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
}

customElements.define('web-comp', WebComp);