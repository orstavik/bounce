# Problem: flash of unstyled content and web components

## WhatIs: native layout web component?

Most native elements actually *only* define layout. Examples of such native, layout-only elements are: `<div>`, `<p>`, `<b>`, `<h4>`, `<table><tr><td>`, `<main>`, `<ol><li><ul>`, `<dl><dt><dd>`, and many more. Some other elements such as `<details><summary>` also define layout with some added interactive behavior. In fact, elements who alters the layout of content on screen make up roughly 75% of all native element types. And, put simply, *defining layout* makes up about half the use-case for HTML.

## Why: custom layout web components?

Web components, aka "custom elements", give us the ability to a) encapsulate modules with JS, HTML, and CSS in order to make "units" that "do stuff in the same way" as native elements.

We have already established that around 3/4 of native elements primarily direct layout, and so it would be natural to assume that custom elements also often would be made to control style. This doesn't mean that *all* custom HTML elements must direct style, only that when we look at how custom elements should/do work, we must assume that most of them primarily will direct style and layout of content on our web pages.

It is my personal guesstimate that making custom layout elements, often with custom UI behavior, will make up *more than half* the use-cases for web components. This is not to say that custom *non-layout* elements such as custom `<script>` and `<a href>` tags are not important, only to say that custom layout elements is/will/should be the bread and butter of web components.

## Problem: flash of unstyled content

Flash of unstyled content is a known entity. It happens when:

1. the "specification of layout/style" is applied **after**
2. the first rendering of content.

Since the application of layout/style most commonly happens only a blink of an eye *after* the initial rendering, the user only sees a short "flash" of the content in some raw layout/style before it is positioned correctly/as intended on screen.

Such flashes of content that is "styled/laid out differently than intended" is called FOUC. It is uncomfortable to watch, disturbing, confusing, and off putting. Users leave such web sites. It is therefore something to be avoided at almost any cost.

## Why: CSS blocks rendering

FOUC is why stylesheets in the main document block rendering. When a stylesheet is added to the main document, the browsers know that this stylesheet is likely to a) change the style and position of elements from their default HTML element value, and therefore b) that if HTML content is rendered *before* such styles are loaded, the browsers *will almost always* create FOUC. Therefore, the browser will always wait to render anything on screen until it has loaded any stylesheet in the main document.

## Why: layout web component definitions also must block rendering

As established above, a main use-case of web components is to *alter* the style and layout of content on screen. This is the same "use-case" as CSS. In fact, web-component technology will in many instances primarily try to encapsulate complex "CSS structures" in order to make them reusable.

But. If the developer wraps a lot of content in web component layout, and then a) render the content *before* b) loading the web component definition, then the upgrade process of those web component definitions *will cause* FOUC.

## Demo: WebComponentStyleFlash

Web Component's Flash Of Unstyled Content (FOUC).

```html

<web-comp>Hello</web-comp>
<web-comp>sunshine</web-comp>

<script type="module">        //simulate a delay loading
setTimeout(function () {   //WebComp script over network
  class WebComp extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode: "open"});
      this.shadowRoot.innerHTML =
          `<div style="padding-top: 1em"><slot></slot></div>`;
    }
  }

  customElements.define("web-comp", WebComp);
}, 3000);
</script>
```

This demo will first render on screen:

```
Hello sunshine
```

and then, after 3 seconds, in a flash change this to:

```

Hello

sunshine
```

So, how to fix WebComponentStyleFlash? There are two ways to do this, one good and one bad.

## Anti-pattern: lightDom redundant style emulation

The bad way is to make an extra, redundant `<style>` in the main document that "emulate" the final layout of the `<web-comp>`. In our demo, it would look something like this:

```html

<style>web-comp {display: block; padding-top: 1em}</style>
<web-comp>Hello</web-comp>
<web-comp>sunshine</web-comp>

<script type="module">        //simulate a delay loading
setTimeout(function () {   //WebComp script over network
  class WebComp extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode: "open"});
      this.shadowRoot.innerHTML =
          `<div style="padding-top: 1em"><slot></slot></div>`;
    }
  }

  customElements.define("web-comp", WebComp);
}, 3000);
</script>
```

Yes, this demo will render something that looks almost the same at the outset:

```

Hello

sunshine
```

But, this isn't 1) exact nor 2) scalable, but 3) redundant.

1. as the demo illustrate there will often be a slight glitch in the layout, as the exact layout defined by the web-comp is likely slightly different. Here, the extra `<div>` and `<slot>` elements would get a little extra padding each, thus making the added style emulation slightly off. The more complex the layout, the more likely the exactness will be more and more difficult to emulate.

