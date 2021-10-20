class WebComp extends HTMLElement {
  static get observedAttributes() {
    return ['a'];
  }

  constructor() {
    super();
    console.log('constructor', this);
    Promise.resolve().then(() => console.log('constructor micro', this));
  }

  attributeChangedCallback(name, oldValue, newValue) {
    super.attributeChangedCallback();
    console.log('attribute', this);
    Promise.resolve().then(() => console.log('attribute micro', this));
  }

  connectedCallback() {
    super.connectedCallback();
    console.log('connected', this);
    Promise.resolve().then(() => console.log('connected micro', this));
  }

  readyCallback() {
    console.log('ready callback', this);
    Promise.resolve().then(() => console.log('ready callback micro', this));
  }
}