const events = ["abort", "animationcancel", "animationend", "animationiteration", "auxclick", "blur", "cancel", "canplay", "canplaythrough", "change", "click", "close", "contextmenu", "cuechange", "dblclick", "durationchange", "ended", "error", "focus", "formdata", "gotpointercapture", "input", "invalid", "keydown", "keypress", "keyup", "load", "loadeddata", "loadedmetadata", "loadend", "loadstart", "lostpointercapture", "mousedown", "mouseenter", "mouseleave", "mousemove", "mouseout", "mouseover", "mouseup", "pause", "play", "playing", "pointercancel", "pointerdown", "pointerenter", "pointerleave", "pointermove", "pointerout", "pointerover", "pointerup", "reset", "resize", "scroll", "select", "selectionchange", "selectstart", "submit", "touchcancel", "touchstart", "transitioncancel", "transitionend", "wheel"];

const interfaces = [Document, HTMLElement, SVGElement, Window];//DocumentFragment does NOT implement the globalEventHandlers mixin

for (let event of events) {
  const handler = "on" + event;
  const prop = {
    enumerable: true,
    configurable: true,
    get: function () {
      throw new Error(`GlobalEventHandlers such as ${handler} are deprecated.`);
    },
    set: function () {
      throw new Error(`GlobalEventHandlers such as ${handler} are deprecated.`);
    }
  };
  for (let iface of interfaces)
    Object.defineProperty(iface.prototype, handler, prop);
}