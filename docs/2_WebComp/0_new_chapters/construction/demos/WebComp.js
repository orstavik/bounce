function lastParsedElementInDocument() {
  let l = document;
  while (l.childNodes.length)
    l = l.childNodes[l.childNodes.length - 1];
  return l;
}

function isSyncUpgrade(webComp, script) {
  return !!(script && script.compareDocumentPosition(webComp) & Node.DOCUMENT_POSITION_CONTAINS);
}

function analyzeContext(name, el) {
  const lastElementInDocument = lastParsedElementInDocument();
  const currentScript = document.currentScript;
  return {
    name,
    el,
    hasParentNode: !!el.parentNode,
    isConnected: el.isConnected,
    isLoading: document.readyState === 'loading',
    isCurrentScript: !!currentScript,
    isEventListener: !!window.event,
    attributes: Array.from(el.attributes).map(a => `${a.nodeName}:${a.nodeValue}`).join(';') || undefined,
    childNodes: el.childNodes.length,
    currentElementIsLastElement: lastElementInDocument === el,
    currentScriptIsLastElement: lastElementInDocument === currentScript,
    syncUpgrade: isSyncUpgrade(el, currentScript),
    cloneNodeDirectly: cloneEmptyNode
  };
}

const sequence = [];

window.log = function (name, el) {
  sequence.push(analyzeContext(name, el));
}

function print2() {
  const els = [...new Set(sequence.map(d => d.el))];
  const prev = [];
  for (let data of sequence) {
    data.elId = els.indexOf(data.el);
    data.prev = prev[data.elId];
    prev[data.elId] = data;
  }


  // const els = [...new Set(sequence.map(d => d.el))];
  // let prev = {attributes: undefined, childNodes: 0, hasParentNode: false};
  // for (let elId = 0; elId < els.length; elId++) {
  //   const el = els[elId];
  //   const perElementSequence = sequence.filter(d => d.el === el);
  //   for (let i = perElementSequence.length - 1; i >= 0; i--) {
  //     const data = perElementSequence[i];
  //     data.elId = els.indexOf(data.el);
  //     data.setAttribute = data.attributes !== prev.attributes;
  //     data.appendChild = data.childNodes !== prev.childNodes;
  //     data.setParentNode = data.hasParentNode !== prev.hasParentNode;
  //     prev = data;
  //   }
  //   prev = {attributes: undefined, childNodes: 0, hasParentNode: false};
  // }
  // const expanded = sequence.reduce((acc, curr)=>{
  //   if(curr.setAttribute)
  //     acc.push(Object.assign({}, curr, {name:'setAttribute'}));
  //   if(curr.appendChild)
  //     acc.push(Object.assign({}, curr, {name:'appendChild'}));
  //   if(curr.setParentNode)
  //     acc.push(Object.assign({}, curr, {name:'setParentNode'}));
  //   acc.push(curr);
  //   return acc;
  // }, []);

  parent.postMessage(
    JSON.stringify(
      {[location.hash.substr(1)]: expanded},
      (key, value) => (value instanceof Node ? value.nodeName + (value.id ? '#' + value.id : '') : value)
    ),
    '*');
}

setTimeout(print2, 100);

let cloneEmptyNode = false;

class WebComp extends HTMLElement {
  static get observedAttributes() {
    return ['a'];
  }

  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = '<slot></slot>';
    this.shadowRoot.addEventListener('slotchange',
      () => this.slotchangeCallback()
    );
    log('constructor', this);
    Promise.resolve().then(() => log('constructor micro', this));
  }

  attributeChangedCallback(name, oldValue, newValue) {
    log('attributeChanged', this);
  }

  connectedCallback() {
    log('connected', this);
  }

  slotchangeCallback() {
    log('slotchange', this);
  }

  cloneNode(deep) {
    // if(!this.attributes.length && !this.childNodes.length)
    //   return document.createElement(this.tagName);
    // return Node.prototype.cloneNode.call(this, deep);
    cloneEmptyNode = !this.attributes.length && !this.childNodes.length;
    const res = Node.prototype.cloneNode.call(this, deep);
    cloneEmptyNode = false;
    return res;
  }
}

customElements.define('web-comp', WebComp);