//focusElements
//the :focus css pseudo class is realized as [\:focus] pseudo attribute
//the :focus-within pseudo class should be realized as :has([\:focus])
//blur and focus events are skipped.
//the state in the DOM is updated before the focusout event.
//therefore, only focusin really needs a relatedTarget property.
//dynamic changes in the DOM is not observed, as there is no ascendant observer..
//todo i should implement a propagation path mutation observer.

let cachedFocusElements = [];
const passKey = Math.random() + 1;

function getFocusElement() {
  return cachedFocusElements.find(el => el.getRootNode() === this) || null;
}

function getActiveElement() {
  return cachedFocusElements[0] || null;
}

Object.defineProperty(DocumentFragment.prototype, 'focusElement', {get: getFocusElement});
Object.defineProperty(Document.prototype, 'focusElement', {get: getFocusElement});
Object.defineProperty(Document.prototype, 'activeElement', {get: getActiveElement});

function updateFocus(inFocus) {
  //1. calculate which elements have gained and lost focus.
  //   Keep cachedState such as lostFocus as closure variables to be used in event dispatch and event.relatedTargets.
  const inFocusElements = [];
  for (let el = inFocus; el; el = el.getRootNode()?.host)
    inFocusElements.push(el);

  const gainedFocus = inFocusElements.filter(el => !cachedFocusElements.includes(el));
  const lostFocus = cachedFocusElements.filter(el => !inFocusElements.includes(el));

  //2. update the state in the DOM and this mixin to reflect the new reality, asap.
  cachedFocusElements = inFocusElements;
  for (let el of lostFocus) el.removeAttribute(':focus', passKey);
  for (let el of gainedFocus) el.setAttributeNode(document.createAttribute(':focus'), passKey);
  return {gainedFocus, lostFocus};
}

function setFocus(inTarget) {
  const {gainedFocus, lostFocus} = updateFocus(inTarget);

  //3. when state is updated, dispatch events for lost and gained focus.
  const lostTarget = lostFocus[0];
  const lostRoot = lostFocus[lostFocus.length - 1];
  const focusout = new FocusEvent('focusout', {composed: true, bubbles: true});
  lostTarget.dispatchEvent(focusout, {root: lostRoot});
  //   relatedTarget is included to make life simpler (so you don't have to add an event listener for focusout to get the old targets).
  //   the problem is that the lostTarget could be deep inside another shadowRoot branch.
  //   don't know how to present the old state for most use case relevance.
  const focusIn = new FocusEvent('focusin', {composed: true, bubbles: true, relatedTarget: lostTarget});
  inTarget.dispatchEvent(focusIn, {root: gainedFocus[gainedFocus.length - 1]});
}


//https://developer.mozilla.org/en-US/docs/Web/HTML/Element
const nativeElementQuerySelector = "a,abbr,acronym,address,applet,area,article,aside,audio,b,base,basefont,bdi,bdo,bgsound,big,blink,blockquote,body,br,button,canvas,caption,center,cite,code,col,colgroup,content,data,datalist,dd,del,details,dfn,dialog,dir,div,dl,dt,em,embed,fieldset,figcaption,figure,font,footer,form,frame,frameset,h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,i,iframe,image,img,input,ins,isindex,kbd,keygen,label,legend,li,link,listing,main,map,mark,marquee,math,menu,menuitem,meta,meter,multicol,nav,nextid,nobr,noembed,noframes,noscript,object,ol,optgroup,option,output,p,param,picture,plaintext,portal,pre,progress,q,rb,rp,rt,rtc,ruby,s,samp,script,section,select,shadow,slot,small,source,spacer,span,strike,strong,style,sub,summary,sup,svg,table,tbody,td,template,textarea,tfoot,th,thead,time,title,tr,track,tt,u,ul,var,video,wbr,xmp";

function* descendantElements(root, query) {
  for (let match of root.querySelectorAll(query))
    yield match;
  for (let el of root.querySelectorAll(nativeElementQuerySelector)) {
    for (let match of descendantElements(el, query))
      yield match;
  }
}

export function checkFocusPseudoAttributes(root = document.body) {
  for (let el of descendantElements(root, '[\\:focus]'))
    !cachedFocusElements.includes(el) && el.removeAttribute(':focus', passKey);
  for (let el of cachedFocusElements)
    !el.hasAttribute(':focus') && el.setAttributeNode(document.createAttribute(':focus'), passKey);
}


//3. the mixin that controls the event listeners on focusable elements
function onMousedown(e) {
  if (!e.isTrusted || !(e.button === 0 || e.button === 1) || this.hasAttribute('focus'))
    return;
  e.preventDefault();
  this.focus();
}

export function focusable(el) {
  el.shadowRoot.addEventListener('mousedown', onMousedown, {preventable: EventListenerOptions.PREVENTABLE_SOFT});
  // const observer = new MutationObserver(attributeChangedCallback);
  // observer.observe(el, {attributes: true, attributeFilter: ['focus', 'focus-within']});
}

export function Focusable(Base) {
  return class Focusable extends Base {
    constructor() {
      super();
      focusable(this);
    }

    focus() {
      !this.hasAttribute('focus') && setFocus(this);
    }
  }
}