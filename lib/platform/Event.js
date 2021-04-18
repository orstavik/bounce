import {composedPath, SubsequentSiblingContexts} from "./BouncedPath.js";

Object.defineProperty(Event, "FINISHED", {value: 4, writable: false, configurable: false, enumerable: true});
Object.defineProperty(Event.prototype, "FINISHED", {value: 4, writable: false, configurable: false, enumerable: true});

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

function preventContext(context) {
  if (context.prevented) return;
  context.prevented = true;
  for (let child of context.contexts)
    preventContext(child);
}

export  function setEventComposedPath (e, root) {
  Object.defineProperty(e, 'composedPath', {get: composedPath.bind(null, this, root)});   //todo unsure of the configurable and writable here
}

export function setEventPhase(e, phase) {
  Object.defineProperty(e, 'eventPhase', {value: phase, configurable: true});
}

export function setEventTarget(e, target) {
  Object.defineProperty(e, 'currentTarget', {value: target, configurable: true});
}

export function setEventContext(e, context) {
  Object.defineProperty(e, 'preventDefault', {
    value: function () {
      preventContext(context)
      for (let child of SubsequentSiblingContexts(context))
        preventContext(child);
    }, writable: true
  });
  Object.defineProperty(e, 'preventDefaultOnHost', {
    value: function (hostNode) {
      const hostIndex = context.path.indexOf(hostNode);
      if (hostIndex === -1 || !(hostNode instanceof Element))
        throw new Error('preventDefaultOnHost(hostNode) must be called on Elements in the current path of the event.')
      const childContext = context.contexts[hostIndex];
      childContext && preventContext(childContext);
    }, writable: true
  });
  Object.defineProperty(e, 'defaultPrevented', {
    get: function () {
      return context.prevented;
    }, configurable: true
  });
  Object.defineProperty(e, 'stopPropagation', {
    value: function () {
      context.stop = true;
    }, writable: true
  });
  Object.defineProperty(e, 'stopImmediatePropagation', {
    value: function () {
      context.stopImme = true;
    }, writable: true
  });
  Object.defineProperty(e, 'path', {    //todo why not define these properties as values? Why would that be a problem?
    get: function () {
      return context.path;
    }, configurable: true
  });
  Object.defineProperty(e, 'target', {
    get: function () {
      return context.path[0];
    }, configurable: true
  });
}