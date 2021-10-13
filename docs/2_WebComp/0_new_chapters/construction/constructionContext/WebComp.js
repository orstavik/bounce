class WebComp extends HTMLElement {
  constructor() {
    super();
    console.log(this, new.target);
  }
}

customElements.define('web-comp', WebComp);