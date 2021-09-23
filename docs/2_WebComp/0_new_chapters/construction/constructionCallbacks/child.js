(function () {

  /**
   * mechanism for calling childChangedCallback on an element
   */
  const previousChildren = new WeakMap();

  function doFirstChildChangedCallback(el) {
    el && el.childNodes.length && doChildChangedCallback(el);
  }

  function doChildChangedCallback(el) {
    const old = previousChildren.get(el);
    const now = Array.from(el.childNodes);
    previousChildren.set(el, now);
    try {
      el.childChangedCallback(old, now); //todo wrap in a method that gives the
    } catch (err) {
      window.dispatchEvent(new Event("Uncaught Error", err)); //todo how?
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
    constructionContext.unshift({type, child: undefined});
  }

  function endFrame() {
    doFirstChildChangedCallback(constructionContext[0].child);
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


  class ChildChangedHTMLElement extends HTMLElement {

    static get observedAttributes(){
      return ['bob'];
    }

    constructor() {
      super();
      //On its own, this demo is naive.
      //when new Element() is called:
      // 1. sync/during predictiveParser, then constructionContext[0] = predictive parser context (which is wrong).
      // 2. async/after DCL, then constructionContext[0] is undefined.
      //Thus new Element() cannot work with readyCallback().
      if (!constructionContext[0]) return;

      doFirstChildChangedCallback(constructionContext[0].child);
      constructionContext[0].child = this.childChangedCallback ? this : undefined;
    }
  }

  //monkeyPatch the HTMLElement so that it includes the childChangedCallback().
  const HTMLElementOG = Object.getOwnPropertyDescriptor(window, 'HTMLElement');
  Object.defineProperty(window, 'HTMLElement', Object.assign(HTMLElementOG, {value: ChildChangedHTMLElement}));
})();