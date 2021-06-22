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

class SwipeEvent extends MouseEvent {
  constructor(type, dict, dist, distX, distY, duration, speed) {
    super(type, dict);
    this.dist = dist;
    this.distX = distX;
    this.distY = distY;
    this.duration = duration;
    this.speed = speed;
  }

  get angle() {
    return 180 * Math.atan2(this.distY, this.distX) / Math.PI;
  }

  static tryToMakeSwipe(dragstart, dragend) {
    const duration = dragend.timeStamp - dragstart.timeStamp;
    if (duration > 50 && duration < 700) {
      const x = dragend.x - dragstart.x;
      const y = dragend.y - dragstart.y;
      const dist = Math.sqrt(x * x + y * y);
      const pixPerMs = dist / duration;
      if (pixPerMs > 1)
        return new SwipeEvent('swipe', dragend, dist, x, y, duration, pixPerMs);
    }
  }
}

let dragstart, target;

export function resetSwipe() {
  target.removeAttribute(':swipe-maybe', pseudo);
  dragstart = target = undefined;
}

function trySwipe(dragend) {
  if (!dragstart.defaultPrevented && !dragend.defaultPrevented) {
    const swipe = SwipeEvent.tryToMakeSwipe(dragstart, dragend);
    swipe && target.dispatchEvent(swipe, document);
  }
  resetSwipe();
}

const pseudo = Math.random() + 1;  //this should probably be exportable.

export class SwipeMaybe extends HTMLElement {
  firstConnectedCallback() {
    this.shadowRoot.addEventListener('drag-start', function (e) {
      if (target)
        return;
      dragstart = e;
      target = this.host;
      target.setAttributeNode(document.createAttribute(':swipe-maybe'), pseudo);
    });
  }
}

export class swipeMaybeReaction extends HTMLElement {

  static get observedAttributes() {
    return [":swipe-maybe"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (newValue !== null) {
      document.addEventListener('drag-end', trySwipe);
      document.addEventListener('drag-cancel', resetSwipe);    //drag-cancel doesn't exist..
    } else {
      document.removeEventListener('drag-end', trySwipe);
      document.removeEventListener('drag-cancel', resetSwipe); //drag-cancel doesn't exist..
    }
  }
}