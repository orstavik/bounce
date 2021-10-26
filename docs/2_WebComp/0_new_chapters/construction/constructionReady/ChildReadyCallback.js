// ChildReadyCallback API

// The childReadyCallback is called in block at the end of the outermost construction frame.
//
// We always strive for top-down sequence in construction frames as in event propagation
// as it gives the developer of the topmost USER document control of the JS in the lower USED document,
// and the parent node of the childNode.
//
// Exception from top-down sequence:
//   1. While "loading", childReadyCallback is called on an individual basis *per element*, and *not* per document.
//   2. The bottom-up sequencing *only apply within the same document*, the main document.
//      The top-down sequence *always applies from USER document to USED document contexts*.
//   3. This enables DOM creation that depends on childReady to be created asap.

// ChildReadyCallback API depends on:
//  1. ConstructionFrame API: construction-complete

//todo Use the imperative Slotting API in a test case

(function () {
  function callChildReadyCallback(el) {
    try {
      el.childReadyCallback();
    } catch (error) {
      window.dispatchEvent(new ErrorEvent('error', {error}));
    }
  }

  window.HTMLElement = class ChildReadyCallbackHTMLElement extends HTMLElement {
    constructor() {
      super();
      this.childReadyCallback && (ConstructionFrame.now.childReadies ??= []).push(this);
    }
  }

  ConstructionFrame.observe('complete', frame => frame.childReadies?.forEach(callChildReadyCallback));
})();