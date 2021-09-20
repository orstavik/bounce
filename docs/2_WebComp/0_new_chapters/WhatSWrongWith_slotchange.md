# WhatIsWrongWith: `slotchange`?

## Problem: IndirectSlotchange events

When you have a SlotMatroschka, the `slotchange` event of the *user* shadowDom context will propagate down into the *used* shadowDOM context. I repeat, `slotchange` events can propagate *down into other shadowDOMs*!

```html

<script>
  class PassPartout extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode: "open"});
      this.shadowRoot.innerHTML =
          '<div style="border: 5px solid white"><slot></slot></div>';
      this.shadowRoot.addEventListener('slotchange', e => console.log('inner', e.path));
    }
  }

  customElements.define('pass-partout', PassPartout);

  class MyFrame extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode: "open"});
      this.shadowRoot.innerHTML =
          '<pass-partout style="border: 5px solid white"><slot></slot></pass-partout>';
      this.shadowRoot.addEventListener('slotchange', e => console.log('outer', e.path));
    }
  }

  customElements.define('my-frame', MyFrame);
</script>

<my-frame></my-frame>
<!-- 
  prints 
  inner [slot, div, document-fragment]
!-->
<script>
  setTimeout(function () {
    document.querySelector('my-frame').append('hello sunshine');
  }, 500);
  //prints
  //inner [slot, slot, div, document-fragment, pass-partout, document-fragment]
  //outer [slot, slot, div, document-fragment, pass-partout, document-fragment]
</script>
```

This behavior is highly convoluted. And the rationale is as follows:

1. `slotchange` is `composed: false`. And yes, that means that it doesn't propagate *up* past shadowRoot of the `<slot>` changing. And so yes, you never expect to see the `slotchange` event in the main `document` context.
2. But. But but but. `composed: false` events propagate *down into* shadowRoots through the `<slot>` connection. So, `composed: false` events doesn't mean that an event doesn't propagate past shadowRoot borders (even if MDN says so). `composed: false` events *do* propagate in *multiple* DOM contexts, by design(!); `composed: false` events *do* propagate *up* past `shadowRoot`s. It is only that they do so when elements are *slotted*.
3. This means that when you make a SlotMatroschka, ie. slot a `<slot>` element into another web component with its own `<slot>`, then the `slotchange` events of the *user*, topmost, wrapping web component's `<slot>` element will propagate *down into* the *used* innermost, wrapped web component.
4. This means that `slotchange` events in the inner web component will *only* propagate past *one* `<slot>` and *one* `shadowRoot`. But, `slotchange` events from the `<slot>` element on the outer web component will propagate past ***TWO*** `<slot>` elements and to ***TWO*** shadowRoots in the SlotMatroschka.

If **this behavior of `slotchange`** is not **convoluted**, then I don't know what is. In fact, this behavior is so complex that for "a normal person", it is difficult to build a coherent description of it in ones own mind - even when you understand it. To remember such complexity will never result in anything but a grey, foggy memory. Don't expect that you long after reading this will remember anything more than "there is a problem with `slotchange` events when you 'slot a `<slot>`'".

To aid my own memory facing such complexity, I try to coin illustrative terms such as SlotMatroschka. This concept is so complex that even such tricks don't work, imho. IndirectSlotchange? EavesDroppingOnSlottedSlotchange? SlotchangeGoingDownInSlotMatroschkas? IMHO `slotchange` is too complex as a general API for web component construction.

## The potential of indirect `slotchange` events

For simplicity, we view `slotchange` events as belonging to one of *two* categories: **direct** and **indirect** `slotchange` events.

1. *direct* `slotchange` events originate from a `<slot>` element in the `shadowRoot` of the web component one is currently working on/"viewing the world from". Such "normal" `slotchange` events occur when the host node of the current web component changes.

