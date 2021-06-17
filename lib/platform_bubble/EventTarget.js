//Why remove EventListenerOptions? benefit: muuuuch simpler, drawback: harder to implement passive, once must be implemented manually

//Bounce bubble only

//rule #0:  No eventListenerOptions!! bubble only. And no event option bubbles: true/false.
//rule #1:  bubble only. capture and at_target phase does not exist.
//          Thus, if there are any event listener options, that must be an Object.
//rule #2:  All events propagate sync. No more async propagation for UI events.
//          Which is good, because you can never tell if an event is async or sync.
//rule #3:  Event listeners can be both added and removed from the currentTarget dynamically.
//          No more special rule that event listeners on the same target(phase) can be removed, but not added.
//rule #4:  no stopPropagation(). No more torpedoes.
//rule #5:  Event objects cannot be dispatched twice.
//rule #6:  Dom events do not propagate to the window, they stop on the document.
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

//question #x: how to implement passive: true? add a setter/getter passiveListeningOrSomething to EventTarget that
//             will add a native event listener for touch and wheel with passive true/false instead of the default.

//question #y: the path is calculated at the outset of each dynamic inside the different documents? That kinda feels appropriate...
//         why not? why freeze the inside of the document?

import {} from "./GlobalEventHandlers.js";
import {bounceSequence, ContextIterator} from "./BouncedPath.js";
import {composedPathOG, initEvent, stopImmediatePropagationOG, updateEvent} from "./Event.js";

function rerouteNativeEvents(e) {
  stopImmediatePropagationOG.call(e);
  let composedPath = composedPathOG.call(e);
  if (composedPath[0] === window) composedPath = [window, window];
  else if (composedPath[composedPath.length - 1] === window) composedPath.pop();
  propagate(e, composedPath[0], composedPath[composedPath.length - 1], composedPath);
}

Window.prototype.dispatchEvent = function (e) {
  propagate(e, this, this);
};
EventTarget.prototype.dispatchEvent = function (e, root) {
  root = root === true ? this.getRootNode({composed: true}) :
    root === false ? this.getRootNode() :
      root instanceof Element || root instanceof DocumentFragment || root instanceof Document ? root :
        this.getRootNode(e);
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

const addEventListenerOG = EventTarget.prototype.addEventListener;
const removeEventListenerOG = EventTarget.prototype.removeEventListener;

EventTarget.prototype.addEventListener = function (type, listener) {
  addListeners(this, type, listener) === 0 &&
  // isNativeType(type) &&  //todo we need to add a check for native type event listeners.. Or, we could just add native event listener for all types of events, even though we don't need them.
  addEventListenerOG.call(this, type, rerouteNativeEvents);
};

EventTarget.prototype.removeEventListener = function (type, listener) {
  removeListener(this, type, listener) === 0 &&
  // isNativeType(type) &&  //todo we need to add a check for native type event listeners..
  removeEventListenerOG.call(this, type, rerouteNativeEvents);
};

// EVENT PROPAGATION
const eventStack = [];

function propagate(e, innermostTarget, root, composedPathIn) {
  if (e.eventPhase !== Event.NONE)
    throw new Error("Cannot dispatch the same Event twice.");

  composedPathIn = composedPathIn || composedPath(innermostTarget, root);
  if (innermostTarget.shadowRoot)
    composedPathIn.unshift(innermostTarget = innermostTarget.shadowRoot);

  eventStack.push(e);
  initEvent(e, composedPathIn);
  const topMostContext = bounceSequence(innermostTarget, root);
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

  eventStack.pop() &&
  !eventStack.length &&
  cleanupListeners();
}