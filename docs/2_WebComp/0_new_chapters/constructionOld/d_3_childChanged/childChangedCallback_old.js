(function () {

  // When are "childNodesReady" during the construction process?
  //
  // After loading, and during the sync methods of innerHTML and the like,
  // all the childNodes listed in HTML template are ready to be read during the constructor()
  // and can be written to during readyCallback().
  //
  // However, for elements a) in the *main document* b) *during loading*,
  // the childNodes read by the predictive parser (or upgraded from a sync, inside/within <script>) are
  // neither ready in the constructor(), readyCallback(), attributeChangedCallback(), nor connectedCallback().
  // In fact, here, childNodesReady is not until the predictive parser has reached a subsequent sibling element.
  // Ie, for elements in the main document, as long as document.currentScript is a DOM descendant of that element,
  // that element has not yet reached childNodesReady.
  //
  // When do we need to wait for childNodesReady?
  //
  // There are two mechanisms for declaratively control the style layout of elements transposed from the lightDom
  // into the shadowDom: CSS and <slot>. Both of these mechanisms have many flaws, and make it difficult to fulfill
  // a lot of use-cases for web component layout and style and modularization.
  // Therefore, web comp developers must often resort to js functions to alter
  // the shadowDom HTML structure "manually" achieve a layout or style effect.
  // We can call such scenarios PatchingLayoutOfShadowDomUsingJS.
  //
  // For example. Imagine that you have an element that organize a bunch of elements in a grid:
  // 4 elements or less, the grid is 2x2; 9 elements or less, 3x3. 16 elements or less, 4x4, etc.
  // Now, the web comp developer finds this difficult to control using <slot> and CSS,
  // and he must manually add `slot` attributes and alter the DOM to accomplish the task.
  // During loading, the browser may at different times during the parsing of the childNodes of this web component
  // trigger `slotchange` events. This might cause the web component to multiple times recalculate the layout,
  // which can produce an sequence of a) FOUC and b) be very inefficient and a likely source of bugs.
  // To avoid such FOUC and multiple shadowDom recalculations, the webcomp should therefore **wait** until
  // *childNodesReady* to calculate/show the shadowDom view (and any non-web-component-grid-positioned childNodes).
  //
  // Because the predictive parser will call the .constructor(), .attributeChangedCallback() and .connectedCallback()
  // on your elements *before* the childNodes are finished parsed, you want all elements that have a shadowRoot that
  // is childNode-sensitive to *wait* displaying *anything* until you are sure that you know that all children are parsed.
  // Ie. you want to *hide* the lightDom childNodes and *wait* to create the full shadowDom until childNodesReady().
  // And you do this by a) in the constructor() create an *empty* shadowRoot (ie. call `this.attachShadow({mode: "open"})`)
  // and nothing more and b) only in the childNodesReadyCallback() add a `<slot>` and other shadowDom elements.
  //
  // This is not a perfect solution. It can result in a big flash: if you hide your custom element, but then fill
  // in with a lot of native elements afterwards, then you might get a FOUC when a big element with lots of childNodes
  // are suddenly presented at domInteractive or another later point.
  //
  // This implementation assumes that NoNewHTMLElement prevents both "new constructor()" and "upgrade inside" from occuring.
  // Therefore, this implementation can for all cases but predictive parser call the previous childReadyCallback()
  // and only check the elements position during predictive parser.
  //

  //While loading, we can check the list of elements to see if any custom elements constructed while loading,
  //are childReady at a given point.
  //The now is given either as the document.currentScript or as a web component. at any point during the predictive parsing, we can check the element list to see if childReady can be called
  //on any custom elements created while loading .
  function runPredictive(now) {
    const list = constructionContext[0].list;
    const hit = list.findIndex(el => !(el.compareDocumentPosition(now) & Node.DOCUMENT_POSITION_CONTAINS));
    const go = list.splice(hit, Number.MAX_SAFE_INTEGER);
    for (let el of go)
      doChildReadyCallback(el);
  }

  function doChildReadyCallback(el) {
    try {
      el.childReadyCallback();
    } catch (err) {
      window.dispatchEvent(new Event("Uncaught Error", err)); //todo how?
    }
  }

  window.constructionContext = [];

  function startFrame(type) {
    if (document.readyState === "loading" && document.currentScript && constructionContext.length === 1/*constructionContext[0].type === 'predictive'*/)
      runPredictive(document.currentScript);
    constructionContext.unshift({type, child: undefined});
  }

  function endFrame() {
    constructionContext[0].child && doChildReadyCallback(constructionContext[0].child);
    constructionContext.shift();
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

  constructionContext.unshift({type: 'predictive', child: undefined, list: []});
  window.addEventListener('DOMContentLoaded', function endFramePredictive() {
    const {list} = constructionContext.unshift();
    for (let el of list)
      doChildReadyCallback(el);
  });

  class childReadyHTMLElement extends HTMLElement {

    constructor() {
      super();
      doChildReadyCallback(this);
      if (constructionContext[0].type !== 'predictive')
        doChildReadyCallback(this);
    }

    connectedCallback() {

      if (constructionContext[0].type !== 'predictive')
        return;
      runPredictive(this);
      constructionContext[0].childList.push(this);
    }
  }

  //monkeyPatch the HTMLElement so that it includes the childReadyCallback().
  const HTMLElementOG = Object.getOwnPropertyDescriptor(window, 'HTMLElement');
  Object.defineProperty(window, 'HTMLElement', Object.assign(HTMLElementOG, {value: childReadyHTMLElement}));
})();