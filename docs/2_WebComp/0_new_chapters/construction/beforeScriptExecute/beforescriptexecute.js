/**
 * beforescriptexecute polyfill
 *
 * This beforescriptexecute polyfill has two differences with the FF original event (I think)
 * 1. It dispatches a beforescriptexecute event at the *end of parsing*. This will happen whether or not any async or
 *    <script defer> scripts is added or not.
 * 2. It will not dispatch any beforescriptexecute events *after* the document has finished loading and
 *    switched to interactive.
 *
 * During "loading"/interpretation of the main document:
 * the `new MutationObserver(callback).observe(document.documentElement, {childList: true, subtree: true});`
 * will aggregate all changes and only *break* off and
 * trigger the callback **before** either
 * 1. a <script> begins (not defer, as they only run once "loading" has completed) or
 * 2. the predictive parser calls a custom element constructor
 *    (which is essentially the same as if the predictive parser would invoke a script).
 *
 * The beforescriptexecute event has *one* property: .lastParsed.
 * The lastParsed is the current position of the parser at the time of beforescriptexecute dispatch.
 * This position is known or guesstimated as:
 * 1. If a sync <script> is about to run, then
 *    the document.currentScript represent the last parsed element.
 * 2. If the predictive parser calls an already defined custom element, then
 *    the innermost element found from the <html> element in the document
 *    can be assumed to be the element currently being parsed.
 *
 * Problem 1:
 *    a) Imagine the main document containing two *sibling* custom element tags
 *    with **NO** whitespace in between:
 *       <a-a></a-a><b-b></b-b>
 *
 *    When the constructor() of <b-b> is called, then lastParsed will find the "<a-a>" element.
 *
 *    b) Imagine the main document containing two *nested* custom element tags:
 *       <a-a><b-b></b-b></a-a>
 *
 *    Again, when the constructor() og "<b-b>" is called, then
 *    again lastParsed will find the "<a-a>" element.
 *
 *    The problem is:
 *    1. Yes, you and I can *plainly read* in the HTML text that
 *       these two situations are different.
 *    2. Yes, in the sibling scenario the browser's parser **has read** the
 *       endTag "</a-a>" and there **knows** the difference between the two scenarios.
 *    3. No, the browers' parsers **DO NOT** write the knowledge that it **has read**
 *       the endTag "</a-a>" in the sibling scenario to any property in the DOM nor
 *       JS land.
 *    4. Therefore, from JS, there is no way for you and I and JS scripts to
 *       distinguish **no space custom element siblings** from **no space custom element
 *       parent-child** scenarios. So, if you are to guess, then you should guess that
 *       "<b-b>" is a child, not a sibling.
 *
 * Problem 2:
 *    The first 'readystatechange' event happens before the mutationObserver is triggered when parsing ends:
 *    ie. at the end of the document we get sequence:
 *    1. readystatechange(loading => interactive)
 *    2. mutationObserver trigger
 *    3. readystatechange(interactive => completed)
 *
 *    This problem is solved by adding a one-time, EarlyBird event listener for readystatechange event
 *    that dispatch a beforescriptexecute event.
 */
function deepestElement(root) {
  while (root.lastChild) root = root.lastChild;
  return root;
}

function lastParsed() {
  return !document.currentScript || document.currentScript.hasAttribute('async') ?
    deepestElement(document.documentElement) :
    document.currentScript;
}

document.readyState === "loading" && (function () {
  function dispatchBeforeScriptExecute() {
    const ev = new Event('beforescriptexecute');
    ev.lastParsed = lastParsed();
    return window.dispatchEvent(ev);
  }

  const mo = new MutationObserver(dispatchBeforeScriptExecute);
  mo.observe(document.documentElement, {childList: true, subtree: true});
  window.addEventListener('readystatechange', function () {
    dispatchBeforeScriptExecute();
    mo.disconnect();
  }, {capture: true, once: true});
})();

//todo need to test how it behaves in Safari and Firefox,
// In 2021 Chrome, this behavior will only trigger before the next script or when the predictive parser calls a custom element constructor.
// that it only triggers before custom events or <script> functions.