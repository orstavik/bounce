function lastParsedElementInDocument() {
  let l = document;
  while (l.childNodes.length)
    l = l.childNodes[l.childNodes.length - 1];
  return l;
}

const sequence = [];

window.log = function (el) {
  const lastElementInDocument = lastParsedElementInDocument();
  const currentScript = document.currentScript;
  const syncUpgrade = !!(currentScript && currentScript.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_CONTAINS);
  const data = {
    hasParentNode: !!el.parentNode,
    hasAttributes: !!el.attributes.length,
    hasChildNodes: !!el.childNodes.length,
    isConnected: el.isConnected,
    isLoading: document.readyState === 'loading',
    isCurrentScript: !!currentScript,
    isEventListener: !!window.event,
    currentElementIsLastElement: lastElementInDocument === el,
    currentScriptIsLastElement: lastElementInDocument === currentScript,
    syncUpgrade,
  };
  data.predictive = data.isLoading && !data.isCurrentScript;
  data.NEW = !data.hasParentNode && !data.hasAttributes && !data.hasChildNodes;
  sequence.push(data);
}

function print2() {
  parent.postMessage(JSON.stringify([location.hash.substr(1), sequence]), '*');
}

setTimeout(print2, 100);

class WebComp extends HTMLElement {
  constructor() {
    super();
    log(this);
  }
}

customElements.define('web-comp', WebComp);