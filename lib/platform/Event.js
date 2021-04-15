import {bounceSequence, composedPath, userAndUsedContextIndicies} from "./BouncedPath.js";
import {getNativeDefaultAction} from "./getNativeDefaultAction.js";

export const EventOG = Object.freeze({
  composedPath: Event.prototype.composedPath,
  stopPropagation: Event.prototype.stopPropagation,
  stopImmediatePropagation: Event.prototype.stopImmediatePropagation,
  preventDefault: Event.prototype.preventDefault
});

//WhatIs: stopPropagation and preventDefault *before* event dispatch?
//a. To call .preventDefault() *before* dispatch essentially strips any default action from the event before it beings. Valid.
//b. To call .stopPropagation() *before* dispatch means that the event will only propagate one context, one phase, one target.
//c. To call .stopImmediatePropagation() *before* dispatch means that the event will not propagate, if some other part of the system tries to dispatch it.
//   todo problems here.

const cache = new WeakMap();

export function getPropagationRoot(target, event) {
  if (target === window) return window;
  const root = target.getRootNode(event);
  return root === document ? window : root;
}

export function setPaths(e, target) {
  const eventState = getEventState(e);
  const root = eventState.root || getPropagationRoot(target, e);
  eventState.composedPath = composedPath(target, root);
  eventState.contexts = bounceSequence(target instanceof Element ? target.shadowRoot : target, root);
  return eventState;
}

function getEventState(e) {
  let state = cache.get(e);
  if (!state)
    cache.set(e, state = {
      doc: 0,
      phase: 0,
      target: 0,
      listener: 0,
      stopImmediate: [],
      stop: [],
      prevented: [],
    });
  return state;
}

function activePropagationContext(state) {
  return state.phase > 0 && state.phase < 4 && state.contexts[state.doc];
}

// rule #4: 'stopPropagation' and 'stopImmediatePropagation' works only per propagationContext/document.
// rule #5: eventPhase === 0 Event.NONE means not yet begun, eventPhase === 4 Event.FINISHED === 4

Object.defineProperty(Event, "FINISHED", {value: 4, writable: false, configurable: false, enumerable: true});

//the innerMost, nearest target, lowestWins default action
//native default actions run only from the following contexts!
//1. the innerMost target context. The shadowRoot of for example a <button> or <input> element
//   This means that all the ancestor host contexts can be skipped.
//2. the native slotted contexts.
//   This means that all custom element slotted contexts can be skipped.
//3. Native elements only have PREVENTABLE or PREVENTABLE_SOFT default actions for a select match of elements.
//   this means that many native propagation contexts can be skipped when event + host element doesn't match up.
//4. Finally, when all the above match, you have found the native default action that should be invoked.
//   If this context is prevented, then call the native preventDefault(). If not, just return
//   (and choose NOT to call the native default action).
export function getDefaultActionNative(event) {
  const state = getEventState(event);
  const contexts = state.contexts;
  for (let i = 0; i < contexts.length; i++) {
    //1. skip nested host contexts and jump straight to last host context (innerMost) (and slot contexts)
    if (i < contexts.length - 1 && !contexts[i + 1].slot) continue;
    let context = contexts[i];
    //2. skip non-native contexts
    if (context.root.host.tagName.indexOf('-') > 0) continue;
    const nativeDefaultAction = getNativeDefaultAction(context.root.host, event);
    //3. skip native contexts that don't have a default action for this type of event
    if (!nativeDefaultAction) continue;
    //4. found the native default action, return it and its prevented status
    const prevented = state.prevented[i];
    return {nativeDefaultAction, prevented};
  }
  return {};
}

Object.defineProperties(Event.prototype, {
//this adds properties to the Event so that we can get the correct state information from it.
  'eventPhase': {    //rule #x: adding phase 4 for event finished propagating.
    get: function () {
      return getEventState(this).phase;
    }
  },
  'currentTarget': {
    get: function () {
      const state = getEventState(this);
      return activePropagationContext(state)?.path[state.target] || null;
    }
  },
  'path': {
    get: function () {
      const state = getEventState(this);
      return activePropagationContext(state)?.path.slice() || [];
    }
  },
  'currentDocument': {
    get: function () {
      const state = getEventState(this);
      return activePropagationContext(state)?.root || null;
    }
  },
  'bouncedPath': {
    value: function () { //returns a copy of the bouncedPath (preserving the original bouncedPath immutable).
      const state = getEventState(this);
      return state.contexts?.map(({parent, root, path}) => ({parent, root, path: path.slice()})) || [];
    }
  },
  //bubbles, composed: NO need to override, always static
  'composedPath': {
    value: function () {
      const state = getEventState(this);
      return EventOG.composedPath.call(this) || state?.composedPath || []; //todo this should be never call EventOG.composedPath??
    }
  },
  'stopPropagation': {
    value: function () {
      const state = getEventState(this);
      state.stop[state.doc] = true;
    }
  },
  'stopImmediatePropagation': {
    value: function () {
      const state = getEventState(this);
      state.stopImmediate[state.doc] = true;
    }
  },
  'preventDefault': {
    value: function () {
      const state = getEventState(this);
      for (let i of userAndUsedContextIndicies(state.contexts, state.doc))
        state.prevented[i] = true;
    }
  },
  'defaultPrevented': {
    get: function () {
      const state = getEventState(this);
      return state.prevented[state.doc];
    }
  },
  //todo we should maybe not implement support for preventDefault. However, the useR context control of individual default actions are more relevant.
  //todo here, we could implement a prevent=once or prevent attribute instead.. I feel this is better. Give the DOM control of the default actions, and then control the defaultAction from js by setting such an attribute.
  'preventDefaultOnHost': {
    value: function (element) {
      if (!(element instanceof Element))
        throw new Error('IllegalArgument: preventDefaultInside(element) can only be called on Element objects.');
      const state = getEventState(this);
      const shadowIndex = state.contexts.findIndex(({root}) => root === element.shadowRoot);
      if (shadowIndex === -1)
        throw new Error('IllegalArgument: The given Element is not in the composed path of this event.');
      state.prevented[shadowIndex] = true;
    }
  }
});

//todo move the properties above into this monkey patch?
(function (nativeEvent) {
  const Event = function Event(type, dict) {
    const event = nativeEvent(type, dict);
    if (dict instanceof Object && dict.composed instanceof DocumentFragment || dict.composed === window)
      getEventState(event).root = dict.composed;
    return event;
  };
  Event.prototype = nativeEvent;
  window.Event = Event;
})(Event);