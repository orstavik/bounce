//DEPENDS ON childReadyCallback()
(function () {

  class SlotHostObserver {

    static #cache = new WeakMap();

    static* #slotMatroschkaHosts(el) {
      for (; el; el = SlotHostObserver.#nextSlotMatroschkaHost(el))
        yield el;
    }

    static #nextSlotMatroschkaHost(el) {
      for (let c of el.childNodes) {
        if (c instanceof HTMLSlotElement)
          return c.getRootNode().host;
      }
    }

    static observe(el, cb) {
      const mo = new MutationObserver(() => cb(el))
      SlotHostObserver.#cache.set(el, mo);
      for (let host of SlotHostObserver.#slotMatroschkaHosts(el))
        mo.observe(host, {childList: true});
    }

    static refresh(el) {
      const mo = SlotHostObserver.#cache.get(el);
      mo.disconnect();
      //todo it is possible to *not* disconnect and re-observe if the slotMatroschkaHosts have not changed.
      for (let host of SlotHostObserver.#slotMatroschkaHosts(el))
        mo.observe(host, {childList: true});
    }
  }

  class ChildChangedRecord {
    #news;
    #old;
    #added;
    #removed;

    constructor(newNodes, oldNodes, added, removed) {
      this.#news = newNodes;
      this.#old = oldNodes;
      this.#added = added;
      this.#removed = removed;
    }

    get newNodes() {
      return Object.freeze(this.#news);
    }

    get oldNodes() {
      return Object.freeze(this.#old);
    }

    get addedNodes() {
      return Object.freeze(this.#added);
    }

    get removedNodes() {
      return Object.freeze(this.#removed);
    }
  }

  function* flatChildNodes(el) {
    for (let i = 0; i < el.childNodes.length; i++) {
      let c = el.childNodes[i];
      if (c instanceof HTMLSlotElement) {
        for (let c2 of c.assignedNodes({flatten: true}))
          yield c2;
      } else {
        yield c;
      }
    }
  }

  //difference between two maps
  //note, if elements are moved around, not added or removed, then this will return {added: [], removed:[]}, which is good.
  function diff(as, bs) {
    if (as.length !== bs.length || !as.every((e, i) => bs[i] === e))
      return {
        added: bs.filter(b => as.indexOf(b) === -1),
        removed: as.filter(a => bs.indexOf(a) === -1)
      };
  }

  const flatChildNodesCache = new WeakMap();

  function callChildChangedCallback(el, childChangedRecord) {
    try {
      el.childChangedCallback(childChangedRecord);
    } catch (err) {
      window.dispatchEvent(new Event('Uncaught Error: ' + err.message)); //todo
    }
  }

  function doChildChanged(el) {
    const oldChildren = flatChildNodesCache.get(el) || [];
    const newChildren = Array.from(flatChildNodes(el));
    const d = diff(oldChildren, newChildren);
    if (!d)
      return;
    flatChildNodesCache.set(el, newChildren);
    SlotHostObserver.refresh(el);
    callChildChangedCallback(el, new ChildChangedRecord(newChildren, oldChildren, d.added, d.removed));
  }

  const HTMLElementOG = HTMLElement;

  class ChildChangedHTMLElement extends HTMLElementOG {

    childReadyCallback() {
      if (!this.childChangedCallback)
        return;
      const newChildren = Array.from(flatChildNodes(this));
      flatChildNodesCache.set(this, newChildren);
      SlotHostObserver.observe(this, doChildChanged);
      callChildChangedCallback(this, new ChildChangedRecord(newChildren, [], newChildren, []));
    }
  }

  window.HTMLElement = ChildChangedHTMLElement;
})();