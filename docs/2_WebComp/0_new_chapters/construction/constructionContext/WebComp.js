class WebComp extends HTMLElement {
  constructor() {
    super();
    console.log(this, new.target);
  }

  connectedCallback() {
    super.connectedCallback && super.connectedCallback();
  }
}

customElements.define('web-comp', WebComp);