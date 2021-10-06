(function () {
  function deepestElement(root) {
    while (root.lastChild) root = root.lastChild;
    return root;
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
   *
   * @returns {Node} the last element parsed by the browser.
   */
  function lastParsed() {
    return document.currentScript?.hasAttribute('async') ? document.currentScript : deepestElement(document.documentElement);
  }

  function doChildReady(el) {
    try {
      el.childReadyCallback();
    } catch (err) {
      window.dispatchEvent(new Event('Uncaught Error: ' + err.message)); //todo
    }
  }

  const list = [];
  let active = null;

  function runList() {
    //1. find the last parsed
    const now = lastParsed();
    for (let el of list) {
      //2. find the first element in the list of elements waiting for childReady that is not an ancestor of now.
      if (el !== now && !(el.compareDocumentPosition(now) & Node.DOCUMENT_POSITION_CONTAINED_BY)) {
        //3. all elements added to the childReady list are descendants of this element, and therefore also childReady.
        while (true) {
          //4. call childReady on the remaining elements, but do so LIFO/bottom-up/right-left.
          //   The LIFO structure will then be the same for all elements waiting for childReady.
          const lastEl = list.pop();
          doChildReady(lastEl);
          //5. when the childReady is completed, reset the elements if there are no more elements in the list.
          if (lastEl === el)
            return list.length === 0 && (active = active.disconnect());
        }
      }
    }
  }

  function addToList(el) {
    list.push(el);
    !active && (active = new MutationObserver(runList)).observe(document.body, {childList: true, subtree: true});
  }

  function doChildReadyLoading(el) {
    ('predictive') ? addToList(el) : doChildReady(el);
  }

  let childReady = doChildReady;
  if (document.readyState === 'loading') {
    childReady = doChildReadyLoading;
    window.addEventListener('readystatechange', () => childReady = doChildReady, {capture: true, once: true});
  }

  const HTMLElementOG = HTMLElement;

  class ChildReadyHTMLElement extends HTMLElementOG {
    constructor() {
      super();
      this.childReadyCallback && childReady(this);
    }
  }

  window.HTMLElement = ChildReadyHTMLElement;
})();