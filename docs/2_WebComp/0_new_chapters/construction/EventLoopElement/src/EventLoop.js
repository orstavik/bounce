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

//
// import {bounceSequence, calculateRoot, composedPath, ContextIterator} from "./BouncedPath.js";
// import {initEvent, updateEvent} from "../../../platform_bubble/Event.js";
// import {EventListenerRegistry} from "./EventListenerRegistry.js";
// import {FirstConnectedCallbackMixin} from "../../callbacks/firstConnectedCallbackMixin/FirstConnectedCallbackMixin.js"


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
  else if (root) root === document.querySelector(`[\\:uid="${root}"]`);
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


function runCallback(el) {
  let cb = el.cb || window[el.getAttribute(":cb")] //todo add new
  if (!cb)
    throw new Error("No callback function " + el)
  let res = cb.call(el);
  return res;
}


 class EventLoop extends FirstConnectedCallbackMixin {
  constructor() {
    super();
    document.addEventListener('DOMContentLoaded', () => {    //todo: add new
      if (document.readyState === "loading") return;
      this.setAttribute(":now", Date.now());
      this.findNextTask();
    });

  }

  connectedCallback() {
    const eventLoopElement = document.querySelectorAll("event-loop");
    if (eventLoopElement.length > 1)
      throw new Error("There are two event-loop elements in the DOM at the same time");
    const parentElementTagNAme = eventLoopElement[0]?.parentNode?.tagName;
    if (parentElementTagNAme !== "HEAD" && parentElementTagNAme !== "BODY")
      throw new Error("event-loop element is not either a direct child of either head or body element");
  }

  firstConnectedCallback() {
    this.active = false;
    this.timer = 0;
    const mo = new MutationObserver(mr => {
      if (this.active || !mr[0].addedNodes.length)
        return;
      this.active = true;
      this.findNextTask();
    });
    mo.observe(this, {childList: true});
  }

  convertArguments(timeoutElement) {
    let args = [...timeoutElement.children].map(child => {
      let textContent = child.textContent;
      let dataType = child.tagName;
      //3. process <str, <json, <int, <boolean, <float, <el>
      if (dataType === 'TASK') {
        textContent = child.getAttribute(':res');
        dataType = child.getAttribute(':res-type');
        if (!dataType) return console.warn(":res attribute specified without :res-type attribute in ", child)
      }
      if (dataType === 'STR')
        return textContent;
      if (dataType === 'JSON')
        return JSON.parse(textContent);
      if (dataType === 'INT')
        return Number.parseInt(textContent);
      if (dataType === 'BOOLEAN')
        return JSON.parse(textContent);
      if (dataType === 'FLOAT')
        return Number.parseFloat(textContent);
      if (dataType === 'undefined')
        console.error("undefined result at ", timeoutElement, "check ",
          timeoutElement.firstElementChild.getAttribute(":cb"), "() returned value")
    });
    return args;
  }

  interpretTask(timeoutElement) {
    super.connectedCallback();
    let cb;
    if (timeoutElement.getAttribute(":cb"))
      cb = window[timeoutElement.getAttribute(":cb")];
    const args = this.convertArguments(timeoutElement);
    if (!cb) return;
    let res = cb.call(null, args);
    if (!res) return timeoutElement.getAttribute(":res");
    timeoutElement.setAttribute(":res-type", timeoutElement.lastElementChild.tagName);
    return res;
  }

  finishTask(currentTask, data) {
    if (!data)
      currentTask.setAttribute(":res-type", undefined);
    currentTask.setAttribute(":res", data);
    currentTask.setAttribute(":finished", Date.now());
    return this.findNextTask();
  }

  findNextTask() {
    const eventLoop = document.querySelector("event-loop");
    const waitingEvent = document.querySelector('event-loop > event:not([\\:started]');
    if (waitingEvent) {
      this.runTask(waitingEvent);
    }
    let nonResolvedTask = [...document.querySelectorAll('task:not([\\:started]')].filter(task =>
      !task.hasAttribute(":started") && !task.children.length ||
      !![...task?.children].filter(
        c => !c.hasAttribute(":started") && c.getAttribute(":start") < eventLoop.getAttribute(
          ":now")).length).pop();
    if (!nonResolvedTask)
      return this.active = false;
    const timeToWait = (parseInt(nonResolvedTask.getAttribute(':start')) || 0) - new Date().getTime();
    if (timeToWait <= 0) {
      this.runTask(nonResolvedTask);
    } else {
      this.timer = setTimeoutOG(() => this.findNextTask(), timeToWait);
      this.active = false;
    }
  }


  runTask(unresolvedTask) {
    this.active = true;
    if (this.timer)
      clearTimeout(this.timer);
    this.timer = 0;
    if (unresolvedTask?.tagName === "EVENT") {
      const target = document.querySelector(`[\\:uid='${unresolvedTask.getAttribute(":target")}']`);
      if (!target)
        throw new Error("there are no :target attribute on event element " + unresolvedTask.uid)
      unresolvedTask.setAttribute(":started", Date.now());
      propagateEvent.call(target, unresolvedTask);
      runCallback(unresolvedTask);  //the same as non nested <task> //todo: rename to runCallback
      unresolvedTask.setAttribute(":finished", Date.now());
    } else {
      unresolvedTask.setAttribute(":started", Date.now());
      let res = unresolvedTask.children?.length ? this.interpretTask(unresolvedTask) : runCallback(unresolvedTask);

      //todo: set undefined res-type if res === undefined

      typeof res?.then === 'function' ? res.then(data => {
        this.finishTask(unresolvedTask, data)
      }) : this.finishTask(unresolvedTask, res);
      let isAsync = !unresolvedTask.getAttribute(":res");
      let startedTimestamp = unresolvedTask.getAttribute(":started");
      // if it has :started, but no :res, then it is :async-started.
      if (isAsync && startedTimestamp) {
        unresolvedTask.setAttribute(":async-started", startedTimestamp)
      }
      // if it has :res, then it is :finished :async-finished.
      if (isAsync)
        unresolvedTask.setAttribute(":async-finished", Date.now()); //todo: Date.now() ??
    }
  }
}

