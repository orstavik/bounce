(function exposingEventListenersList(EventTarget) {

  const map = {};
  const listsWithRemoved = new Set();

  function cleanup() {
    for (let listeners of listsWithRemoved) {
      listsWithRemoved.delete(listeners);
      for (let i = 0; i < listeners.length; i++)
        !listeners[i] && listeners.splice(i--, 1);
    }
  }

  function getEventListeners(target, type) {
    return map[type]?.get(target);
  }

  const addEventListenerOG = EventTarget.prototype.addEventListener;
  class EventTargetExposed {
    addEventListener(type, listener){
      addEventListenerOG.call(this, type, listener);
      const listenersPerNode = map[type] ??= new WeakMap();
      let listeners = listenersPerNode.get(this);
      if (!listeners)
        return listenersPerNode.set(this, [listener]);
      if (listeners.indexOf(listener) >= 0)
        return false;
      listeners.push(listener);
    }
  }
  class EventListenerRegistry {

    //adds the event listener function to the registry, if the function is not already added for that target and type.
    //returns true when this is the first registered entry for this type and target.
    static add(target, type, listener) {
      const listenersPerNode = map[type] ??= new WeakMap();
      let listeners = listenersPerNode.get(target);
      if (!listeners)
        return !!listenersPerNode.set(target, [listener]);
      if (listeners.indexOf(listener) >= 0)
        return false;
      listeners.push(listener);
    }

    static remove(target, type, listener) {
      const listeners = map[type]?.get(target);
      if (!listeners)
        return false;
      const index = listeners.indexOf(listener);
      if (index === -1)
        return false;
      listeners[index] = undefined;
      listsWithRemoved.add(listeners);
    }
  }

  // MonkeyPatch.monkeyPatch(EventTarget.prototype, 'addEventListener', function addEventListener(og, type, listener) {
  //   og.call(this, type, listener);
  //   EventListenerRegistry.add(this, type, listener);
  // });
  Object.defineProperty(EventTarget.prototype, "addEventListener", {value: EventTargetExposed.prototype.addEventListener, writable: true, enumerable:true, configurable: true});
  MonkeyPatch.monkeyPatch(EventTarget.prototype, "removeEventListener", function removeEventListener(og, type, listener) {
    og.call(this, type, listener);
    EventListenerRegistry.remove(this, type, listener);
  });
  Object.defineProperty(EventTarget.prototype, 'getEventListeners', {
    value: function (type) {
      return getEventListeners(this, type);
    },
    writable: true,
    configurable: true,
    enumerable: true
  });
  Object.defineProperty(EventTarget, 'cleanup', {
    value: cleanup,
    writable: true,
    configurable: true,
    enumerable: true
  });
})(EventTarget);