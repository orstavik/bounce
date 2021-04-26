// This Mixin illustrates the problems with PseudoAttributes and Mixins needing the static get attributes(){}

// This is a Mixin for pseudo-attribute visited/link. It is the equivalent of the css pseudo-classes.
// The point of the pseudo-attribute and the pseudo-classes is to have properties of the host node be controlled *only*
// from the shadowDom / mixin scope.

// another good thing about pseudo-attributes is that they can *show* when a set of default actions
// are active in the DOM. This makes it possible to show the full functional state of the DOM in the DOM itself. Declaratively.

function navigate(e) {
  location.href = new URL(this.href, location.href);
}

function navigateBlank(e) {
  window.open(new URL(location.href, this.href), "_blank");
}

const linkPseudoKey = Math.random() + 1;  //this should probably be exportable.
const visitedPseudoKey = Math.random() + 1;

function updateLinkVisited() {
  this.href ?
    this.setAttributeNode(document.createAttribute(':link'), linkPseudoKey) :
    this.removeAttribute(':link', linkPseudoKey);
  this.isVisited() ?
    this.setAttributeNode(document.createAttribute(':visited'), visitedPseudoKey) :
    this.removeAttribute(':visited', visitedPseudoKey);
}

export class HrefVisitedLink extends HTMLElement {

  connectedCallback() {
    window.addEventListener('hashchange', updateLinkVisited);
  }

  disconnectedCallback() {
    window.removeEventListener('hashchange', updateLinkVisited);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.href === null) {
      this.shadowRoot.removeEventListener('click', navigate);
      this.shadowRoot.removeEventListener('mousedown', navigateBlank);
    } else {
      this.shadowRoot.addEventListener('click', navigate, {preventable: EventListenerOptions.PREVENTABLE});
      this.shadowRoot.addEventListener('mousedown', navigateBlank, {preventable: EventListenerOptions.PREVENTABLE});
    }
    updateLinkVisited.call(this);
  }

  static get observedAttributes() {
    return ["href"];
  }

  get href() {
    return this.getAttribute('href');
  }

  set href(val) {
    val ? this.setAttribute('href', val) : this.removeAttribute('href');
  }

  // The real visited property is readable from "user eyeballs" only.
  // For obvious security and privacy issues.
  // Hence the users browsing history is not accessible from script.
  // So, here we just make a little random function to get some variation in this demo.
  isVisited() {
    return Math.random() > 0.5;
  }
}