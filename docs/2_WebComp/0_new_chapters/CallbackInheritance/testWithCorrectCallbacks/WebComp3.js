const els = [];

function getElementId(el) {
  const index = els.indexOf(el);
  if (index >= 0)
    return index;
  els.push(el);
  return els.length - 1;
}

const sequence = [];

function getPreviousData(id) {
  for (let i = sequence.length - 1; i >= 0; i--) {
    if(sequence[i].id === id)
      return sequence[i];
  }
  return {
    attributesLength: 0,
    childNodesLength: 0,
    hasParentNode: false
  };
}

function analyzeContext(name, el, id) {
  const hasParentNode = !!el.parentNode;
  const attributesLength = el.attributes.length;
  const attributes = Array.from(el.attributes).map(a => `${a.nodeName}:${a.nodeValue}`).join(';');
  const childNodesLength = el.childNodes.length;
  return {name, id, hasParentNode, attributesLength, childNodesLength, attributes};
}


window.log = function (name, el) {
  const id = getElementId(el);
  const prevData = getPreviousData(id);
  const nowData = analyzeContext(name, el, id);


  //1. add setAttribute multi/single
  const addedAtts = nowData.attributesLength - prevData.attributesLength;
  if (addedAtts)
    sequence.push(Object.assign({}, nowData, {name: addedAtts > 1 ? 'setMultipleAttributes' : 'setAttribute'}));

  //2. add setParentNode
  if (nowData.hasParentNode !== prevData.hasParentNode)
    sequence.push(Object.assign({}, nowData, {name: 'setParentNode'}));

  //3. appendChild / appendChildren
  const addedChildNodes = nowData.childNodesLength - prevData.childNodesLength;
  if (addedChildNodes)
    sequence.push(Object.assign({}, nowData, {name: addedChildNodes > 1 ? 'setMultipleChildNodes' : 'setChildNode'}));

  sequence.push(nowData);
}

setTimeout(function () {
  const res = sequence.map(({name, id}) => `${name}::${id}`);
  parent.postMessage(JSON.stringify([location.hash.substr(1), res]), '*');
  // parent.postMessage(JSON.stringify({[location.hash.substr(1)]: sequence}), '*');
}, 100);

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
    // const p = this.parentNode;          //todo this is possible in upgrade and in innerHTML, and probably cloneNode too. It is bad.
    // this.parentNode?.parentNode?.appendChild(this);
    // if(p !== this.parentNode){
    //   log("bullshit", this);
    // }
    log('constructor', this);
    Promise.resolve().then(() => log('constructor micro', this));
  }

  attributeChangedCallback(name, oldValue, newValue) {
    log('attributeChanged', this);
    Promise.resolve().then(() => log('attributeChanged micro', this));
  }

  connectedCallback() {
    log('connected', this);
    Promise.resolve().then(() => log('connected micro', this));
  }

  slotchangeCallback() {
    log('slotchange', this);
  }
}