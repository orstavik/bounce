# Pattern: SelectFeedbackElement

The SelectFeedbackElement pattern enables the user to:
 * select one visual expression from a set of predefined a visual expressions, such as `cursor: crosshair`, and/or
 * define a visual profile for a predefined visual expression, such as an hypothetical `cursor-color: blue`.
 
The SelectFeedbackElement pattern uses the CssControlEvents pattern: a CSS variable name is chosen for a specific composed event's visual expression argument; the EventSequence then reads this CSS variable (using `getComputedStyle(..)`) during the StartEvent; and then the EventSequence uses the value of this CSS variable to alter its visual expression.

## Demo: `long-press` with `--long-press-color`

```html
<script>
  (function () {

    class BlindManDomLayer extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({mode: "open"});
        this.shadowRoot.innerHTML = `
<style>
  @keyframes starting-press {
    0% {
      transform: scale(0);
      opacity: 0;
    }
    100% {
      transform: scale(1);
      opacity: 0.5;
    }
  }
  :host {
    margin: 0;
    padding: 0;
    position: fixed;
    z-index: 2147483647;
    pointer-events: none;
    /*overflow: visible;*/
    animation: starting-press 600ms forwards;
  }
</style>
<slot></slot>`;
      }
    }

    customElements.define("blind-man-dom-layer", BlindManDomLayer);

    class PondRing extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({mode: "open"});
        this.shadowRoot.innerHTML = `
<style>
  :host {
    display: block;
    box-sizing: border-box;
    width: 20px;
    height: 20px;
    padding: 0;
    margin: -10px 0 0 -6px;
    border: 3px double grey;
    border-radius: 50%;
  }
  :host(*.long-press-ends) {
    background: green;
  }
  :host(*.long-press-fails) {
    background: red;
  }
</style>`;
      }
    }

    customElements.define("long-press-pond-ring", PondRing);

    function dispatchPriorEvent(target, composedEvent, trigger) {
      composedEvent.preventDefault = function () {
        trigger.preventDefault();
        trigger.stopImmediatePropagation ? trigger.stopImmediatePropagation() : trigger.stopPropagation();
      };
      composedEvent.trigger = trigger;
      return target.dispatchEvent(composedEvent);
    }

    var primaryEvent;
    var blindMan = document.createElement("blind-man-dom-layer");
    var feedbackElement = document.createElement("long-press-pond-ring");
    blindMan.appendChild(feedbackElement);

    function addVisualFeedback(x, y, color) {
      //using left and top instead of transform: translate(x, y) so as to simplify scale animation
      blindMan.style.left = x + "px";
      blindMan.style.top = y + "px";
      if (color)
        feedbackElement.style.borderColor = color;
      document.body.appendChild(blindMan);
    }

    function removeVisualFeedback(success, ttl) {
      const endState = success ? "long-press-ends" : "long-press-fails";
      blindMan.classList.add(endState);
      feedbackElement.classList.add(endState);
      setTimeout(function () {
        blindMan.classList.remove(endState);
        feedbackElement.classList.remove(endState);
        blindMan.remove();
      }, ttl);
    }

    function onMousedown(e) {
      if (e.button !== 0)
        return;
      primaryEvent = e;
      window.addEventListener("mouseup", onMouseup, true);
      const currentTargetStyle = getComputedStyle(e.target);
      const color = currentTargetStyle.getPropertyValue("--long-press-color");
      addVisualFeedback(e.clientX, e.clientY, color);
    }

    function onMouseup(e) {
      var duration = e.timeStamp - primaryEvent.timeStamp;
      //trigger long-press iff the press duration is more than 300ms ON the exact same mouse event target.
      if (duration > 600) {
        let longPress = new CustomEvent("long-press", {bubbles: true, composed: true, detail: duration});
        dispatchPriorEvent(e.target, longPress, e);
        removeVisualFeedback(true, 250);
      } else {
        removeVisualFeedback(false, 250);
      }
      primaryEvent = undefined;
      window.removeEventListener("mouseup", onMouseup, true);
    }

    window.addEventListener("mousedown", onMousedown, true);
  })();
</script>
<style>
h1 {
  --long-press-color: orange;
}
</style>
<h1>Hello sunshine</h1>
<h3>Hello world</h3>
<script>
  window.addEventListener("long-press", e => console.log(e.type));
</script>
```

## What can we style with CSS variables?

The demo above simply adds a border color. Not very complex. But what *can* we accomplish with CSS properties?

1. Add several CSS properties to control several different dimensions of the feedback element.
  
2. Selecting between a group of predefined elements. The `cursor` property is a good example of this use-case. The EventSequence simply needs to implement several multiple feedback images internally, and then set up a custom CSS property that selects between them by name.

3. Reference a custom element. This is a powerful trick, but require the user of the EventSequence to a) define a web component and b) reference this web component's tag name from CSS. This is not bleeding edge, but it does require the developer to *combine two advanced techniques*.  

### HowTo: Select custom elements as FeedbackElement

To set a custom element as FeedbackElement using CSS is done like this:

From the perspective of the app developer, the app:

1. defines a custom element with complex style and animations and registers that element with a tag name, 
```javascript
class NiceFeedback extends HTMLElement{
  constructor(){
    super();
    this.attachShadow({mode: "open"});
    /*The shadowDOM contains a nice set of elemenets with styles that can animate and react to pseudo-pseudo-classes*/
    this.shadowRoot.innerHTML = ""; 
  }
} 
customElements.define("nice-feedback", NiceFeedback);
```       
2. references that tag name in a custom CSS property that is applied to some selected elements in a CSS rule (
```css
div.selected {
  --long-press-symbol: nice-feedback;
}
``` 
   
Inside the EventSequence, when the `--long-press-symbol` property is read, the EventSequence creates a new instance of the given element type (`document.createElement("nice-feedback")`), and uses this element as the FeedbackElement. The EventSequence can of course save and reuse the element instances to make the whole process more efficient.

## References

 * []()