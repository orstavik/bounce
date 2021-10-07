//DEPENDS ON childReadyCallback()
(function () {

  class SlotHostObserver  {

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
      const cache = SlotHostObserver.#cache;
      let mo = cache.get(el);
      mo ? mo.disconnect() : cache.set(el, mo = new MutationObserver(cb));
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
    SlotHostObserver.observe(el, ()=>doChildChanged(el));
    callChildChangedCallback(el, new ChildChangedRecord(newChildren, oldChildren, d.added, d.removed));
  }

  const HTMLElementOG = HTMLElement;

  class ChildChangedHTMLElement extends HTMLElementOG {

    childReadyCallback() {
      //todo bug. when the element has no children, the system never starts
      this.childChangedCallback && doChildChanged(this);
    }
  }

  window.HTMLElement = ChildChangedHTMLElement;
})();