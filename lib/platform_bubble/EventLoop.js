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

//Problem y: Some events run async and some run sync. Even for the same type of event, such as click. This is bad.
//           It is better if they all run according to the same timer logic and treats the delay between event listeners
//           the same. It is also better if this can be set by the developer, so that some event listeners run sync and
//           some async.
//
// setTimeouts as part of the event loop. They must be

//question #x: how to implement passive: true? add a setter/getter passiveListeningOrSomething to EventTarget that
//             will add a native event listener for touch and wheel with passive true/false instead of the default.

//question #y: the path is calculated at the outset of each dynamic inside the different documents? That kinda feels appropriate...
//         why not? why freeze the inside of the document?

//:on attribute on the event objects, and then remove the :on when the propagation is finished
//event[\\:on]:last
//event[\\:on='going']
//timeout[\\:on]

import {bounceSequence, calculateRoot, composedPath, ContextIterator} from "./BouncedPath.js";
import {initEvent, updateEvent} from "./Event.js";
import {EventListenerRegistry} from "./EventListenerRegistry.js";

const listeners = new EventListenerRegistry();

const addEventListenerOG = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function (type, listener) {
  addEventListenerOG.call(this, type, listener);     //todo make this into a regular purish function again
  listeners.add(this, type, listener);
};

const removeEventListenerOG = EventTarget.prototype.removeEventListener;
EventTarget.prototype.removeEventListener = function (type, listener) {
  removeEventListenerOG.call(this, type, listener);  //todo make this into a regular purish function again
  listeners.remove(this, type, listener);
};


// EVENT PROPAGATION
const eventStack = [];

function propagateEvent(el) {
  const e = convertElementToEvent(el);

  if (e.eventPhase !== Event.NONE)
    throw new Error("Cannot dispatch the same Event twice.");

  let root = el.getAttribute(':root');
  if (root === 'true') root === true;
  else if (root === 'false') root === false;
  else if (root) root === document.querySelector(`[\\:uid=${root}]`);
  //todo deep querySelector? //todo patch the querySelector(..) to enable deep queries for uids?
  root = calculateRoot(this, root, e);
  let innermostTarget = this;
  const composedPathIn = composedPath(this, root);
  if (innermostTarget.shadowRoot)
    composedPathIn.unshift(innermostTarget = innermostTarget.shadowRoot);

  eventStack.push(e);
  initEvent(e, composedPathIn);
  const type = e.type;
  const topMostContext = bounceSequence(innermostTarget, root);
  for (let context of ContextIterator(topMostContext)) {
    updateEvent(e, 'context', context);
    if (e.defaultPrevented)
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

function runTimer(el) {
  let cb = el.cb;
  if (!cb) {
    const cbAttribute = el.getAttribute(':cb');
    if (cbAttribute === '#anonymous')
      return;
    cb = window[cbAttribute];
    if (!cb)
      throw new Error('renamed setTimeout function between adding the setTimeout and calling the function');
  }
  cb.call(); //todo try catch any error and add the error message to the timeout element?
}

class EventLoop extends HTMLElement {
  constructor() {
   super();
   document.addEventListener('DOMContentLoaded', () => {  
    if (document.readyState === "loaded") return;
    this.runTask();
  });
    
  firstConnectedCallback() {
    this.active = false;
    this.timer = 0;
    const mo = new MutationObserver(mr => {
      if (this.active || !mr[0].addedNodes.length)
        return;
      this.active = true;
      if (this.hasAttribute(':macro'))
        setTimeoutOG(() => this.runTask());
      else
        this.runTask();
    });
    mo.observe(this, {childList: true});
    //todo throw error if there are two event-loop elements in the DOM at the same time?
    //todo throw error if this element is not either a direct child of either head or body element?
  }

  runTask() {
    this.active = true;
    if (this.timer)
      clearTimeout(this.timer);
    this.timer = 0;
    const waitingEvent = document.querySelector('event[\\:on]:nth-last-child(1)');
    if (waitingEvent) {
      propagateEvent(waitingEvent);
      waitingEvent.removeAttribute(':on');
    } else {
      const waitingTimeouts = document.querySelectorAll('timeout[\\:on]');
      if (!waitingTimeouts.length)
        return this.active = false;
      [...waitingTimeouts].sort((a, b) => a.getAttribute(':time') < b.getAttribute(':time'));
      const initialTime = new Date().getTime();
      for (const timeout of waitingTimeouts) {
       const firstTime = parseInt(timeout.getAttribute(':time'));
       const timeToWait = firstTime - new Date().getTime();
       if ((initialTime - firstTime) > 20) { //deprecated more than 20ms
          this.active = false;
          timeout.removeAttribute(":on");
          return console.warn(timeout, " element is deprecated");
        }
        if (timeToWait <= 0) {
         runTimer(timeout);
         timeout.removeAttribute(':on');
       } else {
         this.timer = setTimeoutOG(() => this.runTask(), timeToWait);
         this.active = false;
       }
      }   
     }
    setTimeoutOG(this.runTask.bind(this));
  }
}

customElements.define('event-loop', EventLoop);

function convertElementToEvent(el) {
  if (el.original)
    return el.original;
  const e = new Event(el.getAttribute(':type'));
  e.timeStamp = el.getAttribute(':time-stamp');
  el.hasAttribute(':default-prevented') && e.preventDefault();
  return e;
}

function makeEventElement(e, root) {
  const el = document.createElement('event');
  el.original = e;
  el.setAttributeNode(document.createAttribute(':on'));
  el.setAttribute(':type', e.type);
  el.setAttribute(':time-stamp', e.timeStamp);
  el.setAttribute(':target', e.target.uid);
  el.setAttribute(':root', root instanceof Node ? root.uid : root);
  e.defaultPrevented && el.setAttributeNode(document.createAttribute(':default-prevented'));
  //todo add the x, y, and other relevant properties for the native events. and the other events.
  //todo use a blacklist to exclude non-relevant properties?
  return el;
}

function makeTimeoutElement(cb, ms) {
  const el = document.createElement('timeout');
  el.setAttributeNode(document.createAttribute(':on'));
  el.setAttribute(':time', new Date().getTime() + ms);
  el.setAttribute(':delay', ms);
  const name = cb === window[cb.name] ? cb.name : "#anonymous";
  el.setAttribute(':cb', name);
  el.cb = cb;
  return el;
}

const setTimeoutOG = window.setTimeout;
window.setTimeout = function setTimeout(cb, ms) {
  document.querySelector("event-loop").prepend(makeTimeoutElement(cb, ms));
};

const dispachEventOG = EventTarget.prototype.dispatchEvent;
Object.defineProperty(EventTarget.prototype, 'dispatchEvent', {
  value: function (e, root) {
    document.querySelector("event-loop").prepend(makeEventElement(e, root));
  }
});
