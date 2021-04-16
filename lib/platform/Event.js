import {bounceSequence, composedPath as composedPathSequence, userAndUsedContextIndicies} from "./BouncedPath.js";
import {getNativeDefaultAction} from "./getNativeDefaultAction.js";

Object.defineProperty(Event, "FINISHED", {value: 4, writable: false, configurable: false, enumerable: true});
Object.defineProperty(Event.prototype, "FINISHED", {value: 4, writable: false, configurable: false, enumerable: true});

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

export function getPropagationRoot(target, event) {
  if (target === window) return window;
  const root = target.getRootNode(event);
  return root === document ? window : root;
}

function getCurrentTarget(phase, path, targetIndex) {
  if (phase === 1 && targetIndex < path.length - 1)
    return path[path.length - targetIndex - 1];
  if (phase === 2 && targetIndex === 0)
    return path[0];
  if (phase === 3 && targetIndex < path.length - 1)
    return path[targetIndex + 1];
}

const cache = new WeakMap();

function setPaths(e, target) {
  const eventState = getEventState(e);
  const root = eventState.root || getPropagationRoot(target, e);
  eventState.composedPath = composedPath(target, root);
  eventState.contexts = bounceSequence(target instanceof Element ? target.shadowRoot : target, root);
  return eventState;
}

function getEventState(e) {
  let state = cache.get(e);
  if (!state)
    cache.set(e, state = {stopImmediate: [], stop: [], prevented: [], root: null});
  return state;
}

// rule #4: 'stopPropagation' and 'stopImmediatePropagation' works only per propagationContext/document.
// rule #5: eventPhase === 0 Event.NONE means not yet begun, eventPhase === 4 Event.FINISHED === 4