customElements.define('event-loop', EventLoop);

function convertElementToEvent(el) {
  if (el.original)
    return el.original;
  const e = new Event(el.getAttribute(':type'));
  // e.timeStamp = el.getAttribute(':created');
  e.x = el.getAttribute(':x');
  e.y = el.getAttribute(':y');
  el.hasAttribute(':default-prevented') && e.preventDefault();
  return e;
}

function makeEventElement(target, e) {
  const el = document.createElement('event');
  const targetId = target.getAttribute(":uid");
  if (!targetId)
    throw new Error("No :uid attribute on target element" + e.target);
  // target = document.querySelector(`[\\:uid="${targetId}"]`)
  const rootNode = target.getRootNode({composed: false});
  rootNode && (rootNode.uid = rootNode.body?.getAttribute(":uid"));
  el.original = e;
  el.cb = e.cb;
  if (!e.cb)
    throw new Error(
      name ? "Unable to add local function " + name + " to " + el : "Unable to add an anonymous function to " + el)
  el.setAttribute(":created", Date.now());
  el.setAttribute(':type', e.type);
  el.setAttribute(':target', targetId);
  el.setAttribute(':root', rootNode instanceof Node ? rootNode.uid : rootNode);
  if (e.pointerType === "mouse") {
    el.setAttribute(':x', e.x);
    el.setAttribute(':y', e.y);
  }
  return el;
}

function makeTaskElement(cb, ms = 0) {   //todo: +1
  const el = document.createElement('task');      //todo: +1
  el.setAttribute(":created", Date.now());    //todo: step 1
  el.setAttribute(":delay", ms);
  el.setAttribute(":start", Date.now() + ms);  //todo: +1
  const name = cb.name;
  if (window[name]) {
    el.cb = cb;
    return el;
  } else
    throw new Error(
      name ? "Unable to add local function " + name + " to " + el : "Unable to add an anonymous function to " + el)

}

const setTimeoutOG = window.setTimeout;
window.setTimeout = function setTimeout(cb, ms) {
  const timeoutElement = makeTaskElement(cb, ms);                                   //todo: +1
  timeoutElement && document.querySelector("event-loop").prepend(timeoutElement);
};

const dispatchEventOG = EventTarget.prototype.dispatchEvent;
Object.defineProperty(EventTarget.prototype, 'dispatchEvent', {
  value: function (e) {
    const eventElement = makeEventElement(this, e);
    document.querySelector("event-loop").prepend(eventElement);

  }
});


