import {DblclickMixin} from "./MouseEventMixins.js";
import {KeyToClickMixin, TabbableMixin} from "./KeyboardEventMixins.js";
import {HTMLShadowDomElement} from "./HTMLShadowDomElement.js";

const templateDetails =
  `<slot name="firstSummary"></slot><slot></slot>
<style>
/**todo**/
</style>
`;

const HTMLDetailsSuperClass =
  DblclickMixin(
    TabbableMixin(
      KeyToClickMixin(
        HTMLShadowDomElement
      )));

export class HTMLDetailsElement extends HTMLDetailsSuperClass {
  constructor() {
    super();
    this.shadowRoot.innerHTML = templateDetails.content.cloneNode(true);
    const me = this;
    this.shadowRoot.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.target.tagName !== 'SUMMARY' || e.target !== me.children[0])
        return;
      e.preventDefault();
      const toggle = new Event('toggle', {composed: false, bubbles: true});
      me.dispatchEvent(toggle);
      if(toggle.defaultPrevented)
        return;
      me.hasAttribute('open')? me.removeAttribute('open'): me.setAttribute('open', '');
    });
  }

  slotCallback(slottables){
    for (let el of slottables.now)    //slot attribute for <details> elements (and good riddance?).
      el.removeAttribute('slot');
    slottables.now[0]?.tagName === 'SUMMARY' && slottables.now[0].setAttribute('slot', 'first');
  }
}