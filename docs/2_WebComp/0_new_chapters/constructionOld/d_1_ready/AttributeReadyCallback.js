// AttributeReadyCallbackHTMLElement depends on:
//
// 1. ReadyHTMLElement needs aggregate/correct lifecycle method inheritance.
//    Aggregate lifecycle method inheritance means that
//    a base class' connectedCallback(){...} and/or attributeChangedCallback(){...} **must call**
//    super.connectedCallback() and/or super.attributeChangedCallback() at the beginning of the
//    **if and only if** the super class implements such a lifecycle method.
//
// 2. ConstructionFrame API with construction-end and ConstructionFrame.now.

(function () {

  function callAttributeReadyCallback(el) {
    try {
      el.attributeReadyCallback();
    } catch (err) {
      window.dispatchEvent(new Event('Uncaught Error', err)); //todo don't remember exactly what this looks like.
    }
  }

  /**
   * mechanism for calling readyCallback on an element
   */
  function doReadyCallback(el) {
    ConstructionFrame.now.ready && callAttributeReadyCallback(ConstructionFrame.now.ready);
    ConstructionFrame.now.ready = el?.attributeReadyCallback ? el : undefined;
  }

  //monkeyPatch the HTMLElement so that it includes the readyCallback().
  window.HTMLElement = class AttributeReadyCallbackHTMLElement extends HTMLElement {

    constructor() {
      super();
      doReadyCallback(this);
    }

    attributeChangedCallback() {
      doReadyCallback();
    }

    connectedCallback() {
      doReadyCallback();
    }
  }

  //clean up any trailing readyCallbacks on the tail end of a closing constructionFrame
  window.addEventListener('construction-end', ({ended: {ready}}) => ready && callAttributeReadyCallback(ready));
})();