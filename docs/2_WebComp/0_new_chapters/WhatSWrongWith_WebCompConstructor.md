# WhatIsWrongWith: web comp constructor?

# Expectation 1: attributes and children are ready during `constructor()`

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

Here, the element `constructor` is called *before* the attributes and childNodes are ready. This breaks *both* the pattern for web component upgrade and `innerHTML` *and* developer expectations. 

## Why?! Why the difference in behavior and expectations?

First, why do developers expect attributes and children to be ready during `constructor()`?

1. HTML elements have start and *end* tags: an element's declaration is not concluded until it is closed with for example a `</h1>` or `/>` tag. The end tag echo the en parenthesis `)` symbol in JS functions and constructor. Thus, the attributes and child nodes echo two sets of constructor arguments: `constructor(attributes, childNodes)`.

2. HTML is a declarative language. That means that it declares the truth, the state of the world, *all at once*.
    1. If you define an HTML element with attributes, children, and end tag on line 2, you cannot later in the same HTML text *change* neither the tagName, attributes, nor children on say line 5. The HTML interpreter simply reads "HTML values" and lists them in a (directed acyclic) graph; the HTML interpreter can never change the values of things already *read*.
        1. Note: sync `<script>` tags with DOM manipulation and `document.write`s mess things up practically, but not conceptually in HTML.
    2. In imperative languages such as JS, this "reading static values"-concept is not implied: if you define a JS variable on line 2 and then change that variable on line `5`, then the value of the line2/line5-variable changes as the interpreter moves through the text.
    3. As HTML implies a graph of static values, something happens in the human mind: the world view becomes *synchronic*. A *synchronic mindset* imagines everything as true all at once. It is as if we imagine a space only, and no timeline. For example, imagine your local super-market. Think of it as a building, full of shops, and items in shelves, and passages, and windows, and lights, and people standing behind counters. This is a synchronic view of the super-market. Now, imagine you taking a trip to the super-market. You go into your car, you drive, you park the car, you walk into the grocer, you get a cart, you put milk in the cart, then walk to bread, get a bun, walk to the teller, stand in line, pay, put stuff in bag, walk to car, drive home. This is an imperative view of the super-market.
    4. A *synchronic* mindset expects things to be true all at once. For everything to be there already. There is no *after*. There is no *before*. Thus, in declarative, *synchronic* HTML the mind of the developer sees no reason why the attributes and childnodes of an HTML element should not be ready when the element is constructed.

But, why are web components defined in a *sync* `<script>` (and native elements) constructed *before* attributes and childNodes are ready? 

1. Now, in reality there might be reasons for a timeline with *before* and *after*. Let's look at an example.
2. Imagine the browser downloading a big HTML document. The network splits the document into several network packages, and a delay occurs such that the browser only receives the first half of an HTML document. The second half is delayed 666ms.
3. This puts the browser in a bind: Should it a) wait 666ms for the rest of the document before it starts constructing elements, or b) should it construct and show on screen as much as possible with the in-complete information already downloaded. 
4. The browser chooses b). It constructs for example the `<body>` element knowing full well it doesn't know all its children yet, and it might also construct a `<div>` element whose start tag is still not yet fully downloaded. 
5. Thus, when interpreting the main HTML document, the browser chooses to construct elements *before* it has read all the children nodes and even all the attributes. Best understood as driven by fear that it might have to wait 666ms or more before the whole document is ready.
6. Furthermore, consistency is paramount. If the browser might construct some elements, sometimes without attributes and children ready, it should construct *all* elements, all the time, without attributes and children ready.
   1. When interpreting the main document
   2. the browser constructs *all* HTML elements 
   3. *after* it has read the beginning of the start tag, but
   4. *before* it has read the full list of attributes and children, and
   5. therefore calls the `constructor()` on an element object that so far has NO attributes and NO host node children set. 
   
