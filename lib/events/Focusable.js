//

//focusElements
//the :focus css pseudo class is realized as [\:focus] pseudo attribute. It is only applied to the document.activeElement, not host nodes.
//the :focus-within pseudo class should be realized as :has([\:focus]). The :has([\:focus]) should run into shadowDom.
//blur and focus events are skipped.
//focusout and focusin run sync.
//the state in the DOM is updated before the focusout event.
//therefore, only focusin really needs a relatedTarget property.
//dynamic changes in the DOM is not observed, as there is no ascendant observer..

let activeElement = null; //should this be document.body, and should this only be set after DOMContentLoaded??
Object.defineProperty(Document.prototype, 'activeElement', {
  get: function () {
    return activeElement;
  }
});

const pseudoFocusKey = Math.random() + 1;
const focusAttribute = document.createAttribute(':focus', pseudoFocusKey);

function* hostNodes(host) {
  for (; host; host = host.getRootNode().host)
    yield host;
}

function lastCommonHostNode(focusIn, focusOut) {
  const focusOuts = Array.from(hostNodes(focusOut));
  for (let focusIn of hostNodes(focusIn))
    if (focusOuts.includes(focusIn))
      return focusIn;
}

function focusImpl(focusinTarget) {
  const focusoutTarget = activeElement;
  const unchangedHost = lastCommonHostNode(focusinTarget, focusoutTarget) || document.body;
  const unchangedRoot = unchangedHost.shadowRoot;
  //focusout sequence
  activeElement.removeAttributeNode(focusAttribute, pseudoFocusKey);
  activeElement = unchangedHost;
  activeElement.setAttribute(focusAttribute, pseudoFocusKey);
  updateFocusWithin && updateFocusWithin();
  const focusout = new FocusEvent('focusout', {composed: true, bubbles: true, relatedTarget: focusinTarget});
  focusoutTarget.dispatchEvent(focusout, {root: unchangedRoot});
  //focusin sequence
  activeElement.removeAttributeNode(focusAttribute, pseudoFocusKey);
  activeElement = focusinTarget;
  activeElement.setAttribute(focusAttribute, pseudoFocusKey);
  updateFocusWithin && updateFocusWithin();
  const focusIn = new FocusEvent('focusin', {composed: true, bubbles: true, relatedTarget: focusoutTarget});
  activeElement.dispatchEvent(focusIn, {root: unchangedRoot});
}

let autofocus = true;

export class Focusable extends HTMLElement {
  connectedCallback() {
    this.shadowRoot.addEventListener('mousedown', this.focus, {
      trustedOnly: true,
      // preventable: EventListenerOptions.PREVENTABLE  //todo to make preventable or not to make preventable, that is a question.
    });
  }

  disconnectedCallback() {
    this.shadowRoot.removeEventListener('mousedown', this.focus);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!autofocus)
      return;                            //first come is the only one to be served
    autofocus = false;
    //don't change focus until the DCL. Mainly to avoid triggering a bad :focus-within observation chain while the document is loading.
    document.readyState === "loading" ?
      document.addEventListener('DOMContentLoaded', () => this.focus()) :
      this.focus();
  }

  static get observedAttributes() {
    return ["autofocus"];
  }

  focus() {
    activeElement !== this && focusImpl(this);
  }
}

//Below is a patch for :focus-within since there is no :has(...) selector in css yet.
let updateFocusWithin;

import {composedPath} from "../platform/BouncedPath.js";

function diff(oldPath, newPath) {
  return {
    added: newPath.filter(n => !oldPath.includes(n)),
    removed: oldPath.filter(n => !newPath.includes(n))
  };
}

function updateFocusWithinImpl() {
  const nowComposedPath = composedPath(document.activeElement);
  const {added, removed} = diff(lastComposedPath, nowComposedPath);
  if (added)
    for (let add of added)
      add.setAttributeNode(document.createAttribute(':focus-within'), pseudoFocusKey);
  if (removed)
    for (let rem of removed)
      rem.removeAttribute(':focus-within', pseudoFocusKey);
}

let focusWithinInterval;
let lastComposedPath;

export function startFocusWithin() {
  const nowComposedPath = composedPath(document.activeElement);
  for (let el of lastComposedPath)
    el.setAttributeNode(document.createAttribute(':focus-within'), pseudoFocusKey);
  lastComposedPath = nowComposedPath;
  updateFocusWithin = updateFocusWithinImpl;
  focusWithinInterval = setInterval(updateFocusWithinImpl, 75);
}

export function stopFocusWithin() {
  for (let el of lastComposedPath)
    el.removeAttributeNode(':focus-within', pseudoFocusKey);
  lastComposedPath = undefined;
  updateFocusWithin = undefined;
  clearInterval(focusWithinInterval);
}