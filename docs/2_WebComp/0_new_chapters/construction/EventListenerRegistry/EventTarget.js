(function exposingEventListenersList(EventTarget) {

  const writable = true, enumerable = true, configurable = true;
  const map = {};
  const listsWithRemoved = new Set();

  function cleanup() {
    for (let listeners of listsWithRemoved) {
      listsWithRemoved.delete(listeners);
      for (let i = 0; i < listeners.length; i++)
        !listeners[i] && listeners.splice(i--, 1);
    }
  }

  const addEventListenerOG = EventTarget.prototype.addEventListener;
  const removeEventListenerOG = EventTarget.prototype.removeEventListener;

  class EventTargetExpose {
    addEventListener(type, listener) {
      addEventListenerOG.call(this, type, listener);
      const listenersPerNode = map[type] ??= new WeakMap();
      let listeners = listenersPerNode.get(this);
      if (!listeners)
        return listenersPerNode.set(this, [listener]);
      if (listeners.indexOf(listener) >= 0)
        return false;
      listeners.push(listener);
    }

    removeEventListener(type, listener) {
      removeEventListenerOG.call(this, type, listener);
      const listeners = map[type]?.get(this);
      if (!listeners)
        return false;
      const index = listeners.indexOf(listener);
      if (index === -1)
        return false;
      listeners[index] = undefined;
      listsWithRemoved.add(listeners);
    }

    getEventListeners(type) {
      return map[type]?.get(this);
    }
  }

  function injectInterface(prototype) {
    Object.defineProperties(prototype, {
      addEventListener: {value: EventTargetExpose.prototype.addEventListener, writable, enumerable, configurable},
      removeEventListener: {value: EventTargetExpose.prototype.removeEventListener, writable, enumerable, configurable},
      getEventListeners: {value: EventTargetExpose.prototype.getEventListeners, writable, enumerable, configurable}
    });
  }

  injectInterface(EventTarget.prototype);
  Object.defineProperty(EventTarget, 'cleanup', {value: cleanup, writable, enumerable, configurable});
})(EventTarget);