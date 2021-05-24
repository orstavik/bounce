 function dispatchPriorEvent(target, composedEvent, trigger) {
    composedEvent.preventDefault = function () {
      trigger.preventDefault();
      trigger.stopImmediatePropagation ? trigger.stopImmediatePropagation() : trigger.stopPropagation();
    };
    composedEvent.trigger = trigger;
    return target.dispatchEvent(composedEvent);
  }
  var primaryEvent;
    
  function onMousedown(e) {
    if (e.button !== 0)
      return;
    primaryEvent = e;
  }

  class mouseDownToPrimaryEvent extends HTMLElement {
    firstConnectedCallback() {
      this.addEventListener('mousedown', onMousedown, {
        preventable: EventListenerOptions.PREVENTABLE_SOFT,
        trustedOnly: true
      });
    }
  }

  function onMouseup(e) {
    if (!primaryEvent || e.button !== 0)
      return;
    var duration = e.timeStamp - primaryEvent.timeStamp;
    if (duration > 300) {
      var longPress = new CustomEvent("long-press", {bubbles: true, composed: true, detail: {duration: duration}});
      dispatchPriorEvent(e.target, longPress, e);
    }
    primaryEvent = undefined;
  }

  class mouseUpToLongPress extends HTMLElement {
    firstConnectedCallback() {
      this.addEventListener('mouseup', onMouseup, {
        preventable: EventListenerOptions.PREVENTABLE_SOFT,
        trustedOnly: true
      });
    }
  }
