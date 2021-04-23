const passKeys = {};

function checkAttributePassKey(name, passKey) {
  if (name[0] !== ':') return;
  if (!passKey) throw new Error('PseudoAttribute error: missing passKey.');
  if (passKeys[name] === undefined) return passKeys[name] = passKey;
  if (passKeys[name] !== passKey) throw new Error('PseudoAttribute error: wrong passKey');
}

const setAttributeOG = Element.prototype.setAttribute;
Element.prototype.setAttribute = function setAttribute(name, value, passKey) {
  checkAttributePassKey(name, passKey);
  setAttributeOG.call(this, name, value);
};
const removeAttributeOG = Element.prototype.removeAttribute;
Element.prototype.removeAttribute = function removeAttribute(name, passKey) {
  checkAttributePassKey(name, passKey);
  removeAttributeOG.call(this, name);
};
const setAttributeNodeOG = Element.prototype.setAttributeNode;
Element.prototype.setAttributeNode = function setAttributeNode(attr, passKey) {
  checkAttributePassKey(attr.name, passKey);
  setAttributeNodeOG.call(this, attr);
};
const removeAttributeNodeOG = Element.prototype.removeAttributeNode;
Element.prototype.removeAttributeNode = function removeAttributeNode(attr, passKey) {
  checkAttributePassKey(attr.name, passKey);
  removeAttributeNodeOG.call(this, attr);
};

//https://developer.mozilla.org/en-US/docs/Web/HTML/Element
const nativeElementQuerySelector = "a,abbr,acronym,address,applet,area,article,aside,audio,b,base,basefont,bdi,bdo,bgsound,big,blink,blockquote,body,br,button,canvas,caption,center,cite,code,col,colgroup,content,data,datalist,dd,del,details,dfn,dialog,dir,div,dl,dt,em,embed,fieldset,figcaption,figure,font,footer,form,frame,frameset,h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,i,iframe,image,img,input,ins,isindex,kbd,keygen,label,legend,li,link,listing,main,map,mark,marquee,math,menu,menuitem,meta,meter,multicol,nav,nextid,nobr,noembed,noframes,noscript,object,ol,optgroup,option,output,p,param,picture,plaintext,portal,pre,progress,q,rb,rp,rt,rtc,ruby,s,samp,script,section,select,shadow,slot,small,source,spacer,span,strike,strong,style,sub,summary,sup,svg,table,tbody,td,template,textarea,tfoot,th,thead,time,title,tr,track,tt,u,ul,var,video,wbr,xmp";
const customElementQuerySelector = `:not(${nativeElementQuerySelector})`;

function* descendantElements(root, query) {
  for (let match of root.querySelectorAll(query))
    yield match;
  for (let el of root.querySelectorAll(customElementQuerySelector)) {
    if (el.shadowRoot)
      for (let match of descendantElements(el.shadowRoot, query))
        yield match;
  }
}

function removeAllRegisteredPseudoAttributesImpl(root , query, attributes) {
  for (let el of descendantElements(root, query)) {
    for (let att of attributes)
      removeAttributeOG.call(el, att);
  }
}

export function removeRegisteredPseudoAttributes(root = document.body) {
  const attributes = Object.keys(passKeys);
  const query = attributes.map(att=> `[\\${att}]`).join(',');
  return removeAllRegisteredPseudoAttributesImpl(root, query, attributes);
}

/*
*
* WhatIs: PseudoAttributes?
**************************
*
* Html element that start with ':'. Example:
*    <div>
*      <a href :focus>
*
*
* PseudoAttributes in JS
**********************
*
* All attribute names starting with ':' are PseudoAttributes.
* PseudoAttributes can only be set and removed using setAttribute(':name', val, passKey) and removeAttribute(':name', val, passKey).
* When setting and removing PseudoAttributes, a non nullish passKey must be provided.
* The first time a PseudoAttribute is set, the passKey is registered.
* Any subsequent calls to setAttribute and removeAttribute must include the same passKey.
* PseudoAttributes CANNOT be set and removed using setAttributeNS, removeAttributeNS, setAttributeNode, nor removeAttributeNode.
*
* add/remove pseudo attributes:
*   Element.prototype.setAttribute('name', value, passKey)
*   Element.prototype.removeAttributeNode(attr, passKey)
*   Element.prototype.setAttribute('name', passKey)
*   Element.prototype.removeAttributeNode(attr, passKey)
*
* To get string-free attributes attributes such as <a :focus>, then do:
*    aEl.setAttributeNode(document.createAttribute(':focus'), passKey);
*
* PseudoAttributes are read using `.hasAttribute(':name')`, `.getAttribute(':name')` and `.getAttributeNames()` normally.
*
*
* PseudoAttributes in CSS
******************************
*
* In CSS style sheets, pseudoAttributes can read as such:
*   'a[\:focus] { color: green }'.
*   ':host([\:focus]) slot { color: green }'.
*
*
* PseudoAttributes in querySelectors
******************************
*
* In .querySelector(), .querySelectorAll(), .matches(), the ':' must be double \\ prefixed.
*   'document.querySelectorAll('[\\:focus]').
*   :focus-within => :has([:\\focus])
*
*
* PseudoAttributes in HTML
******************************
*
* PseudoAttributes can be only read from HTML. If the state of an element can be set from the lightDOM, and stipulated in
* HTML template, then this state should be set as normal attributes. The HTML functions as lightDOM, pseudoAttributes are
* controlled solely from the shadowDOM.
*
* PseudoAttributes should only be applied to the hostNode of either the custom element or the element that the mixin is applied to.
* This gives the mixin/web component the ability to control the pseudo attribute from within, even when the DOM is changed dynamically.
**/