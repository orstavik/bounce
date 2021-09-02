# WhatIsWrongWith: `Element.constructor()`?

When reading HTML code, the browser will convert the HTML text into run-time objects, ie. DOM nodes. For native elements (and custom elements not yet defined) the browser calls a native `constructor`, and custom elements already defined are called the web component `constructor`. But *exactly when* does this happen?

## WhenIs: the beginning of an element in HTML template text?

An element looks like this in HTML:

```
<div a="one" b="two">hello <b>sunshine</b></div> 
```

Looking at the element, there are three points that we could consider an element's beginning:

1. **tag start**: as soon as the element is detected / the start of the tag is read(y). Precisely, this is the first whitespace inside the tag which would delineate the end of the tag name.
2. **end of start tag**: as soon as all the attributes are read(y). Precisely, this is when the `>` end of the start tag is read.
3. **tag completed**: as soon as the end tag is read(y). Precisely, this is when the `>` that *ends* the end tag is read.

We can illustrate this in the example above:

```
<div »1« a="one" b="two">hello <b>sunshine</b></div> 

<div a="one" b="two">»2«hello <b>sunshine</b></div> 

<div a="one" b="two">hello <b>sunshine</b></div>»3« 
```

Currently, the browser calls the constructor for HTML elements at *two different times*:

1. **tag start** `»1«` and
2. **tag completed** `»3«`.

So. *Sometimes* the browser calls the constructor *immediately* as it discovers the element and **start tag**; *sometimes* the browser waits until it has read all the information about attributes and childNodes.

This difference is *baffling* and *much more* influential for web component design than one first might think. And the browser *does this on purpose*! Why? Why can't the browser just call the constructor either at the end or at the beginning? And when? When does the browser call the constructor at the beginning of the tag, and when does it call the constructor when the tag is complete?

> Sometimes, the browser even calls an element's `constructor` *during `childNode`* construction. But, this is an edge-case, so it is better to understand the `constructor` as either

## WhenAndWhy: `Element.constructor()` at **tag start**?

There are *two* situations when the browser calls `Element.constructor()` at **tag start**: during "predictive parsing" and from JS `constructor()` calls.

### Predictive parser uses **start tag** `constructor()`

The browser's Predictive Parser (here: PP) is `loading` the HTML text that will blossom into a web page. It does so by downloading the file over the network, parsing it, and then interpreting it into a DOM. But, when the PP is downloading the html text file, it must anticipate network delays: put simply, the browser must expect to receive half the document immediately, and then wait for example 3 seconds for the rest of the document to finish downloading.

This is a real problem. If the browser shows a white screen for 3 seconds, the user thinks something is wrong, he/she will try to reload or go somewhere else. Must not keep the user waiting! The goal of the browser is therefore to give the user a meaningful paint asap. The meaningful paint tells the user that the browser *is* working to fulfil the user's request. Then, the browser aims to give the user a "contentful paint". This entertains the user with while both browser and user wait for the second half of the document.

To accomplish its goal, the browser makes a decision:

1. The browser will *not* wait until all tags are fully read with attributes nor childNodes. If it did, it couldn't construct the `</body>` and `</html>` elements until it had the whole document, and that would effectively force the browser to display a white screen until the whole document finished loading.
2. Instead, the browser *chooses* to *start making* elements ASAP, relying *only* on the **start tag**. This means that the `Element.constructor()` is called *before* attributes and childNodes are made available, even though they are declared "simultaneously" in the HTML template.
3. The browser acts as if developers put the most important and enough information at the top of their HTML files so that they can make meaningful and contentful paints with the early parts of the document. The browser also acts as if developers will honor the HTML template in the beginning of their file and not switch too many elements around using styles and JS loaded near the end of the document. And seeing that the browsers' PPs work like this, most developers wisely comply.

And so, in a highly competitive world, browsers with PP and web pages that play nicely with the browsers' PPs wins. And calling `Element.constructor()` asap, and at start tag detection, is a corner stone of the PPs' behavior. And that is the short story of why the browsers' PP call `Element.constructor()` as soon as start tags are detected.

> The predictive parser is actually *not* connecting the constructed element to the DOM at *start tag*: instead, the predictive parser waits until *end of start tag* (it waits until all attributes are read(y)) *before* connecting constructed elements. This means that the predictive parser *could* just as easily have delayed calling the `Element.constructor()` until *end of start tag*.

### JS `constructor()` at **start tag**

JS is an imperative programming language: it takes thing step by step. Faced with the task of making a complete HTML tag, the current API in JS is currently set up to behave like this:

```
<web-comp               const wc = new WebCompElement();
a="one"                 wc.setAttribute("a", "one");
b="two"                 wc.setAttribute("a", "one");
>
hello                   wc.append(helloTextNode);
<b>sunshine</b>         wc.append(sunshineBElement);
</web-comp> 
``` 

However, it *is* possible to imagine a different JS API: `HTMLElement.constructor(attributes, childNodes, parentNode)`.

The *syntax* of HTML allows for *only 3* contextual bindings when making elements: attributes, childNodes, and parentNode. To more directly *mirror* the HTML world in JS world, then the browser *could* specify that `Element.constructor()` should *also* accept attributes, childNodes, and parentNode arguments by default.

```
<web-comp a="one" b="two">hello <b>sunshine</b></web-comp> 

const wc = new WebComp(
   parentNode, 
   {a: 'one', b: 'two'}, 
   ['hello', sunshineBElement]
);
``` 

In such a world, *empty* `Element.constructor()` calls could still be considered legal, but it would give the developers an ability to specify: a) when an empty, no-parent-connected element is constructed VS. b) when an element with known attributes, childNodes and parent is constructed.

