function lastParsedElementInDocument() {
  let l = document;
  while (l.childNodes.length)
    l = l.childNodes[l.childNodes.length - 1];
  return l;
}

function isSyncUpgrade(webComp, script) {
  return !!(script && script.compareDocumentPosition(webComp) & Node.DOCUMENT_POSITION_CONTAINS);
}

function predictiveRequire(context) {
  return context.isLoading && !context.isCurrentScript;
}

function NEWrequire(context) {
  return !context.hasParentNode && !context.cloneNode;
}

function isUpgrade(context) {
  return context.currentScriptIsLastElement;
}

function isUpgradeWithin(context) {
  return context.syncUpgrade;
}

function isInnerHTML(context) {
  return context.isLoading && !context.isCurrentScript;
}

function isCloneNode(context) {
  return context.cloneNode /*|| context.hasParentNode*/;
}

function analyzeContext(el) {
  const lastElementInDocument = lastParsedElementInDocument();
  const currentScript = document.currentScript;
  return {
    hasParentNode: !!el.parentNode,
    hasAttributes: !!el.attributes.length,
    hasChildNodes: !!el.childNodes.length,
    isConnected: el.isConnected,
    isLoading: document.readyState === 'loading',
    isCurrentScript: !!currentScript,
    isEventListener: !!window.event,
    currentElementIsLastElement: lastElementInDocument === el,
    currentScriptIsLastElement: lastElementInDocument === currentScript,
    syncUpgrade: isSyncUpgrade(el, currentScript),
    cloneNode: cloneNode,
  };
}

const sequence = [];

window.log = function (el) {
  const data = analyzeContext(el);
  data.predictive = predictiveRequire(data);
  data.NEW = !data.predictive && NEWrequire(data);
  data.cloneNode = isCloneNode(data);
  data.upgradeWithin = isUpgradeWithin(data);
  data.upgrade = !data.upgradeWithin && isUpgrade(data);
  data.innerHTML = !data.predictive && !data.cloneNode && !data.upgrade && isInnerHTML(data);
  sequence.push(data);
}

function print2() {
  parent.postMessage(JSON.stringify([location.hash.substr(1), sequence]), '*');
}

setTimeout(print2, 100);

let cloneNode = false;

class WebComp extends HTMLElement {
  constructor() {
    super();
    log(this);
  }

  //cloneNode if the element is the key of this cloneNode, then it might not have a parentNode.
  cloneNode(deep) {
    //todo don't know if it is better to check for this yet??
    // if(!this.attributes.length && !this.childNodes.length && !this.parentNode)
    //   return document.createElement(this.tagName);
    // return Node.prototype.cloneNode.call(this, deep);
    //during construction of completely shallow cloneNode calls, an otherwise empty '<clone-node-empty-element>' element
    //is given as parentNode for the constructor so it can be separated from new Constructor() calls for the same type.
    //if you read such a parentNode in the constructor, then you know that it is a cloneNode empty parentNode.
    //the constructor() is context free. It doesn't know neither parent, attributes, nor children.
    //the attributes are available during attributesReady.
    //the parentNode is available at connectedCallback.
    //the children are only available during childrenChangedCallback().
    if (!this.attributes.length && (!this.childNodes.length || !deep)) {
      const ghost = document.createElement('clone-node-empty-element');
      ghost.innerHTML = `<${this.tagName}></${this.tagName}>`; //will create with a parentNode... This is not what you really get
      const res = ghost.children[0];
      res.remove();
      return res;
    }
    return Node.prototype.cloneNode.call(this, deep);
    // cloneNode = true;// !this.attributes.length && !this.childNodes.length && !this.parentNode;
    // const res = Node.prototype.cloneNode.call(this, deep);
    // cloneNode = false;
    // return res;
  }
}


customElements.define('web-comp', WebComp);