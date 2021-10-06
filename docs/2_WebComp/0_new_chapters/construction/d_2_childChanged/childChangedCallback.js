//DEPENDS ON childReadyCallback()
(function () {

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

  function nextSlotMatroschkaHost(el) {
    for (let c of el.childNodes) {
      if (c instanceof HTMLSlotElement)
        return c.getRootNode().host;
    }
  }

  function* slotMatroschkaHosts(el) {
    for (; el; el = nextSlotMatroschkaHost(el))
      yield el;
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
  const moCache = new WeakMap();

  function observeFlatChildNodes(el) {
    let mo = moCache.get(el);
    mo ? mo.disconnect() : mo = new MutationObserver(() => doChildChanged(el));
    for (let obs of slotMatroschkaHosts(el))
      mo.observe(obs, {childList: true});
  }

  function doChildChanged(el) {
    const oldChildren = flatChildNodesCache.get(el) || [];
    const newChildren = Array.from(flatChildNodes(el));
    const d = diff(oldChildren, newChildren);
    if (!d)
      return;
    flatChildNodesCache.set(el, newChildren);
    observeFlatChildNodes(el);
    try {
      el.childChangedCallback(new ChildChangedRecord(newChildren, oldChildren, d.added, d.removed));
    } catch (err) {
      window.dispatchEvent(new Event('Uncaught Error: ' + err.message)); //todo
    }
  }

  const HTMLElementOG = HTMLElement;
  class ChildChangedHTMLElement extends HTMLElementOG {

    childReadyCallback() {
      this.childChangedCallback && doChildChanged(this);
    }
  }
  window.HTMLElement = ChildChangedHTMLElement;
})();