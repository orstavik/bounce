(function monkeyEventTarget() {
  window.EventListenerRegistry = class EventListenerRegistry {
    //#map todo
    //#listsWithRemoved
    constructor() {
      this.map = {};
      this.listsWithRemoved = [];
    }

    //adds the event listener function to the registry, if the function is not already added for that target and type.
    //returns true when this is the first registered entry for this type and target.
    add(target, type, listener) {
      const listenersPerNode = this.map[type] || (this.map[type] = new WeakMap()); //this.map[type] ??= new WeakMap() todo
      let listeners = listenersPerNode.get(target);
      if (!listeners)
        return !!listenersPerNode.set(target, [listener]);
      if (listeners.indexOf(listener) >= 0)
        return false;
      const empty = listeners.every(f => !f);
      listeners.push(listener);
      return empty;
    }

    remove(target, type, listener) {
      const listeners = this.map[type]?.get(target);
      if (!listeners)
        return false;
      const index = listeners.indexOf(listener);
      if (index === -1)
        return false;
      listeners[index] = undefined;
      this.listsWithRemoved.push(listeners);
      return listeners.every(f => !f);       //todo this is a heavy check.. and also not that important. better wait until the event loop is empty??
    }

    get(target, type) {
      return this.map[type]?.get(target);
    }

    cleanup() {
      for (let listeners; listeners = this.listsWithRemoved.pop();) {      //todo this can be made simpler I think..
        if (this.listsWithRemoved.indexOf(listeners) >= 0)//a list might be added twice, if so we clean it only the last time.
          continue;
        let length = listeners.length;
        for (let i = 0; i < length; i++) {
          if (listeners[i] === undefined)
            length--, listeners.splice(i--, 1);
        }
      }
    }
  }

  const listeners = new EventListenerRegistry();
  MonkeyPatch.monkeyPatch(EventTarget.prototype, 'addEventListener', function addEventListener(og, type, listener) {
    og.call(this, type, listener);
    listeners.add(this, type, listener);
  });
  MonkeyPatch.monkeyPatch(EventTarget.prototype, "removeEventListener", function removeEventListener(og, type, listener) {
    og.call(this, type, listener);
    listeners.remove(this, type, listener);
  });
  Object.defineProperty(EventTarget.prototype, 'getEventListeners', {
    value: function (type) {
      return listeners.get(this, type);
    },
    writable: true,
    configurable: true,
    enumerable: true
  });
  Object.defineProperty(EventTarget, 'cleanup', {
    value: listeners.cleanup.bind(listeners),
    writable: true,
    configurable: true,
    enumerable: true
  });
})();