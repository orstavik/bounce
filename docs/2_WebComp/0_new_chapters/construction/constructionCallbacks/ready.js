(function () {

  /**
   * mechanism for calling readyCallback on an element
   */
  function doReadyCallback(el) {
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
    doReadyCallback(constructionContext[0].ready);
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


  class ReadyHTMLElement extends HTMLElement {

    constructor() {
      super();
      //On its own, this demo is naive.
      //when new Element() is called:
      // 1. sync/during predictiveParser, then constructionContext[0] = predictive parser context (which is wrong).
      // 2. async/after DCL, then constructionContext[0] is undefined.
      //Thus new Element() cannot work with readyCallback().
      if(!constructionContext[0]) return;
      doReadyCallback(constructionContext[0].ready);
      constructionContext[0].ready = this.readyCallback ? this : undefined;
    }

    attributeChangedCallback() {
      doReadyCallback(constructionContext[0].ready);
      constructionContext[0].ready = undefined;
    }

    connectedCallback() {
      doReadyCallback(constructionContext[0].ready);
      constructionContext[0].ready = undefined;
    }

    // 1. In this simplistic demo, we call super.connectedCallback() and super.attributeChangedCallback() manually from test web component.
    // 2. Later, we can monkeyPatch the customElements.define to make this automatically.
    // 3. When we do that, we need some way to commincate that a class wish to observe *all* other *observed* attributes.
    //    This is not all other attributes, but all other attributes who some other class observes. We use '*'.
    //
    // static get observedAttributes() {
    //   return ['*'];
    // }
  }

  //monkeyPatch the HTMLElement so that it includes the readyCallback().
  const HTMLElementOG = Object.getOwnPropertyDescriptor(window, 'HTMLElement');
  Object.defineProperty(window, 'HTMLElement', Object.assign(HTMLElementOG, {value: ReadyHTMLElement}));
})();