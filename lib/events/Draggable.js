//Draggable

//1. start to listen, then check when movement is more than 5px.
//2. then grab the event.

//problem 1, by having a top receiver for draggable, it makes adding more default actions for the same event type difficult.
//thus, it is better to add the receiver on the actual element, to get the task queued correctly.
//problem 2, it is an anti-pattern to parse the value of on/off attributes.
//           draggable attribute means draggable, undraggable means not draggable

//there might be many different elements that all listen for these events.

function mousemoveDrag(e) {
  if (!(e.buttons & 1)) {    //The mouse moved outside of the window, then mouseup, and then mousemove back into window
    mousedownTarget.dispatchEvent(new MouseEvent('dragerror', e));
    return endDrag();
  }
  mousedownTarget.dispatchEvent(new MouseEvent('drag', e));
}

function mouseupDrag(e) {
  if (e.button !== 0)
    return;
  e.preventDefault();
  mousedownTarget.dispatchEvent(new MouseEvent('dragend', e));
  if (e.composedPath().find(n=> n.hasAttribute && n.hasAttribute('droppable')))
    e.currentTarget.dispatchEvent(new MouseEvent('drop', e));
}

function startDrag(e) {
  mousedownEvent.preventDefault();
  mousemoveEvent.preventDefault();
  e.preventDefault();
  document.children[0].shadowRoot.addEventListener('mousemove', mousemoveDrag, {preventable: EventListenerOptions.PREVENTABLE});
  document.children[0].shadowRoot.addEventListener('mouseup', mouseupDrag, {preventable: EventListenerOptions.PREVENTABLE_SOFT});
  mousedownTarget.dispatchEvent(new MouseEvent('dragstart', mousedownEvent));
  mousedownTarget.dispatchEvent(new MouseEvent('drag', e));
}

function endDrag(e) {
  document.children[0].shadowRoot.removeEventListener('mousemove', mousemoveDrag);
  document.children[0].shadowRoot.removeEventListener('mouseup', mouseupDrag);
}

let mousedownEvent;
let mousedownTarget;

function stopObservation() {
  mousedownEvent = undefined;
  mousedownTarget = undefined;
  document.children[0].shadowRoot.removeEventListener('mousemove', mousemoveObserver); //these observers are not preventable
  document.children[0].shadowRoot.removeEventListener('mouseup', mouseupObserver);
}

//if somebody calls preventDefault, then the listener is blocked, but the listener will never block the mousedown.
function startObservation(target, e) {
  mousedownEvent = e;
  mousedownTarget = target;
  document.children[0].shadowRoot.addEventListener('mousemove', mousemoveObserver); //these observers are not preventable
  document.children[0].shadowRoot.addEventListener('mouseup', mouseupObserver);
}

function mouseupObserver(e) {
  e.button === 0 && stopObservation();
}

function mousemoveObserver(e) {
  if (mousedownEvent.defaultPrevented)  //We look back at the mousedown event to see if .preventDefault has been called on the gesture.
    return stopObservation();
  if (!(e.buttons & 1))                 //The mouse moved outside of the window, then mouseup, and then mousemove back into window
    return stopObservation();
  if (Math.abs(e.x - mousedownEvent.x) + Math.abs(e.y - mousedownEvent.y) < 5)
    return;
  stopObservation();
  startDrag(e);
}

function mousedown(e) {
  if (e.button !== 0 || mousedownEvent === e)  //another draggable element below has already caught this mousedown
    return;
  if (mousedownEvent)
    throw new Error('omg');  //this shouldn't happen. Cleanup/GC is explicit, so this point in code should never be reached.
  startObservation(this, e);
}

function addDraggable(target) {
  target.shadowRoot.addEventListener('mousedown', mousedown, {
    preventable: EventListenerOptions.PREVENTABLE_SOFT,
    trustedOnly: true
  });
}

function removeDraggable(target) {
  target.shadowRoot.removeEventListener('mousedown', mousedown);
}

export class DraggableByDefault extends HTMLElement {

  connectedCallback() {
    !this.hasAttribute('undraggable') && addDraggable(this);
  }

  disconnectedCallback() {
    removeDraggable(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    oldValue === null && removeDraggable(this);
    newValue === null && addDraggable(this);
  }

  static get observedAttributes() {
    return ["undraggable"];
  }
}

export class Draggable extends HTMLElement {

  connectedCallback() {
    this.hasAttribute('draggable') && addDraggable(this);
  }

  disconnectedCallback() {
    removeDraggable(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected) return;
    oldValue === null && addDraggable(this);
    newValue === null && removeDraggable(this);
  }

  static get observedAttributes() {
    return ["draggable"];
  }
}