Object.defineProperty(Event, 'FINISHED', {value: 4, writable: false, enumerable: true, configurable: false});

window.ElementEvent = class ElementEvent extends Event {
  #el;

  constructor(el) {
    super(el.getAttribute(':type'), {        //todo do we need to do this? can we not just get all the properties from the element?
      composed: el.getAttribute(":composed"),//todo do we need to do this? can we not just get all the properties from the element?
      bubbles: el.getAttribute(":bubbles"),  //todo do we need to do this? can we not just get all the properties from the element?
    });
    this.x = el.getAttribute(':x');   //todo do we need to do this? can we not just get all the properties from the element?
    this.y = el.getAttribute(':y');    //todo do we need to do this? can we not just get all the properties from the element?
    this.#el = el;
  }

  get timeStamp() {
    return this.#el.getAttribute(':started');
  }

  composedPath() {
    return this.#el.composedPath.slice();
  }

  get path() {
    return this.#el.context.path.slice();
  }

  get target() {
    return this.#el.context.path[0];
  }

  get currentTarget() {
    return this.#el.currentTarget;
  }

  get eventPhase() {
    if (this.#el.hasAttribute(':finished'))
      return Event.FINISHED;
    if (this.currentTarget === this.target)
      return Event.AT_TARGET;
    return Event.BUBBLING_PHASE;
  }

  stopPropagation() {
    throw new Error('omg')
  }

  stopImmediatePropagation() {
    throw new Error('omg')
  }

  get defaultPrevented() {
    return this.#el.hasAttribute(':default-prevented');
  }

  preventDefault() {
    this.defaultPrevented() || this.#el.setAttribute(':default-prevented');
  }
}