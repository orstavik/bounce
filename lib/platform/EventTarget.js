import {bounceSequence, composedPath, ContextIterator, PathIterator} from "./BouncedPath.js";
import {
  cleanupEvent,
  composedPathOG,
  initEvent,
  initNativeEvent,
  preInitState,
  preventContext,
  stopImmediatePropagationOG,
  updateEvent,
} from "./Event.js";

window.EventListenerOptions = Object.assign(window.EventListenerOptions || {}, {
  PREVENTABLE_NONE: 0,   // the listener is not blocked by preventDefault, nor does it trigger preventDefault.     //this is the same as passive: true
  PREVENTABLE_SOFT: 1,   // the listener is blocked by preventDefault, and *may or may not* trigger preventDefault.
  PREVENTABLE: 2,        // the listener is blocked by preventDefault, and will always call preventDefault when invoked.
});

const listeners = Symbol("listeners");

//Rule x: reroute natively triggered window events to the html element.
// This makes the event visible in the DOM. It is necessary to have events "visit" the DOM
// because that makes two things possible:
// 1. it gives us a shadowDom to add default action event listeners in.
// 2. It gives us a good place to attach mixins with default actions that can be made visible as pseudo-attributes for example.
function onFirstNativeListener(e) {
  stopImmediatePropagationOG.call(e);
  const nativeComposedPath = composedPathOG.call(e);
  initNativeEvent(e);
  let innerMostTarget = nativeComposedPath[0];
  if (innerMostTarget === window || innerMostTarget === document) innerMostTarget = document.children[0];
  //the composed: true/false is broken. We need to find the root from the native composedPath() for focus events.
  propagate(e, innerMostTarget, nativeComposedPath[nativeComposedPath.length - 1], false, false, false);
  // innerMostTarget.dispatchEvent(e);
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

function* ListenerIterator(target, type, phase, trusted) {
  const list = target[listeners];
  for (let i = 0; i < list.length; i++)
    if (listenerOK(list[i], type, phase, trusted))
      yield list[i];
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
const eventStack = [];

function propagate(e, innerMostTarget, root, stopped, prevented, onHost) {
  //rule : reroute dispatch of all events on elements to their shadowRoot if not onHost: true.
  //todo replace the onHost with a check for e.defaultPrevented?? orr just remove the onHost all together?? we don't need it, nor want it??
  // todo this shouldnt conflict with .click() and .requestSubmit()..
  innerMostTarget instanceof Element && !onHost && (innerMostTarget = innerMostTarget.shadowRoot);

  if (eventStack.includes(e))
    throw new Error("Failed to execute 'dispatchEvent' on 'EventTarget': The event is already being dispatched.");
  eventStack.unshift(e);
  const topMostContext = bounceSequence(innerMostTarget, root);
  topMostContext.stop = stopped;
  prevented && preventContext(topMostContext);
  initEvent(e, composedPath(innerMostTarget, root)); //todo add in property e.topContext = true?? so that inner contexts can know whether or not they are controlled?? why? we don't really need this info??
  main: for (let context of ContextIterator(topMostContext)) {
    updateEvent(e, 'context', context);
    for (let phase = 1; phase <= 3; phase++) {
      updateEvent(e, 'eventPhase', phase);
      for (let target of PathIterator(context.path, phase)) {
        let first;
        for (let listener of ListenerIterator(target, e.type, phase, e.isTrusted)) {
          if (e.defaultPrevented && listener.preventable > 0)   //preventable: PREVENTABLE_SOFT or PREVENTABLE
            continue;
          !first && (first = true) && updateEvent(e, 'currentTarget', target);
          if (listener.once)                                    //once: true
            removeListener(listener);
          try {
            /*const maybePromise = */listener.cb instanceof Function ? listener.cb.call(target, e) : listener.cb.handleEvent.call(listener.cb.handleEvent, e);
            //todo this is unnecessary, right? the browser already does this internally??
            // maybePromise instanceof Promise && maybePromise.catch(err=> window.dispatchEvent(new ErrorEvent('Uncaught Error', {error: err, message: err.message})));
          } catch (err) {
            window.dispatchEvent(new ErrorEvent('Uncaught Error', {error: err, message: err.message}));
          }
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
  cleanupEvent(e);
  if (e !== eventStack.shift())
    throw new Error('Critical error in EventTarget.dispatchEvent().');
  !eventStack.length && removedListeners.map(removeListenerImpl);
}

EventTarget.prototype.dispatchEvent = function (e, options) {
  const root = options instanceof Object && 'root' in options ? options.root : e.composed;  //options root override e.composed.
  const {stopped, prevented} = preInitState(e);
  propagate(e, this, root, stopped, prevented, !options?.onHost);
};
// todo start explanation from dispatchEvent only. second step is addEventListener take-over.
// todo explain the event stack as an addition to the event loop