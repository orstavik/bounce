let count = 0;

console.log = function log(name, el) {
  const id = '__id' in el ? el.__id : (el.__id = count++);
  const hasParentNode = !!el.parentNode;
  const attributesLength = el.attributes.length;
  const attributes = Array.from(el.attributes).map(a => `${a.nodeName}:${a.nodeValue}`).join(';');
  const childNodesLength = el.childNodes.length;
  const nowData = {name, id, hasParentNode, attributesLength, childNodesLength, attributes};
  parent.postMessage(JSON.stringify([location.hash.substr(1),nowData]), '*');
}