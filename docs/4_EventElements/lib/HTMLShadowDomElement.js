export class HTMLShadowDomElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
  }
}