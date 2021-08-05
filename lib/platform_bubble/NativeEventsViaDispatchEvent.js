//Reroute native events via target.dispatchEvent(..)

//Problem 1: native focus events are composed: true, but sometimes do not propagate all the way to the window.
// for custom dispatchEvent functions, that handle a root argument, this can be handled quite easily.
// but for the native dispatchEvent, this will break focus events limitation, and make them propagate all the way to the window.

//Problem/benefit 2: the dispatchEvent is running all event listeners sync. Not having native events run async is a positive thing.

//todo make an api so that the native event types can be specified from the outside, not hardcoded in the map.
const map = {
  "pointerdown": new WeakMap(),
  "pointerup": new WeakMap(),
  "pointermove": new WeakMap(),
};

function rerouteNativeEventsToDispatchEvent(e) {
  stopImmediatePropagationOG.call(e);
  let composedPath = composedPathOG.call(e);
  if (composedPath[0] === window) composedPath = [window];
  else if (composedPath[composedPath.length - 1] === window) composedPath.pop();
  composedPath[0].dispatchEvent(e, composedPath[composedPath.length - 1], composedPath);
}

const addEventListenerOG = EventTarget.prototype.addEventListener;
const removeEventListenerOG = EventTarget.prototype.removeEventListener;
const stopImmediatePropagationOG = Event.prototype.stopImmediatePropagation;
const composedPathOG = Event.prototype.composedPath;

Object.defineProperties(EventTarget.prototype, {
  addEventListener: {
    value: function (type, listener) {
      const typeMap = map[type];
      if (!typeMap)
        return;
      let list = typeMap.get(this);
      if (list) {
        if (list.indexOf(listener) === -1)
          list.push(listener);
      } else {
        map.set(this, [listener]);
        addEventListenerOG.call(this, type, rerouteNativeEventsToDispatchEvent);
      }
    }
  },
  removeEventListener: {
    value: function (type, listener) {
      const typeMap = map[type];
      if (!typeMap)
        return;
      let list = typeMap.get(this);
      if (!list)
        return;
      list.splice(list.indexOf(listener), 1);
      if (list.length > 0)
        return;
      typeMap.delete(this);
      removeEventListenerOG.call(this, type, rerouteNativeEventsToDispatchEvent);
    }
  }
});

Object.defineProperty(HTMLElement.prototype, "click", {
  value: function () {
    this.dispatchEvent(new MouseEvent("click"));
  }
});