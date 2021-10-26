(function initConstructionFrameAPI() {
  /*
   * The ConstructionFrame API
   *
   *  1. construction-start. Dispatched immediately *before* a new constructionFrame starts.
   *  2. construction-end.   Dispatched immediately *after* a constructionFrame ends. Has one property,
   *                         .ended which is the constructionFrame recently dropped.
   *  3. construction-complete. Dispatched after a top constructionFrame ends. Has one property: .completed
   *                         which is a top-down iterator of all the frames completed.
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
    #parent;

    constructor(type, parent, el) {
      this.type = type;
      this.el = el;
      this.#parent = parent;
      this.#parent?.#children.push(this);
    }

    * #allFrames() {
      yield this;
      for (let child of this.#children)
        for (let desc of child.#allFrames())
          yield desc;
    }

    toString() {
      return this.#parent ? this.#parent.toString() + ', ' + this.type : this.type;
    }

    static start(type, el, Type, ...args) {
      const frame = now = new Type(type, now, el, ...args);
      window.dispatchEvent(new Event('construction-start'));
      return frame;
    }

    complete() {
      const completeEvent = new Event('construction-complete');
      completeEvent.completed = Array.from(this.#allFrames());     //todo I want to dispatch this on each frame. Not on the top frame only.
      window.dispatchEvent(completeEvent);
    }

    end() {
      now = this.#parent;  //todo I want the now to be set after the end.
      const endEvent = new Event('construction-end');
      endEvent.ended = this;
      window.dispatchEvent(endEvent);
      !this.#parent && this.complete();
    }

    //todo move this to the PredictiveConstructionFrame class
    static endPredictiveContexts(endedFrames) {
      const skips = endedFrames.map(({el}) => el);
      for (let i = endedFrames.length - 1; i >= 0; i--)
        endedFrames[i].end(skips);
    }

    static get now() {
      return now;
    }
  }

  function* recursiveNodes(el) {
    yield el;
    if (el.childNodes)
      for (let c of el.childNodes)
        for (let desc of recursiveNodes(c))
          yield desc;
  }

  function* recursiveNodesWithSkips(el, skips) {
    yield el;
    if (el.childNodes)
      for (let c of el.childNodes)
        if (skips.indexOf(c) >= 0)
          for (let desc of recursiveNodes(c))
            yield desc;
  }

  class UpgradeConstructionFrame extends ConstructionFrame {
    #nodes = [];
    #tagName;

    constructor(type, parent, el, tagName) {
      super(type, parent, el);
      this.#tagName = tagName;
    }

    get tagName() {
      return this.#tagName;
    }

    pushElement(el) {
      this.#nodes.push(el);
    }

    get nodes() {
      return Array.from(this.#nodes);
    }
  }

  class ShallowConstructionFrame extends ConstructionFrame {
    get nodes() {
      return [this.el];
    }
  }

  class DeepConstructionFrame extends ConstructionFrame {
    get nodes() {
      return Array.from(recursiveNodes(this.el));
    }
  }

  class DescendantConstructionFrame extends ConstructionFrame {
    get nodes() {
      return Array.from(this.el.childNodes).map(n => Array.from(recursiveNodes(n))).flat(2);
    }
  }

  function* siblingUntil(start, end) {
    for (let next = start; next !== end; next = next.nextSibling)
      yield next;
  }

  class InsertAdjacentHTMLConstructionFrame extends ConstructionFrame {
    #start;
    #end;

    constructor(type, parent, el, position) {
      super(type, parent, el);
      if (position === 'beforebegin')
        this.#start = el.previousSibling, this.#end = el;
      else if (position === 'after#end')
        this.#start = el, this.#end = el.nextSibling;
      else if (position === 'afterbegin')
        this.#start = undefined, this.#end = el.firstChild;
      else if (position === 'before#end')
        this.#start = el.lastChild, this.#end = undefined;
    }

    get nodes() {
      return Array.from(siblingUntil(this.#start, this.#end)).map(c => Array.from(recursiveNodes(c))).flat(2);
    }
  }

  class PredictiveHTMLConstructionFrame extends ConstructionFrame {
    #skips;

    end(skips) {
      this.#skips = skips;
      super.end();
    }

    get nodes() {
      return Array.from(recursiveNodesWithSkips(this.el, this.#skips)).map(c => Array.from(recursiveNodes(c))).flat(2);
    }
  }

  function wrapConstructionFunction(og, type, Type) {
    return function constructHtmlElement(...args) {
      const frame = ConstructionFrame.start(type, this, Type, ...args);
      const res = og.call(this, ...args);
      frame.end();
      //todo after this point, the .elements property is no longer safe.
      return res;
    };
  }

  function monkeyPatch(proto, prop, setOrValue, Type) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
    descriptor[setOrValue] = wrapConstructionFunction(descriptor[setOrValue], proto.constructor.name + '.' + prop, Type);
    Object.defineProperty(proto, prop, descriptor);
  }

  monkeyPatch(Element.prototype, "outerHTML", 'set', DeepConstructionFrame);
  monkeyPatch(Element.prototype, "innerHTML", 'set', DescendantConstructionFrame);
  monkeyPatch(ShadowRoot.prototype, "innerHTML", 'set', DescendantConstructionFrame);
  monkeyPatch(Element.prototype, "insertAdjacentHTML", 'value', InsertAdjacentHTMLConstructionFrame);
  monkeyPatch(Node.prototype, "cloneNode", 'value', DeepConstructionFrame);
  monkeyPatch(Document.prototype, "createElement", 'value', ShallowConstructionFrame);
  monkeyPatch(CustomElementRegistry.prototype, "define", 'value', UpgradeConstructionFrame);

  // if (document.readyState !== 'loading')
  //   return;

  /*
   * PREDICTIVE PARSER
   */
  function endTagRead(el, lastParsed) {
    return el !== lastParsed && el.compareDocumentPosition(lastParsed) !== 20;
  }

  const frames = [];

  function onParseBreak(e) {
    now = undefined;
    const endTagReadElement = frames.findIndex(({el}) => endTagRead(el, e.target));
    if (endTagReadElement < 0)
      return;
    ConstructionFrame.endPredictiveContexts(frames.splice(endTagReadElement));
    if (endTagReadElement)
      return;
    document.removeEventListener('beforescriptexecute', onParseBreak, true);
    document.removeEventListener('readystatechange', onParseBreak, true);
  }

  function predictiveConstructionFrameStart(el) {
    if (!frames.length) {
      document.addEventListener('beforescriptexecute', onParseBreak, true);
      document.addEventListener('readystatechange', onParseBreak, true);
    }
    frames.push(ConstructionFrame.start('predictive', el, PredictiveHTMLConstructionFrame));
  }

  class PredictiveConstructionFrameHTMLElement extends HTMLElement {
    constructor() {
      super();
      !now && predictiveConstructionFrameStart(this);
    }
  }

  class UpgradeConstructionFrameHTMLElement extends PredictiveConstructionFrameHTMLElement {
    constructor() {
      super();
      now?.type === 'CustomElementRegistry.define' && this.tagName === now.tagName && now.pushElement(this);
    }
  }

  window.HTMLElement = UpgradeConstructionFrameHTMLElement;

  function dropParentPrototype(proto) {
    Object.setPrototypeOf(proto, Object.getPrototypeOf(Object.getPrototypeOf(proto)));
  }

  window.addEventListener('readystatechange',
    () => dropParentPrototype(UpgradeConstructionFrameHTMLElement.prototype), {once: true, capture: true});
})();