2. This demo is super simple, yet we would still need to debug the output to emulate the style. However, if the custom element included different styling for different screens, itself contained complex web components, etc., this solution quickly becomes unrealistic to pursue. There is after all a *reason* why the custom element was made in the first place.

3. The emlutated `<style>` is the essence of redundancy. It really is bad. The more useful the web component (ie. the more exact it defines more complex layout), the more redundant code needs to be a) written and **b) maintained(!!)**. I cannot stress this enough, any reusability and maintainability a custom layout web component would afford goes right out the window if you try to fend of WebComponentStyleFlash using style emulation in the lightDom.

## Fixing WebComponentStyleFlash with **sync** `<script>`s

**Sync** `<script>`s are performance taboo. They *block* not only rendering, but also parsing and execution of later `<script>`s. What you are supposed to do (and in order to get your stars in the google search engine hierarchy), is to preferably `defer` or `type="module"` all your `<script>`s.

But. If you a) use a layout web component in your main HTML document and b) then `customElements.define` in a `<script defer>`, then c) you get a WebComponentStyleFlash. And, you want to avoid FOUC at almost all cost.

So. You are between a rock and a hard place and broken glass. FOUC vs sync scripts vs no layout web components. It is a hard choice. And it falls to.... sync scripts.

Why? a) You **need**  web components for modularizing reusable layout and style. That is what HTML is half about. And there is no other mechanism that offers even a glimmer of hope of reuse and flexibility in reusing flexible styles. And if you don't believe me, google "bootstrap".

b) quick rendering with FOUC is worse than slightly slower rendering without FOUC. So, investing your efforts in efficient and sync web component definition will produce a better result than trying to emulate style or do some other work around to handle WebComponentStyleFlashes.

## Demo 1: custom element definitions in inline script 

```html
<p>Hello, I require no link rel="stylesheet"</p>

<script>
  class WebComp extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode: "open"});
      this.shadowRoot.innerHTML =
          `<div style="padding-top: 1em"><slot></slot></div>`;
    }
  }

  customElements.define("web-comp", WebComp);
</script>
<link rel="stylesheet" href="https://cdn.com/style.css"/>
<p>Hello, I am styled by style.css</p>

<web-comp>Hello</web-comp>
<web-comp>sunshine</web-comp>

<link rel="stylesheet" href="https://cdn.com/otherstyle.css"/>
<p>Hello, I am styled by otherstyle.css</p>
```

First rule: You want to load the custom element definition a) *before* the first custom element tag and b) as late as possible. The sync `<script>` tag will block other processes, and you don't want that until you absolutely have to in order to avoid FOUC. This essentially means placing the sync `<script>` tag immediately before the first custom element tag.

Second rule: sync `<script>` tags do not load *before* all *upto-this-point* declared style sheets are loaded and parsed. *Can* you load a `<link rel="stylesheet">` *after* your custom elements? Then do it.

## Demo 2: custom element definitions in script src

```html
<head>
   <link rel="preload" href="https://cdn.com/WebComp.js">
   <link rel="stylesheet" href="https://cdn.com/style.css">
</head>
<body>
<p>Hello, I am styled by style.css</p>
<script src="https://cdn.com/WebComp.js"></script>
<web-comp>Hello</web-comp>
<web-comp>sunshine</web-comp>
<link rel="stylesheet" href="https://cdn.com/otherstyle.css"/>
<p>Hello, I am styled by otherstyle.css</p>
</body>
```

First rule: You want to load the custom element definition a) *before* the first custom element tag and b) as late as possible.

Second rule: *Can* you load a `<link rel="stylesheet">` *after* your custom elements? Then do it.

Third rule: initiate the download of the sync `<script>` src *before* any style sheets are loaded with a `<link rel="preload" href="src">`

## Upgrade layout elements?

You can upgrade *non-layout* elements. Functionality that essentially only dictate event listener behavior may very well be upgraded at the turning point to DOM interactive for example. Such elements can very well be declared in the DOM and then upgraded.

Some *select few times*, you can upgrade elements that only slightly alter style. For example, a custom element might add color and text decoration to an element if it is a known link. If this custom element also adds a nice animation that fades the color in, then starting this color animation 50ms sooner or later doesn't matter much.

But. If color or position abruptly changes to cause a *flash*, you don't want to "upgrade" your custom element definitions. Period.

So. Upgrading is kinda advanced. If you have custom elements that do not alter layout (ie. has no shadowRoot or a shadowRoot that just looks like this: `<slot></slot>`), then to upgrade should be fine. However, if you have any other visible content in your web components shadowRoot, try to avoid upgrading.