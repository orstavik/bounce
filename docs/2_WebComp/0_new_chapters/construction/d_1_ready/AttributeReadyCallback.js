(function () {
  //AttributeReadyCallbackHTMLElement has three dependencies:
  // 1. ReadyHTMLElement needs aggregate/correct lifecycle method inheritance.
  //    Aggregate lifecycle method inheritance means that
  //    a base class' connectedCallback(){...} and/or attributeChangedCallback(){...} **must call**
  //    super.connectedCallback() and/or super.attributeChangedCallback() at the beginning of the
  //    **if and only if** the super class implements such a lifecycle method.
  //
  // 2. ReadyHTMLElement assumes NoNewHTMLElement patch that restricts constructing custom HTMLElements using "new"
  //    the same way native HTMLElements cannot be constructed using "new".
  //
  // 3. constructionFramesEnd() must be patched to trigger doReadyCallback().

  /**
   * mechanism for calling readyCallback on an element
   */
  function doReadyCallback() {
    const el = constructionFrames[0].ready;
    constructionFrames[0].ready = undefined;
    try {
      el?.attributeReadyCallback();
    } catch (err) {
      window.dispatchEvent(new Event('Uncaught Error', err)); //todo don't remember exactly what this looks like.
    }
  }

  class AttributeReadyCallbackHTMLElement extends HTMLElement {

    constructor() {
      super();
      doReadyCallback();
      this.attributeReadyCallback && (constructionFrames[0].ready = this);
    }

    attributeChangedCallback() {
      doReadyCallback();
    }

    connectedCallback() {
      doReadyCallback();
    }
  }

  //monkeyPatch the HTMLElement so that it includes the readyCallback().
  const HTMLElementOG = Object.getOwnPropertyDescriptor(window, 'HTMLElement');
  Object.defineProperty(window, 'HTMLElement', Object.assign(HTMLElementOG, {value: AttributeReadyCallbackHTMLElement}));

  //clean up any trailing readyCallbacks on the tail end of a closing constructionFrame
  const constructionFrameEndOG = window.constructionFrameEnd;
  window.constructionFrameEnd = function attributeReadyConstructionFrameEnd(){
    const frame = constructionFrameEndOG();
    doReadyCallback();
    return frame;
  }
})();