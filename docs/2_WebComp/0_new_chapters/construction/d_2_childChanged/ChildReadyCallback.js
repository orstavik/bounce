//this is an observer for "tagEnd" for custom elements during predictive parser/loading of the main document.
class TagEndObserver {
  #_mo;
  #list = [];
  #cb;

  constructor(cb) {
    this.#cb = cb;
  }

  addElement(el) {
    !this.#list.length && this.#mo.observe(document.documentElement, {childList: true, subtree: true});
    el.childReadyCallback && this.#list.push(el);
  }

  get #mo() {
    return this.#_mo || (this.#_mo = new MutationObserver(() => this.checkPoint()));
  }

  checkPoint() {
    const ready = this.#parseIndex();
    if (ready === -1)
      return;
    let readies = this.#list.splice(ready, Number.MAX_SAFE_INTEGER);
    for (let i = readies.length - 1; i >= 0; i--)  //run in reverse sequence to get the same sequence for all
      this.#cb(readies[i]);
    !ready && this.#_mo.disconnect();
  }

  #parseIndex() {
    const lastParsed = TagEndObserver.lastParsed();
    return this.#list.findIndex(el => !(el.compareDocumentPosition(lastParsed) & Node.DOCUMENT_POSITION_CONTAINED_BY) && el !== lastParsed);
  }

  /**
   * During "loading", the predictive parser has two means to get the last parsed node:
   * 1. If a sync <script> runs, the document.currentScript should represent the deepest point in the DOM (main document).
   *    Problem: If somebody does something stupid and move the <script> node that is the document.currentScript *before*
   *    this method runs, then obviously the document.currentScript will not represent the deepest point in the DOM.
   *    But, this script should run before such code, and to move a script element is both stupid and unnecessary, so
   *    the shortcut is kept.
   * 2. If the predictive parser calls an already defined custom element, then the deepest element found from the
   *    <html> element in the document is the last parsed element.
   *    Problem: The main document contains "<a-a></a-a><b-b></b-b>" with **NO** whitespace between the two components.
   *    When the constructor() of <b-b> is called, then lastParsed will return "<a-a>" element, and there is no way
   *    to distinguish if the position of the parser is 'inside' or 'after' <a-a>. Ie, from JS, you cannot see if the
   *    template is: a) nested "<a-a><b-b></b-b></a-a>" or b) siblings "<a-a></a-a><b-b></b-b>".
   *    Therefore a whitespace or comment or any other Node should be added between two sibling web components,
   *    which it normally would.
   */
  static lastParsed() {
    return document.currentScript?.hasAttribute('async') ?
      document.currentScript :
      TagEndObserver.deepestElement(document.documentElement);
  }

  static deepestElement(root) {
    while (root.lastChild) root = root.lastChild;
    return root;
  }
}

(function () {
  //One dependencies:
  // 1. constructionFrameEnd callback
  function callChildReadyCallback(p) {
    try {
      p.childReadyCallback();
    } catch (err) {
      window.dispatchEvent(new Event('Uncaught Error: ' + err.message)); //todo
    }
  }

  function doChildReady(frame, el) {
    frame.child && callChildReadyCallback(frame.child);
    frame.child = el?.childReadyCallback ? el : undefined;
  }

  let handle = doChildReady;
  if (document.readyState === 'loading') {
    const obs = new TagEndObserver(callChildReadyCallback);
    handle = (frame, el) => frame.type === 'predictive' ? obs.addElement(el) : doChildReady(frame, el);
    window.addEventListener('readystatechange', () => handle = doChildReady, {capture: true, once: true});
  }

  window.HTMLElement = class ChildReadyHTMLElement extends HTMLElement {
    constructor() {
      super();
      handle(constructionFrame, this);
    }
  }

  window.addEventListener('construction-end', () => doChildReady(constructionFrame));
})();