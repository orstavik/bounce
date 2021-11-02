/**
 * beforescriptexecute polyfill
 *
 * The beforescriptexecute event is dispatched before a <script> is triggered during loading of the main document.
 * As such, the beforescriptexecute event signify a break when the parser switches from adding native elements into the
 * DOM to running some JS script.
 *
 * However, with web components there are *two* ways that JS scripts/functions can be triggered during loading:
 * 1. the good old <script> and <script async>, and
 * 2. the constructor(), attributeChangedCallback(), and connectedCallback() of elements already defined and
 *    placed in the DOM.
 *
 * The original Firefox beforescriptexecute event only triggers before <script> elements (1), and
 * *not* before custom element constructor() and ...Callback()s.
 *
 * The beforescriptexecute polyfill triggers before *both* custom elements *and* custom element constructors(),
 * with the following *two* exceptions:.
 * a. If the last element added to the DOM is the same, then there will be no second beforescriptevent,
 *    even though two different scripts are technically triggered. There are two examples of such a situation:
 *    I.  <script>console.log('script1');</script><web-comp><web-comp>
 *    II. <web-comp-x></web-comp-x><web-comp><web-comp>   where web-comp-x implements connectedCallback().
 *
 *    When a web component's <start-tag> *immediately* follows either a <script> or another <web-comp-x>
 *    (and where web-comp-x implements a custom connectedCallback()),
 *    then there will be no beforescriptexecute trigger *before* the web-comp constructor.
 *
 * Note: When would a custom element start tag immediately follow a <script>, <start-tag>, or <end-tag>?
 * 1. For some container elements whitespace might be meaningful. In such container elements no whitespace is meaningful.
 * 2. An html minifier of some sort might remove all whitespace.
 * In such situations custom elements *can* immediately follow either <script> or
 * other custom elements' <start-tag> or <end-tag>. And in such sitautions, no beforescriptexecute event will be
 * dispatched.
 *
 * WhatIs: the `.target` of the `beforescriptexecute` polyfill event?
 *
 * The `target` of the `beforescriptexecute` event is the last element the parser has added to the DOM.
 * a) For sync `<script>`'s that is the <script> element itself. The <script> element is always added to the DOM before the
 * javascript functions it contains are triggered.
 * b) When web component constructors are triggered, the web component itself is not yet added to the DOM.
 *    This means that the last element added by the parser to the DOM is either a) a previous sibling node, b) the parent
 *    element, or c) a descendant of a previous sibling.
 *
 * Most commonly, web component start tags are preceded by whitespace. Therefore, most commonly the `target` of a
 * beforescriptexecute event would be a text node.
 *
 * How is the beforescriptexecute polyfill implemented?
 *
 * During "loading"/interpretation of the main document a
 *    `new MutationObserver(callback).observe(document.documentElement, {childList: true, subtree: true});`
 * will aggregate all changes and only *break off* and trigger either
 * 1. as a separte macro-task *before* a <script> begins,
 * 2. as a micro-task that is added to a connectedCallback() macro-task for an already defined custom element,
 * 3. as a separate macro-task *before* the constructor() of an already defined custom element,
 *    iff that custom element doesn't immediately follow either
 *    a) a </script> of a sync script,
 *    b) the startTag <web-comp-x>,   (*)
 *    c) the endTag </web-comp-x>, or (*)
 *    *) where <web-comp-x> implements a custom connectedCallback().
 *
 * Important test case 1:
 *    a) Imagine the main document containing two *sibling* custom element tags
 *    with **NO** whitespace in between:
 *       <a-a></a-a><b-b></b-b>
 *
 *    <a-a>'s definition implement a custom connectedCallback().
 *    Here, there should be no beforescriptexecute event dispatched before <b-b>.
 *
 *    b) Imagine the main document containing two *nested* custom element tags:
 *       <a-a><b-b></b-b></a-a>
 *
 *    <a-a>'s definition implement a custom connectedCallback().
 *    Here, there should be no beforescriptexecute event dispatched before <b-b>.
 *
 * Important test case 2:
 *    There should be no beforescriptexecute event after the first <script defer> has begun
 *    or after the first 'readystatechange' event that marks the start of document.readyState === 'interactive'
 */

//connectedCallback macro-task mixup
//
// When the predictive parser creates an already defined web-comp that:
// 1) has NO constructor() definition,
// 2) triggers NO attributeChangedCallback(), and
// 3) triggers only a .connectedCallback(), then
// !!BAD!! the MO callback will run inside the same macro-task as the web-comp.connectedCallback().
// This is bad because we want all parser-breaks to have their own macrotask.
// Therefore, the ParserObserver will not call a break in these instances.

(function () {

  function touchDom(c) {
    document.head.append(c = new Comment());
    c.remove();
  }

  function lastAddedNode(mrs) {
    const nodes = mrs[mrs.length - 1].addedNodes;
    return nodes[nodes.length - 1];
  }

  function* addedNodes(mrs) {
    //todo the dynamic add/remove comment patch for readystatechange event adds the #comment in Chrome and FF, but not Safari.
    for (let {addedNodes} of mrs)
      if (addedNodes)
        for (let n of addedNodes)
          yield n;
  }

  function endTagUnknown(n) {
    const res = [];
    for (; n; n = n.parentNode)
      n.nodeType === Node.ELEMENT_NODE && n.tagName !== "SCRIPT" && res.unshift(n);
    return res;
  }

  window.ParserObserver = class ParserObserver {
    #cb1;
    #mo;
    #stillOpen = [];

    constructor(onEveryBreakCb) {
      if (document.readyState !== 'loading')
        throw new Error('new ParserObserver(..) can only be created while document is loading');
      this.#cb1 = onEveryBreakCb;

      this.#mo = new MutationObserver(mrs => {
        if (document.currentScript)            //1. skip DOM mutation inside <script>
          return;
        if (document.readyState !== 'loading') //2. The last MO is the end, not a break.
          return this.disconnect(mrs);
        const node = lastAddedNode(mrs);
        if (node.connectedCallback)            //3. .connectedCallback() macro-task mixup
          return;
        this.#onBreak(node, mrs);
      });
      this.#mo.observe(document.documentElement, {childList: true, subtree: true});
      //chrome and firefox runs 'readystatechange:interactive' before the last MO trigger.
      //thus, to force the last MO trigger in the same macrotask, we do a mutation on the body
      document.addEventListener('readystatechange', touchDom, {capture: true, once: true});
    }

    #onBreak(target, mrs) {
      const stillOpen = endTagUnknown(target);
      const ended1 = this.#stillOpen.filter(n => stillOpen.indexOf(n) === -1);
      this.#stillOpen = stillOpen;
      const ended2 = [...addedNodes(mrs)].filter(n => stillOpen.indexOf(n) === -1);
      this.#cb1(target, [...ended1, ...ended2]);
    }

    disconnect(mrs) {
      this.#cb1(document.documentElement, [...this.#stillOpen, ...addedNodes(mrs)]);
      document.removeEventListener('readystatechange', touchDom, {capture: true});
      this.#mo.disconnect();
    }
  }
})();