## Why: `Element.constructor()` at **tag completed**?

There are two reasons why `Element.constructor()` should run a **tag completed**: 1) this is the "normal" way to view the world in HTML, and 2) it can be much more efficient.

### Why: **tag completed** makes more sense in HTML?

HTML is a declarative programming language. Part of the declarative nature of HTML is the fact that there are no "changing of variables" within a document. What is true after reading 5 lines of HTML code must remain after 500lines of code are read. Truth accumulates, but it doesn't change. Put simply, this means that an HTML tag can *never* change neither its name, parentNode, attributes, nor child list *after* it has been read.

To see what this means, we can compare a piece of HTML side-by-side with JS:

```
<div att="1">             var obj = { 
                             att: 1,
  <h1>hello</h1>             one: "hello", 
  sunshine                   two: "sunshine"
</div>                    }
???                       obj.att = 2;
???                       obj.three = "bob";
???                       obj = 42;
```

As the example above illustrates, HTML simply doesn't have any means to *change* something once it has been declared. HTML is mutation free. JS on the other hand is almost nothing but variable mutations.

So, while the HTML world therefore is static, non-mutable; the JS world is dynamic, mutable. When the developer puts on his "HTML thinking hat", he sees the DOM as a static, acyclic graph of HTML elements; when he puts on the "JS thinking hat", he sees step-by-step processes *changing* DOM elements parents, attributes, and children.

This has important implications for the `Element.constructor()`. Viewed from HTML both the parentNode, attributes, and children have already been declared when the element is declared. There is no chicken-or-egg dilemma in HTML: parent, children, and attributes are just *there* when the element tag is *declared*.

Thus, viewed from HTML there are no "steps" in element construction. Element construction *is* with the blink of an eye. All elements in the document are constructed *simultaneously*. This is the intrinsic logic of the HTML grammar, this is what *declarative leads us to assume*.

All this boils down the **NORMAL** way to perceive elements in HTML as being constructed is *after* the end tag. It makes no sense in HTML to think about the construction of `div` in `<div a="one" b="two">hello <b>sunshine</b></div>` as ever occurring *before* the attributes, childNodes, and potential parentNode declared *simultaneously*. There is no *before* when the universe is *declared*.

### When: **tag completed** can be more efficient?

Computers can do performance magic. Especially when faced with tasks such as converting strings to in-memory objects. This means that converting HTML text into in-memory DOM objects can be made super efficient.

How? Imagine that all the known HTML tag names are given a number. And every time you define a new custom element tag name, that is also given a number. Also, every time you parse a new element, you know the number of the parent node. And so, reading something like `<div..` can be converted into `elementNumber-parentNumber-tagNumber..`, and if we assume that there are never more than 1024 elements and 256 tags, then this can be a fixed length binary number: `1101001110....1101010101`. And then the parser continues, adding number for attributes and attribute values. Assuming all element has no more than 8 attributes, and that attribute names is no longer than 256 characters and attribute values no more than 1024 characters, the attribute text in HTML can also immediately be converted into fixed length binary number. And that is it. When the HTML parser starts reading the child, it will store the list children of the parent implicitly via the parentNumber.

Of course, the browser makes a much better binary number converter from a string of HTML than the one above. The browser should make a smaller number, reuse attribute names, reuse string values, reuse all strings in fact, map children in the first pass, make everything into a Rubik's cube type of binary number. Describing the best HTML-text-to-binary-DOM-number is not my point; my point is to illustrate *how* easy it is to make a low-level, super efficient HTML-to-DOM function **iff HTML is read as *one, whole* block** .

HTML can be made super efficient **iff** a document is *first* parsed into nodes with all parents, attributes, and child nodes *all at once*, and then *second* call native or javascript `constructor()` and other callbacks for each of the elements.

## When: `Element.constructor()` and **tag completed**?

The browser calls `Element.constructor()` at **tag completed** in *two* situations: 1) `innerHTML` and 2) "normal" sibling *upgrades* of web components.

`.innerHTML` is called from script, and when working from script the browser assumes that the entire HTML text string is already downloaded. Thus, no need for predictive parsing, much more need for efficient HTML-text to binary-DOM translation. And, this fits with the developers HTML world view.

Upgrade is what the browser does to elements *directly or indirectly connected to the main document* when `customElement.define(..)` is called for their tag name. These elements have already been added to the DOM, with parentNode, attributes, and childNodes. And therefore, when upgrade triggers the `Element.constructor()`, then all attributes and childNodes are read(y).

## SpecialCaseCaveat: upgrade called from `<script>` inside `<web-comp>`?

```html
<web-comp>
  <h1>Hello</h1>
  <h1>sunshine</h1>
</web-comp>
<web-comp>
  <h1>Hello</h1>
  <script>
    class WebComp extends HTMLElement {
      constructor() {
        super();
        console.log(this.children.length);
      }
    }

    customElements.define('web-comp', WebComp);
  </script>
  <h1>darkness</h1>
</web-comp>
```

If you call `customElements.define(..)` from inside a sync `<script>`-tag in the main HTML document *before* one or more childNodes, then the `Element.constructor()` will be triggered midway through child parsing. A dynamic, forth `»4«`, weird, construction time. You should consider this an implementation problem that arise when the HTML and JS world view collide. The browser chooses here to fulfill its obligation to JS expectations that `customElements.define(..)` triggers upgrade of web components synchronically. Combined with the sync `<script>` tag, and the predictive parser, this causes the `Element.constructor()` to *sometime* be called *midway during child parsing* when upgrading, instead of at *tag completed* which is common for upgrades.

## References