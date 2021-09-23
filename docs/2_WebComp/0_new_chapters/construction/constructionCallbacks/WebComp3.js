const sequence = [];
let count = 0;

window.log = function (name, el) {
  const id = '__id' in el ? el.__id : (el.__id = count++);
  const hasParentNode = !!el.parentNode;
  const attributesLength = el.attributes.length;
  const attributes = Array.from(el.attributes).map(a => `${a.nodeName}:${a.nodeValue}`).join(';');
  const childNodesLength = el.childNodes.length;
  const nowData = {name, id, hasParentNode, attributesLength, childNodesLength, attributes};
  sequence.push(nowData);
}

setTimeout(() => parent.postMessage(JSON.stringify([location.hash.substr(1), sequence]), '*'), 100);

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
    log('attribute', this);
    Promise.resolve().then(() => log('attribute micro', this));
  }

  connectedCallback() {
    log('connected', this);
    Promise.resolve().then(() => log('connected micro', this));
  }

  slotchangeCallback() {
    log('slotchange', this);
  }
}