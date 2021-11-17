const events = new WeakMap();

window.HTMLEventElement = class HTMLEventElement extends HTMLElement {
  static makeEventElement(targetId, e) {
    const el = document.createElement('event');
    el.setAttribute(':target', targetId);
    el.setAttribute(":created", Date.now());
    el.setAttribute(':type', e.type);
    el.setAttribute(':composed', e.composed);
    el.setAttribute(':bubbles', e.bubbles);
    if (e.pointerType === "mouse") {
      el.setAttribute(':x', e.x);
      el.setAttribute(':y', e.y);
    }
    return el;
  }

  get type() {
    return this.getAttribute(":type");
  }

  get defaultPrevented() {
    return this.getAttribute(":default-prevented");
  }

  get target() {
    return document.querySelector(`[\\:uid='${this.getAttribute(":target")}']`);
  }

  get composed() {
    return this.getAttribute(":composed");
  }

  get event() {
    let event = events.get(this);
    !event && events.set(this, event = new ElementEvent(this));
    return event;
  }

  static dispatchEvent(eventElement, listeners) {
    eventElement.setAttribute(":started", Date.now());
    Object.setPrototypeOf(eventElement, HTMLEventElement.prototype);
    const target = eventElement.target;
    if (!target)
      eventElement.setAttribute(":error", `Can't find target: ${(eventElement.getAttribute(":target"))}`);
    else
      HTMLEventElement.#propagate(eventElement, target, listeners);
    eventElement.setAttribute(":finished", Date.now());
  }

  static #propagate(eventEl, target, listeners) {
    eventEl.composedPath = BouncePath.composedPath(target, eventEl.composed);
    eventEl.topMostContext = BouncePath.make(target, eventEl.composed);
    for (let context of eventEl.topMostContext) {
      if (eventEl.defaultPrevented)                  //on this level, we just want to work with the EventElement.
        break;                                       //todo this doesn't work with mandatory functions, then we would have to complete the iteration.
      eventEl.context = context;
      for (let target of context.path) {
        const list = listeners.get(target, eventEl.type);
        if (list) {

          eventEl.currentTarget = target;
          for (let fun of list) {
            try {
              fun?.call(target, eventEl.event);
            } catch (error) {
              //eventElement.listenerErrors.push(target, fun, error); //todo something like this
            }
          }

        }
      }
    }
  }
}