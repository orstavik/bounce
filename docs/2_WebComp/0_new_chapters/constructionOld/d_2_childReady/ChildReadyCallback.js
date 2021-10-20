// ChildReadyCallback API

// The childReadyCallback is called in block at the end of the outermost construction frame.
// Top-down sequence is something that we strive to obtain all the time, as it gives the topmost developer
// as much control as possible. The user document context controls the user document context.
//
// However, there is an exception to this rule. During loading, the childReadyCallback for each custom element
// is called as quickly as possible. This to make drawing elements on screen as quick as possible.
//
// ChildReadyCallback API depends on:
//  1. ConstructionFrame API: construction-end

//todo I need test cases here to see the dilemma when we do the imperative Slotting API.

(function () {
  function callChildReadyCallback(p) {
    try {
      p.childReadyCallback();
    } catch (error) {
      window.dispatchEvent(new ErrorEvent('error', {error})); //todo don't remember exactly what this looks like.
    }
  }

  function runRecursive(constructionFrame) {
    constructionFrame.childReadies.forEach(callChildReadyCallback);
    constructionFrame.children.filter(frame => frame.type !== 'branch').forEach(runRecursive);
  }

  window.HTMLElement = class ChildReadyCallbackHTMLElement extends HTMLElement {
    constructor() {
      super();
      this.childReadyCallback && (ConstructionFrame.now.childReadies || (ConstructionFrame.now.childReadies = [])).push(this);
    }
  }

  window.addEventListener('construction-end', function (frame) {
    if (frame.type === 'branch' || !frame.parent)
      runRecursive(frame);
  });
})();