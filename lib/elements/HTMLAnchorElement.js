import {Dblclickable} from "../events/Dblclickable.js";
import {KeypressToClick} from "../events/KeypressToClick.js";
// import {TabbableMixin} from "./KeyboardEventMixins.js";
import {HTMLShadowDomElement} from "./HTMLShadowDomElement.js";
import {HrefVisited} from "../events/HrefVisited";  //todo should we make the shadowRoot attach and detach when it has children or not??

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

const HTMLAnchorSuperClass =
    Dblclickable(
      HrefVisited(
        //   TabbableMixin(
        KeypressToClick(
          HTMLShadowDomElement
        )))
  // )
;

export class HTMLAnchorElement extends HTMLAnchorSuperClass {
  constructor() {
    super();
    this.shadowRoot.appendChild(aTemplate.content.cloneNode(true));
  }

  //marshalling of properties are only getter and setters for attributes, not the other way round.
  //the attribute is the sole source of truth.
  get href() {
    return this.getAttribute('href') || null;
  }

  set href(val) {
    if (val === null) {  //todo which null value is removing the attribute? only null or nullish or null and undefined or what?
      this.removeAttribute('href');
      return null;
    }
    this.setAttribute('href', val);
    return val;
  }
}