  class EventListenerRegistry {
  constructor() {
    this.map = {};
    this.listsWithRemoved = [];
  }

  //adds the event listener function to the registry, if the function is not already added for that target and type.
  //returns true when this is the first registered entry for this type and target.
  add(target, type, listener) {
    const listenersPerNode = this.map[type] || (this.map[type] = new WeakMap());
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
    return listeners.every(f => !f);
  }

  get(target, type) {
    return this.map[type]?.get(target);
  }

  cleanup() {
    for (let listeners; listeners = this.listsWithRemoved.pop();) {
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