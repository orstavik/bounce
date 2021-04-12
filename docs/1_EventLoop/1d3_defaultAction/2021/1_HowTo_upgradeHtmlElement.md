# HowTo: upgrade `HTMLElement`?

## WhatIs: `HTMLElement` relationship with `customElements.define(..)`?

The `HTMLElement` is special. First, `HTMLElement` is the base `class` for all HTML elements. This means that it can create objects that not only exist in the context of JS engine, but also in the context of the DOM. Second, to prepare the DOM for the arrival of such custom HTML elements, any subclass of HTMLElement *must be* passed through `customElements.define(..)` that will associate an HTML `tagName` to it.

```javascript
class X extends HTMLElement {
  constructor() {
    super();
  }
}

// const throwsAnError = new X();
customElements.define("tag-name", X);
const worksJustFine = new X();
```

## HowTo: upgrade `HTMLElement`?

You have three options when you need to upgrade the `HTMLElement`:

1. Wrap and replace `HTMLElement` class. This is the simplest and cleanest method is to upgrade the `HTMLElement` class. If you replace the `HTMLElement` first (as in before any other JS script has used it in some `extends`-expression or otherwise), then you will know that *all* `HTMLElement`s in your app are upgraded.

   The drawback of replacing `HTMLElement` class is that:
	1. all upgrades now apply to all `HTMLElement`s whether they need it or not. This can have huge impact for performance if some of your upgrade require custom listeners or caching in memory. In addition, you must make very sure that none of your upgrades will come into conflict with *any other* implementation.
	2. monkey-patching the `HTMLElement` gives no access to the *time* of declaration for each particular `class`, and that provides no means to *adjust* the monkey-patch to suit the needs of the individual subclass of `HTMLElement`.

2. Add mixins to class declarations. This is more complex than altering the `HTMLElement` class, but it enables you to solve the first problem: not applying costly upgrades to all new `HTMLElements`, even those who do not need them.

3. Monkey-patch the `customElements.define(..)` method. This has all the benefits of mixins, but in addition, this provides access to the equivalent of declaration-time where statistical analysis can be applied to adjust the `HTMLElement` extension to suit the `HTMLElement` subclass instance.

## HowTo: monkey-patch `customElements.define(..)`?

When you monkey-patch the `customElements.define(..)` function you:

1. wrap the `CustomElements.prototype.define(..)` function in a custom `define(..)` function.
2. Inside your custom `define(..)`, you first turn the ancestor chain upto `HTMLElement` of your incoming `class` definition into an array.
3. Then you iterate *top-down* and analyze each step in the chain for missing abilities (properties). If one of the classes are missing an "extension" class that has not already been set, you splice in that extending class as the prototype of that class.
4. If you need more than one extending class, you splice in several such classes, one by one.
5. Once the entire chain is populated with the extending classes that it needs, at the appropriate level, then statistical analysis can be performed. This can for example merge several layers of static properties such as `static get observedAttributes` or `static get defaultActions`.

This is as nimble as you can get it. It is not super pretty, but it will make mutations once, so that if for example two different classes use the same inherit from the same super class, then that super classes hierarchy will not be altered up until that point.

A drawback is that once this `customElements.define` has been set, then there is no changing the abilities of those objects. This can be fixed by calling a redefine method. Which will potentially be implemented later.

### HowTo: `findSuperClass(subclass, ancestor)`?

If you have a subclass of an `HTMLElement`, there might be a series of classes between the subclass instance and the `HTMLElement` ancestor. Here is the method of finding the nearest subclass of an ancestor:

```javascript
function findSuperClass(subClass, ancestor) {
  for (let next = Object.getPrototypeOf(subClass); next && next !== ancestor; next = Object.getPrototypeOf(next))
    subClass = next;
  return subClass;
}
```

### HowTo: upgrade `HTMLElement` in an existing class hierarchy?

This is not so hard as it seems. You need:
1. a new subclass of `HTMLElement`.
2. the sub

## References
