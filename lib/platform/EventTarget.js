import {preventDefaultOG, stopImmediatePropagationOG} from "./Event.js";
import {PathIterator} from "./EventIterator.js";
import {bounceSequence2, cloneContext, composedPath, contextForElement, getPropagationRoot} from "./BouncedPath.js";
import {findNativeDefaultAction} from "./getNativeDefaultAction.js";

const EventListenerOptionsOG = window.EventListenerOptions;
window.EventListenerOptions = {
  PREVENTABLE_NONE: 0,   // the listener is not blocked by preventDefault, nor does it trigger preventDefault.
  PREVENTABLE_SOFT: 1,   // the listener is blocked by preventDefault, and *may or may not* trigger preventDefault.
  PREVENTABLE: 2,        // the listener is blocked by preventDefault, and will always call preventDefault when invoked.
};
Object.assign(EventListenerOptions, EventListenerOptionsOG);  //untested, as there is no EventListenerOptionsOG..

const listeners = Symbol("listeners");

function onFirstNativeListener(e) {
  stopImmediatePropagationOG.call(e);
  let innerMostTarget = e.composedPath()[0];
  //rule : reroute all natively dispatched events to the shadowRoot of the element. //todo this shouldnt conflict with .click() and .requestSubmit()..
  innerMostTarget = innerMostTarget instanceof Element ? innerMostTarget.shadowRoot : innerMostTarget;
  innerMostTarget.dispatchEvent(e);
  const {target} = findNativeDefaultAction(e.composedPath(), e);
  const context = contextForElement(e.context, target);  //todo e.context doesn't work. WeakMap for: event=>context??
  context?.prevented && preventDefaultOG.call(e);
}

function typeCheckListener(listen) {
  return listen instanceof Function || listen instanceof Object && listen.handleEvent instanceof Function;
}

function typeAndPhaseIsOk(listener, type, phase) {
  return listener.type === type && (phase === 2 || (listener.capture && phase === 1) || (!listener.capture && phase === 3));
}

function getListeners(target, type, phase) {
  return target[listeners]?.filter(listener => typeAndPhaseIsOk(listener, type, phase)) || [];
}

function getListener(target, type, cb, capture) {
  target[listeners] || (target[listeners] = []);
  return target[listeners].find(old => old.type === type && old.cb === cb && old.capture === capture && !old.removed);
}

function defaultPassiveValue(type, target) {
  return (type === 'touchstart' || type === 'touchmove') && (target === window || target === document || target === body);
}

function addListenerImpl(l) {
  l.target[listeners].push(l);
  addEventListenerOG.call(l.target, l.type, l.realCb, {capture: l.capture, passive: l.passive});
}

function removeListenerImpl(l) {
  l.target[listeners].splice(l.target[listeners].indexOf(l), 1);
  removeEventListenerOG.call(l.target, l.type, l.realCb, {capture: l.capture, passive: l.passive});
}

const addEventListenerOG = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function (type, cb, options) {
  if (!typeCheckListener(cb))
    return;
  const capture = options instanceof Object ? options.capture : !!options;
  if (getListener(this, type, cb, capture))
    return;
  const target = this;
  const passive = options instanceof Object && 'passive' in options ? options.passive : defaultPassiveValue(type, target);
  const once = options instanceof Object && !!options.once;
  const preventable = +(options instanceof Object && 'preventable' in options && options.preventable);
  const trustedOnly = options instanceof Object && !!options.trustedOnly;
  const listener = {target, type, cb, capture, passive, once, preventable, trustedOnly};
  listener.realCb = onFirstNativeListener.bind(listener);
  //we don't use the listener object, but we need to bind the nativeEventListener to something to get a unique realCb.
  addListenerImpl(listener);
}

//REMOVE EVENT LISTENERS
const removedListeners = [];

function removeListener(listener) {
  listener && (listener.removed = true) && removedListeners.push(listener);
}

const removeEventListenerOG = EventTarget.prototype.removeEventListener;
EventTarget.prototype.removeEventListener = function (type, cb, options) {
  const capture = options instanceof Object ? options.capture : !!options;
  removeListener(getListener(this, type, cb, capture));
}

// DISPATCH EVENT
function invokeListener(e, target, cb) {
  try {
    //todo if cb is async, returns a promise, do we wish to add a catch(error handler) on that Promise?
    // or is that unnecessary? as the browser will already do so?
    cb instanceof Function ?
      cb.call(target, e) :
      cb.handleEvent.call(cb.handleEvent, e);
  } catch (err) {
    const error = new ErrorEvent('Uncaught Error', {error: err, message: err.message});
    window.dispatchEvent(error);
    if (!error.defaultPrevented)
      console.error(error);
  }
}

const eventStack = [];

function propagatePath(path, e, prevented, context) {
  //todo we choose actively to preserve the .stop, .stopImme, and .prevent because that will enable us to read them later.
  //     we need this for prevent in order to patch the native preventDefault(). But this might also be very useful debug
  //     information, so we keep it in.
  let currentTarget, phase;

  //todo these are changed during iteration
  Object.defineProperty(e, 'currentTarget', {
    get: function () {
      return currentTarget;
    }, configurable: true
  });
  Object.defineProperty(e, 'eventPhase', {
    get: function () {
      return phase;
    }, configurable: true
  });

  const eventIterator = PathIterator(path);
  for (let next = eventIterator.next(); !next.done; next = eventIterator.next()) {
    const obj = next.value;
    currentTarget = obj.currentTarget;
    phase = obj.phase;
    const listeners = getListeners(currentTarget, e.type, phase);
    for (let i = 0; i < listeners.length; i++) {
      let listener = listeners[i];
      if (listener.removed)
        continue;
      if (!e.isTrusted && listener.trustedOnly)             //trustedOnly: true
        continue;
      if (context.prevented && listener.preventable > 0)    //preventable: PREVENTABLE_SOFT or PREVENTABLE
        continue;
      if (listener.once)                                    //once: true
        removeListener(listener);
      invokeListener(e, currentTarget, listener.cb);
      if (listener.preventable === 2)                       //preventable: PREVENTABLE
        e.preventDefault();
      if (context.stopImme)                                         //stopImmediatePropagation
        return;
    }
    if (context.stop)                                               //stopPropagation
      return;
  }
}

