# HowTo: `<a href>`?

## WhatIs: `click` on `<a href>`?

To navigate the user can click on the content inside a link with a pointer device. This will generate a `click` event that bubbles upwards. `click` events are composed by default, and will thus pass across shadowDom borders of custom elements. But, `click` events *do not* pass by `<iframe>` document borders.

The `click` event's `target` is the innermost HTML *element* pointed to when clicking ([WHATWG](https://html.spec.whatwg.org/multipage/interaction.html#dom-click-dev)). In the example below, `<a id="one">` wraps around a text node.
`<a id="two">` wraps around a another HTML element, a `<div>`.

```html
<a id="one" href="#YesWeCan">Can we ever get enough of HTML examples?</a>

<a id="two" href="https://outside.com">
  <div style="border: 2px solid black">think</div>
</a>
```

When clicked on, the `target` of the `click` event would be:

1. the `<a id="one">` element (as the text node is only an HTML node, and not an element), and
2. the `<div>` element inside the `<a id="two">` element. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Event/target) [WHATWG](https://dom.spec.whatwg.org/#dom-event-target)

## BadDemo: a BROKEN `<a href>`

We might think that we could make the `<a href>` element without a shadowDOM. However, this doesn't work, for two reasons: 1. the event listener will doing the navigation will be appended to a target in the lightDOM and thus be called *too soon*, and 2. the styles associated with the `<a href>` element will be unprotected.

```javascript
class HTMLAnchorElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.addEventListener('click', function (e) {
      window.open(new URL(this.href, location.href));
    });
  }
}
```

## Demo: naive `<a href>`

So, what would be the simplest implementation of such an `<a href>` element?

```javascript
class HTMLAnchorElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = '<slot></slot>';
    this.shadowRoot.addEventListener('click', function (e) {
      window.open(new URL(this.href, location.href));
    });
  }
}
```

When the event propagates in bounced sequence, this demo runs the event listener at the correct time.

## Demo: adding all the nuances

In this final demo we add quite a lot of nuances to our `<a>` web component:
1. We add `preventDefault()`.
2. We add the detail that the `<a href>` only does its default action if it has a `href` attribute.
1. We add style and color
2. We update the style and color with the changing state of the browsing history.
3. We give the ability of opening up in a new window when the user presses the middle mouse button.
6. We give the `<a>` element the ability to respond to `keypress` space and enter and tab. 
7. We add a `focus` mixin that will give the `HTMLAnchorElement` the ability to pass along its `focus` to the next tabbable element.

```javascript
function updateVisited(anchor){
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

class HTMLAnchorElement extends Tabbable(HTMLElement) {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = '';
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
    this.shadowRoot.addEventListener('keydown', function(e){
      if(e.key === 'space' || e.key === 'enter')     //todo this should also be a mixin as it is used by radio buttons and checkboxes and buttons in the same way.
        return me.click();
    });
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
```

`click` events can also be generated:

* from JS script using either
	* `HTMLElement.click()` [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/click)
	  [WHATWG](https://html.spec.whatwg.org/multipage/webappapis.html#fire-a-synthetic-mouse-event)
	* `HTMLElement.dispatchEvent(new MouseEvent("click", {bubbles: true, composed: true, cancelable: true}))`.[MDN](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent) [WHATWG](https://dom.spec.whatwg.org/#dom-eventtarget-dispatchevent)
* using a shortcut specified with the [`accesskey`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/accesskey)
  ([spec](https://html.spec.whatwg.org/multipage/interaction.html#the-accesskey-attribute))
  attribute on an element. For example, `<a href="#down" accesskey="d">scroll down</a>` will trigger a `click` event when the user presses `alt`+ `d`.
* Pressing `Enter` on the keyboard while a link `<a href="...">` or a child of a link is in `.focus()`.

> Tips: In Chrome, no `keypress` is generated by the 'Enter-on-focus' nor `accesskey` combination,
> only a `keydown`, `click` and `keyup`. Firefox also dispatch the `keypress` event before the `click`.

## Separating navigating clicks from other clicks

To identify which `click` events are navigating events, the browser must analyze all `click` events that has completed bubbling.
`click` events has completed bubbling when the event has either: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Event/bubbles) [WHATWG](https://dom.spec.whatwg.org/#dom-event-bubbles)

* bubbled past the `window` object,
* a `.bubbles` value of `false` (ie. `.stopPropagation()` has been called on it), or
* bubbled past the `document` object in an `<iframe>`, `<frame>`, or `<object>`.

```html
<a id="blue" href="#blueTarget">blue stopPropagation()</a>
<a id="red" href="#redTarget">red preventDefault()</a>
<a id="yellow" href="#yellowTarget">yellow normal</a>


<h1 id="blueTarget" style="margin-top: 100vh;">blueTarget</h1>
<h1 id="redTarget" style="margin-top: 100vh;">redTarget</h1>
<h1 id="yellowTarget" style="margin-top: 100vh;">yellowTarget</h1>

<script>
  document.querySelector("#blue").addEventListener("click", e => e.stopPropagation());
  document.querySelector("#red").addEventListener("click", e => e.preventDefault());
</script> 
```

`click` events are `.composed` by default and should propagate past shadowDOM borders.
[MDN](https://developer.mozilla.org/en-US/docs/Web/API/Event/composed)
[WHATWG](https://dom.spec.whatwg.org/#dom-event-composed)

When a `click` event has completed bubbling, the browser will examine the event to see if the `click` event:

1. has [`.defaultPrevented`](https://developer.mozilla.org/en-US/docs/Web/API/Event/defaultPrevented) ([spec.](https://dom.spec.whatwg.org/#dom-event-defaultprevented)) is false,
2. is from a left or middle mouse button click, ie. not a right context menu button click,
3. has no `shift` or `ctrl` key pressed, and
4. has a `target` with an `<a href=" ">` ancestor that comes before a link blocking element
   (such as `<body>`). [WHATWG](https://html.spec.whatwg.org/multipage/webappapis.html#event-firing)

If all these criteria are met, then the `click` event is considered a navigating event and will cause the browser to que a navigation task in the micro-task que.
(or in the event loop?? todo Test this using messages). This will cause the browser to load a new document.

### `ismap`, not `usemap`

When I said there is nothing you can do with `<a href>` links, I meant *almost* nothing. If you wrap an `<a href>` element around an `<img>` element, and then add the `ismap` attribute [WHATWG](https://html.spec.whatwg.org/multipage/embedded-content.html#attr-img-ismap) to the `<img>`element. When you click on the image with a pointing device, the coordinates of the pointer will be appended to the `href` of the link on the format of `?x,y`.

```html
<a href="inYourDreams.html">
  <img src="http://maps.com/world.jpg" width="450px" height="360px" ismap alt="the place to be">
</a>
```

In the example above, if the user clicks with his pointing device at the center of the linked image, then the `href` in the navigating `click` event will be interpreted to be `inYourDreams.html?222,180`.

## No nested links

Do *not* wrap `<a>` elements around [interactive elements](https://html.spec.whatwg.org/multipage/dom.html#interactive-content-2)
such as `<form>` and `<select>`, and do *not* [nest `<a>` elements](https://www.kizu.ru/nested-links/). It is [not allowed](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element). When you nest links around other interactive elements, the browser will most often assume you have made a typo and create a different DOM than you specify.

```html

<head>
  <a href="#headLink">the browser will simply delete this element (< head> doesn't work in codepen)</a>
</head>
<body>
<a id="blueLink" href="#blue" style="border: 2px solid blue">
  <div id="blue">blue</div>
  <!--at this point the browser will very likely assume you have forgotten an </a> and therefore simply close off the #blueLink element.-->
  <a id="redLink" href="#red" style="border: 2px solid red">
    <div id="red">red</div>
  </a>
  <div id="blueToo">blueToo</div>
</a>
<a href="#yellow" id="yellowLink">
  <form action="#green">
    <select name="test" id="testSelect">
      <option value="a">a</option>
      <option value="b">b</option>
      <option value="c">c</option>
    </select>
    <a href="#purple">
      <button id="purpleButton" type="submit">go purple</button>
    </a>
    <button id="greenButton" type="submit">go green</button>
  </form>
</a>
<script>
  window.addEventListener("hashchange", e => console.log(e.newURL));
  /*
  var headLink = document.querySelector("#headLink");  //headLink === undefined
  document.querySelector("#blueLink").click();    //#blue
  document.querySelector("#redLink").click();     //#red
  document.querySelector("#blue").click();        //#blue
  document.querySelector("#red").click();         //#red
  document.querySelector("#blueToo").click();     //not wrapped by a link in the DOM
  document.querySelector("#purpleButton").click();//nothing happens
  document.querySelector("#testSelect").click();  //#yellow
  document.querySelector("#greenButton").click(); //nothing happens  
  */
</script>
</body>  
```

In short: nested links will be clickable, but the DOM will likely be altered and the page therefore behave in a chaotic way. You cannot nest links.

## References

*
* [MDN: `MouseEvent`](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent)
* [MDN: `KeyboardEvent`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent)
* [MDN: `<a>` in SVG](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/a)
* [MDN: `<area>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/area)
* [WHATWG: `<a>` in HTML](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element)
* [MDN: `<a>` in SVG](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/a)
* [Whatwg: Interactive elements](https://html.spec.whatwg.org/multipage/interactive-elements.html)
* [MDN: `.focus()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus)

*

// * [w3.org: Interactive content](https://www.w3.org/TR/html5/dom.html#interactive-content)
