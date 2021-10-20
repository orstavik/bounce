// NoNewConstructorHTMLElement

//Developer tool/monkeypatch that bans using *new* for custom HTMLElements.
//If this script is added before a script loads, then neither custom nor native HTMLElements can be constructed using new.
//Intended for use in a browser extension.

//Technically, a "new constructor()" is recognized by having:
//1. no parentNode
//2. no attributes
//3. no childNodes

//However, there are three other legal scenarios where no parentNode, no attributes, no childNodes can occur:
//a. document.createElement('custom-element')
//b. customElement.cloneNode()
//c. predictive parser
//
//And, there are some gotchas:
// 1. When a custom element is created using either document.createElement or .cloneNode, then
//    *inside* the constructor() of that customElement another custom element can be attempted constructed using new.
//    However, when a native element is constructed using either document.createElement or .cloneNode, then
//    there will not be an HTMLElement.constructor() callback.
//    This means that any flag set to mark document.createElement or .cloneNode as legal, must be turned off
//    *both* by a) the custom HTMLElement.constructor() as soon as possible and
//    b) the document.createElement or .cloneNode methods themselves when native elements are created.
//
// 2. Yes, the .cloneNode() *must* be called on the customElement itself for .parentNode to be undefined.
//    Yes, that means that it is likely sufficient to override .cloneNode from the HTMLElement class, and not Node.
//    But. It is possible that someone *could* call Node.cloneNode.call(customElement).
//    Since this plugin is meant to *only* be used during development to produce `SyntaxError`s,
//    we therefore choose to make it as safe as possible and thus monkeypatch Node.cloneNode().
//
// 3. During loading, when the custom element has a custom connectedCallback(), the MutationObserver watching the
//    document.childNodes.subtree will trigger as a microtask at the end of the connectedCallback() macro frame.
//    If the connectedCallback() then triggers a *new* HTMLElement.constructor() from inside a micro task that holds
//    the connectedCallback(), then it might get the flagPredictive wrongly. To avoid this problem, the
//    resetting of flagPredictive is done in a 4-level deep microtask.
//
// old. There are two scenarios that are hard to distinguish:
//    a) two custom element constructor()s are called back-to-back and
//    b) a custom element constructor() is called that calls a new constructor() inside.
//    The best way to patch this is therefore to reset the predictiveFlag at every possible break in the predictive parsing.
//    Every possible break during predictive parser is monitored like this.
//    to depend on the beforescriptexecute event to continuously
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

  let flagPredictive;
  if (document.readyState === 'loading') {
    flagPredictive = true;
    const mo = new MutationObserver(_ => flagPredictive = true);
    mo.observe(document.documentElement, {childList: true, subtree: true});
    window.addEventListener('readystatechange', _ => mo.disconnect(), {capture: true, once: true});
  }

  window.HTMLElement = class NoNewConstructorHTMLElement extends HTMLElement {

    constructor() {
      super();
      //1. predictive parser
      const predictiveOk = document.readyState === 'loading' && !document.currentScript && flagPredictive;
      flagPredictive = false;
      if (predictiveOk)
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