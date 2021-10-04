/*
 * LegalHTMLElement
 * This monkeypatch inserts a class LegalHTMLElement for HTMLElement.
 * This class makes 'new' and upgrade inside throw 'Illegal constructor' error.
 */
(function () {
  let allowDocumentCreateElement = false;
  let predictivePoint;

  //We need two different LegalHTMLElement.
  //One during loading, and one after dom interactive.

  class LegalHTMLElement extends HTMLElement {

    constructor() {
      super();
      if (allowDocumentCreateElement) return;
      const canBePredictive = document.readyState === 'loading' && !document.currentScript; //parserFrame.type !== 'predictive';
      if(canBePredictive && predictivePoint)
        throw new Error('This is a new call from within a canBePredictive call');
      if (!canBePredictive && !this.parentNode && !this.attributes.length && !this.childNodes.length)
        throw new SyntaxError('Illegal "new HTMLElement()" constructor');
      const upgradeInside = document.currentScript && document.currentScript.compareDocumentPosition(this) & Node.DOCUMENT_POSITION_CONTAINS; //parserFrame.type === 'upgrade' &&
      if (upgradeInside)
        throw new SyntaxError('Cannot define a custom element inside a tag of that custom element.');
    }

    cloneNode(deep) {
      allowDocumentCreateElement = !this.attributes.length && !(deep && this.childNodes.length);
      const res = super.cloneNode(deep);
      allowDocumentCreateElement = false;
      return res;
    }
  }

  const HTMLElementOG = Object.getOwnPropertyDescriptor(window, 'HTMLElement');
  Object.defineProperty(window, "HTMLElement", Object.assign(HTMLElementOG, {value: LegalHTMLElement}));

  const createElementOG = Object.getOwnPropertyDescriptor(Document.prototype, 'createElement');

  function createElement(...args) {
    allowDocumentCreateElement = true;
    const res = createElementOG.value.call(document, ...args);
    allowDocumentCreateElement = false;
    return res;
  }

  Object.defineProperty(Document.prototype, "createElement", Object.assign({}, createElementOG, {value: createElement}));

})();