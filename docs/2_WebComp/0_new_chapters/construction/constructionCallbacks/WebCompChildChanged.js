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
    console.log('attribute', this);
    Promise.resolve().then(() => console.log('attribute micro', this));
  }

  connectedCallback() {
    console.log('connected', this);
    Promise.resolve().then(() => console.log('connected micro', this));
  }

  childChangedCallback() {
    console.log('child callback', this);
    Promise.resolve().then(() => console.log('child callback micro', this));
  }
}