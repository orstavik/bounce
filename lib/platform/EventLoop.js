export {EventOG} from './Event.js';
import {nextTarget, setPaths} from './Event.js';

function nextInLoop(type, event, contexts, getListeners) {
  nextContext: for (; event.doc < contexts.length; event.doc++, event.phase = 1, event.target = event.listener = 0) {
    if (event.stopImmediate[event.doc])
      continue nextContext;
    const context = contexts[event.doc];
    const prevented = event.prevented[event.doc];
    for (; event.phase < 4; event.phase++, event.target = 0) {
      for (let target = nextTarget(event.phase, context.path, event.target);
           target;
           target = nextTarget(event.phase, context.path, ++event.target)
      ) {
        const listeners = getListeners(target, type, event.phase);
        while (event.listener < listeners.length) {
          const listener = listeners[event.listener++];
          if (listener.removed)
            continue;
          if (prevented && listener.preventable > 0)                       //PREVENTABLE_SOFT or PREVENTABLE
            continue;
          return listener;
        }
        event.listener = 0;
        if (event.stop[event.doc])
          continue nextContext;
      }
    }
  }
  event.phase = 4, event.doc = 0;
}

const eventStack = [];

export function propagate(e, target, getListeners, removeListener) {
  const eventState = setPaths(e, target);
  eventStack.unshift(eventState);
  for (let listener; listener = nextInLoop(e.type, eventState, eventState.contexts, getListeners);) {
    listener.once && removeListener(listener);                                       //once
    listener.preventable === 1 || listener.preventable === -1 && e.preventDefault(); //preventable PREVENTABLE_STRONG or PREVENTABLE
    try {
      listener.cb instanceof Function ? listener.cb.call(listener.target, e) : listener.cb.handleEvent.call(listener.cb.handleEvent, e);
    } catch (err) {
      const error = new ErrorEvent('Uncaught Error', {error: err, message: err.message});
      window.dispatchEvent(error);
      if (!error.defaultPrevented)
        console.error(error);
    }
  }
  if (eventState !== eventStack.shift()) throw 'omg';
  return eventStack.length === 0;
}