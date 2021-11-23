//todo can we inject this instead of the EventTarget??

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
//
// window.CustomAttribute = class CustomAttribute extends Attr {
//   #listeners = {};
//
//   upgrade(setCustomValue, addEventListener, removeEventListener, hasEventListener) {
//     //todo, should we pass in addEventListener and removeEventListener and hasEventListener here too??
//     //todo, that would make the methods very safe from interference. That way we could 100% trust that they are protected.
//   }
//
//   addEventListener(type, listener) {
//     let listeners = this.#listeners[type];
//     if (!listeners)
//       this.#listeners[type] = [listener];
//     else if (listeners.indexOf(listener) < 0)
//       listeners.push(listener);
//   }
//
//   hasEventListener(type, listener) {
//     return this.#listeners[type]?.indexOf(listener) ?? -1;
//   }
//
//   removeEventListener(type, listener) {
//     const index = hasEventListener(type, listener);
//     index >= 0 && listeners.splice(index, 1);
//   }
//
//   getEventListeners(type) {
//     return this.#listeners[type];
//   }
// }
//
// //todo we need to lock the getEventListeners, that is only for the eventLoop. Will that work with the private this.#listeners?
// // And we need to lock the add/has/removeEventListener(..) and pass those into the constructor only.