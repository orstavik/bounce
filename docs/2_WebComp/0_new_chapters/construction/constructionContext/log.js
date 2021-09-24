function lastParsedElementInDocument() {
  let l = document;
  while (l.childNodes.length)
    l = l.childNodes[l.childNodes.length - 1];
  return l;
}

console.log = function (el) {
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
  parent.postMessage(JSON.stringify([location.hash.substr(1), data]), '*');
}

window.addEventListener('error', () => parent.postMessage(JSON.stringify([location.hash.substr(1), {error: true}]), '*'));