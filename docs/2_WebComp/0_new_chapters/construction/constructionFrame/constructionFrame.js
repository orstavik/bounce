(function initConstructionFrameAPI() {
  /*
   * The ConstructionFrame API
   *
   *  1. construction-start. Dispatched immediately *before* a new constructionFrame starts.
   *  2. construction-end.   Dispatched immediately *after* a constructionFrame ends. Has one property,
   *                         .ended which is the constructionFrame recently dropped.
   *
   * The ConstructionFrame API depends on:
   *  1. beforescriptexecute event.
   *  2. NoNewConstructorHTMLElement.
   *     The NoNewContructorHTMLElement essentially ensures that no 'new HTMLElement()' constructor is called directly.
   *     This is a restriction that applies to native elements, and this restriction is extended to custom elements.
   *     The ConstructionFrame API will produce wrong events if used with 'new HTMLElement.constructor()',
   *     but error management is not included to make the ConstructionFrame API faster in production.
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
   *  { predictive:comp-a { innerHTML:comp-b { createElement:comp-c } } }
   *
   * Problem 1: main document nests lightDom branches while loading
   * While loading, the browser can create custom elements directly. And while loading, the browser's parser
   * may be delayed for a long time while waiting for sync <scripts>. And with custom web components that direct layout,
   * you need to load custom elements synchronously and block rendering to avoid FOUC.
   *
   * This creates a situation where you wish to mark the *end* of a construction frame as early as possible, ie.
   * on a per element level. When we mark a construction frame for an individual element, the frame begins just before
   * the start tag is read and ends when the end tag is read. As there is no possible means to know when the end tag is,
   * the document frame would end as soon as possible after the end tag is read.
   *
   * The per element construction frames that are created when the predictive parser calls the custom element constructor
   * directly is called a "predictive construction frame".
   *
   * We make "predictive construction frames" with a somewhat complex mechanism:
   * 1. every time an HTMLElement.constructor() is called directly by the predictive parser, we start a new
   *    predictive constructionFrame and issue a construction-start event. all predictive constructionFrames will have
   *    an empty parent construction frame (ie. be a root construction frame).
   * 2. then, every time the predictive parser breaks to either a) run a script or b) run another custom element constructor,
   *    ie. at beforescriptexecute time during loading, then the mechanism will check if the endTag of the custom element
   *    whose constructor triggered the predictive construction frame has been read.
   * 3. If the endTag of the custom element that triggered the predictive frame has been read, the construction-end event
   *    is dispatched for that predictive construction frame.
   * 4. This means that predictive construction frames for parent nodes will remain open (but no longer be accessible from
   *    ConstructionFrame.now) while the predictive construction frames of the light dom child nodes are also active.
   * 5. For nested construction frame contexts, construction contexts start and end recursively.
   *    A predictive construction frame associated with a descendant element will always end before
   *    a predictive construction frame associated with an ancestor element.
   *
   * The ConstructionFrame API is a low level API. It is not intended to be used directly, but intended for use by other
   * API such as attributeReadyCallback() and childReadyCallback() APIs.
   * These APIs need mainly to listen for construction-end events so that they can trigger
   * attributeReadyCallback() and childReadyCallback() at the correct time.
   */
  let now;

  window.ConstructionFrame = class ConstructionFrame {

    #children = [];

    constructor(type, parent) {
      this.type = type;
      this.parent = parent;                             //todo make parent hidden again.
      this.parent?.#children.push(this);
    }

    toString() {
      return this.parent ? this.parent.toString() + ', ' + this.type : this.type;
    }

    static start(type) {
      const frame = now = new ConstructionFrame(type, now);
      window.dispatchEvent(new Event('construction-start'));
      return frame;
    }

    static end(frame) {
      const endEvent = new Event('construction-end');
      endEvent.ended = frame;
      window.dispatchEvent(endEvent);
    }

    static get now() {
      return now;
    }
  }

  function wrapConstructionFunction(og, type) {
    return function constructHtmlElement(...args) {
      const frame = ConstructionFrame.start(type);
      const res = og.call(this, ...args);
      now = frame.parent;                                        //todo make parent hidden again.
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

  if (document.readyState !== 'loading')
    return;

  /*
   * PREDICTIVE PARSER
   */
  function endTagRead(el, lastParsed) {
    return el !== lastParsed && el.compareDocumentPosition(lastParsed) !== 20;
  }

  function dropParentPrototype(proto) {
    Object.setPrototypeOf(proto, Object.getPrototypeOf(Object.getPrototypeOf(proto)));
  }

  const frames = [];

  function onParseBreak(e) {
    now = undefined;
    const endTagReadElement = frames.findIndex(({el}) => endTagRead(el, e.lastParsed));
    if (endTagReadElement < 0) return;
    const endedContexts = frames.splice(endTagReadElement);
    for (let i = endedContexts.length - 1; i >= 0; i--)
      ConstructionFrame.end(endedContexts[i].frame);
    !endTagReadElement && window.removeEventListener('beforescriptexecute', onParseBreak, true);
  }

  function predictiveConstructionFrameStart(el) {
    !frames.length && window.addEventListener('beforescriptexecute', onParseBreak, true);
    const frame = ConstructionFrame.start('predictive');
    frames.push({el, frame});
  }

  class ConstructionFrameHTMLElement extends class OnlyWhileLoadingHTMLElement extends HTMLElement {
    constructor() {
      super();
      !now && predictiveConstructionFrameStart(this);
    }
  } {
  }

  HTMLElement = ConstructionFrameHTMLElement;
  window.addEventListener('readystatechange',
    () => dropParentPrototype(ConstructionFrameHTMLElement.prototype), {once: true, capture: true});
})();