const els = [];

function getElementId(el) {
  const index = els.indexOf(el);
  if (index >= 0)
    return index;
  els.push(el);
  return els.length - 1;
}

const sequence = [];

window.log = function (name, el) {
  const id = getElementId(el);
  const hasParentNode = !!el.parentNode;
  const attributesLength = el.attributes.length;
  const attributes = Array.from(el.attributes).map(a => `${a.nodeName}:${a.nodeValue}`).join(';');
  const childNodesLength = el.childNodes.length;
  const nowData = {name, id, hasParentNode, attributesLength, childNodesLength, attributes};
  sequence.push(nowData);
}

function findMissingActions(nowData, prevData) {
  const res = [];
  //1. add setAttribute multi/single
  const addedAtts = nowData.attributesLength - prevData.attributesLength;
  if (addedAtts > 1)
    res.push({id: nowData.id, name: 'setMultipleAttributes'});
  else if (addedAtts === 1)
    res.push({id: nowData.id, name: 'setAttribute'});

  //2. add setParentNode
  if (nowData.hasParentNode !== prevData.hasParentNode)
    res.push({id: nowData.id, name: 'setParentNode'});

  //3. appendChild / appendChildren
  const addedChildNodes = nowData.childNodesLength - prevData.childNodesLength;
  if (addedChildNodes > 1)
    res.push({id: nowData.id, name: 'setMultipleChildNodes'});
  else if (addedChildNodes === 1)
    res.push({id: nowData.id, name: 'setChildNode'});
  return res;
}

function analyze(sequence) {
  for (let i = 0; i < sequence.length; i++) {
    let nowData = sequence[i];
    let prevData = {attributesLength: 0, childNodesLength: 0, hasParentNode: false};
    for (let j = i - 1; j >= 0; j--) {
      const maybePrev = sequence[j];
      if (maybePrev.id === nowData.id) {
        prevData = maybePrev;
        break;
      }
    }
    const res = findMissingActions(nowData, prevData);
    sequence.splice(i, 0, ...res);
    i += res.length;
  }
}

setTimeout(function () {
  analyze(sequence);
  // const res = sequence.map(({name, id}) => `${name}::${id}`);
  // parent.postMessage(JSON.stringify([location.hash.substr(1), res]), '*');
  parent.postMessage(JSON.stringify([location.hash.substr(1), sequence]), '*');
}, 100);

class WebComp extends HTMLElement {
  static get observedAttributes() {
    return ['a'];
  }

  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = '<slot></slot>';
    this.shadowRoot.addEventListener('slotchange', () => this.slotchangeCallback());
    //todo this is possible in upgrade and in innerHTML, and probably cloneNode too. It is bad.
    // const p = this.parentNode;
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