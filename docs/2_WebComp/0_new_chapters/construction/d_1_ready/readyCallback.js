(function () {

  /**
   * mechanism for calling readyCallback on an element
   */
  function doReadyCallback() {
    const el = constructionContext[0].ready;
    constructionContext[0].ready = undefined;
    try {
      el?.readyCallback();
    } catch (err) {
      window.dispatchEvent(new Event('Uncaught Error', err)); //todo don't remember exactly what this looks like.
    }
  }

  /*
   * constructionContext.
   * The context now cache the last constructed element that has yet to call .readyCallback()
   *
   * At the end of each constructionContext, if the last constructed element did not call .readyCallback(),
   * then call it before the constructionContext ends.
   */
  window.constructionContext = [];

  function startFrame(type) {
    constructionContext.unshift({type, ready: undefined});
  }

  function endFrame() {
    doReadyCallback();
    constructionContext.shift();
  }

  function wrapConstructionFunction(og, type) {
    return function (...args) {
      startFrame(type);
      const res = og.call(this, ...args);
      endFrame();
      return res;
    };
  }

  function monkeyPatch(proto, prop, setOrValue) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
    descriptor[setOrValue] = wrapConstructionFunction(descriptor[setOrValue], proto.constructor.name + '.' + prop);
    Object.defineProperty(proto, prop, descriptor);
  }

  monkeyPatch(Element.prototype, "innerHTML", 'set');
  monkeyPatch(Element.prototype, "outerHTML", 'set');
  monkeyPatch(Element.prototype, "insertAdjacentHTML", 'value');
  monkeyPatch(ShadowRoot.prototype, "innerHTML", 'set');
  monkeyPatch(Node.prototype, "cloneNode", 'value');
  monkeyPatch(Document.prototype, "createElement", 'value');
  monkeyPatch(CustomElementRegistry.prototype, "define", 'value');

  startFrame('predictive');
  window.addEventListener('DOMContentLoaded', endFrame);

  //ReadyHTMLElement has two dependencies:
  // 1. ReadyHTMLElement needs aggregate/correct lifecycle method inheritance.
  //    Aggregate lifecycle method inheritance means that
  //    a base class' connectedCallback(){...} and/or attributeChangedCallback(){...} **must call**
  //    super.connectedCallback() and/or super.attributeChangedCallback() at the beginning of the
  //    **if and only if** the super class implements such a lifecycle method.
  //
  // 2. ReadyHTMLElement assumes NoNewHTMLElement patch that restricts constructing custom HTMLElements using "new"
  //    the same way native HTMLElements cannot be constructed using "new".
  class ReadyHTMLElement extends HTMLElement {

    constructor() {
      super();
      doReadyCallback();
      this.readyCallback && (constructionContext[0].ready = this);
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
  Object.defineProperty(window, 'HTMLElement', Object.assign(HTMLElementOG, {value: ReadyHTMLElement}));
})();