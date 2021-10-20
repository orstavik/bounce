// todo depends on beforescriptexecute event.

// NoNewConstructorHTMLElement
//
//Monkeypatch which makes *new* an illegal constructor mechanism for custom HTMLElements, not just native HTMLElements.
//Most likely this can be removed during production, this mechanism is only to dissuade the developer from using
//new as a means to construct HTMLElements.

//A "new constructor()" is recognized by having:
//1. no parentNode
//2. no attributes
//3. no childNodes

//However, there are three other scenarios where this can occur:
//a. document.createElement('custom-element')
//b. customElement.cloneNode()
//c. predictive parser
//
//And, there are some gotchas:
// 1. The _constructor()_ of the customElement of both document.createElement and .cloneNode can create new custom
//    elements, for example to put in its shadowDom.
//    This means that all these three methods can *nest* new constructor() calls inside.
//    The flags therefore has to work only *once* and then be *reset* by *both* the constructor itself for custom elements
//    and the method itself (for native elements).
//
// 2. Yes, the .cloneNode() *must* be called on the customElement itself for .parentNode to be undefined.
//    Yes, that means that it is likely sufficient to override .cloneNode from the HTMLElement class, and not Node.
//    But. It is possible that someone might call Node.cloneNode.call(customElement).
//    Since this plugin is meant to only be used during development to produce `SyntaxError`s,
//    we therefore monkeypatch Node.cloneNode().
//
// 3. There are two scenarios that are hard to distinguish:
//    a) two custom element constructor()s are called back-to-back and
//    b) a custom element constructor() is called that calls a new constructor() inside.
//    The best way to patch this is to depend on the beforescriptexecute event to continuously
//    reset a predictiveFlag before any customElement constructor() is called by the predictive parser.
//
//Problem X:
//             <script>new WebComp();</script><web-comp></web-comp>
//
//1. During the beforescriptexecute, there is no document.currentScript set.
//   We can therefore only use the beforescriptexecute to reset the first empty constructor.
//2. So, to recognize a customElement constructor, from within the constructor itself, we therefore check two things:
//   a) is the document.currentScript === null inside the constructor, this will not happen in any <script> that is
//      called while loading.
//   b) is this the first time an HTMLElement.constructor() is called since the last beforescriptexecute.

(function () {
  //upgradeInside throws a SyntaxError too.
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

  let flag = false;
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

  let flagPredictive = true;
  window.addEventListener('beforescriptexecute', () => flagPredictive = true, true);

  window.HTMLElement = class NoNewConstructorHTMLElement extends HTMLElement {

    constructor() {
      super();
      //1. predictive parser
      const fp = flagPredictive;
      flagPredictive = false;
      if (document.readyState === 'loading' && !document.currentScript && fp)
        return;
      //2. document.createElement and .cloneNode()
      if (flag) {
        flag = false;
        return;
      }
      //3. upgradeInside
      if (document.currentScript && document.currentScript.compareDocumentPosition(this) & Node.DOCUMENT_POSITION_CONTAINS)
        throw new SyntaxError(upgradeInsideErrorMessage(this.tagName.toLowerCase()));
      //4. new constructor()
      if (!(this.parentNode || this.attributes.length || this.childNodes.length))
        throw new SyntaxError(makeNEWErrorMessage(this));
      //5. the rest is fine
    }
  }
})();