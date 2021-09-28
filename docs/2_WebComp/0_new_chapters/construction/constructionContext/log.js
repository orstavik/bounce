function lastParsedElementInDocument() {
  let l = document;
  while (l.childNodes.length)
    l = l.childNodes[l.childNodes.length - 1];
  return l;
}

const elements = [];

console.log = function (el, new_target) {
  const withinCount = elements.filter(prev => prev.compareDocumentPosition(el) && Node.DOCUMENT_POSITION_CONTAINED_BY).length;
  elements.push(el);
  const lastElementInDocument = lastParsedElementInDocument();
  const currentScript = document.currentScript;
  const upgradeWithin = !!(currentScript?.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_CONTAINS);
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
    syncUpgrade: upgradeWithin,
    new_target: !!new_target,
    withinCount //if withinCount && predictive, then we have a parentNode that is not yet ready.
    //if we have upgrade within, we go into predictive mode in childChanged.
    //for all the elements that are not ancestor , then we can remove the
  };
  data.predictive = data.isLoading && !data.isCurrentScript;
  data.NEW = !data.hasParentNode && !data.hasAttributes && !data.hasChildNodes;
  parent.postMessage(JSON.stringify([location.hash.substr(1), data]), '*');
}

window.addEventListener('error', () => parent.postMessage(JSON.stringify([location.hash.substr(1), {error: true}]), '*'));