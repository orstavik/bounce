function topMostTarget(pathA) {
  let res = document.body;
  for (let i = pathA.length - 5; i >= 0; i--)
    res = pathA[i];
  return res;
}


const options = {
  preventable: true,
  trustedOnly: true
}

let target;


function handleEventListener(element, command, type, cb) {
  if (command === "add")
    return element.addEventListener(type, cb, options)
  if (command === "remove")
    return element.addEventListener(type, cb, options)
}

function onMousedown(e) {
  if (e.button === 0) {
    handleEventListener(target, "remove", "mousedown", onMousedown)
    handleEventListener(target, "add", "mouseup", onMouseup);
  }
}

function onMouseup(e) {
  handleEventListener(target, "add", "mousedown", onMousedown)
  handleEventListener(target, "remove", "mouseup", onMouseup)
  if (e.button === 0) {
    const clickTarget = topMostTarget(e.composedPath());
    setTimeout(() => clickTarget.dispatchEvent(new MouseEvent('click', e)));
  }
}

export function clickable(el, connectDisconnect = true) {
  target = el.shadowRoot;
  if (connectDisconnect) {
    handleEventListener(target, "add", "mousedown", onMousedown)
  } else {
    handleEventListener(target, "remove", "mousedown", onMousedown)
  }
}

export function Clickable(Base) {
  return class Clickable extends Base {
    constructor() {
      super();
      clickable(this, true);
    }
  }
}
