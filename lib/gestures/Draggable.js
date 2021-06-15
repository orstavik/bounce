//
/*
* You have a situation: two different elements listen for long-press and swipe for the same inner target.
* Now, both long-press and swipe shouldn't run at the same time, they should be preventDefault-sensitive to each other.
* This means that as soon as one of the gesture mixins switch from maybeObservationMode and to activeTriggeredMode,
* then it should alert the other gesture mixins for touch events that it has activated. It does so, by calling preventDefault()
* on the initial touchstart event that started the maybeObservationMode.
*
* preventDefault on touchstart when it kicks in. When a touch swipe mixin decides that this is a swipe, it needs to call
 touchstartEvent.preventDefault(). This communicates to the other mixins, such as touch-long-press, that also might
 observe this touch sequence, that they do should be blocked. Both such mixins also needs to check for defaultPrevented
 on the touchStartEvent during the initial observation, so that they don't start a second gesture for the same event.
  */


/*
* mousedown=> :swipe-maybe + longEnough + cancel listener for mouseup + mousedown + blur/focusout + selectstart ?
* longEnough => grabs by calling preventDefault on the mousedown, :swipe-maybe => :swipe-start
*               also checks preventDefault on mousedown to cancel.
*
*
* :swipeMaybe=> cancel/start
*
* rule 1. use preventDefault on the initial trigger event such as mousedown some time *after* the fact, so to communicate with other gesture mixins.
* rule 2. use :gesture-maybe pseudo attribute to mark the element as having a gesture that is in the maybe state.
* rule 3. trigger secondary event listeners using the maybe-state pseudo attribute.
* */

class DragEvent extends MouseEvent {
  constructor(type, dict) {
    super(type, dict);
  }

  static tryToMakeDrag(mousedown, mousemove) {
    const distX = mousemove.x - mousedown.x;
    const distY = mousemove.y - mousedown.y;
    if ((distY > 4 || distY < -4) || (distX > 4 || distX < -4))
      return new DragEvent('drag', mousemove);
  }
}

const pseudo = Math.random() + 1;  //this should probably be exportable.
let userSelectOG, target, mousedown, lastDragEvent; //global state

function cancelDragMaybe() {
  target.removeAttribute(':drag-maybe', pseudo);
  userSelectOG = mousedown = target = undefined;
}

function cancelDragging() {
  target.dispatchEvent(new DragEvent('drag-cancel', lastDragEvent));
  target.removeAttribute(':dragging', pseudo);
  target.style.userSelect = userSelectOG;
  lastDragEvent = userSelectOG = mousedown = target = undefined;
}

function endDragging(mouseup) {
  mouseup.preventDefault();
  target.dispatchEvent(new DragEvent('drag-end', mouseup));
  target.removeAttribute(':dragging', pseudo);
  target.style.userSelect = userSelectOG;
  lastDragEvent = userSelectOG = mousedown = target = undefined;
}

function maybeDragListener(e) {
  if (e.buttons !== 1)
    return;
  mousedown = e;
  target = this;
  userSelectOG = target.style.userSelect;
  target.style.userSelect = 'none';
  target.setAttributeNode(document.createAttribute(':drag-maybe'), pseudo);
}

function tryToDrag(mousemove) {
  if (mousedown.defaultPrevented)
    return this.cancelDragMaybe();
  lastDragEvent = DragEvent.tryToMakeDrag(mousedown, mousemove);
  if (!lastDragEvent)
    return;
  mousedown.preventDefault();
  mousemove.preventDefault();
  target.removeAttribute(':drag-maybe', pseudo);
  target.setAttributeNode(document.createAttribute(':dragging'), pseudo);
  target.dispatchEvent(new DragEvent('drag-start', mousedown));
  target.dispatchEvent(lastDragEvent);
}

function mousemoveToDrag(mousemove) {
  console.log(mousemove)
  // mousemove.preventDefault();
  //we are not blocking mousemove events here.. do we want to do that?
  //mousemove.stopImmediatePropagation();    //i don't think that we should block like this...
  // target.dispatchEvent(lastDragEvent = new DragEvent('drag', mousemove));
}

export class DragMaybe extends HTMLElement {
  firstConnectedCallback() {
    this.addEventListener('mousedown', maybeDragListener, {
      preventable: EventListenerOptions.PREVENTABLE_SOFT,
      trustedOnly: true
    });
  }
}

export class DragMaybeReaction extends HTMLElement {
  static get observedAttributes() {
    return [":drag-maybe"];
  }

  cancelDragMaybe() {
    this === target && cancelDragMaybe();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (newValue === null) {
      window.removeEventListener('mousemove', tryToDrag, true);
      window.removeEventListener('mouseup', cancelDragMaybe, true);
      window.removeEventListener('mousedown', cancelDragMaybe, true);
      window.removeEventListener('blur', cancelDragMaybe, true);
    } else {
      window.addEventListener('mousemove', tryToDrag, true);
      window.addEventListener('mouseup', cancelDragMaybe, true);
      window.addEventListener('mousedown', cancelDragMaybe, true);
      window.addEventListener('blur', cancelDragMaybe, true);
    }
  }
}

export class DraggingReaction extends HTMLElement {
  static get observedAttributes() {
    return [":dragging"];
  }

  requestDragCancel() {
    target === this && cancelDragging();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (newValue === null) {
      window.removeEventListener('mousemove', mousemoveToDrag, true);
      window.removeEventListener('mouseup', endDragging, true);
      window.removeEventListener('mousedown', cancelDragging, true);
      window.removeEventListener('blur', cancelDragging, true);
    } else {
      window.addEventListener('mousemove', mousemoveToDrag, true);
      window.addEventListener('mouseup', endDragging, true);
      window.addEventListener('mousedown', cancelDragging, true);
      window.addEventListener('blur', cancelDragging, true);
    }
  }
}