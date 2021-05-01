import {contextForElement} from "./BouncedPath.js";
import {findNativeDefaultAction} from "./getNativeDefaultAction.js";

let cpog = Event.prototype.composedPath;
export const composedPathOG = Event.prototype.composedPath;
export const preventDefaultOG = Event.prototype.preventDefault;
export const stopImmediatePropagationOG = Event.prototype.stopImmediatePropagation;

export function preventContext(context) {
  if (context.prevented) return;
  context.prevented = true;
  for (let i = 0; i < context.contextChildren.length; i++)
    context.contextChildren[i] && preventContext(context.contextChildren[i]);
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
  const state = eventToState.get(this);
  if (!state)
    return preventedBeforeDispatch.has(this);
  for (let c = state.context; c; c = c.parent)
    if (c.prevented !== undefined) return c.prevented;
  return false;
}

//.preventDefault() rules:
// 1. defaultPrevented inherits from parent to child context. Thus, when you ask if an event is .defaultPrevented, then you read upwards to find the first context that *specifies* defaultPrevented.
// 2. The generic preventDefault()/enableDefault() sets defaultPrevented = true/false on the current context AND all its ancestor contexts. It goes up.
// 3. The needlepoint preventDefaultOnHost(element)/enableDefaultOnHost(element) sets defaultPrevented ONLY on the shadowRoot context of the specified element. These two functions can only be called DURING propagation of that context.

//.preventDefault() needs to apply to:
//1. children contexts. If you have a document with an <a href>,
//   then .preventDefault() and .preventDefaultOnHost(aHref) is the means to turn that elements default actions off.
//2. If a default action runs inside an element, then
//   that element needs to notify any slotting contexts that it has already run a default action.
//   This is why preventDefault() needs to run up. It needs to alert subsequent slotting propagation contexts that it
//   has filled the space.
//3. If a document wishes to run a default action even when preventDefault() has been called, it can do so either by
//   enabling preventDefault everywhere, or just for the shadowDom context of one of its lightDom elements.

//    Example: <a href><input type=checkbox></a>
//    Thus, the calling of preventDefault() inside the <input type=checkbox> shadowRoot, will cause defaultPrevented to be true in
//    in the <a href> shadowRoot context.

function setPrevented(event, val) {
  const state = eventToState.get(event);
  if (!state)
    return val ? preventedBeforeDispatch.add(event) : preventedBeforeDispatch.delete(event);
  for (let c = state.context; c; c = c.parent)
    c.prevented = val;
}

function preventDefault() {
  setPrevented(this, true);
}

function enableDefault() {
  setPrevented(this, false);
}

function getContextForElement(event, hostNode) {
  const state = eventToState.get(event);
  if (!state) return;
  const index = state.context.path.indexOf(hostNode);
  if (index === -1) return;
  return state.context.contextChildren[index];
}

function preventDefaultOnHost(hostNode) {
  const childContext = getContextForElement(this, hostNode);
  if (!childContext)
    throw new Error('IllegalArgument: "hostNode" must be an element in the current path of the event during propagation.')
  childContext.prevented = true;
}

function enableDefaultOnHost(hostNode) {
  const childContext = getContextForElement(this, hostNode);
  if (!childContext)
    throw new Error('IllegalArgument: "hostNode" must be an element in the current path of the event during propagation.')
  childContext.prevented = false;
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
  enableDefault: {value: enableDefault},
  preventDefaultOnHost: {get: preventDefaultOnHost},
  enableDefaultOnHost: {get: enableDefaultOnHost},
});

//todo there is a huge problem with defaultPrevented being mutable. We need to make it immutable. Somehow. Don't know how yet.

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

export function cleanupEvent(e, topMostContext) {
  if (nativeEvent.has(e)) {
    nativeEvent.delete(e);
    const path = cpog.call(e);
    const {target} = findNativeDefaultAction(path, e);
    if (target) {
      const context = contextForElement(eventToState.get(e).context, target);
      context?.prevented && preventDefaultOG.call(e);
    }
  }
  topMostContext.prevented ? preventedBeforeDispatch.set(e) : preventedBeforeDispatch.delete(e);
  stopBeforeDispatch.delete(e);
  eventToState.delete(e);
}