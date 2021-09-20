# WhatIs: `HTMLElement` construction?

When the browser creates HTML elements, it obviously will call a `constructor()`, either in JS for custom elements or a native constructor for native elements. But. Key in understanding the `HTMLElement` construction is knowing that "calling the `constructor()`" is only half the job. In addition to calling the `constructor()` the browser will also add attributes and children, call `attributeChangeCallback()` and `connectedCallback()`s and potentially fire of events such as `slotchange`s.

Naively, `HTMLElement` construction can therefore be summarized as:

1. `HTMLElement.constructor()`
2. adding `attributes`
3. adding `childNodes`
4. `attributeChangedCallback()`
5. `attributeChangedCallback()`
6. `connectedCallback()`
7. `slotchange`

But. Sometimes the `HTMLElement.constructor()` is called before `attributes` and `childNodes` are added; sometimes the `HTMLElement.constructor()` is called first. Sometimes, `attributeChangedCallback()` is called before `connectedCallback()`; sometimes neither `connectedCallback()` nor `attributeChangeCallback()` is called during `HTMLElement` construction. To find out, we need to *which* `HTMLElement` construction process was used to create the element.

## Which: processes can construct `HTMLElement`?

Put simply, these are the different processes that can construct `HTMLElement`s:

1. The Predictive Parser. If a custom element is defined in a sync `<script>` *before* it is declared as an element in the same document, then it will be constructed by the Predictive Parser.

```html

<script> ...
customElements.define('web-comp', ...)
... </script>
<web-comp>...</web-comp>
```

2. Normal upgrade. The normal upgrade happens to already created custom elements that are directly or indirectly connected to the DOM. Here, the upgrade process happens *after* the element has been constructed.

```html

<script type="module">...
customElements.define('web-module', ...)
... </script>
<web-module>...</web-module>
<web-sync>...</web-sync>
<script> ...
customElements.define('web-sync', ...)
... </script>
```

3. Sync upgrade. The sync upgrade happens when `customElements.define(...)` for a web component is called from a sync `<script>` positioned inside the web component itself in the main document:

```html

<web-comp>
  ...
  <script> ...
  customElements.define('web-comp', ...)
  ... </script>
  ...
</web-comp>
```

4. `innerHTML = ` and `.insertAdjacentHTML(...)`
5. `new HTMLElement()` and `document.createElement("tag-name")`
6. `HTMLElement.cloneNode()`

These six processes construct `HTMLElement`s differently. And so, a web component must align its `constructor()`, `connectedCallback()`, `attributeChangeCallback()`, reading of `attributes` and `childNodes` and `slotchange` event listeners accordingly. We will look at this in detail shortly, but first...

## HowTo: detect *which* `HTMLElement` construction process triggers `HTMLElement.constructor()`?

To detect *which* `HTMLElement` construction process triggered the `HTMLElement.constructor()` we need to look at the following details *from **within** the `HTMLElement.constructor()`*:

1. `document.readyState`
2. `this.parentNode`
3. `this.isConnected`
4. `document.currentScript`
5. `window.event`
6. `this.attributes`/`this.childNodes`
7. What is the last parsed element in the `document`

```javascript
function lastParsedElementInDocument() {
  let l = document;
  while (l.childNodes.length)
    l = l.childNodes[l.childNodes.length - 1];
  return l;
}
```

7. Is the custom element an ancestor of the current script?

```javascript
function isSyncUpgrade(webComponent, scriptEl) {
  return webComponent.compareDocumentPosition(scriptEl) === Node.DOCUMENT_POSITION_CONTAINS;
}
```

## Demo: `analyzeContext(el)`

```javascript
function lastParsedElementInDocument() {
  let l = document;
  while (l.childNodes.length)
    l = l.childNodes[l.childNodes.length - 1];
  return l;
}

function isSyncUpgrade(webComponent, scriptEl) {
  return webComponent.compareDocumentPosition(scriptEl) === Node.DOCUMENT_POSITION_CONTAINS;
}

function analyzeContext(el) {
  const hasParentNode = !!el.parentNode;
  const isConnected = el.isConnected;
  const isLoading = document.readyState === 'loading';
  const currentScript = document.currentScript;
  const isEventListener = !!window.event;
  const hasAttributesOrChildNodes = el.attributes.length || el.childNodes.length;
  const lastElementInDocument = lastParsedElementInDocument();
  const currentElementIsLastElement = lastElementInDocument === el;
  const currentScriptIsLastElement = lastElementInDocument === currentScript;
  const syncUpgrade = isSyncUpgrade(el, currentScript);
  return {
    hasParentNode,
    isConnected,
    isLoading, currentScript, isEventListener, hasAttributesOrChildNodes, lastElementInDocument, currentElementIsLastElement, currentScriptIsLastElement, syncUpgrade
  }
}
```

In the next chapters, we will look at each of these `HTMLElement` construction processes in detail. We will look at what properties are ready at what stage during the construction, and which callbacks are made when. We will also look at the construction processes' signature based on the 7 criteria above. Once this is complete, we will look at the different processes altogether.

We will use the same web component in demos:

```javascript
class WebComp extends HTMLElement {
  static get observedAttributes() {
    return ['a'];
  }

  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = '<slot></slot>';
    this.shadowRoot.addEventListener('slotchange',
      () => this.slotchangeCallback()
    );
    console.log('constructor', analyzeContext(this));
  }

  attributeChangedCallback(name, oldValue, newValue) {
    console.log('attributeChanged', analyzeContext(this));
  }

  connectedCallback() {
    console.log('connected', analyzeContext(this));
  }

  slotchangeCallback() {
    console.log('slotchange', analyzeContext(this));
  }
}

customElements.define('web-comp', WebComp);
```

## References
