const aTemplate = document.createElement('template');
aTemplate.innerHTML =
  `<slot></slot>
<style>
:root([href][link]) ::slotted{ /*todo don't remember*/
  color: blue;
  text-decoration: underline;
}
:root([href][visited]) ::slotted{
  color: gray;
  text-decoration: none;
}
</style>`;

export class HTMLAnchorElement extends HTMLElement {
  firstConnectedCallback() {
    if (!this.shadowRoot.children.length)
      this.shadowRoot.appendChild(aTemplate.content.cloneNode(true));
  }
}