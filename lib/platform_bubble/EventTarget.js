//Why remove EventListenerOptions? benefit: muuuuch simpler, drawback: harder to implement passive, once must be implemented manually

//Bounce bubble only

//rule #1:  bubble only!! all events bubble. no need for capture nor at_target phase. No event option bubbles: true.
//          Thus, if there are any event listener options, that must be an Object.
//rule #2:  All events propagate sync. No more async propagation for UI events.
//          Which is good, because you can never tell if an event is async or sync.
//rule #3:  Event listeners can be both added and removed from the currentTarget dynamically.
//          No more special rule that event listeners on the same target(phase) can be removed, but not added.
//rule #4:  no stopPropagation(). No more torpedoes.
//rule #5:  Event objects cannot be dispatched twice.
//rule #6:  Events never propagate on window. The window is no longer a functioning EventTarget.
//          Any native events that previously targeted the window, now targets the <html> element.
//rule #7:  All native events are directed at the shadowRoot of the element, if it has one.
//          This will run default actions when an element is targeted.
//rule #8:  preventDefault() will stop propagation into used documents.
//          enableDefault(el) and preventDefault(el) can target a single element only.
//rule #9:  Event listener must be a Function. No more messing around with {Object.handleEvent}.
//rule #10: The old onclick, onmouseenter, onxyz no longer works.
//rule #11: The event doesn't specify the composed: true/false.
//          It specifies the 'root' EventTarget (element, Document, DocumentFragment).
//          Or should this be in the dispatchEvent function. I think maybe this.
//rule #12: You can't call .preventDefault() before event propagation.

//question #x: how to implement passive: true??

//question #y: the path is calculated at the outset of each dynamic inside the different documents? That kinda feels appropriate...
//         why not? why freeze the inside of the document?

import {bounceSequence, ContextIterator} from "./BouncedPath.js";
import {stopImmediatePropagationOG, composedPathOG, preventDefaultOG, updateEvent, initEvent} from "./Event.js";

window.EventListenerOptions = Object.assign(window.EventListenerOptions || {}, {
  PREVENTABLE_NONE: 0,   //The listener is not blocked by preventDefault, nor does it trigger preventDefault. (same as passive: true)
  PREVENTABLE_SOFT: 1,   //The listener is blocked by preventDefault, and *may or may not* trigger preventDefault.
  PREVENTABLE: 2,        //The listener is blocked by preventDefault, and will always call preventDefault when invoked.
});

function rerouteNativeEvents(e) {
  stopImmediatePropagationOG.call(e);
  let composedPath = composedPathOG.call(e);
  if (composedPath[0] === window) composedPath = [document.childNodes[0], document];
  else if (composedPath[composedPath.length - 1] === window) composedPath.pop();
  propagate(e, composedPath[0], composedPath[composedPath.length - 1], composedPath);
}

EventTarget.prototype.dispatchEvent = function (e, root) {
  if (root === window)
    throw new Error('The window is no longer an EventTarget.');
  root = root instanceof Element || root instanceof DocumentFragment || root instanceof Document ? root : this.getRootNode(e);
  propagate(e, this, root);
};

//type => node* => [listener Functions]
const listenersMap = {};
const listenersListWithRemoved = [];

function addListeners(target, type, listener) {
  const listenersPerNode = listenersMap[type] || (listenersMap[type] = new WeakMap());
  let listeners = listenersPerNode.get(target);
  if (!listeners || listeners.length === 0) {
    listenersPerNode.set(target, [listener]);
    return 0;
  }
  if (listeners.contains(listener))
    return -1;
  listeners.push(listener);
  return 1;
}

function removeListener(target, type, listener) {
  const listeners = listenersMap[type]?.get(target);
  if (!listeners)
    return -1;
  const index = listeners.indexOf(listener);
  if (index === -1)
    return -1;
  listeners[index] = undefined;
  listenersListWithRemoved.push(listeners);
  return listeners.every(i => i === undefined) ? 0 : 1;
}

function cleanupListeners() {
  let listeners;
  while (listeners = listenersListWithRemoved.pop()) {
    if (listeners.indexOf(listeners) >= 0) continue; //a list might be added twice, if so we clean it only the last time.
    let length = listeners.length;
    for (let i = 0; i < length; i++) {
      if (listeners[i] === undefined)
        length--, listeners.splice(i--, 1);
    }
  }
}

Window.prototype.addEventListener = function () {
  throw new Error('deprecated');
}
const addEventListenerOG = EventTarget.prototype.addEventListener;

function isWindowTypeEvent(type) {
  return type === 'offline' || type === 'online';
}

function isNativeType(type) {
  return type === 'mousedown' || type === 'click';
}

EventTarget.prototype.addEventListener = function (type, listener) {
  //typecheck (type, listener) todo
  // if (!(arguments.length === 2 && listener instanceof Function && type instanceof String || typeof (type) === "string"))
  //   throw new Error('addEventListener(string, Function)');
  //todo here we also need to reroute the native window-targeting events...
  const target = isWindowTypeEvent(type) ? window : this;
  addListeners(this, type, listener) === 0 && isNativeType(type) && addEventListenerOG.call(target, type, rerouteNativeEvents);
};

const removeEventListenerOG = EventTarget.prototype.removeEventListener;
EventTarget.prototype.removeEventListener = function (type, listener) {
  // typecheck(type, listener) todo
  //todo here we also need to reroute the native window-targeting events...
  const target = isWindowTypeEvent(type) ? window : this;
  removeListener(this, type, listener) === 0 && isNativeType(type) && removeEventListenerOG.call(target, type, rerouteNativeEvents);
}

// EVENT PROPAGATION
const eventStack = [];

function propagate(e, innerMostTarget, root, composedPathIn) {
  if (e.eventPhase !== Event.NONE)
    throw new Error("Cannot dispatch the same Event twice.");

  composedPathIn = composedPathIn || composedPath(innerMostTarget, root);
  if (innerMostTarget.shadowRoot)
    composedPathIn.unshift(innerMostTarget = innerMostTarget.shadowRoot);

  eventStack.unshift(e);
  initEvent(e, composedPathIn);
  const topMostContext = bounceSequence(innerMostTarget, root);
  for (let context of ContextIterator(topMostContext)) {
    updateEvent(e, 'context', context);
    for (let target of context.path) {
      const listeners = listenersMap[e.type]?.get(target);
      if (listeners) {
        updateEvent(e, 'currentTarget', target);
        for (let fun of listeners)
          fun?.call(target, e);
      }
    }
  }
  updateEvent(e, 'eventPhase', Event.FINISHED);
  updateEvent(e, 'context', topMostContext);
  updateEvent(e, 'currentTarget', undefined);
  // if (e !== eventStack.shift()) throw new Error('Critical error in EventTarget.dispatchEvent().');
  !eventStack.length && cleanupListeners();
}