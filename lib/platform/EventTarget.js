import {
  bounceSequence,
  composedPath,
  contextForElement,
  ContextIterator,
  PathIterator,
  SubsequentSiblingContexts
} from "./BouncedPath.js";
import {findNativeDefaultAction} from "./getNativeDefaultAction.js";

Object.defineProperty(Event, "FINISHED", {value: 4, writable: false, configurable: false, enumerable: true});
Object.defineProperty(Event.prototype, "FINISHED", {value: 4, writable: false, configurable: false, enumerable: true});

const EventListenerOptionsOG = window.EventListenerOptions;
window.EventListenerOptions = {
  PREVENTABLE_NONE: 0,   // the listener is not blocked by preventDefault, nor does it trigger preventDefault.
  PREVENTABLE_SOFT: 1,   // the listener is blocked by preventDefault, and *may or may not* trigger preventDefault.
  PREVENTABLE: 2,        // the listener is blocked by preventDefault, and will always call preventDefault when invoked.
};
Object.assign(EventListenerOptions, EventListenerOptionsOG);  //untested, as there is no EventListenerOptionsOG..

const listeners = Symbol("listeners");

function onFirstNativeListener(e) {
  Event.prototype.stopImmediatePropagation.call(e);
  let innerMostTarget = e.composedPath()[0];
  //rule : reroute all natively dispatched events to the shadowRoot of the element. //todo this shouldnt conflict with .click() and .requestSubmit()..
  innerMostTarget = innerMostTarget instanceof Element ? innerMostTarget.shadowRoot : innerMostTarget;
  innerMostTarget.dispatchEvent(e);
  const {target} = findNativeDefaultAction(e.composedPath(), e);
  const context = contextForElement(e.context, target);  //todo e.context doesn't work. WeakMap for: event=>context??
  context?.prevented && Event.prototype.preventDefault.call(e);
}

function typeCheckListener(listen) {
  return listen instanceof Function || listen instanceof Object && listen.handleEvent instanceof Function;
}

function activeListener(phase, listener, type, trusted) {
  return listener.type === type &&
    phase === 2 || (listener.capture && phase === Event.CAPTURING_PHASE) || (!listener.capture && phase === Event.BUBBLING_PHASE) &&
    !listener.removed &&
    (trusted || !listener.trustedOnly);
}

function* ListenerIterator(listeners, type, phase, trusted) {
  for (let i = 0; i < listeners.length; i++) {
    let listener = listeners[i];
    if (activeListener(phase, listener, type, trusted))
      yield listener;
  }
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

//preventDefault() general applies to the current context, children contexts, and subsequent sibling contexts.
//preventDefault(hostNode) applies specifically to one child propagation context, and not subsequent sibling contexts.
//the whole point of preventDefault(hostNode) is to enable an upper slotting context to become effective instead of an inner slotting or target context.

//preventDefault() NEVER apply to parent (useR) contexts. The whole point is that this is a UseR => UseD control mechanism,
//and a coordination mechanism between sibling target/slotting contexts/event listeners.

function preventContext(context) {
  if (context.prevented) return;
  context.prevented = true;
  for (let child of context.contexts)
    preventContext(child);
}

function defineContextPropertiesOnEvent(e, context) {
  Object.defineProperty(e, 'preventDefault', {
    value: function () {
      preventContext(context)
      for (let child of SubsequentSiblingContexts(context))
        preventContext(child);
    }, writable: true
  });
  Object.defineProperty(e, 'preventDefaultOnHost', {
    value: function (hostNode) {
      const hostIndex = context.path.indexOf(hostNode);
      if (hostIndex === -1 || !(hostNode instanceof Element))
        throw new Error('preventDefaultOnHost(hostNode) must be called on Elements in the current path of the event.')
      const childContext = context.contexts[hostIndex];
      childContext && preventContext(childContext);
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
EventTarget.prototype.dispatchEvent = function (e, options) {
  if (e.eventPhase > 0)
    throw new Error('Re-dispatch of events is disallowed.');
  eventStack.unshift(e);
  const root = options?.root instanceof EventTarget ? options.root : e.composed;
  Object.defineProperty(e, 'composedPath', {get: composedPath.bind(null, this, root)});   //todo unsure of the configurable and writable here
  const topMostContext = bounceSequence(this, root);
  if (e.defaultPrevented) topMostContext.prevented = true; //patch the before propagation begins prevented
  if (e.isStopped) topMostContext.stop = true;             //patch the before propagation begins stopped
  main: for (let context of ContextIterator(topMostContext)) {
    defineContextPropertiesOnEvent(e, context);
    for (let phase = 1; phase <= 3; phase++) {
      Object.defineProperty(e, 'eventPhase', {value: phase, configurable: true});
      for (let target of PathIterator(context.path, phase)) {
        const listenerss = target[listeners];
        if (!listenerss)
          continue;
        Object.defineProperty(e, 'currentTarget', {value: target, configurable: true});
        for (let listener of ListenerIterator(listenerss, e.type, phase, e.isTrusted)) {
          if (e.defaultPrevented && listener.preventable > 0)   //preventable: PREVENTABLE_SOFT or PREVENTABLE
            continue;
          if (listener.once)                                    //once: true
            removeListener(listener);
          invokeListener(e, target, listener.cb);
          if (listener.preventable === 2)                       //preventable: PREVENTABLE
            e.preventDefault();
          if (context.stopImme)                                 //stopImmediatePropagation
            continue main;
        }
        if (context.stop)                                       //stopPropagation
          continue main;
      }
    }
  }
  if (e !== eventStack.shift())
    throw new Error('Critical error in EventTarget.dispatchEvent().');
  !eventStack.length && removedListeners.map(removeListenerImpl);
}
// todo start explanation from dispatchEvent only. second step is addEventListener take-over.
// todo explain the event stack as an addition to the event loop