import {Dblclickable} from "../events/Dblclickable.js";
import {KeypressToClick} from "../events/KeypressToClick.js";
import {HTMLShadowDomElement} from "./HTMLShadowDomElement.js";
import {ToggleOpen} from "../events/ToggleOpen.js";

const templateDetails =
  `<slot name="firstSummary"></slot><slot></slot>
<style>
/**todo**/
</style>
`;

const HTMLDetailsSuperClass =
  ToggleOpen(
    KeypressToClick(
      Dblclickable(
        // TabbableMixin(
        HTMLShadowDomElement
      )
    )
    // )
  );

export class HTMLDetailsElement extends HTMLDetailsSuperClass {
  constructor() {
    super();
    this.shadowRoot.innerHTML = templateDetails.content.cloneNode(true);
  }

  slotCallback(slottables) {
    for (let el of slottables.now)    //remove any slot attributes set from the lightDom.
      el.removeAttribute('slot');
    slottables.now[0]?.tagName === 'SUMMARY' && slottables.now[0].setAttribute('slot', 'first');
  }
}