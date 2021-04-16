import {EventOG, nextTarget, setPaths} from "./Event.js";

const EventListenerOptionsOG = window.EventListenerOptions;
window.EventListenerOptions = {
  PREVENTABLE_NONE: 0,   // the listener is not blocked by preventDefault, nor does it trigger preventDefault.
  PREVENTABLE_SOFT: 1,   // the listener is blocked by preventDefault, and *may or may not* trigger preventDefault.
  PREVENTABLE: 2,        // the listener is blocked by preventDefault, and will always call preventDefault when invoked.
};
Object.assign(EventListenerOptions, EventListenerOptionsOG);//todo does this work ok?

const removedListeners = [];

const listeners = Symbol("listeners");

function onFirstNativeListener(e) {
  EventOG.stopImmediatePropagation.call(e);
  let innerMostTarget = e.composedPath()[0];
  innerMostTarget = innerMostTarget instanceof Element ? innerMostTarget.shadowRoot : innerMostTarget;
  innerMostTarget.dispatchEvent(e);
  e.getNativeDefaultAction().prevented && EventOG.preventDefault.call(e);
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

function removeListener(listener) {
  listener && (listener.removed = true) && removedListeners.push(listener);
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

const removeEventListenerOG = EventTarget.prototype.removeEventListener;
EventTarget.prototype.removeEventListener = function (type, cb, options) {
  const capture = options instanceof Object ? options.capture : !!options;
  removeListener(getListener(this, type, cb, capture));
}

//EVENT LOOP

function nextInLoop(type, isTrusted, event, contexts/*, getListeners*/) {
  nextContext: for (; event.doc < contexts.length; event.doc++, event.phase = 1, event.target = event.listener = 0) {
    if (event.stopImmediate[event.doc])
      continue nextContext;
    const context = contexts[event.doc];
    const prevented = event.prevented[event.doc];
    for (; event.phase < 4; event.phase++, event.target = 0) {
      for (let target = nextTarget(event.phase, context.path, event.target);
           target;
           target = nextTarget(event.phase, context.path, ++event.target)
      ) {
        const listeners = getListeners(target, type, event.phase);
        while (event.listener < listeners.length) {
          const listener = listeners[event.listener++];
          if (listener.removed)
            continue;
          if (!isTrusted && listener.trustedOnly)                         //filters for isTrusted events
            continue;
          if (prevented && listener.preventable > 0)                       //PREVENTABLE_SOFT or PREVENTABLE
            continue;
          return listener;
        }
        event.listener = 0;
        if (event.stop[event.doc])
          continue nextContext;
      }
    }
  }
  event.phase = 4, event.doc = 0;
}

const eventStack = [];

function propagate(e, target/*, getListeners, removeListener*/) {
  const eventState = setPaths(e, target);
  eventStack.unshift(eventState);
  let listener;
  while (listener = nextInLoop(e.type, e.isTrusted, eventState, eventState.contexts/*, getListeners*/)) {
    listener.once && removeListener(listener);            //once
    listener.preventable === 2 && e.preventDefault();     //preventable: PREVENTABLE
    try {
      listener.cb instanceof Function ? listener.cb.call(listener.target, e) : listener.cb.handleEvent.call(listener.cb.handleEvent, e);
    } catch (err) {
      const error = new ErrorEvent('Uncaught Error', {error: err, message: err.message});
      window.dispatchEvent(error);
      if (!error.defaultPrevented)
        console.error(error);
    }
  }
  if (eventState !== eventStack.shift()) throw 'omg';
  return eventStack.length === 0;
}

EventTarget.prototype.dispatchEvent = function (e) {
  if (e.eventPhase > 0)
    throw new Error('Re-dispatch of events is disallowed.');
  const stackEmpty = propagate(e, this/*, getListeners, removeListener*/);
  stackEmpty && removedListeners.map(removeListenerImpl);
}
//todo start explanation from dispatchEvent only. second step is addEventListener take-over.