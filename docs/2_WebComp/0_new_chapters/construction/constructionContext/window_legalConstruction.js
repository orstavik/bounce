(function () {
  //NewIllegalConstructor
  //
  //Monkeypatch which makes *new* an illegal constructor mechanism for custom HTMLElements, not just native HTMLElements.
  //Most likely this can be removed during production, this mechanism is only to dissuade the developer from using
  //new as a means to construct HTMLElements.

  //A new constructor is recognized by having:
  //1. no parentNode
  //2. no attributes
  //3. no childNodes

  //However, there are three other scenarios where this can occur:
  //a. customElement.cloneNode() directly on the customElement and the
  //   customElement has a) no attributes and b) either no childNodes or deep=false.
  //b. document.createElement('custom-element')
  //c. predictive parser
  //
  //These scenarios are handled using the following strategies:
  //a. .cloneNode() *must* be called on the customElement directly (otherwise parentNode will be set).
  //   This means that the LegalHTMLElement can intercept the cloneNode method itself.
  //   But. Others might call cloneNode from the Node.prototype.cloneNode definition, for example:
  //   `Node.cloneNode.call(customElement)`
  //   Therefore, a monkeypatch of Node.prototype.cloneNode is safer.
  //b. document.createElement() is monkeyPatched the same way as cloneNode
  //   The monkeypatches sets a simple boolean flag notifying the constructor
  //   that the call comes from document.createElement, and not from new.
  //c. The predictive parser is slightly more complicated. First, the patch relies on correct aggregation of the
  //   lifecycle method connectedCallback(). Any web component must call super.connectedCallback() at the beginning of the callback.
  //   Then, any element created by the predictive parser will always call connectedCallback() as part of its construction
  //   sequence. Therefore, if the document.readyState === 'loading' && !document.currentScript at the beginning of
  //   the constructor, we either have c1) the predictive parser instantiating a custom element, or c2) a "new" custom
  //   element from within either a predictive parser constructor or connectedCallback call. So, by flagging the *first*
  //   constructor being triggered in this state, and then removing the flag at the connectedCallback for the same HTMLElement,
  //   we get a safe mechanism for distinguishing predictive parser initialized constructors, and new constructor calls from
  //   within the predictive parser.

  //An additional scenario, upgradeInside can be added as either illegal or as a warning
  function upgradeInsideErrorMessage(tag) {
    return `UpgradeInside! 
<!-- move your script here instead, or at the end of the main document if it doesn't define layout on the page -->
<${tag} ...>
  ...
  <script>      //it is not a good idea to do this positioning.
    ...
    customElements.define('${tag}', ...);
  </script>  
</${tag}>`;
  }

  function makeNEWErrorMessage(el) {
    return `Illegal constructor: "new ${(Object.getPrototypeOf(el).constructor.name)}()". Try "document.createElement('${(el.tagName.toLowerCase())}')"`;
  }

  let flag;
  let flagPredictive;

  class NoNewConstructorHTMLElement extends HTMLElement {

    constructor() {
      super();
      //1. upgradeInside!!
      if (document.currentScript && document.currentScript.compareDocumentPosition(this) & Node.DOCUMENT_POSITION_CONTAINS)
        throw new SyntaxError(upgradeInsideErrorMessage(this.tagName.toLowerCase()));
      //2. scenarios easily identify as not new
      if (this.parentNode || this.attributes.length || this.childNodes.length || flag)
        return;
      //3. predictive parser vs. new
      if (document.readyState === 'loading' && !document.currentScript && !flagPredictive) //signature for a predictive parser constructor.
        flagPredictive = this;
      //4. new!!
      else
        throw new SyntaxError(makeNEWErrorMessage(this, this));
    }

    connectedCallback() {
      flagPredictive === this && (flagPredictive = undefined);
    }
  }

  const HTMLElementOG = Object.getOwnPropertyDescriptor(window, 'HTMLElement');
  Object.defineProperty(window, "HTMLElement", Object.assign(HTMLElementOG, {value: NoNewConstructorHTMLElement}));

  const createElementOG = Object.getOwnPropertyDescriptor(Document.prototype, 'createElement');
  Object.defineProperty(Document.prototype, 'createElement', Object.assign({}, createElementOG, {
    value: function createElement(...args) {
      flag = true;
      const res = createElementOG.value.call(this, ...args);
      flag = false;
      return res;
    }
  }));

  const cloneNodeOG = Object.getOwnPropertyDescriptor(Node.prototype, 'cloneNode');
  Object.defineProperty(Node.prototype, 'cloneNode', Object.assign({}, cloneNodeOG, {
    value: function cloneNode(...args) {
      flag = true;
      const res = cloneNodeOG.value.call(this, ...args);
      flag = false;
      return res;
    }
  }));
})();