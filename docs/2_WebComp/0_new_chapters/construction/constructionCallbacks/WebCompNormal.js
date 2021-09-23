class WebComp extends HTMLElement {
  static get observedAttributes() {
    return ['a'];
  }

  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = '<slot></slot>';
    this.shadowRoot.addEventListener('slotchange', () => this.slotchangeCallback());
    console.log('constructor', this);
    Promise.resolve().then(() => console.log('constructor micro', this));
  }

  attributeChangedCallback(name, oldValue, newValue) {
    console.log('attribute', this);
    Promise.resolve().then(() => console.log('attribute micro', this));
  }

  connectedCallback() {
    console.log('connected', this);
    Promise.resolve().then(() => console.log('connected micro', this));
  }

  slotchangeCallback() {
    console.log('slotchange', this);
  }
}