2. *indirect* `slotchange` events originate from a `<slot>` element *outside* of the current web component. Indirect `slotchange` events are propagate into a shadowDOM from above. Indirect `slotchange` events *do not* signal that a childNode of the host node has changed (it hasn't); indirect `slotchange` events signal that the host node has changed its conceptual/flattenedDOM list of childNodes (ie. that in the DOM the user sees and the browser draws on screen has changed its list of childNodes).
	* Caveat: This description require that we look past the fundamental problem that `<slot>`s are elements and not `DocumentFragments` (which IMHO they should have been). If you consider `<slot>` elements as elements, then such a "flattening" can never actually be done (well). If the `<slot>` had been a `DocumentFragment`, then the list of childNodes *could* truly have been flattened (`<summary>` elements could have been slotted into the `<details>` elements, and positioned in a non-linear way like hoisting the first `<summary>` element); inherited CSS properties could have been blocked from *bleeding up* from `<slot>` elements (currently inherited CSS properties inherit *both* **down into** `shadowRoot`s from *user* DOM contexts (which is good) and **up into** `shadowRoot`s from *used* DOM contexts via `<slot>` elements in the flattened DOM (which is very bad!)); and `composed: false` events could more easily be prevented from propagating *down into* slotted contexts.

The benefit of indirect `slotchange` events is that they enable a web component to observe changes of "visible" childNodes. This opens the door for such a web component to be reused inside another web component.

## Demo: do native elements observe *indirect* children?

The short answer is "yes, but no, no". Here are three demos that illustrate this:

### Indirect children in `<a href>`

Can we *(re)use* the native `<a href>` element in a web component?

```html

<script>
  class FrameA extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode: "open"});
      this.shadowRoot.innerHTML = '<div style="border: 2px solid black"><a><slot></slot></a></div>';
    }

    attributeChangedCallback(name) {
      const att = this.getAttributeNode(name);
      const innerA = this.shadowRoot.children[0].children[0];
      att ?
          innerA.setAttributeNode(att.cloneNode()) :
          innerA.removeAttribute(name);
    }

    static get observedAttributes() {
      return ["href"];
    }
  }

  customElements.define('frame-a', FrameA);
</script>
<frame-a href="https://hello.com/">sunshine</frame-a>
```

Yes. For the native `<a href>` element, indirect children 'works'. But, the `<a href>` do not *observe* the slotted children, it only observes the `href` attribute. And this solution is still patchy. We would need to hack using `computedStyle` to discover the `:visited` property of the inner `<a href>` element, and then transpose it to the wrapping web component. But, the `composed: false` events should nicely flow down into the inner `<a href>`. Wrapping the `<a href>` 'works ok, but require hacks to work fully'.

### Indirect children in `<details>`

Can we *(re)use* the native `<details>` element in a web component *and* pass the `<summary>` element from outside?

```html

<script>
  class FrameDetails extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode: "open"});
      this.shadowRoot.innerHTML = '<div style="border: 2px solid black"><details><slot></slot></details></div>';
    }
  }

  customElements.define('frame-details', FrameDetails);
</script>
<frame-details>
  <summary>hello</summary>
  sunshine
</frame-details>
```

No. The `<details>` element do *not* recognize the slotted `<summary>` element as an *indirect*, flatDOM child of the host node. Instead it sees only the *direct*, realDOM `<slot>` child and therefore create a default `<summary>` element in its shadowDom.

### Indirect children in `<form>`

Can we *(re)use* the native `<form>` element in a web component *and* pass a `<button>` element from outside?

```html

<script>
  class FrameForm extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode: "open"});
      this.shadowRoot.innerHTML = '<div style="border: 2px solid black"><form><slot></slot><button>insider</button></form></div>';
      this.shadowRoot.addEventListener('slotchange', e => {
        //a desperate attempt to update the native <form> .elements so that it will recognize clicks on slotted buttons
        //hint: it doesn't work.
        const innerForm = this.shadowRoot.children[0].children[0];
        const indirect = innerForm.children[0].assignedNodes({flatten: true})[1];
        const direct = innerForm.children[1];
        Object.defineProperty(innerForm, 'elements', {value: [indirect, direct]});
      })
    }

    attributeChangedCallback(name) {
      const att = this.getAttributeNode(name);
      const innerForm = this.shadowRoot.children[0].children[0];
      att ?
          innerForm.setAttributeNode(att.cloneNode()) :
          innerForm.removeAttribute(name);
    }

    static get observedAttributes() {
      return ["action"];
    }
  }

  customElements.define('frame-form', FrameForm);
</script>
<frame-form action="#sunshine">
  hello
  <button type="submit">outsider</button>
</frame-form>
```

No. The `<form>` element do *not* recognize the slotted, *indirect* `<button>` element as a flatDOM child of the host node. Yes, the `click` event propagate past the inner, native `<form>` correctly, but even when we monkey-patch the `.elements` property of the inner `<form>` element, it does not recognize the `<button>outsider` element as a child of the inner `<form>`.

## Consequence 1: observe indirect children on native elements => plugins

So. Were do we stand with slotted, flatDom children? Can we use them or what? Or more precisely, can we wrap elements such as `<a href>`, `<details>` and `<form>`?

The short answer is "yes, but no, no..". We cannot wrap native elements such as `<form>`, `<details>`, `<table>`, `<ul>`, `<li>`, `<summary>`, etc. Native elements in such HelicopterParentChild pairs will not recognize each other if one is wrapped inside a web component. This is sad. But true. And that means that if you wish to use such native elements in some kind of web component, you can only do so as a plugin. You must write web component definition that is *pluggable*, and then apply that definition to the native element that you seek. You can here only apply styles to the host elements, make no changes to the shadowDom, but if a event propagation monkey patch is in place, you can add default actions.

Consequence 1 is: any observation of children that combine with native elements that relate to children such as `<form>` and `<details>` *must* be implemented as a plugin on a native element. You cannot wrap such native elements inside the shadowRoot of a web component and thus harness their functionality on slotted, indirect children. With *one* notable exception: `<a href>` (except `<a href>` don't really observe its children..).

Observation of children on a native element *cannot* be executed via `slotchange` events, obviously. You cannot never ever get access to the shadowRoot of the native element, and the browser probably doesn't implement their native element reactions as something as heavy as a microtask even if you did. Thus. `slotchange` is not possible for plugins, and you need instead to use a `MutationObserver` with `childListe` on the host node that works similarly, but not identically to `slotchange`.

The way to implement this is akin to this, very short, very simple:

```javascript
class ChildrenChanged extends HTMLElement {
  firstConnectedCallback() {
    const obs = new MutationObserver(() => this.childrenChangedCallback());
    obs.observe(this, {childList: true});
  }
}
```

## Problem: but we still want indirect children.

The simplified (native?) concept is for (native and custom) elements to only anticipate and observe *only direct* children. But, we actually want *both* the direct and indirect children. Why? Because we want our custom web components to be composable inside the HTML template of other web components shadowDoms. 

## Demo: why nest slots? 

First, somebody else have already created a super smart image frame called `PassPartout`. This custom element has some magic methods that analyze the pixels of an image, its colors, the dimensions of the image, and then creates a **truly perfect** colored frame around the image. All controlled by a nice attribute API.

```javascript
class PassPartout extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML =
      '<div style="border: 5px solid white"><slot></slot></div>';
  }

  childrenChangedCallback({newChildren}) {
    if (newChildren.length > 1 || !(newChildren[0] instanceof HTMLImageElement))
      throw new SyntaxError('ImgPassPartout only accept on <img> as children.');
    if (newChildren.length === 0)
      delete this.shadowRoot.children[0].style.borderColor;
    //magic function that analyze img file colors and dimensions and the host node attributes to perfectly style a border around the image.
    this.shadowRoot.children[0].style.borderColor = 'skyblue';
  }
}
```

Second, we come around. Our mission is "mygallery.com" by taking a series of `<img>` files, frame them with a nice `<pass-partout>` and hang them on the web page. Yes, we are that creative!

Third, we already have the super smart `PassPartout` element. So the *right* thing to do would be to *compose* the our frame-passpartout-image by making a web custom web component for our frame that wraps the `PassPartout` in its shadowDom and then slots the `<img>` file into `PassPartout`. Nesting `<slot>`s; a nested SlotMatroschka. 

```html
<script type="module">

  import PassPartout from "https://in.genious.com/PassPartout.js";
  customElements.define('pass-partout', PassPartout);
  
  class FramePasspartout extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode: "open"});
      this.shadowRoot.innerHTML =
          '<div style="border: 5px solid SaddleBrown"><pass-partout mode="antique"><slot></slot></pass-partout></div>';
    }
  }

  customElements.define('frame-passpartout', FramePasspartout);
</script>

<frame-passpartout>
  <img src="anotherMunch.jpg" alt="feel the pain">
</frame-passpartout>
```

## *direct* vs. *indirect* `childrenChangedCallback()`

In the example above, we use a callback named `childrenChangedCallback()` as an abstraction for observing changes to the childNodes of the host node, a functionality now supported primarily by `slotchange` and `MutationObserver().observe(hostNode, {childList: true})`.

The  

## Discussion: Why compose in HTML?

The example above illustrates "HTML composition". Put simply, HTML composition is "programming in HTML". And, the question is: why would we like to compose/program in HTML?

First, people have already been composing HTML for a long time. When they made their old good homepages in the 90s, they were composing HTML. Crudely. Web components is simply adding another dimension with their shadowDoms and `<slot>` elements. And using custom web components inside the shadowDom of other custom elements is just a natural extension of the grammar of shadowRoots and `<slot>`. A not-so-bad parallel is to think of old school HTML as programming without functions, and web components and `<slot>`s as adding functions and parameters to the tool belt of HTML programmers.    

Thus, narrowing the question: why do we wish to add a function/parameter-like grammar to HTML?

Functions/parameters enable modularity, abstraction,  simplicity, and re-use. Using functions you can encapsulate a set of operations in a box. You can then distill, purify, abstract, and simplify this function into something safe, coherent, consistent, dependable, elegant, beautiful, inspiring. In short, functions/parameters enable you to fully "program".

We all feel that programming is *pure good*. At least until AI comes and make us all extinct. The use-case for programming is therefore not at stake. However, a new question arise: why would we like to expand the programming capability in HTML, when we already have such a rich programming environment in JS?

This is a better question. There are good arguments to be made that it would be better for the world (wide web) if the programming facilities in HTML was reduced, not increased. Arguments can be made that for example HTML and CSS should be made into a purer data-structure, like JSON, and not grow with more syntactic features.

But. There are good reasons to enable feature rich HTML composition too. Web components enable developers to cluster repeatable pieces of template behind a single element. It enables the developers *making* his own words, not just being limited to the fifty native tag names. This is useful to enable re-use not only internally in a document (intra-textual), but also re-use across texts (inter-textual). By adding the `<slot>` such words can hold positions not only at the leaf node of an HTML text, but cluster nodes and form words anywhere. Even if we want HTML to be a purer data format, we would like this means to group similar content behind new names.       

    and thus `slotchange`s are anticipated. Because. Commonly web components *adapt only to direct childNodes*; commonly web components do *not* anticipate nor accept scenario for listening for changes to children in web components is to do layout or behavioral changes in elements based on childNodes of a particular `type`/`tagName`. For example, the `<details>` element might wish to add an event listener for `click` and create some elements *only* when it receives a `<summary>` element as a child. And this behavior is linked to direct `<summary>` children only, you cannot reuse the `<details>` element inside a shadowRoot and then have it behave as if it did. Put simply, it is best practice to *only* link child sensitive behavior with *direct* children.



However. If you would like to link behavior of a web component

when a nested `<slot>` Thi means *two* things: 1. the `slotchange` event can be a message of both *direct* changes of The consequence of this is that whenever you are making a reusable web component, you must assume that others might place their `<slot>` element as the child of your host node element. And when they do, the `slotchange` event that occurs on the using web component will then be dispatched inside your context. This is yet another

## Consequence 2: what you really want is *all* the visible childNodes.

The limitations of wrapping native elements illustrates that what we really want is the *flatDom* children in order to make HelicopterParentChild parents *composable* in HTML only. Which we do.

This means that observing the *direct* children only, as we would using a `MutationObserver` `childList: true` setup would, is not sufficient. When an element is used inside a SlotMatroschka, then the direct child would be a `<slot>`, and then we would need to listen for `slotchange` events on those `<slot>` elements. Combining this with the consequence that we need to make a solution that also works as a plugin for native elements, gets slightly tricky.. We need the `MutationObserver childList` for the primary element, but we *can* for certain say that if the element is with `<slot>` elements, we can use the `slotchange` event in this secondary layer. And voilà:

```javascript
//when the directChildren change, we need to do update the slotchange listeners, and then call the CB
//when the indirectChildren change, we only call the CB

//the CB needs to hold the now and then values of the flatDom children
//the CB needs to hold the now and then values of the children
//from this, the CB can calculate the addedChildren, the removedChildren

const previousChildren = new WeakMap();
const previousSlots = new WeakMap();
const slotchangeListeners = new WeakMap();

function getSlotchangeListener(hostNode) {
  let slotchangeListener = slotchangeListeners.get(hostNode);
  if (slotchangeListener)
    return slotchangeListener;
  slotchangeListener = function () {
    indirectChildrenChanged(hostNode)
  };
  slotchangeListeners.set(hostNode, slotchangeListener);
  return slotchangeListener;
}

function getSlots(hostNode) {
  const slotChildren = hostNode.children.filter(c => c instanceof HTMLSlotElement);
  const oldSlots = previousSlots.get(hostNode) || [];
  previousSlots.set(hostNode, slotChildren);
  return {slotChildren, oldSlots};
}

class ChildrenChangedRecord {
  #newCs;
  #oldCs;
  #addCs;
  #remCs;

  constructor(newFlatChildren, oldFlatChildren) {
    this.#newCs = newFlatChildren;
    this.#oldCs = oldFlatChildren;
  }

  get newChildren() {
    return this.#newCs.clone();
  }

  get oldChildren() {
    return this.#oldCs.clone();
  }

  get added() {
    return this.#addCs || (this.addCs = this.#newCs.filter(c => this.#oldCs.indexOf(c) === -1));
  }

  get removed() {
    return this.#remCs || (this.remCs = this.#oldCs.filter(c => this.#newCs.indexOf(c) === -1));
  }
}

function makeChildrenChangedRecord(hostNode) {
  const flatDomChildren = hostNode.children.map(c => c instanceof HTMLSlotElement ? c.assignedNodes({flatten: true}) : c).flat();
  const oldChildren = previousChildren.get(hostNode) || [];
  previousChildren.set(hostNode, flatDomChildren);
  return new ChildrenChangedRecord(flatDomChildren, oldChildren);
}

function directChildrenChanged(hostNode) {
  //check for removed and new slots on hostNode, and update slotchange listeners
  const slotchangeListener = getSlotchangeListener(hostNode);
  const {slotChildren, oldSlots} = getSlots(hostNode);
  for (let addedSlot of slotChildren.filter(slot => oldSlots.indexOf(slot) === -1))
    addedSlot.addEventListener('slotchange', slotchangeListener);
  for (let removedSlot of oldSlots.filter(slot => slotChildren.indexOf(slot) === -1))
    removedSlot.removeEventListener('slotchange', slotchangeListener);

  //call the childrenChangedCallback
  /*hostNode.childrenChangedCallback &&*/  //it is not necessary to make this safe, you would have to remove the childrenChangedCallback from the methods definition for it to fail. Which is very bad. You cannot remove such a method. If you want to remove it, you should replace the cb with an empty method.
  hostNode.childrenChangedCallback(makeChildrenChangedRecord(hostNode));
}

function indirectChildrenChanged(hostNode) {
  hostNode.childrenChangedCallback(makeChildrenChangedRecord(hostNode));
}

class ChildrenChanged extends HTMLElement {

  firstConnectedCallback() {
    const obs = new MutationObserver(mrs => directChildrenChanged(mrs[0].target));
    obs.observe(this, {childList: true});
    Promise.resolve().then(() => directChildrenChanged(this));
    //directChildrenChanged(this);
    //todo, if we always know that childrenChangedCallback() is called first? or last? in firstConnectedCallback(), then we can do so sync I think. The problem is the varying sequence of attributeChangedCallback is async, firstConnectedCallback, and childrenChangedCallback, depending on the type of html parser..
    //todo sometimes attributeChangedCallback is done *after* connectedCallback()? no.. I think never. If so, the good sequence would be:
    //constructor, attributeChangedCallback, firstConnectedCallback, connectedCallback, then last childrenChangedCallback. Thus, connected which is sync always before childrenChangedCallback, which is always async microtask??
  }
}
```


