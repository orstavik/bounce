(function () {
  /*
   * window.constructionFrames is an array that illustrate the construction frames for HTMLElement construction.
   * window.constructionFrameStart is a function that is called every time a new HTMLElement construction frame starts.
   *   the constructionFrameStart receives one parameter: type name for the HTMLElement construction method.
   * window.constructionFrameEnd is a function that is called every time a new HTMLElement construction frame ends.
   *
   * When upgrading and fixing the callbacks on the HTMLElement for attributeReadyCallback() and childReadyCallback(),
   * then you need to patch into the constructionFrameEnd() function.
   */
  window.constructionFrames = [];
  
  window.constructionFrameStart = function constructionFrameStart(type){
    constructionFrames.unshift({type});
  } 

  window.constructionFrameEnd = function constructionFrameEnd(){
    return constructionFrames.shift();
  } 

  function wrapConstructionFunction(og, type) {
    return function constructHtmlElement(...args) {
      constructionFrameStart(type, ...args);
      const res = og.call(this, ...args);
      constructionFrameEnd();
      return res;
    };
  }

  function monkeyPatch(proto, prop, setOrValue) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
    descriptor[setOrValue] = wrapConstructionFunction(descriptor[setOrValue], proto.constructor.name + '.' + prop);
    Object.defineProperty(proto, prop, descriptor);
  }

  monkeyPatch(Element.prototype, "outerHTML", 'set');
  monkeyPatch(Element.prototype, "innerHTML", 'set');
  monkeyPatch(ShadowRoot.prototype, "innerHTML", 'set');
  monkeyPatch(Element.prototype, "insertAdjacentHTML", 'value');
  monkeyPatch(Node.prototype, "cloneNode", 'value');
  monkeyPatch(Document.prototype, "createElement", 'value');
  monkeyPatch(CustomElementRegistry.prototype, "define", 'value');

  if (document.readyState === "loading") {
    constructionFrameStart('predictive');
    window.addEventListener('readystatechange', constructionFrameEnd);
  }
})();