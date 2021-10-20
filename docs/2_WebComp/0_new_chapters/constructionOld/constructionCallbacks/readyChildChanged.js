(function () {

  /**
   * framework for calling element callbacks.
   */
  const previousChildren = new WeakMap();

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

  function doReadyCallback(el) {
    try {
      el.readyCallback();
    } catch (err) {
      window.dispatchEvent(new Event('Uncaught Error', err)); //todo don't remember exactly what this looks like.
    }
  }


  /*
   *
   */
  window.constructionContext = [];
  let parserFrame;

  function startFrame(type) {
    constructionContext.unshift(parserFrame = {type, ready: undefined, child: undefined});
  }

  function endFrame() {
    checkReady();
    checkChildChanged();
    constructionContext.shift();
    parserFrame = constructionContext[0];
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


  /*
 * functions for checking readyCallback() childChangedCallback()
 */
  function checkReady() {
    if (parserFrame.ready) {
      doReadyCallback(parserFrame.ready);
      parserFrame.ready = undefined;
    }
  }


  class ReadyHTMLElement extends LegalHTMLElement {

    constructor() {
      super();
      checkReady();
      this.readyCallback && (parserFrame.ready = this);
    }

    connectedCallback() {
      checkReady();
    }

    attributeChangedCallback() {
      checkReady();
    }

    //this is not observing *all* other attributes, but all the *other observed* attributes.
    // static get observedAttributes() {
    //   return ['*'];
    // }
  }

  const predictiveChildChanged = [];
  window.addEventListener('DOMContentLoaded', () => predictiveChildChanged.forEach(doChildChangedCallback));

  class ChildChangedHTMLElement extends ReadyHTMLElement {

    constructor() {
      super();
      const predictiveMode = document.readyState === 'loading' && !document.currentScript;
      if (predictiveMode) {
        predictiveChildChanged.push(this);
      } else {
        parserFrame.child && doChildChangedCallback(parserFrame.child);
        this.childChangedCallback && (parserFrame.child = this);
      }
    }
  }

  //todo I need the customElements.define monkeyPatch to make this work.. That is a lot in a single change..
  //todo unless I do that manually? calling WebComp.connectedCallback(){=>super.connectedCallback()}
  //todo yes we do it manually to begin with.
})();