//DEPENDS ON childReadyCallback()
(function () {

  //observes the host chain for all hosts that might slot in an element.
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

    static #flatChildNodesCache = new WeakMap();

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

    static #init(el) {
      const nowChildren = flatChildNodes(el);
      const rec = new ChildChangedRecord(nowChildren, [], nowChildren, []);
      ChildChangedRecord.#flatChildNodesCache.set(el, rec);
      return rec;
    }

    static check(el) {
      const prev = ChildChangedRecord.#flatChildNodesCache.get(el);
      if(!prev)
        return ChildChangedRecord.#init(el);
      const nowChildren = flatChildNodes(el);
      const d = diff(prev.#news, nowChildren);
      if(!d)
        return;
      const rec = new ChildChangedRecord(nowChildren, prev.#news, d.added, d.removed);
      ChildChangedRecord.#flatChildNodesCache.set(el, rec);
      return rec;
    }
  }

  function flatChildNodes(el) {
    return Array.from(el.childNodes).map(c => c instanceof HTMLSlotElement ? c.assignedNodes({flatten: true}) : c).flat(1);
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

  function callChildChangedCallback(el, childChangedRecord) {
    try {
      el.childChangedCallback(childChangedRecord);
    } catch (err) {
      window.dispatchEvent(new Event('Uncaught Error: ' + err.message)); //todo
    }
  }

  function doChildChanged(el) {
    const rec = ChildChangedRecord.check(el);
    if (rec) {
      SlotHostObserver.refresh(el); //todo here we can pass in added/removed to check if there are any slot elements that are mutated.
      callChildChangedCallback(el, rec);
    }
  }

  const HTMLElementOG = HTMLElement;

  class ChildChangedHTMLElement extends HTMLElementOG {

    childReadyCallback() {
      if (!this.childChangedCallback)
        return;
      //todo fuck new bug. because the childReady is called on the child first, then it will not get the parent slotted children.. why?
      //todo it happens because the childReady is called on the nested element first, while the host element is not ready.
      //todo and when that happens, the childNodes of the hostElement is not connected and thus the hostElement doesn't have the things it needs yet.
      //todo this is seriously difficult stuff.
      //todo this is fixed using a prt..
      SlotHostObserver.observe(this, doChildChanged);
      callChildChangedCallback(this, ChildChangedRecord.check(this));
    }
  }

  window.HTMLElement = ChildChangedHTMLElement;
})();