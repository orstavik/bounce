;
//todo during predictive, then we have two situations.
// a. The next element can be a descendant, then we should say that no childNodes are ready, even though a handful might be
// b. The next element is a sibling branch, then we should say that all childNodes are ready.
// c. It should be an either/or. all children are ready, or no children are ready.
//    and then we can signal that by having this.childNodes.length !== newChildNodes.
//    But that is very confusing. No, it is better to wait with the first callback until DCL. Or until

// during the a) sync loading, HTMLElements in b) the main document are constructed *half parsed*. This only applies to
// main document elements, not HTMLElements in strings such as innerHTML. Put simplistically, *half parsed* means that
// the start tag is constructed *before* the childNodes are ready. This can *only* happen in *two* contexts:
// 1. predictive
// 2. upgrade
// 1 & 2 are the *only* ways that custom HTMLElements in the main document are created.
// The DCL is the time that the *whole* main document is known.
//
// In both 1 and 2, attributeChangedCallback and connectedCallback is called for the element, and in those callbacks
// all attributes are known. So, the *half parsed* is not a problem for readyCallback. But, in both 1 and 2, it can be
// difficult to track when the elements childNodes are ready. Here, we need to assess the "within" situation.
//
// The WithinSituation only occur during the construction of an element in the predictive or upgrade situation.
// The within situation is a problem for childCallback, because it triggers the construction of an element *before*
// the children of the previous element is added to the childList of that element.
// To assess if there is a within situation for a particular element, we need the following test:
// 1. is the upgrade within, is document.currentScript a DOM descendant of the HTMLElement being constructed?
// 2. predictive, is the now element triggering the check a DOM descendant
// of the previous HTMLElement being constructed?
// The list of these elements is shared, it is a common list for all main document elements being constructed,
// shared by both the sync upgrade and predictive construction.
// upgrade
//   sync upgrade
//     upgrade within
// predictive
//   predictive constructor
// which previous HTMLElements being constructed are we not yet within?

// predictive within, this is a descendant of child, then wait..
// upgrade within, currentScript is within this element

// predictive and upgrade, the child being tested is not an ancestor of either the now element or currentScript.

(function () {

  //there are two different scenarios for childChanged during construction
  //1. *after* loading is complete, the children are always known at the beginning of construction (also during upgrade).
  //   Therefore, they can always be called by the next constructor for the same frame, or
  //   at the tail end of the construction frame. We call this childChangedSimple.
  //2. *while* loading, the children are:
  //   1. known for all but the predictive and upgrade scenarios. For these construction frames, we call childChanged in
  //      "simple sequence".
  //   2. for predictive parser elements, the children might become known at a point.
  //      This point cannot be precisely specified as we cannot get a callback anytime a new sync <script> tag begins
  //      execution. Instead, we therefore keep the construction frame running or sync upgrade elements, the children are , the children *might* be

  function childChangedSimple(el) {
    constructionContext[0].child && doChildChangedCallback(constructionContext[0].child);
    el.childNodes.length && (constructionContext[0].child = el);
  }

  function childChangedLoading(el) {
    /*    if (!document.readyState === "loading")
          childChangedSimple(el);      //after loading, children are always parsed before constructor
        else*/
    if (!document.currentScript)
      childChangedPredictive(el);  //predictive children are never parsed before constructor
    else if (constructionContext[0].type === 'CustomElementRegistry.define')
      childChangedSyncUpgrade(el);  //upgrade children might be triggered either during parsing or after parsing
    else
      childChangedSimple(el);
    //if a script triggers innerHTML or cloneNode or something during loading, this doesn't affect the main document parsing.
    //this essentially means that we don't bother checking to see if any not yet ready predictive/upgrade childChanged are called.
    //there are race conditions that might occur here, but we are ok with that.
  }

  let partials;

  function childChangedPredictive(now) {
    while (partials.length && !(now.compareDocumentPosition(partials[0]) & Node.DOCUMENT_POSITION_CONTAINED_BY)) {
      const parsed = partials.shift();
      parsed.childNodes.length && doChildChangedCallback(parsed);
    }
    partials.push(now);
  }

  function childChangedSyncUpgrade(el) {
    partials.push(el);
    const now = document.currentScript;
    while (partials.length && !(now.compareDocumentPosition(partials[0]) & Node.DOCUMENT_POSITION_CONTAINED_BY)) {
      const parsed = partials.shift();
      parsed.childNodes.length && doChildChangedCallback(parsed);
    }
  }

  let childChanged = childChangedSimple;
  if (document.readyState === "loading") {
    partials = [];
    childChanged = childChangedLoading;
    window.addEventListener("DOMContentLoaded", function (e) {
      childChanged = childChangedSimple;
      for (let parsed of partials)
        parsed.childNodes.length && doChildChangedCallback(parsed);
      //partials = undefined;
    });
  }
  //List of elements that are constructed either by predictive parser or sync upgrade during loading of main document.

  //During loading, scripts can be triggered in two ways:
  //1. sync scripts. This *always* sets document.currentScript property to a `<script>` element value
  //2. the constructor(), attributeChangedCallback() and connectedCallback() of an already (sync) defined web component.
  //For the childChangedCallback() we can therefore now that there will always be a now/Therefore, we can assume that we during loading will have the lastParsedElement as this/document.currentScript

  const previousChildren = new WeakMap();

  function doChildChangedCallback(el) {
    const old = previousChildren.get(el);
    const now = Array.from(el.childNodes);
    previousChildren.set(el, now);
    try {
      el.childChangedCallback(old, now); //todo wrap in a method that gives the
    } catch (err) {
      window.dispatchEvent(new Event("Uncaught Error", err)); //todo how?
    }
  }

  /*
   * constructionContext.
   * The context now cache the last constructed element that has yet to call .readyCallback()
   *
   * At the end of each constructionContext, if the last constructed element did not call .readyCallback(),
   * then call it before the constructionContext ends.
   */
  window.constructionContext = [];

  function startFrame(type) {
    constructionContext.unshift({type, child: undefined});
  }

  function endFrame() {
    childChanged(null);
    constructionContext.shift();
  }

  function wrapConstructionFunction(og, type) {
    return function (...args) {
      const predictiveOrSyncUpgrade = type === 'predictive' || type === 'CustomElementRegistry.define' && document.readyState === 'loading';
      startFrame(type, predictiveOrSyncUpgrade ? [] : null);
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

  startFrame('predictive');
  constructionContext[0].child = [];  //setting the child to be a list
  window.addEventListener('DOMContentLoaded', endFrame);


  class LegalHTMLElement extends HTMLElement {
    constructor() {
      super();
      //On its own, this demo is naive.
      //when new Element() is called:
      // 1. sync/during predictiveParser, then constructionContext[0] = predictive parser context (which is wrong).
      // 2. async/after DCL, then constructionContext[0] is undefined.
      //    Thus new Element() cannot work with readyCallback().
      const thisIsNew = !constructionContext[0] || constructionContext[0].type === 'predictive' && document.currentScript;
      if (thisIsNew) //this is
        throw Error('Illegal constructor: ' + location.hash);
    }
  }

  class ChildChangedHTMLElement extends LegalHTMLElement {

    constructor() {
      super();
      childChanged(this);
    }
  }

  //monkeyPatch the HTMLElement so that it includes the childChangedCallback().
  const HTMLElementOG = Object.getOwnPropertyDescriptor(window, 'HTMLElement');
  Object.defineProperty(window, 'HTMLElement', Object.assign(HTMLElementOG, {value: ChildChangedHTMLElement}));
})();