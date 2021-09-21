/*
 * LegalHTMLElement
 * This monkeypatch inserts a class LegalHTMLElement for HTMLElement.
 * This class makes 'new' and upgrade inside throw 'Illegal constructor' error.
 */
(function () {
  let allowEmptyConstruction = false;

  class LegalHTMLElement extends HTMLElement {

    constructor() {
      super();
      if (allowEmptyConstruction) return;
      const predictive = document.readyState === 'loading' && !document.currentScript; //parserFrame.type !== 'predictive';
      if (!predictive && !this.parentNode && !this.attributes.length && !this.childNodes.length)
        throw new SyntaxError('Illegal "new HTMLElement()" constructor');
      const upgradeInside = document.currentScript && document.currentScript.compareDocumentPosition(this) & Node.DOCUMENT_POSITION_CONTAINS; //parserFrame.type === 'upgrade' &&
      if (upgradeInside)
        throw new SyntaxError('Cannot define a custom element inside a tag of that custom element.');
    }

    cloneNode(deep) {
      allowEmptyConstruction = !this.attributes.length && !(deep && this.childNodes.length);
      const res = super.cloneNode(deep);
      allowEmptyConstruction = false;
      return res;
    }
  }

  const HTMLElementOG = Object.getOwnPropertyDescriptor(window, 'HTMLElement');
  Object.defineProperty(window, "HTMLElement", Object.assign(HTMLElementOG, {value: LegalHTMLElement}));

  const createElementOG = Object.getOwnPropertyDescriptor(Document.prototype, 'createElement');

  function createElement(...args) {
    allowEmptyConstruction = true;
    const res = createElementOG.value.call(document, ...args);
    allowEmptyConstruction = false;
    return res;
  }

  Object.defineProperty(Document.prototype, "createElement", Object.assign({}, createElementOG, {value: createElement}));

})();