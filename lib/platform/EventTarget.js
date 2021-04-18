import {bounceSequence, contextForElement, ContextIterator, PathIterator} from "./BouncedPath.js";
import {findNativeDefaultAction} from "./getNativeDefaultAction.js";
import {setEventContext, setEventPhase, setEventTarget, setEventComposedPath} from "./Event.js";

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

function listenerOK(listener, type, phase, trusted) {
  return listener.type === type &&
    phase === 2 || (listener.capture && phase === Event.CAPTURING_PHASE) || (!listener.capture && phase === Event.BUBBLING_PHASE) &&
    !listener.removed &&
    (trusted || !listener.trustedOnly);
}

function* ListenerIterator(listeners, type, phase, trusted) {
  for (let i = 0; i < listeners.length; i++)
    if (listenerOK(listeners[i], type, phase, trusted))
      yield listeners[i];
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
//todo if cb is async, returns a promise, do we wish to add a catch(error handler) on that Promise?
// or is that unnecessary? as the browser will already do so?
function invokeListener(e, target, cb) {
  try {
    cb instanceof Function ? cb.call(target, e) : cb.handleEvent.call(cb.handleEvent, e);
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
  setEventComposedPath(e, root);
  const topMostContext = bounceSequence(this, root);
  if (e.defaultPrevented) topMostContext.prevented = true; //patch the before propagation begins prevented. currently, this doesn't work, but it should.
  if (e.isStopped) topMostContext.stop = true;             //patch the before propagation begins stopped
  main: for (let context of ContextIterator(topMostContext)) {
    setEventContext(e, context);
    for (let phase = 1; phase <= 3; phase++) {
      setEventPhase(e, phase);
      for (let target of PathIterator(context.path, phase)) {
        const listenerss = target[listeners];
        if (!listenerss)
          continue;
        setEventTarget(e, target);
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