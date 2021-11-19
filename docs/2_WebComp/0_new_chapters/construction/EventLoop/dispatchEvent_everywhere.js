//Reroute native events via target.dispatchEvent(..)

//Problem 1: native focus events are composed: true, but sometimes do not propagate all the way to the window.
// for custom dispatchEvent functions, that handle a root argument, this can be handled quite easily.
// but for the native dispatchEvent, this will break focus events limitation, and make them propagate all the way to the window.

//Potential: If every event propagates through the dispatchEvent, then we can make them all run either sync or as separate macro tasks.
(function (HTMLElement_prototype, EventTarget_prototype, stopImmediatePropagation, preventDefault, composedPath) {

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

  Object.defineProperties(EventTarget_prototype, {
    addEventListener: {
      value: function (og, type, listener) {
        og.call(this, type, getMakeFunctionWrapper(listener));
      }
    },
    removeEventListener: {
      value: function (og, type, listener) {
        og.call(this, type, getMakeFunctionWrapper(listener));
      }
    }
  });

  Object.defineProperty(HTMLElement_prototype, "click", {
    value: function () {
      this.dispatchEvent(new MouseEvent("click"));
    }
  });

})(
  HTMLElement.prototype,
  EventTarget.prototype,
  Event.prototype.stopImmediatePropagation,
  Event.prototype.preventDefault,
  Event.prototype.composedPath
);