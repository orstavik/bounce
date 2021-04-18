import {SubsequentSiblingContexts} from "./BouncedPath.js";

Object.defineProperty(Event, "FINISHED", {value: 4, writable: false, configurable: false, enumerable: true});
Object.defineProperty(Event.prototype, "FINISHED", {value: 4, writable: false, configurable: false, enumerable: true});

function preventContext(context) {
  if (context.prevented) return;
  context.prevented = true;
  for (let child of context.contexts)
    preventContext(child);
}

const cache = new WeakMap();
const stopBeforeDispatch = new WeakSet();
const preventedBeforeDispatch = new WeakSet();

function path() {
  return cache.get(this)?.context.path.slice() || [];
}

function composedPath() {
  return cache.get(this)?.composedPath.slice() || [];
}

function eventPhase() {
  return cache.get(this)?.eventPhase || Event.NONE;
}

function target() {
  return cache.get(this)?.context.path[0] || null;
}

function currentTarget() {
  return cache.get(this)?.currentTarget || null;
}

function stopPropagation() {
  const state = cache.get(this);
  if (!state)
    return stopBeforeDispatch.add(this), undefined;
  state.context.stop = true;
}

function stopImmediatePropagation() {
  const state = cache.get(this);
  if (!state)
    return stopBeforeDispatch.add(this), undefined;
  state.context.stopImme = true;
}

function defaultPrevented() {
  return cache.get(this)?.context.prevented || false;
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
  const state = cache.get(this);
  if (!state)
    return preventedBeforeDispatch.add(this), undefined;
  preventContext(state.context)
  for (let child of SubsequentSiblingContexts(state.context))
    preventContext(child);
}

function preventDefaultOnHost(hostNode) {
  const state = cache.get(this);
  if (!state)
    throw new Error('preventDefaultOnHost(hostNode) can only be called during propagation.')
  const hostIndex = state.context.path.indexOf(hostNode);
  if (!(hostNode instanceof Element) || hostIndex === -1)
    throw new Error('preventDefaultOnHost(hostNode) must be called on Elements in the current path of the event.')
  const childContext = state.context.contexts[hostIndex];
  childContext && preventContext(childContext);
}

export const preventDefaultOG = Event.prototype.preventDefault;
export const stopImmediatePropagationOG = Event.prototype.stopImmediatePropagation;
Object.defineProperties(Event.prototype, {
  path: {get: path},                      //todo unsure of the configurable and writable here
  target: {get: target},
  currentTarget: {get: currentTarget},
  eventPhase: {get: eventPhase},
  composedPath: {get: composedPath},
  stopPropagation: {value: stopPropagation},
  stopImmediatePropagation: {value: stopImmediatePropagation},
  defaultPrevented: {get: defaultPrevented},
  preventDefault: {value: preventDefault},
  preventDefaultOnHost: {get: preventDefaultOnHost},
});

export function initEvent(e, composedPath) {
  cache.set(e, {composedPath});
}

export function updateEvent(e, key, value) {
  cache.get(e)[key] = value;
}