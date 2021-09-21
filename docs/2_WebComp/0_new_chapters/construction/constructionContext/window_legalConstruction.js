/*
 * LegalHTMLElement
 * This monkeypatch inserts a class LegalHTMLElement for HTMLElement.
 * This class makes 'new' and upgrade inside throw 'Illegal constructor' error.
 */
(function () {
  class LegalHTMLElement extends HTMLElement {
    #emptyClone = false;

    constructor() {
      super();
      if (this.#emptyClone) return this.#emptyClone = false;
      const predictive = document.readyState === 'loading' && !document.currentScript; //parserFrame.type !== 'predictive';
      if (!predictive && !this.parentNode && !this.attributes.length && !this.childNodes.length)
        throw new SyntaxError('Illegal "new HTMLElement()" constructor');
      const upgradeInside = document.currentScript && document.currentScript.compareDocumentPosition(webComp) & Node.DOCUMENT_POSITION_CONTAINS; //parserFrame.type === 'upgrade' &&
      if (upgradeInside)
        throw new SyntaxError('Cannot define a custom element inside a tag of that custom element.');
    }

    cloneNode(deep) {
      this.#emptyClone = !this.attributes.length && !(deep && this.childNodes.length);
      return super.cloneNode(deep); //todo or super.cloneNode.call(this, deep)??
    }
  }

  const HTMLElementOG = Object.getOwnPropertyDescriptor(window, 'HTMLElement');
  Object.defineProperty(window, "HTMLElement", Object.assign(HTMLElementOG, {value: LegalHTMLElement}));
})();