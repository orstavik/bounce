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
  // )))
;

function navigate(e) {
  location.href = new URL(this.href, location.href);
}

function navigateBlank(e) {
  window.open(new URL(location.href, this.href), "_blank");
}

export class HTMLAnchorElement extends HTMLAnchorSuperClass {
  constructor() {
    super();
    this.shadowRoot.appendChild(aTemplate.content.cloneNode(true));
  }

  static get observedAttributes() {
    return ['href'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    // if(oldValue === newValue) //todo do I need this check?
    //   return;
    if (name === 'href') {
      if (newValue === null) {
        this.shadowRoot.removeEventListener('click', navigate);
        this.shadowRoot.removeEventListener('mousedown', navigateBlank);
      } else if (oldValue === null) {
        this.shadowRoot.addEventListener('click', navigate, {preventable: EventListenerOptions.PREVENTABLE});
        this.shadowRoot.addEventListener('mousedown', navigateBlank, {preventable: EventListenerOptions.PREVENTABLE});
      }
    }
  }

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