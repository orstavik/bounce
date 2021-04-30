import {composedPath} from "../index.js";

describe('preventDefault', function () {

  const outerHost = document.querySelector("outer-host");
  const h1 = outerHost.shadowRoot.children[0].children[0].children[0].shadowRoot.children[0];
  const targets = composedPath(h1.shadowRoot, window);

  function shortTagName(tagName) {
    return tagName.length < 11 ? tagName : (tagName.split('-').map(n => n.substr(0, 2)).join('-'));
  }

  function nodeName(node) {
    if (node === window)
      return 'window        ';
    if (node === document)
      return 'document      ';
    if (node instanceof DocumentFragment)
      return "##" + shortTagName(node.host.tagName);
    return shortTagName(node.tagName) + "  ";
  }

  function getPropagationRoot(node) {
    if (node === window) return window;
    const root = node.getRootNode();
    return root === document ? window : root;
  }

  function log(e) {
    const propagationRoot = getPropagationRoot(e.currentTarget);
    const root = nodeName(propagationRoot);
    const target = nodeName(e.currentTarget);
    const str = [root, target, e.defaultPrevented].map(s => (s + '           ').substr(0, 13)).join(' ');
    return str;
  }

  it('preventDefault and defaultPrevented 1', function () {
    let res = "";
    targets[0].addEventListener("my-event-xyz", e => e.preventDefault(), true);
    for (let node of targets) {
      node.addEventListener("my-event-xyz", function (e) {
        res += log(e).trim() + '\n';
      }, true)
    }
    h1.dispatchEvent(new Event('my-event-xyz', {composed: true, bubbles: true}));
    const test =
      `window        window        false
window        document      false
window        HTML          false
window        BODY          false
window        DIV           false
window        LINK-SLOT     false
window        SPAN          false
window        OUTER-HOST    false
##OUTER-HOST  ##OUTER-HOST  false
##OUTER-HOST  UP-IN-LI-SL   false
##OUTER-HOST  IN-LI-SL      false
##OUTER-HOST  INNER-HOST    false
##INNER-HOST  ##INNER-HOST  false
##INNER-HOST  H1            false
##H1          ##H1          true
##IN-LI-SL    ##IN-LI-SL    true
##IN-LI-SL    IN-FR-SL      true
##IN-LI-SL    SLOT          true
##IN-FR-SL    ##IN-FR-SL    true
##IN-FR-SL    SLOT          true
##UP-IN-LI-SL ##UP-IN-LI-SL true
##UP-IN-LI-SL UP-IN-FR-SL   true
##UP-IN-LI-SL SLOT          true
##UP-IN-FR-SL ##UP-IN-FR-SL true
##UP-IN-FR-SL SLOT          true
##LINK-SLOT   ##LINK-SLOT   true
##LINK-SLOT   FRAME-SLOT    true
##LINK-SLOT   SLOT          true
##FRAME-SLOT  ##FRAME-SLOT  true
##FRAME-SLOT  SLOT          true
##HTML        ##HTML        true
##HTML        SLOT          true
`;
    expect(res).to.be.equal(test)
  });

  it('preventDefault and defaultPrevented inside outer-host', function () {
    let res = "";
    targets[9].addEventListener("my-event-rst", e => e.preventDefault(), true);
    for (let node of targets) {
      node.addEventListener("my-event-rst", function (e) {
        res += log(e).trim() + '\n';
      }, true)
    }
    h1.dispatchEvent(new Event('my-event-rst', {composed: true, bubbles: true}));
    const test =
      `window        window        false
window        document      false
window        HTML          false
window        BODY          false
window        DIV           false
window        LINK-SLOT     false
window        SPAN          false
window        OUTER-HOST    false
##OUTER-HOST  ##OUTER-HOST  false
##OUTER-HOST  UP-IN-LI-SL   false
##OUTER-HOST  IN-LI-SL      true
##OUTER-HOST  INNER-HOST    true
##INNER-HOST  ##INNER-HOST  true
##INNER-HOST  H1            true
##H1          ##H1          true
##IN-LI-SL    ##IN-LI-SL    true
##IN-LI-SL    IN-FR-SL      true
##IN-LI-SL    SLOT          true
##IN-FR-SL    ##IN-FR-SL    true
##IN-FR-SL    SLOT          true
##UP-IN-LI-SL ##UP-IN-LI-SL true
##UP-IN-LI-SL UP-IN-FR-SL   true
##UP-IN-LI-SL SLOT          true
##UP-IN-FR-SL ##UP-IN-FR-SL true
##UP-IN-FR-SL SLOT          true
##LINK-SLOT   ##LINK-SLOT   true
##LINK-SLOT   FRAME-SLOT    true
##LINK-SLOT   SLOT          true
##FRAME-SLOT  ##FRAME-SLOT  true
##FRAME-SLOT  SLOT          true
##HTML        ##HTML        true
##HTML        SLOT          true
`;
    console.log(test)
    console.log(res)
    expect(res).to.be.equal(test)
  });
});

it('div> aHref> checkbox', function () {

  const lightDom = `
<div>
  <a href>
    <input type="checkbox">
  </a>  
</div>`;

  const test =
    `div           input         false
div           a             false
div           div           false
##input       ##input       false 
##input       ##input       => true
##a           ##a           true
`;

//1. add event listener on all 5 nodes [div, a, a.shadow, input, input.shadow] that log(context, target, e.defaultPrevented)
//2. then add event listener that calls preventDefault() on input.shadow.
//3. this should cause event listener inside the shadowRoot of a to also get e.defaultPrevented === true;
});


