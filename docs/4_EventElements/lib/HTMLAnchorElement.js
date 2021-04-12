import {keyToClick, tabbable} from "./KeydownMixins.js";

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

export class HTMLAnchorElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
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
    keyToClick(this);
    tabbable(this);
    dblClick(this);//todo no, this isn't necessary, as it can be appended to the host node. This can be a regular mixin.
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