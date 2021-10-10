(function () {
  /*
   * The ConstructionFrame API
   *
   *  1. construction-start. Dispatched *before* a new constructionFrame starts: .now
   *  2. construction-end. Dispatched *before* a constructionFrame ends: .now and .ended
   *
   * The ConstructionFrame API depends on:
   *  1. NoNewConstructorHTMLElement.
   *     The NoNewContructorHTMLElement essentially ensures that no 'new HTMLElement()' constructor is called directly.
   *     This is a restriction that applies to native elements, and this restriction is extended to custom elements.
   *     The ConstructionFrame API will not produce correct extra callbacks if used with 'new constructor()',
   *     but error management is not included to make the ConstructionFrame API faster in production.
   *  2. beforescriptexecute event.
   *
   * Whenever a custom element is defined and referenced in an HTMLElement construction method or template, then
   * the browser will call all the callbacks *sync* for those elements as part of the construction process.
   * This means that the construction HTMLElements nests and branch out as a tree when for example as a custom element
   * creates a shadowDom with one or more other custom elements. We call the nodes in this graph for constructionFrames.
   *
   * Example:
<script>
  class CompA extends HTMLElement{
    constructor(){
      super();
      this.attachShadow();
      this.shadowRoot.innerHTML = '<comp-b></comp-b>';
    }
  }
  class CompB extends HTMLElement{
    constructor(){
      super();
      this.attachShadow();
      const c = document.createElement('comp-c');
      this.shadowRoot.appendChild(c);
    }
  }
  class CompC extends HTMLElement{
    constructor(){
      super();
      this.attachShadow();
      this.shadowRoot.innerHTML = 'hello sunshine';
    }
  }
  customElements.define('comp-c', CompC);
  customElements.define('comp-b', CompB);
  customElements.define('comp-a', CompA);
</script>.
<comp-a></comp-a>
   *
   *  In this example, the constructionFrame will nest like this:
   *  { predictive:html { branch:comp-a { innerHTML:comp-b { createElement:comp-c } } } }
   *
   * Problem 1: main document nests lightDom branches while loading
   * While loading, the browser can create custom elements directly. And while loading, the browser's parser
   * may be delayed for a long time while waiting for sync <scripts>. And with custom web components that direct layout,
   * you need to load custom elements synchronously and block rendering to avoid FOUC.
   *
   * This creates a situation where you wish to *nest* custom element lightDom children in the main document *more or less*
   * as if they were shadowDom constructionFrames. This can for example enable the browser to call childReadyCallback on
   * a completed branch in the main document, while still waiting for another script to load.
   *
   * We accomplish this with a fairly complex mechanism:
   * 1. every time a constructor() is called directly by the predictive parser, we nest them according to their lightDom
   *    position. This means that custom element descendant nodes in the main document are construction frame descendants
   *    too.
   * 2. The main document lightDom branches don't finish until the parser has definitively parsed the endTag of the custom
   *    element node.
   * 3. We therefore
   *    a) create a new constructionFrame each time the predictive parser directly calls a custom element constructor(), and
   *    b) use the beforescriptexecute event to check when the constructionFrame ends.
   * 4. todo When such delayed constructionFrames end, should they be called bottom up or top down?
   *     I think always bottom up, but then we do it differently with childReadyCallback.
   *     Here we do it only on either top level, or second top level if it begins with predictive.
   *
   * The ConstructionFrame API is a low level API. It is not intended to be used directly, but intended for use by other
   * API such as attributeReadyCallback() and childReadyCallback() APIs.
   * These APIs need mainly to listen for construction-end events so that they can trigger the callbacks at the
   * appropriate times.
   */
  let now;

  class ConstructionFrame {

    #children = [];
    #parent;
    #finished = false;

    constructor(type) {
      this.type = type;
    }

    toString() {
      let el = this;
      const stack = [el];
      while (el.#parent) stack.unshift(el = el.#parent);
      return stack.map(el => el.type).join(', ');
    }

    static make(type) {
      const frame = new ConstructionFrame(type);
      frame.#parent = now;
      frame.#parent?.#children.push(frame);
      return now = frame;
    }

    static start(type) {
      const startEvent = new Event('construction-start');
      const frame = startEvent.now = ConstructionFrame.make(type);
      window.dispatchEvent(startEvent);
      return frame;
    }

    static end(frame) {
      frame.#finished = true;
      //Commonly: frame === now,
      //but. Nested predictive.branches are not, and then we don't.
      frame === now && (now = now.#parent);
      const endEvent = new Event('construction-end');
      endEvent.now = now;
      endEvent.ended = frame;
      window.dispatchEvent(endEvent);
    }

    static get now(){
      return now;
    }
  }

  function wrapConstructionFunction(og, type) {
    return function constructHtmlElement(...args) {
      const frame = ConstructionFrame.start(type);
      const res = og.call(this, ...args);
      ConstructionFrame.end(frame);
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

  /*
   * PREDICTIVE PARSER
   */
  function endTagRead(el, lastParsed) {
    return el !== lastParsed && el.compareDocumentPosition(lastParsed) !== 20;
  }

  const frames = [];

  function observeFrame(el, frame) {
    !frame.length && window.addEventListener('beforescriptexecute', checkPredictiveBranchEnd);
    frames.push({frame, el});
  }

  function checkPredictiveBranchEnd(e) {
    const ended = frames.findIndex(({el}) => endTagRead(el, e.lastParsed));
    if (ended === -1)
      return;
    const endedFrames = frames.splice(ended);
    for (let i = endedFrames.length - 1; i >= 0; i--)
      ConstructionFrame.end(endedFrames[i].frame);
    if (frames.length === 0) window.removeEventListener('beforescriptexecute', checkPredictiveBranchEnd);
  }

  if (document.readyState === "loading") {

    const predictiveFrame = ConstructionFrame.start('predictive');

    const HTMLElementOG = HTMLElement;

    class WhileLoadingHTMLElement extends HTMLElement {
      constructor() {
        super();
        if (ConstructionFrame.now.type === 'predictive' || ConstructionFrame.now.type === 'branch')
          observeFrame(this, ConstructionFrame.start('branch'));
      }
    }

    const patchedClass = window.HTMLElement = class ConstructionFrameHTMLElement extends WhileLoadingHTMLElement {
    };

    window.addEventListener('readystatechange', function () {
      Object.setPrototypeOf(patchedClass.prototype, HTMLElementOG.prototype);  //todo test this, don't remember exactly how
      ConstructionFrame.end(predictiveFrame);
    }, {once: true, capture: true});
  }
})();