const templateDetails =
  `<slot name="firstSummary"></slot><slot></slot>
<style>
/**todo**/
</style>
`;

export class HTMLDetailsElement extends HTMLElement {
  connectedCallback() {
    if(!this.shadowRoot.children.length)
      this.shadowRoot.innerHTML = templateDetails.content.cloneNode(true);
  }
}