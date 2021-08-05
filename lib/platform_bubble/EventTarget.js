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
//rule #9:  Event listener must be a Function. No more messing around with {.handleEvent} objects.
//rule #10: The old onclick, onmouseenter, onXyz no longer works. The only way is addEventListener(xyz, ...).
//rule #11: The event doesn't specify the composed: true/false.
//          It specifies the 'root' EventTarget (element, Document, DocumentFragment).
//          Or should this be in the dispatchEvent function. I think maybe this.
//rule #12: You can't call .preventDefault() before event propagation.

//x: Problems:
// Nested events. All native events are queued linearly, in the event loop. Not even toggle or reset after click are run nestedly.
// However, script driven events are dispatched immediately, and so if an event listener for eventA dispatches an eventB,
// then all the event listeners for eventB will run before the next eventA listener.
// Are event properties immutable? Do events have mutable properties such as .timeStamp and .type?
// Or is it only .defaultPrevented that are mutable?
//
// setTimeouts as part of the event loop. They must be

//question #x: how to implement passive: true? add a setter/getter passiveListeningOrSomething to EventTarget that
//             will add a native event listener for touch and wheel with passive true/false instead of the default.

//question #y: the path is calculated at the outset of each dynamic inside the different documents? That kinda feels appropriate...
//         why not? why freeze the inside of the document?

import {bounceSequence, ContextIterator, composedPath} from "./BouncedPath.js";
import {composedPathOG, initEvent, stopImmediatePropagationOG, updateEvent} from "./Event.js";
import {EventListenerRegistry} from "./EventListenerRegistry.js";

// //todo we need to add a check for native type event listeners..
// // Or, we could just add native event listener for all types of events, even though we don't need them.
// // what is the performance difference? I think it should be good for performance if the browser can skip a whole bunch of native events?
// function isNativeType(type){
//   return ["pointerdown", "pointermove", "pointerup"].indexOf(type) >= 0;
// }
//
const listeners = new EventListenerRegistry();

const addEventListenerOG = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function (type, listener) {
  listeners.add(this, type, listener) &&
  // isNativeType(type) &&  //todo we need to add a check for native type event listeners.. Or, we could just add native event listener for all types of events, even though we don't need them.
  addEventListenerOG.call(this, type, rerouteNativeEvents);
};

const removeEventListenerOG = EventTarget.prototype.removeEventListener;
EventTarget.prototype.removeEventListener = function (type, listener) {
  listeners.remove(this, type, listener) &&
  // isNativeType(type) &&  //todo we need to add a check for native type event listeners..
  removeEventListenerOG.call(this, type, rerouteNativeEvents);
};

function rerouteNativeEvents(e) {
  stopImmediatePropagationOG.call(e);
  let composedPath = composedPathOG.call(e);
  if (composedPath[0] === window) composedPath = [window, window];
  else if (composedPath[composedPath.length - 1] === window) composedPath.pop();
  propagate(e, composedPath[0], composedPath[composedPath.length - 1], composedPath);
}

function calculateRoot(target, root, e) {
  if (target === window) return window;
  if (root === false) return target.getRootNode();
  if (root === true) return target.getRootNode({composed: true});
  if (root instanceof Element || root instanceof DocumentFragment || root instanceof Document) return root;
  return target.getRootNode(e);
}

EventTarget.prototype.dispatchEvent = function (e, root) {
  propagate(e, this, calculateRoot(this, root, e));
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
  const type = e.type;
  const topMostContext = bounceSequence(innermostTarget, root);
  for (let context of ContextIterator(topMostContext)) {
    updateEvent(e, 'context', context);
    if(e.defaultPrevented)
      continue;
    for (let target of context.path) {
      const list = listeners.get(target, type);
      if (list) {
        updateEvent(e, 'currentTarget', target);
        for (let fun of list)
          fun?.call(target, e);
      }
    }
  }
  updateEvent(e, 'eventPhase', Event.FINISHED);
  updateEvent(e, 'context', topMostContext);
  updateEvent(e, 'currentTarget', undefined);

  eventStack.pop() &&
  !eventStack.length &&
  listeners.cleanup();
}