//shouldn't preventDefault apply to all subsequent contexts?
// no, preventDefault does NOT go up to **parent host** context.

//defaultPrevented applies to event listener in:
// 1. the same context,
// 2. children contexts, and
// 3. sibling contexts, ie. listeners in subsequent slotted contexts.
//    Example: <a href><input type=checkbox></a>
//    Thus, the calling of preventdDefault() inside the <input type=checkbox> shadowRoot, will cause defaultPrevented to be true in
//    in the <a href> shadowRoot context.
// *. defaultPrevented does NOT apply up into parent (useR) context.
function propagateContexts(context, e, preventedIn) {
  context.prevented = context.prevented || preventedIn;      //a particular context can be prevented via host, and then we don't want to overwrite it.
  Object.defineProperty(e, 'preventDefault', {
    value: function (target) {
      if (!target) {
        context.prevented = true;
        return;
      }
      const targetIndex = context.path.indexOf(target);
      if (targetIndex === -1)
        throw new Error('The target in preventDefault(target) is not in event.path.')
      const childContext = context.contexts[targetIndex];
      if (childContext)
        childContext.prevented = true;
    }, writable: true
  });
  Object.defineProperty(e, 'defaultPrevented', {
    get: function () {
      return context.prevented;
    }, configurable: true
  });
  Object.defineProperty(e, 'stopPropagation', {
    value: function () {
      context.stop = true;
    }, writable: true
  });
  Object.defineProperty(e, 'stopImmediatePropagation', {
    value: function () {
      context.stopImme = true;
    }, writable: true
  });
  Object.defineProperty(e, 'path', {    //todo why not define these properties as values? Why would that be a problem?
    get: function () {
      return context.path;
    }, configurable: true
  });
  Object.defineProperty(e, 'target', {
    get: function () {
      return context.path[0];
    }, configurable: true
  });
  propagatePath(context.path, e, preventedIn, context);
  let childPrevented = context.prevented;
  for (let child of context.contexts.filter(c => c))
    childPrevented = childPrevented || propagateContexts(child, e, childPrevented).prevented;
  return context;
}

EventTarget.prototype.dispatchEvent = function (e, options) {
  if (e.eventPhase > 0)
    throw new Error('Re-dispatch of events is disallowed.');
  eventStack.unshift(e);

  //setting paths on the event.
  const root = options instanceof Object && options.root instanceof EventTarget ? options.root : getPropagationRoot(this, e);
  Object.defineProperty(e, 'composedPath', {get: composedPath.bind(null, this, root)});   //todo unsure of the configurable and writable here
  const context = bounceSequence2(this, root);
  //todo not sure we want to expose this one..
  //Object.defineProperty(e, 'bouncedPath', {get: cloneContext.bind(null, context)});   //todo unsure of the configurable and writable here

  const prevented = false; //e.defaultPrevented??
  propagateContexts(context, e, prevented /*could be set before propagation*/);
  if (e !== eventStack.shift())
    throw new Error('Critical error in EventTarget.dispatchEvent().');
  !eventStack.length && removedListeners.map(removeListenerImpl);
}

// EventTarget.prototype.dispatchEvent = function (e, options) {
//   if (e.eventPhase > 0)
//     throw new Error('Re-dispatch of events is disallowed.');
//   eventStack.unshift(e);
//   const root = options instanceof Object && options.root instanceof EventTarget ? options.root : getPropagationRoot(this, e);
//   let stopImme;
//   Object.defineProperty(e, 'stopImmediatePropagation', {value: function(){this.stopPropagation(); stopImme = true}});
//   Object.defineProperty(e, 'composedPath', {get: composedPath.bind(null, this, root)});   //todo unsure of the configurable and writable here
//
//   const eventIterator = EventIterator(bounceSequence(this, root));
//   e.ititit = eventIterator;
//   targetLoop: for (let next = eventIterator.next(); !next.done; next = eventIterator.next()) {
//     const {currentTarget, phase} = next.value;
//     const listeners = getListeners(currentTarget, e.type, phase);
//     for (let i = 0; i < listeners.length; i++) {
//       let listener = listeners[i];
//       if (listener.removed)
//         continue;
//       if (!e.isTrusted && listener.trustedOnly)             //trustedOnly: true
//         continue;
//       if (e.defaultPrevented && listener.preventable > 0)   //preventable: PREVENTABLE_SOFT or PREVENTABLE
//         continue;
//       if (listener.once)                                    //once: true
//         removeListener(listener);
//       invokeListener(e, currentTarget, listener.cb);
//       if (listener.preventable === 2)                       //preventable: PREVENTABLE
//         e.preventDefault();
//       if(stopImme){
//         stopImme = false;
//         continue targetLoop;
//       }
//     }
//   }
//   if (e !== eventStack.shift())
//     throw new Error('Critical error in EventTarget.dispatchEvent().');
//   !eventStack.length && removedListeners.map(removeListenerImpl);
// }
// todo start explanation from dispatchEvent only. second step is addEventListener take-over.
// todo explain the event stack as an addition to the event loop