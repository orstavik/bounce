import {Dblclickable} from "../events/Dblclickable.js";
import {KeypressToClick} from "../events/KeypressToClick.js";
// import {TabbableMixin} from "./KeyboardEventMixins.js";
import {HTMLShadowDomElement} from "./HTMLShadowDomElement.js";  //todo should we make the shadowRoot attach and detach when it has children or not??

const aTemplate = document.createElement('template');
aTemplate.innerHTML =
  `<slot></slot>
<style>
:root([href]) ::slotted{ /*todo don't remember*/
  color: blue;
  text-decoration: underline;
}
:root([href]._pseudo_visited) ::slotted{
  color: gray;
  text-decoration: none;
}
</style>`;

const HTMLAnchorSuperClass =
    Dblclickable(
      //   TabbableMixin(
          KeypressToClick(
      HTMLShadowDomElement
    ))
  // )))
;

function navigate(e) {
  location.href = new URL(this.href, location.href);
}

function navigateBlank(e) {
  window.open(new URL(location.href, this.href), "_blank");
}

function setVisitedPseudoClass() {
  //For obvious security reasons the browser cannot give us access to reading the full history from script.
  const visited = Math.random() < 0.5; //history.includes(new URL(location.href, href))
  visited ? this.classList.add('_pseudo_visited') : this.classList.remove('_pseudo_visited');
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
    if (name === 'href') {
      if (newValue === null) {
        this.shadowRoot.removeEventListener('click', navigate);
        this.shadowRoot.removeEventListener('mousedown', navigateBlank);
        window.removeEventListener('hashchange', setVisitedPseudoClass);
      } else if (oldValue === null) {
        this.shadowRoot.addEventListener('click', navigate, {preventable: EventListenerOptions.PREVENTABLE});
        this.shadowRoot.addEventListener('mousedown', navigateBlank, {preventable: EventListenerOptions.PREVENTABLE});
        window.addEventListener('hashchange', setVisitedPseudoClass);
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
    this.setAttribute('href', val)
    setVisitedPseudoClass(this);
    return val;
  }
}