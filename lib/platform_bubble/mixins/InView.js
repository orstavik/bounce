/*
 :in-view (runs all the time, on off on off on off) When the element comes into view, the pseudoAttribute is added.
 When the element leaves the view, then the pseudoAttribute is removed.

:in-view-once (runs only once, once the pseudoAttribute has been added, then the observer and/or event listener is removed).
When the element comes into view, the element adds the pseudoAttribute. Then, the mixin does nothing else, and so when the
element leaves the view, the pseudoAttribute remains.
*/

const inViewOnceObserver = new IntersectionObserver(entries => {
  for (let entry of entries)
    if (entry.isIntersecting) {
      entry.target.setAttributeNode(document.createAttribute(":in-view-once"));
      inViewOnceObserver.unobserve(entry.target);
    }
});

const inViewObserver = new IntersectionObserver(entries => {
  for (let entry of entries) {
    entry.isIntersecting ?
      entry.target.setAttributeNode(document.createAttribute(":in-view")) :
      entry.target.removeAttribute(":in-view");
  }
});

export class InViewOnce extends HTMLElement {
  firstConnectedCallback() {
    inViewOnceObserver.observe(this);
  }
}

export class InView extends HTMLElement {
  firstConnectedCallback() {
    inViewObserver.observe(this);
  }
}