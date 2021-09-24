class WebComp extends HTMLElement {
  constructor() {
    super();
    console.log(this);
  }
}

customElements.define('web-comp', WebComp);