const events = new WeakMap();

window.HTMLEventElement = class HTMLEventElement extends HTMLElement {
  static makeEventElement(targetId, e) {
    const el = document.createElement('event');
    el.setAttribute(':inner-target', targetId);
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

  get preventDefault() {
    this.hasAttribute(":default-prevented") || this.setAttribute(":default-prevented");
  }

  get innerTarget() {
    return document.querySelector(`[\\:uid='${this.getAttribute(":inner-target")}']`);
  }

  //target and currentTarget should be private.

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
    if (eventElement.innerTarget)
      HTMLEventElement.#propagate(eventElement, eventElement.innerTarget, listeners);
    else
      eventElement.setAttribute(":error", `Can't find target: ${(eventElement.getAttribute(":target"))}`);
    eventElement.setAttribute(":finished", Date.now());
  }

  static targetRoots(target, composed) {
    if (!composed)
      return [{target, root: target.getRootNode(), path: [target]}];
    const hosts = [];
    for (let root; target; target = root.host)
      hosts.unshift({target, root: root = target.getRootNode(), path: [target]});
    return hosts;
  }

  static* dynamo_core(target, composed, depth = 0, pos = 0) {
    const hosts = HTMLEventElement.targetRoots(target, composed);
    for (let i = 0; i < hosts.length; i++) {                           //user document is top down
      let {target, root} = hosts[i];   //todo we need to preserve the actual nodes being called, because there might be mutations!
      for (; target; target = target.parentNode)
        yield {target, root, depth: depth + i, pos};
    }
    for (let i = hosts.length - 1; i >= 0; i--) {                     //slotting/attributes  documents is bottom up
      let {target, root} = hosts[i];
      for (let pos = 0; target; target = target.parentNode, pos++) {
        if (target.assignedSlot) {                                    //first shadowDom
          yield* this.dynamo_core(target.assignedSlot, false, depth + i + 1, pos + 1);
        }
        if (target.attributes)
          for (let i = 0; i < target.attributes.length; i++)          //second attributes
            yield {target: target.attributes[i], root: target, depth: depth + i, pos};
      }
    }
  }

  //if you remove a node from the dom, then you don't really need to run its listeners anymore.
  static* dynamo_connected(t, composed, connectedOnly) {
    if (!connectedOnly) {
      yield* this.dynamo_core(t, composed);
      return;
    }
    for (let {target, root} of this.dynamo_core(t, composed))
      if (target.isConnected) yield {target, root};
  }

  //example of dev time check that can be used to produce error messages.
  static* dynamo_neverSameTargetTwice(t, composed, connectedOnly) {
    const seen = new WeakSet();
    for (let {target, root} of this.dynamo_connected(t, composed, connectedOnly)) {
      if (seen.has(target))
        throw new Error("Don't manipulate the parent context of an element during event propagation");
      seen.add(target);
      yield {target, root};
    }
  }

  static #propagate(eventEl, target, listeners) {
    let previousRoot;
    for (let {target: t, root} of this.dynamo_neverSameTargetTwice(target, eventEl.composed, true)) {
      if (previousRoot !== root) {
        if (eventEl.defaultPrevented)  //defaultPrevented is a global variable... this could be a problem...
          return;                      //this behavior also blocks mandatory defaultActions such as a dblclick attribute on the <body>. fix this stage 2.
        previousRoot = root;
        eventEl.target = t;    //todo lock this in weakMap
      }
      const list = listeners.get(t, eventEl.type);
      if (!list)
        continue;
      eventEl.currentTarget = t;  //todo lock this in weakMap
      for (let fun of list) {
        try {
          fun?.call(t, eventEl.event);
        } catch (error) {
          //eventElement.listenerErrors.push(target, fun, error); //todo something like this
        }
      }
    }
  }
}