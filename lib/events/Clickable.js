let mousedownComposedPath;

function onMousedown(e) {
  if (e.button !== 0)
    return;
  mousedownComposedPath = e.composedPath();
  document.children[0].shadowRoot.addEventListener("mouseup", onMouseup, {trustedOnly: true, preventable: EventListenerOptions.PREVENTABLE_SOFT});
  // document.children[0].shadowRoot.addEventListener("mouseup", onMouseup, {trustedOnly: true});//*browser behavior
}

function onMouseup(e) {
  if (e.button !== 0)
    return;
  e.preventDefault();   //*browser behavior would not call preventDefault
  document.children[0].shadowRoot.removeEventListener("mouseup", onMouseup);
  let clickTarget = e.composedPath().find(upEl => mousedownComposedPath.includes(upEl));
  setTimeout(() => clickTarget.dispatchEvent(new MouseEvent('click', e)));
}

export function clickable(el, connectDisconnect = true) {
  connectDisconnect ?
    el.shadowRoot.addEventListener("mousedown", onMousedown) :
    el.shadowRoot.removeEventListener("mousedown", onMousedown);
}

export function Clickable(Base) {
  return class Clickable extends Base {
    constructor() {
      super();
      clickable(this, true);
    }
  }
}

//comments:
//1. The mouseup event listener must be added to the topmost shadowRoot in the DOM that will capture the UI events.
//   This is the <html>-element's shadowRoot.
//2. Adding a subsequent event listener on the shadowRoot of the <html>-element like this is a pattern for
//   composing events when there are different triggering events. Other examples are drag'n'drop.
//3. In the browser, you cannot block 'click' events by calling preventDefault on mouseup.
//   It is also unlikely that the browser would block other default actions if they were attached to mouseup.
//   This behavior appears wrong, an idiosyncrasy, legacy code.