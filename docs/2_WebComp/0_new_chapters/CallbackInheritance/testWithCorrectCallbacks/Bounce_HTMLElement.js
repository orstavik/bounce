(function () {

  /*
   * ParserFrame
   */
  const parseStack = [];
  let parserFrame;

  function startParserFrame(type) {
    parseStack.unshift(parserFrame = {
      type,
      needsAttributeChanged: undefined,
      childrenChangedElements: []
    });
  }

  function endParserFrame() {
    checkEmptyAttribute();
    checkChildrenChanged();
    parseStack.shift();
    parserFrame = parseStack[0];
  }

  function wrapConstructionFunction(og, type) {
    return function innerHTML(...args) {
      startParserFrame(type);
      const res = og.call(this, ...args);
      endParserFrame();
      return res;
    };
  }

  function monkeyPatch(proto, prop, setOrValue) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
    descriptor[setOrValue] = wrapConstructionFunction(descriptor[setOrValue], proto.constructor.name + '.' + prop);
    Object.defineProperty(proto, prop, descriptor);
  }

  /*
   * MonkeyPatch all methods for constructing HTMLElements to inject ParserFrame
   * It is because we can't distinguish a *startFrame* and *endFrame* around 'new' that it must be Illegalized.
   */
  startParserFrame('predictive');
  window.addEventListener('DOMContentLoaded', endParserFrame);

  monkeyPatch(Element.prototype, "innerHTML", 'set');
  monkeyPatch(Element.prototype, "outerHTML", 'set');
  monkeyPatch(Element.prototype, "insertAdjacentHTML", 'value');
  monkeyPatch(ShadowRoot.prototype, "innerHTML", 'set');
  monkeyPatch(Node.prototype, "cloneNode", 'value');
  monkeyPatch(Document.prototype, "createElement", 'value');
  monkeyPatch(customElements, "define", 'value');


  /*
   * MonkeyPatch HTMLElement lifecycle callbacks
   * Here, we are adding missing empty attributeChangedCallback(),
   * and adding childrenChangedCallback().
   * The MonkeyPatch for lifecycle callback inheritance is implemented elsewhere.
   */

  function checkEmptyAttribute() {
    const cache = parserFrame.needsAttributeChanged;
    parserFrame.needsAttributeChanged = undefined;
    try {
      cache?.attributeChangedCallback();
    } catch (err) {
      window.dispatchEvent(new Event('Uncaught Error', err)); //todo don't remember exactly what this looks like.
    }
  }

  function checkChildrenChanged(currentPoint) {
    const index = parserFrame.childrenChangedElements.findIndex(function (el, index, ar) {
      const res = currentPoint.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_CONTAINED_BY;//todo or contains
      debugger;
      return res;
    });
    for (let i = parserFrame.childrenChangedElements.length - index; i > 0; i--) {
      const el = parserFrame.childrenChangedElements.pop();
      try {
        el.childrenChangedCallback(el.childNodes, null);
      } catch (err) {
        window.dispatchEvent(new Event("Uncaught Error", err)); //todo how?
      }
    }
  }

  class Bounce_HTMLElement extends HTMLElement {
    constructor() {
      super();
      const predictiveParser = !document.currentScript && document.readyState === 'loading';
      const emptyAttributes = !this.attributes.length;
      //1. We check for Illegal constructor using new(). Assuming patch of document.createElement and empty cloneNode.
      if (!this.parentNode && !this.childNodes.length && emptyAttributes && !predictiveParser)
        throw new Error(`Illegal constructor. Try document.createElement("${this.tagName}");`);
      //2. check for childrenChangedCallback. This is necessary in all legal construction modes.
      //   and childrenChanged is only changed from constructor().
      checkChildrenChanged(this);
      //3. If the element has childrenChangedCallback, then we must register it for patch.
      this.childrenChangedCallback instanceof Function && parserFrame.childrenChangedElements.push(this);
      //4. predictive parser/upgrade/connected innerHTML
      //   This mode *always* call connectedCallback, so we neither need to check previous constructor nor make the next constructor check us.
      if (this.isConnected || predictiveParser)
        return;
      //5. At this point we know that we are in a disconnected HTML branch, either:
      //   a) disconnected innerHTML,
      //   b) document.createElement, or
      //   c) cloneNode.
      //   Here, we want the constructors to fix each others empty attributeChangedCallback().
      checkChildrenChanged();
      if (emptyAttributes)
        parserFrame.needsAttributeChanged = this;
      // this.attachShadow({mode: 'open'});//todo keep this as fixed? no. We can add this as another subclass
    }

    cloneNode(deep) {
      return !this.attributes.length && (!deep || !this.childNodes.length) ?
        document.createElement(this.tagName) :
        super.cloneNode.call(this, deep);
    }

    connectedCallback() {
      //this will now run for all
      checkChildrenChanged();
    }

    attributeChangedCallback() {
      //This needs to run, because the element in predictive mode *can* remove all attributes from a attributeChangedCallback().
      //This is not an unlikely scenario.
      parserFrame.needsAttributeChanged = undefined;
    }

    //not necessary, but added to avoid having super.disconnectedCallback() crash. Is most likely be optimized away quickly.
    disconnectedCallback() {
    }
  }

  const HTMLElementOG = Object.getOwnPropertyDescriptor(window, 'HTMLElement');
  debugger;
  HTMLElementOG.value = Bounce_HTMLElement;
  Object.defineProperty(window, "HTMLElement", HTMLElementOG);
});