7. But. The same practical considerations do not apply when the browser constructs HTML elements *after* the main document has loaded. When `.innerHTML` is processed or web components are *upgraded*, the browser can assume that there will be no 666ms network delay and therefore that the data about attributes and childNodes is ready. Without fear of network delays, the HTML interpreter *calls* the `constructor()` *after* it has read the full list of attributes and children, as meats the expectations of the declarative, *synchronic* mindset.
8. To conclude. It is only during the loading of the main HTML document that the browser a) is in a rush to produce displayable objects and b) fears the delay of latter parts of the main document and therefore c) construct all elements in an imperative fashion *before* and *without* reading attributes and childNodes. This is the exception to the declarative, *synchronic* expectation of HTML that everything is ready at once, that the browser's HTML interpreter honors when it constructs HTML elements from `.innerHTML` template and web component upgrades. 

## Limit 1: No attributes nor childNodes in `constructor()`

Seeing that the browser *sometimes* call `HTMLElement.constructor()` *before* and *without* setting its *synchronously* declared attributes and children, the browser has chosen to set a limitation on `HTMLElment.constructor`. For consistency. And to avoid race conditions between attributes set in `constructor()` vs attributes set in template: 

    The `HTMLElment.constructor()` cannot write to `this.attributes` nor `this.childNodes`.

```html
<script>
class WebComp extends HTMLElement{
  constructor(){
    super();
    this.setAttribute('a', 'default-value');//throws an Error
    this.append('hello world');//throws an Error
  }
}

customElements.define('web-comp', WebComp);
</script>
<web-comp></web-comp>
```

But. This is a *patchy* limitation: it only restricts *writes*, but has the same problem for *reads*. In the example below, you can see the confusing situation when the same element *read* the same situation *differently*.

```html
<web-comp a="123">hello</web-comp>
<script>
  class WebComp extends HTMLElement{
    constructor(){
      super();
      console.log(this.getAttribute('a'), this.childNodes[0]);
    }
  }
  customElements.define('web-comp', WebComp);
</script>
<web-comp a="abc">sunshine</web-comp>
```

Results in:
```
123, hello
undefined, undefined   //and no warning!
```

It is not your fault for not *intuiting* this restriction. It is the browsers fault. 

And. Now that the validity of the limitation is down, lets kick it some more! This limitation is also conceptually flawed. The principle in HTML is *synchronicity*, ie. everything is true and ready at the same time. *Intuitively*, the constructor should have all information  

This is not an intuitive limitation. And this limitation is patchy. Why? First. You cannot *write* to neither attributes nor children, but you are not warned when you try to *read*   write childNodes to the  Sometimes when a web component's `constructor()` is called, you can read attributes and childNodes, sometimes not. Web components are intended to be reused, ie. made by one man who doesn't know in which contexts the web component is to be used, and therefore, the developer of the web component cannot assume that attributes nor childNodes are ready.

Furthermore, the browser has restricted the `constructor()` from setting either attributes or childNodes on the host node. Much in the same spirit. Doing something like this is therefore both illegal and error prone:

```javascript
class BrokenWebComponent extends HTMLElement{
  constructor(){
    super();
    if(!this.hasAttribute('a')) this.setAttribute('a', 'default');
    if(!this.childNodes.length) this.append('hello world');
  }
}

customElements.define('web-comp', BrokenWebComponent);
```

## Limit 2: `constructor()` cannot be used by plugins

If you are making a web component, then you might very well like to apply that functionality to an already existing element in the DOM. There can be many reasons why "creating a definition, new tag and element" is off limits: 
1. you might not have access to the template creation: the template might be stored in vast legacy datastores and/or generated by big legacy servers you definitely do not want to play with;
2. you might need native behavior of native elements such as `<form>` and `<input>` to enable say predictive writing or suggestionssuch as predictive writing against that you need your javascript to run against: there is a legacy server system spewing out HTML that you do not dare to touch given your projects constraints, thus you wish to add a js file against a given html structure, for now; you might be writing a plugin that many other people would like to use against their existing structure; you might need to work against existing elements such as `<body>`, `<form>` or `<a>` that the browser has added lots of native functionality too and that cannot be redefined using anything but a plugin.

