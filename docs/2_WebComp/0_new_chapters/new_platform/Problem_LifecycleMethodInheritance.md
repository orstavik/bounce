# Lifecycle method inheritance for `attributeChangedCallback()`

## Two strategies: inclusive or exclusive - override or aggregate?

We have established that:

1. life cycle methods need to aggregate
2. the arguments of life cycle methods are set from outside, and should never be altered by base classes. It just doesn't happen.
3. the basic principle of JS extends is to override, and a required call to `super` is

So. What are the alternative ways to design and implement lifecycle method inheritance for `attributeChangedCallback()`.

## Demo 1: SuperSimple

The SuperSimple alternative adds a soft rule:

* the `attributeChangedCallback(...)` of any `HTMLElement` can be triggered for any `attribute name`, not only the `name` added in `observedAttributes`. The reason for this is that any implementation of `HTMLElement` must assume that a sub class will a) observe the same AND different attributes and b) always call `super.attributeChangedCallback(...arguments)`.

The code looks like this:

```javascript
class HTMLElement {
  connectedCallback() {
    console.log("HTMLElement.connectedCallback");
  }

  attributeChangedCallback() {
    console.log("check HTMLElement");
    if (true)
      console.log("HTMLElement.attributeChangedCallback");
  }
}

class A extends HTMLElement {

  attributeChangedCallback() {
    super.attributeChangedCallback(...arguments);
    console.log("check A");
    if (name === 'a' || name === 'c')
      console.log("A.attributeChangedCallback");
  }

  static get observedAttributes() {
    return ['a', 'c'];
  }
}

class B extends A {

  attributeChangedCallback(name, oldValue, newValue) {
    super.attributeChangedCallback(...arguments);
    console.log("check B");
    if (name === 'b')
      console.log("B.attributeChangedCallback");
  }

  static get observedAttributes() {
    return ['b'];
  }
}

class C extends B {

  attributeChangedCallback() {
    super.attributeChangedCallback(...arguments);
    console.log("check C");
    if (name === 'c')
      console.log("C.attributeChangedCallback");
  }

  static get observedAttributes() {
    return ['c'];
  }
}

customElements.define('web-c', C);
```

When you make a `<web-c c="foo">`, then you should get:

```
check HTMLElement
HTMLElement.attributeChangedCallback
check A
A.attributeChangedCallback
check B
check C
C.attributeChangedCallback
```

The problems:

1. It can be confusing that `attributeChangedCallback(...)` is triggered for `names` not listed in the specific class' `observedAttributes`. And it is confusing in *two* different ways:
	1. The developer of `class C` might forget that the two classes `A` and `B` that `C` extends observes attributes `a` and `b` in addition to `c`. Looking at `class C` only, the `if(name==='c')` seems redundant, while it really isn't.
	2. Checking its ancestor chain, the developer of `class A` sees that *only* attribute `a` is observed. However, the developer of `class A` forgets that some other developer might choose to a) extend his `class A` and b) in this sub-class observe additional attribute names and c) call `super.attributeChangedCallback(...arguments)`. So even `class A` must check `if(name==='a')` in his `attributeChangedCallback()`.

## Demo 2. SuperFilter

An alternative approach is to make a more *advanced selection* of which inherited `attributeChangedCallback(..)` to trigger based on the attribute `name`. Essentially, this method replaces the easy-to-forget `if(name==='observedName')` tests inside the `attributeChangedCallback(..)`.

