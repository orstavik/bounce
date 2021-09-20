# The ElementMixin life cycle.

The life cycle is 'something happening' in the life of an element. These are the technical points that might trigger a reactive function in the element.

## List Principle points in an element's life cycle
1. **sync** `constructor()`.
2. **sync** attributeReady.
3. **sync** childrenReady.

## Expectation: attributes and children are ready during `constructor()`

When web-components are a) upgraded or b) created from script using `innerHTML` for example, then both attributes and children are ready when the `constructor()` is called. This can be considered the normal expectation, ie. that `constructor()` and attributeReady and childrenReady are *one*.

```html
<ac-ready a="upgrade">hello</ac-ready>
<script>
  class ACReady extends HTMLElement {
    constructor() {
      super();
      console.log(this.getAttribute('a'), this.childNodes[0]);
    }
  }

  customElements.define('ac-ready', ACReady);

  const div = document.createElement('div');
  div.innerHTML = '<ac-ready a="innerHTML">sunshine</ac-ready>';
</script>
```

Results in:
```
upgrade "hello"
innerHTML "sunshine"
```

## Problem: AlreadyDefinedMainDocumentWebCompConstructor

But. When:
1. a *sync* script has *already* `customElements.define` for a web component tag/definition, and 
2. an element with that tagName is created in the main document template after it, then
3. the `constructor()` will occur *before* attributeReady and childrenReady. 
                                                                     
```html
<script>
  class ACReady extends HTMLElement {
    constructor() {
      super();
      console.log('constructor()', this.getAttribute('a'), this.childNodes[0]);
    }
    static get observedAttributes(){
      return ['a'];
    }
    attributeChangedCallback(name, oldValue, newValue){
      console.log('attributeCC()', this.getAttribute('a'), this.childNodes[0]);
    }
  }

  customElements.define('ac-ready', ACReady);
</script>
<ac-ready a="definition">hello</ac-ready>
```

Which result in:
```
constructor() null undefined
attributeCC() definition undefined
```

The problem is that the `constructor` now doesn't have the attributes nor childNodes ready. This breaks the pattern with both upgrade and `innerHTML` and expectations (what you see in HTML is what you get; HTML is declarative, not imperative). And it is likely to cause pain during development. 

To manage this problem, the browser has made two restrictions that:
1. attributes cannot be added to an element during `constructor()`, and
2. lightDom child nodes cannot be added during `constructor()`.



3. the element's host nodes's initial ligthDOM children are registered 
4. element is connected to the DOM for the first time
5. element is connected to the DOM
6. element is disconnected from the DOM
7. element is disconnected from the DOM for the last time
8. element is moved to another document
9. element attribute is changed
10. element list of host node children changes
11. a slot inside the shadowDom of an element changes (slotchange)
12. element's calculated style changes, or a rule that apply to a shadow element changes
13. element's layout changes, its position on the screen or its size.
14. element destruction

 

There is no constructor. The Element is created naked.

Attributes, children, and parents are the main knobs.

## The elements live with other elements

The main changes in the lives of an element is when:
1. the element is connected/disconnected to a parent(or document) and 
2. other elements are connected/disconnected to it as children (direct descendants). 

1. `firstConnectedCallback`. This takes the place for the constructor.
3. `connectedCallback`.
4. `adoptedCallback`, moving between documents.
5. `disconnectedCallback`.
6. `lastDisconnectedCallback`. This will function as a destructor, but it will not always be called.
7. `childCallback`?? `childrenChangeCallback`

The main changes in the life of (context around) a web component is when the web component gets new parent, new children, or moves to a new document. The elements position with other elements.

## The elements' attributes (and pseudo attributes) 

The other main change for an element is an attribute is added, removed or given a new value. This is reflected via `attributeChangedCallback()` and `observedAttributes`.

PseudoAttributes are attributes that cannot be set on the element, but that are controlled from one particular system source, most often an ElementMixin.

## Other JS properties are JS only

Apart from `.parentNode` and `.children` and `attributes` of various forms, all other JS properties on the Element should be considered JS context only. These properties are not observable in HTML such as when the element is printed in html form (such as in devtools) nor observable from CSS such as in a CSS rule selector.  

## Two 'peripheral' contexts: computed style and layout

But. In addition to parent, children, and attributes, there are two other contexts that can trigger life changes in a web component: changes to computed styles and changes in the layout of the element.

Changes in the CSSOM are often considered something that should only be observed from CSS where it is readily observable. So, if an element needs to react in JS to changes coming from the lightDOM above, it should specify that such changes be made using HTML attributes. However, sometimes such changes are made available as    computed styles are considered something that should be observed from 

The web component can be made to react from changes that originate from 3(4) different contexts: HTML, JS, and CSS. Changes in the state of a web component should also be *observable* from the  

1. Change via JS. Calling methods/setting props directly. These mutations are not visible in HTML/CSS directly and should therefore first be marshalled to HTML attributes / pseudo attributes that reflect the state.

2. Change via HTML. HTML around the light Dom host node can affect the ElementMixin in a handful of ways: a. Attribute (attributeChangedCallback). b. connectedCallback (parent/ancestor context), c. Slotcallback (children), d. Other (sibling of radio button, focus, etc.)

3. Change via CSS. Stylechange. Table.

Change via LAYOUT. CSS media queries. LayoutChange. Not yet much used, but very useful for layout reuse.

Events also influence the state of web components, but they do so indirectly via JS event listeners, and so they are treated as JS context changes. 
> Change via EVENT. defaultActions. Event listeners preventable(soft) in the shadowRoot shadowRoot, trustedOnly (sometimes). (trustedOnly is not really necessary).


## The ElementMixin life cycle. OUTPUT.

JS context. Process inner variables. Sometimes notify other type- related elements such as radio button group siblings.
HTML context. Most often, the element should update pseudoAttributes or regular attributes too. Reflect external state in HTML and CSS observable form.
Rarely change shadowDom. Try to only use CSS to react to pseudoAttributes. But if you must, you must.
Local Event. Dispatch events on type-related elements when you need to affect lightDom changes. These events are composed: false. Local events.
Global event. If you need to change global state, dispatch an event on the root element (html).
xyzCallback on the element itself. Many of the custom element callbacks are managed from other callbacks such as firstConnectedCallback.