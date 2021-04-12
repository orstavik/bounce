 import {DblclickMixin} from "./MouseEventMixins.js";
import {KeyToClickMixin, TabbableMixin} from "./KeyboardEventMixins.js";
import {HTMLShadowDomElement} from "./HTMLShadowDomElement.js";

function updateVisited(anchor) {
  isVisited(anchor) ?
    anchor.shadowRoot.children[0].classList.add('visited') :
    anchor.shadowRoot.children[0].classList.remove('visited');
}

function isVisited(href) {
  const fullUrl = new URL(href, location.href).href;
  for (let beenThere of history) {
    if (beenThere === fullUrl)
      return true;
  }
  return false;
}

const aTemplate =
  `<slot></slot>
<style>
slot {
  color: blue;
  text-decoration: underline;
}
slot:visited {
  color: gray;
  text-decoration: none;
}
</style>
`;

const HTMLAnchorSuperClass =
  DblclickMixin(
    TabbableMixin(
      KeyToClickMixin(
        HTMLShadowDomElement
      )));

export class HTMLAnchorElement extends HTMLAnchorSuperClass {
  constructor() {
    super();
    this.shadowRoot.innerHTML = aTemplate.content.cloneNode(true);
    this.shadowRoot.addEventListener('click', function (e) {
      if (e.defaultPrevented)
        return;
      e.preventDefault();
      window.open(new URL(this.href, location.href));
    });
    this.shadowRoot.addEventListener('mousedown', function (e) {
      if (e.defaultPrevented && e.button !== 1)
        return;
      e.preventDefault();
      window.open(new URL(this.href, location.href), "_blank");
    });
    const me = this;
    // window.addEventListener('popstate', e => updateVisited(me));
    window.addEventListener('hashchange', e => updateVisited(me));
  }

  static get observedAttributes() {
    return ['href'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'href') {
      this.href = newValue;
      updateVisited(this);
    }
  }
}