Object.defineProperties(Event.prototype, {
//this adds properties to the Event so that we can get the correct state information from it.
  'eventPhase': {    //rule #x: adding phase 4 for event finished propagating.
    get: function () {
      return this.ititit?.phase || 0;
    }
  },
  'currentTarget': {
    get: function () {
      return this.ititit?.currentTarget || null;
    }
  },
  'path': {
    get: function () {
      return this.ititit?.path || [];
    }
  },
  'target': {
    get: function () {
      return this.ititit?.target || null;
    }
  },
  'currentDocument': {
    get: function () {
      return this.ititit?.currentRoot || null;
    }
  },
  'bouncedPath': {
    value: function () { //returns a copy of the bouncedPath (preserving the original bouncedPath immutable).
      return this.ititit?.contexts.map(({parent, root, path}) => ({parent, root, path: path.slice()})) || [];
      // const state = getEventState(this);
      // return state.contexts?.map(({parent, root, path}) => ({parent, root, path: path.slice()})) || [];
    }
  },
  //bubbles, composed: NO need to override, always static
  'composedPath': {
    value: function () {
      debugger
      return this.ititit?.composedPath.slice() || [];
      // const state = getEventState(this);
      // return EventOG.composedPath.call(this) || state?.composedPath || []; //todo this should be never call EventOG.composedPath??
    }
  },
  'stopPropagation': {
    value: function () {
      this.eventPhase > 0 ? this.ititit.stop(1) : !this.stoppedBeforePropagation && (this.stoppedBeforePropagation = 2);
    }
  },
  'stopImmediatePropagation': {
    value: function () {
      this.eventPhase > 0 ? this.ititit.stop(2) : this.stoppedBeforePropagation = 2;
    }
  },
  'preventDefault': {
    value: function () {
      const state = getEventState(this);
      const stateDoc = this.ititit?.currentContextIndex || 0;
      for (let i of userAndUsedContextIndicies(state.contexts, stateDoc))
        // for (let i of userAndUsedContextIndicies(state.contexts, state.doc))
        state.prevented[i] = true;
    }
  },
  'defaultPrevented': {
    get: function () {
      const stateDoc = this.ititit?.currentContextIndex || 0;
      const state = getEventState(this);
      return state.prevented[stateDoc];
      // return state.prevented[state.doc];
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
  },
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
  'getNativeDefaultAction': {
    value: function (event) {
      const state = getEventState(event);
      const contexts = state.contexts;
      for (let i = 0; i < contexts.length; i++) {
        //1. skip nested host contexts and jump straight to last host context (innerMost) (and slot contexts)
        if (i < contexts.length - 1 && !contexts[i + 1].slot) continue;
        const target = contexts[i].root.host;
        //2. skip non-native contexts
        if (target.tagName.indexOf('-') > 0) continue;
        const nativeDefaultAction = getNativeDefaultAction(target, event);
        //3. skip native contexts that don't have a default action for this type of event
        if (!nativeDefaultAction) continue;
        //4. found the native default action, return it and its prevented status
        const prevented = state.prevented[i];
        return {target, nativeDefaultAction, prevented};
      }
      return {};
    }
  }
});

const EventConstructorOG = window.Event;
window.Event = function Event(...args) {
  if (!new.target)
    throw new TypeError("Failed to construct 'Event': Please use the 'new' operator, this DOM object constructor cannot be called as a function.");
  const event = Reflect.construct(EventConstructorOG, args, EventConstructorOG);
  const dict = args[1];
  if (dict instanceof Object && dict.composed instanceof DocumentFragment || dict.composed === window)
    getEventState(event).root = dict.composed;
  return event;
};

export function isStopped(e) {
  const eventDoc = e.ititit?.currentContextIndex || 0;
  const event = getEventState(e);
  return event.stopImmediate[eventDoc] ? 2 : event.stop[eventDoc] ? 1 : 0;
}

export function targetPhaseIterator(e, lowestTarget) {
  //todo pass in a context object here instead.
  const eventState = getEventState(e);
  const root = eventState.root || getPropagationRoot(lowestTarget, e);
  const composedPath = composedPathSequence(lowestTarget, root);
  const contexts = bounceSequence(lowestTarget, root);
  let currentTarget;
  let target;
  let path;
  let currentContext;
  let currentDocument;
  const stopped = [];

  let contextI = 0;
  let phase = 1;
  let targetI = -1;

  const nextTarget2 = {
    next: function () {
      targetI++;
      for (; contextI < contexts.length; contextI++, phase = 1, targetI = 0) {
        currentContext = contexts[contextI];
        currentDocument = currentContext.root;
        path = currentContext.path;
        target = path[0];
        for (; phase < 4; phase++, targetI = 0) {
          currentTarget = getCurrentTarget(phase, path, targetI);
          if (currentTarget)
            return {value: {currentTarget, phase}, done: false};
        }
      }
      phase = 4, contextI = 0;
      return {done: true};
    },
    get phase() {
      return phase;
    },
    get path() {
      return path;
    },
    get target() {
      return target;
    },
    get currentTarget() {
      return currentTarget;
    },
    get currentRoot() {          //rename to currentContext currentRoot currentPropagationRoot?
      return currentDocument;
    },
    get currentContextIndex() {
      return contextI;
    },
    get composedPath() {
      return composedPath;
    },
    get contexts() {
      return contexts;
    },
    skipContext() {
      contextI++;
    },
    get isStopped() {
      return stopped[contextI];
    },
    stop(val) {
      stopped[contextI] !== 2 && (stopped[contextI] = val);
    }
  };
  e.ititit = nextTarget2;
  return nextTarget2;
}

// // EVENT LOOP
// export function nextListener(mainEvent, getListeners) {
//   const event = getEventState(mainEvent);
//   const contexts = event.contexts;
//   nextContext: for (; event.doc < contexts.length; event.doc++, event.phase = 1, event.target = event.listener = 0) {
//     if (event.stopImmediate[event.doc])
//       continue nextContext;
//     const context = contexts[event.doc];
//     const prevented = event.prevented[event.doc];
//     for (; event.phase < 4; event.phase++, event.target = 0) {
//       for (let target = nextTarget(event.phase, context.path, event.target);
//            target;
//            target = nextTarget(event.phase, context.path, ++event.target)
//       ) {
//         const listeners = getListeners(target, mainEvent.type, event.phase);
//         while (event.listener < listeners.length) {
//           const listener = listeners[event.listener++];
//           if (listener.removed)
//             continue;
//           if (!mainEvent.isTrusted && listener.trustedOnly)                         //filters for isTrusted events
//             continue;
//           if (prevented && listener.preventable > 0)                       //PREVENTABLE_SOFT or PREVENTABLE
//             continue;
//           return listener;
//         }
//         event.listener = 0;
//         if (event.stop[event.doc])
//           continue nextContext;
//       }
//     }
//   }
//   event.phase = 4, event.doc = 0;
// }