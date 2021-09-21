/*
 * ConstructionContext
 * This monkeypatch creates a constructionContext array whose head element will always be the current mode of element construction.
 */
(function () {
  window.constructionContext = [];

  function wrapConstructionFunction(og, type) {
    return function (...args) {
      constructionContext.unshift(type);
      const res = og.call(this, ...args);
      constructionContext.shift();
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

  constructionContext.unshift('predictive');
  window.addEventListener('DOMContentLoaded', function () {
    constructionContext.shift();
  });
})();