```javascript
function superAttributeChangedCallback(proto, el, name, ...args) {
  proto = Object.getPrototypeOf(proto);
  while (proto) {
    if (proto.attributeChangedCallback instanceof Function &&
      (!proto.constructor.observedAttributes ||
        !proto.constructor.observedAttributes.length ||
        proto.constructor.observedAttributes.indexOf(name) >= 0)) {
      return proto.attributeChangedCallback.call(el, name, ...args);
    }
    p = Object.getPrototypeOf(p);
  }
}

class HTMLElement {
  connectedCallback() {
    console.log("HTMLElement.connectedCallback");
  }

  attributeChangedCallback() {
    console.log("HTMLElement.attributeChangedCallback");
  }
}

class A extends HTMLElement {

  attributeChangedCallback() {
    superAttributeChangedCallback(A, this, ...arguments);
    console.log("check A");
    if (name === 'a' || name === 'c')
      console.log("A.attributeChangedCallback");
  }

  static get observedAttributes() {
    return ['a', 'c'];
  }
}

class B extends A {

  attributeChangedCallback(name, oldValue, newValue) {
    superAttributeChangedCallback(B, this, ...arguments);
    console.log("B.attributeChangedCallback");
  }

  static get observedAttributes() {
    return ['b'];
  }
}

class C extends B {

  attributeChangedCallback() {
    superAttributeChangedCallback(C, this, ...arguments);
    console.log("C.attributeChangedCallback");
  }

  static get observedAttributes() {
    return ['c'];
  }
}

customElements.define('web-c', C);
```

When you make a `<web-c c="foo">`, then you should get:

```
HTMLElement.attributeChangedCallback
check A
A.attributeChangedCallback
C.attributeChangedCallback
```

If we want, we can make the method even slightly more efficient, by passing the prototype's prototype as the first argument into `superAttributeChangedCallback(extend, this, ...arguments)`, and then skipping the first `proto = Object.getPrototypeOf(proto)` inside `superAttributeChangedCallback(...){}`. I didn't do it here for easier readability.

The problem with this approach is *obviously* the `superAttributeChangedCallback(extend, this, ...arguments)`:
1. It is a weird method, a custom `super` that has to be invoked. 
2. It confuses, it hints at the syntax of `super` without using it.
3. It isn't super efficient. It runs a loop in every step of the super call chain. 
 
It is no surprise this strategy is not be a keeper.

## Demo 3: SuperInvisible

We can implement this call sequence without using `super`. If we intercept the call to `attributeChangedCallback()`, we can make a single loop that:
1. finds all the prototypes in the prototype chain that implement `attributeChangedCallback()` and that either includes the attribute `name` in its `constructor.observedAttributes` or that has an empty `constructor.observedAttributes`, and then
2. calls these methods on the `this` object with the given `...arguments` top down.

This strategy will a) completely remove any `super.attributeChangedCallback(...arguments)` boilerplate *without*. This strategy thus illustrate that the `super.lifecycleMethod()` is *completely unnecessary*, and *only* a source of forgetting-bugs, misunderstanding-bugs, typo-bugs, still-learning-bugs, and provide *no added value* as a) ancestor lifecycle methods should *always be called*, b) ancestor lifecycle methods should *always get the original arguments*, and c) the static `observedAttributes` essentially implements a static function filter.

SuperInvisible assumes that no-one never writes `super.lifecycleCallback()`, and will fail if one class in the hierarchy does that.

## Conclusion: Choosing between convention and convenience, between consistency and correctness

The choice is between the SuperSimple and SuperInvisible strategies. 

The SuperSimple strategy most resembles the "normal" JS way. It aggregates lifecycle method callbacks according to the convention established by `constructor()` aggregation. It is therefore the easiest strategy to *recognize* and understand for developers already familiar with JS classes. It will feel consistent.

The SuperInvisible strategy is the most convenient way. It lets you aggregate lifecycle method callbacks without writing any boilerplate `super` code. As the arguments for each `lifecycleCallback()` is fixed, and there is no overloading, this is 100% and will guarantee that the inherited lifecycle methods will be correctly called in correct sequence. As long the lifecycle methods doesn't mistakenly call each other that is.

My opinion is very mixed in this regard. It is clear that for HTMLElements in isolation, the best strategy would be SuperInvisible. There is always aggregation with a static filter; the call should always be made at the beginning, like the `constructor()`; and the attributes should never be tampered with. For the HTMLElement's lifecycle methods, explicitly calling `super` is 100% unnecessary and only a source of bugs. SuperInvisible could do away with that.

However. Doing so would *add a half syntactic/half semantic rule* for `extends HTMLElement`. A rule that breaks with the established convention for class inheritance in JS. JS classes *overload* by default, and they *aggregate* using `super`. With SuperInvisible `attributeChangedCallback()` would *no longer **override***. And that would be strange JS behavior indeed.

The choice is therefore made to at the primary level implement **lifecycle inheritance** using SuperSimple.