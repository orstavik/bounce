// This is a Mixin for pseudo-attribute visited/link. It is the equivalent of the css pseudo-classes.
// We can implement this as a pseudo-class too by observing the style attribute instead.

// the point of the pseudo-attribute and the pseudo-classes are that they are controlled from the shadowDom and
// cannot be controlled from the lightDOM. That is why they must change back to their inner state value if somebody
// tries to change them from outside.

// another good thing about pseudo-attributes/pseudo-classes is that they can *show* when a set of default actions
// are active in the DOM. This makes it possible to show the full functional state of the DOM in the DOM itself. Declaratively.

// this could also be accomplished by overriding the setAttribute value. That would be more efficient.
// //todo do that. make a more efficient solution for setAttribute that will enable you to control the attributes better.

function navigate(e) {
  location.href = new URL(this.href, location.href);
}

function navigateBlank(e) {
  window.open(new URL(location.href, this.href), "_blank");
}

function attributeChangedCallback(mutationList) {
  for (let mutation of mutationList) {
    const att = mutation.attributeName;
    const el = mutation.target;
    const newValue = el.getAttribute(att);
    const oldValue = mutation.oldValue;
    if (oldValue === newValue)
      continue;
    if (att === 'href') updateHref(el, oldValue, newValue);
    else if (att === 'link') updateLink(el, oldValue, newValue);
    else if (att === 'visited') updateVisited(el, oldValue, newValue);
  }
}

function isHrefVisited(href) {
  // The real visited property is readable from user eyeballs only.
  // For obvious security and privacy issues.
  // Hence the users browsing history is not accessible from script.
  // So, here we just make a little random function to get some variation in this demo.
  return Math.random() > 0.5;
}

const state = new WeakMap();

function updateHref(el, oldValue, newValue) {
  if (newValue === null) {
    el.shadowRoot.removeEventListener('click', navigate);
    el.shadowRoot.removeEventListener('mousedown', navigateBlank);
  } else if (oldValue === null) {
    el.shadowRoot.addEventListener('click', navigate, {preventable: EventListenerOptions.PREVENTABLE});
    el.shadowRoot.addEventListener('mousedown', navigateBlank, {preventable: EventListenerOptions.PREVENTABLE});
  }
  updateState(el, newValue);
}

function updateState(el, newValue = el.getAttribute('href')) {
  const state = newValue === null ? null : isHrefVisited(newValue) ? 'visited' : 'link';
  state.set(el, state);
  updateVisited(el);
  updateLink(el);
}

function updateLink(el) {
  const doLink = state.get(el) === "link";
  const hasLink = el.hasAttribute('link');
  if (!doLink && hasLink) el.removeAttribute('link');
  else if (doLink && !hasLink) el.setAttribute('link', '');
}

function updateVisited(el) {
  const doVisited = state.get(el) === "visited";
  const hasVisited = el.hasAttribute('visited');
  if (!doVisited && hasVisited) el.removeAttribute('visited');
  else if (doVisited && !hasVisited) el.setAttribute('visited', '');
}

export function hrefVisited(el) {
  updateState(el);
  const observer = new MutationObserver(attributeChangedCallback);
  observer.observe(el, {attributes: true});
  window.addEventListener('hashchange', e => updateState(el));
}

export function HrefVisited(Base) {
  return class HrefVisited extends Base {
    constructor() {
      super();
      hrefVisited(this);
      //todo the double-prt patch below is necessary to control the setup from html template where attributes are set later.
      //todo should we test this based on the document.readyState??
      Promise.resolve().then(() => Promise.resolve().then(() => hrefVisited(this)));
    }
  }
}