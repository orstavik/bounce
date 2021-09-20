# CallbackInheritance

the constructor needs to run on all super-classes. Why? Because it is a "life cycle" method. It really makes no sense having inheritance if they didn't "live" the same way as their ancestors. Or. That is what the rich will tell ya. But hey, who don't wanna be rich?! So, who can blame them..

Anywho, web components/custom elements/`HTMLElement`s have the constructor lifecycle method. But. `HTMLElement`s also have other lifecycle methods: `connectedCallback()` and `attributeChangedCallback()` and its associate `static get observedAttributes()`. So, to actually have web component inheritance, if there is a `super.connectedCallback()` for a web component, then it needs to be called.

## Demo: super.naive.connectedCallback()

```html

<script>
  class SuperComp extends HTMLElement {
    connectedCallback() {
      console.log('SuperComp');
    }
  }

  class WebComp extends SuperComp {

    connectedCallback() {
      super.connectedCallback();
      console.log("WebComp")
    }
  }

  customElements.define('web-comp', WebComp);
</script>
<web-comp></web-comp>
```

The good thing with `super.naive` is that it is simple. super.simple. But, it has two problems:

1. What if the *top* of the chain doesn't have a `connectedCallback()`, and
2. what if the developer *forgets* to put the `super.connectedCallback()` first?

## Demo: super.patched.connectedCallback()

The simplest solution for this problem is to *patch* the `HTMLElement.prototype` to always include the lifecycle methods:

```html

<script>
  HTMLElement.prototype.connectedCallback = function connectedCallback() {
    console.log('patched');
  };

  class NotSuperComp extends HTMLElement {
  }

  class WebComp extends NotSuperComp {

    connectedCallback() {
      super.connectedCallback();
      console.log(super.connectedCallback)
      console.log("WebComp")
    }
  }

  customElements.define('web-comp', WebComp);
</script>
<web-comp></web-comp>
```

## Demo: did you forget something, super?

Let's fix the second "naiveness": developers forgetting.

You cannot *instantiate* any web component from a sub-class of `HTMLElement` until you have passed it through `customElements.define(..)`. And that also means that you can do a check of the code of the signature of the connectedCallback function using regex to ensure that `super.connectedCallback(` is the first thing happening in your code. We first make a naive check that skips comments, then include the comments.

```html

<script>
  HTMLElement.prototype.connectedCallback =
      function connectedCallback() {
      };

  const defineOG = customElements.define;
  customElements.define = function(tag, clazz, ...args){
    
  }
  
  class BadSuperComp extends HTMLElement {
    connectedCallback() {
      const three = 1 + 1;
      //BAD! not calling super.connectedCallback();, thus breaking the chain!
    }
  }

  class BadWebComp extends BadSuperComp {
    connectedCallback() {
      const meaningOfLife = 40 + 2;
      //BAD! not calling super.connectedCallback();, thus breaking the chain!
    }
  }

  class BadWebCompTryingToBeGood extends BadSuperComp {
    connectedCallback() {
      super.connectedCallback();
      const meaningOfLife = 40 + 2;
      //BAD! not calling super.connectedCallback();, thus breaking the chain!
    }
  }

  class GoodWebComp extends HTMLElement {
    connectedCallback() {
      super.connectedCallback();
      const meaningOfLife = 40 + 2;
      //BAD! not calling super.connectedCallback();, thus breaking the chain!
    }
  }
  try {
    customElements.define('bad-web-comp', BadWebComp);
  } catch(err){
    console.error(err);
  }
  try {
    customElements.define('bad-web-comp-trying-to-be-good', BadWebCompTryingToBeGood);
  } catch(err){
    console.error(err);
  }
  customElements.define('good-web-comp', GoodWebComp);
  console.log('good-web-comp');
</script>
```

After some roundabout, this leads us to an issue where we need This leads us to two choices:

1. should we fix this issue during the `customElements.define()` process, or
2. should we fix this issue from the `constructor()`