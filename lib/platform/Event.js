import {contextForElement, SubsequentSiblingContexts} from "./BouncedPath.js";
import {findNativeDefaultAction} from "./getNativeDefaultAction.js";

let cpog = Event.prototype.composedPath;
export const composedPathOG = Event.prototype.composedPath;
export const preventDefaultOG = Event.prototype.preventDefault;
export const stopImmediatePropagationOG = Event.prototype.stopImmediatePropagation;

export function preventContext(context) {
  if (context.prevented) return;
  context.prevented = true;
  for (let child of context.contexts)
    preventContext(child);
}

export const eventToState = new WeakMap();
export const nativeEvent = new WeakSet();
export const stopBeforeDispatch = new WeakSet();
export const preventedBeforeDispatch = new WeakSet();

function timeStamp() {                           //todo adding timeStamp. -1 before and after event was dispatched.
  return eventToState.get(this)?.timeStamp || -1;
}

function composedPath() {
  return eventToState.get(this)?.composedPath.slice() || [];
}

function path() {
  return eventToState.get(this)?.context.path.slice() || [];
}

function eventPhase() {
  return eventToState.get(this)?.eventPhase || Event.NONE;
}

function target() {
  return eventToState.get(this)?.context.path[0] || null;
}

function currentTarget() {
  return eventToState.get(this)?.currentTarget || null;
}

function stopPropagation() {
  const state = eventToState.get(this);
  if (!state)
    return stopBeforeDispatch.add(this), undefined;
  state.context.stop = true;
}

function stopImmediatePropagation() {
  const state = eventToState.get(this);
  if (!state)
    return stopBeforeDispatch.add(this), undefined;
  state.context.stopImme = true;
}

function defaultPrevented() {
  return eventToState.get(this)?.context.prevented || false;
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
function preventDefault() {
  const state = eventToState.get(this);
  if (!state)
    return preventedBeforeDispatch.add(this), undefined;
  preventContext(state.context)
  for (let child of SubsequentSiblingContexts(state.context))
    preventContext(child);
}

function preventDefaultOnHost(hostNode) {
  const state = eventToState.get(this);
  if (!state)
    throw new Error('preventDefaultOnHost(hostNode) can only be called during propagation.')
  const hostIndex = state.context.path.indexOf(hostNode);
  if (!(hostNode instanceof Element) || hostIndex === -1)
    throw new Error('preventDefaultOnHost(hostNode) must be called on Elements in the current path of the event.')
  const childContext = state.context.contexts[hostIndex];
  childContext && preventContext(childContext);
}

Object.defineProperties(Event.prototype, {
  timeStamp: {get: timeStamp},
  composedPath: {value: composedPath},

  path: {get: path},                      //todo unsure of the configurable and writable here
  target: {get: target},
  currentTarget: {get: currentTarget},
  eventPhase: {get: eventPhase},

  stopPropagation: {value: stopPropagation},
  stopImmediatePropagation: {value: stopImmediatePropagation},

  defaultPrevented: {get: defaultPrevented},
  preventDefault: {value: preventDefault},
  preventDefaultOnHost: {get: preventDefaultOnHost},
});

export function preInitState(e) {
  return {stopped: stopBeforeDispatch.has(e), prevented: preventedBeforeDispatch.has(e)};
}

export function initNativeEvent(e) {
  nativeEvent.add(e);
}

export function initEvent(e, composedPath) {
  eventToState.set(e, {composedPath, timeStamp: new Date().getTime()});
}

export function updateEvent(e, key, value) {
  eventToState.get(e)[key] = value;
}

export function cleanupEvent(e) {
  if (nativeEvent.has(e)) {
    nativeEvent.delete(e);
    const path = cpog.call(e);
    const {target} = findNativeDefaultAction(path, e);
    if (target) {
      const context = contextForElement(eventToState.get(e).context, target);
      context?.prevented && preventDefaultOG.call(e);
    }
  }
  preventedBeforeDispatch.delete(e);
  stopBeforeDispatch.delete(e);
  eventToState.delete(e);
}