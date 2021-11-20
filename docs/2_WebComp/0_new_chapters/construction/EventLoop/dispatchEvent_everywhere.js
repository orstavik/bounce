//Reroute native events via target.dispatchEvent(..)

//Problem 1: native focus events are composed: true, but sometimes do not propagate all the way to the window.
// for custom dispatchEvent functions, that handle a root argument, this can be handled quite easily.
// but for the native dispatchEvent, this will break focus events limitation, and make them propagate all the way to the window.

//Note 1: this only works if the native .dispatchEvent is monkeyPatched, because you cannot dispatch the same event while it is still being dispatched.

// Potential: If every event propagates through the dispatchEvent, then we can make them all run either sync or as separate macro tasks.
(function (EventTarget_prototype, stopImmediatePropagation, preventDefault, composedPath) {

  function nativeEventPickMeUpper(e) {
    stopImmediatePropagation.call(e);
    preventDefault.call(e);                       //we might not want to preventDefault action on all native events.
    composedPath.call(e)[0].dispatchEvent(e);
  }

  const funcToWrapper = new WeakMap();

  function getMakeFunctionWrapper(listener) {
    if (!(listener instanceof Function)) return listener;
    const cache = funcToWrapper.get(listener);
    if (cache) return cache;
    const wrapper = nativeEventPickMeUpper.bind({});
    funcToWrapper.set(listener, wrapper);
    return wrapper;
  }

  MonkeyPatch.monkeyPatch(EventTarget_prototype, "addEventListener", function addEventListener(og, type, listener) {
    og.call(this, type, getMakeFunctionWrapper(listener));
  });
  MonkeyPatch.monkeyPatch(EventTarget_prototype, "removeEventListener", function removeEventListener(og, type, listener) {
    og.call(this, type, getMakeFunctionWrapper(listener));
  });
})(
  EventTarget.prototype,
  Event.prototype.stopImmediatePropagation,
  Event.prototype.preventDefault,
  Event.prototype.composedPath
);