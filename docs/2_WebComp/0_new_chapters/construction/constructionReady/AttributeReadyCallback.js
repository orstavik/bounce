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
    } catch (error) {
      window.dispatchEvent(new ErrorEvent('error', {error}));
    }
  }

  /**
   * mechanism for calling readyCallback on an element
   */
  // function doReadyCallback(el) {
  //   ConstructionFrame.now.ready && callAttributeReadyCallback(ConstructionFrame.now.ready);
  //   ConstructionFrame.now.ready = el?.attributeReadyCallback ? el : undefined;
  // }

  //monkeyPatch the HTMLElement so that it includes the readyCallback().
  window.HTMLElement = class AttributeReadyCallbackHTMLElement extends HTMLElement {

    constructor() {
      super();
      ConstructionFrame.now.ready && callAttributeReadyCallback(ConstructionFrame.now.ready);
      ConstructionFrame.now.ready = this.attributeChangedCallback ? this : undefined;
    }

    attributeChangedCallback() {
      if(ConstructionFrame.now?.ready !== this)
        return;
      ConstructionFrame.now.ready = undefined;
      callAttributeReadyCallback(this);
    }

    connectedCallback() {
      if(ConstructionFrame.now?.ready !== this)
        return;
      ConstructionFrame.now.ready = undefined;
      callAttributeReadyCallback(this);
    }
  }

  //clean up any trailing readyCallbacks on the tail end of a closing constructionFrame
  ConstructionFrame.observe('end', ({ready}) => ready && callAttributeReadyCallback(ready));
})();