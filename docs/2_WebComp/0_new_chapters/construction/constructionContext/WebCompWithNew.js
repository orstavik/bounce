class InnerComp extends HTMLElement{
  constructor(){
    super();
    console.log(this, new.target);
  }
}
customElements.define('inner-comp', InnerComp);

class WebComp extends HTMLElement {
  constructor() {
    super();
    console.log(this, new.target);
    const inner = new InnerComp();
  }

  connectedCallback() {
    super.connectedCallback && super.connectedCallback();
  }
}

customElements.define('web-comp', WebComp);