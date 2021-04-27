import {composedPath} from "../index.js";

describe('stopPropagation', function () {

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

  function log(e, capture, node) {
    const propagationRoot = getPropagationRoot(node);
    const b = capture ? 'c' : 'b';
    const root = nodeName(propagationRoot);
    const target = nodeName(node);
    const str = [root, b, target].map(s => (s + '           ').substr(0, 13)).join(' ');
    return str;
  }

  it('stopImmediatePropagation', function () {
    let res = "";
    targets[0].addEventListener("my-event-123", e=>e.stopImmediatePropagation(), true);
    for (let node of targets) {
      node.addEventListener("my-event-123", function (e) {
        res += log(e, true, node).trim() + '\n';
      }, true)
    }
    h1.dispatchEvent(new Event('my-event-123', {composed: true, bubbles: true}));
    const test =
`window        c            window
window        c            document
window        c            HTML
window        c            BODY
window        c            DIV
window        c            LINK-SLOT
window        c            SPAN
window        c            OUTER-HOST
##OUTER-HOST  c            ##OUTER-HOST
##OUTER-HOST  c            UP-IN-LI-SL
##OUTER-HOST  c            IN-LI-SL
##OUTER-HOST  c            INNER-HOST
##INNER-HOST  c            ##INNER-HOST
##INNER-HOST  c            H1
##IN-LI-SL    c            ##IN-LI-SL
##IN-LI-SL    c            IN-FR-SL
##IN-LI-SL    c            SLOT
##IN-FR-SL    c            ##IN-FR-SL
##IN-FR-SL    c            SLOT
##UP-IN-LI-SL c            ##UP-IN-LI-SL
##UP-IN-LI-SL c            UP-IN-FR-SL
##UP-IN-LI-SL c            SLOT
##UP-IN-FR-SL c            ##UP-IN-FR-SL
##UP-IN-FR-SL c            SLOT
##LINK-SLOT   c            ##LINK-SLOT
##LINK-SLOT   c            FRAME-SLOT
##LINK-SLOT   c            SLOT
##FRAME-SLOT  c            ##FRAME-SLOT
##FRAME-SLOT  c            SLOT
##HTML        c            ##HTML
##HTML        c            SLOT
`;
    expect(res).to.be.equal(test)
  })

  it('stopPropagation', function () {
    targets[25].addEventListener("my-event-234", e=>e.stopPropagation());

    let res = "";
    for (let node of targets) {
      node.addEventListener("my-event-234", function (e) {
        res += log(e, false, node).trim() + '\n';
      }, false);
    }
    h1.dispatchEvent(new Event('my-event-234', {composed: true, bubbles: true}));
    const test =
`window        b            OUTER-HOST
window        b            SPAN
window        b            LINK-SLOT
window        b            DIV
##OUTER-HOST  b            INNER-HOST
##OUTER-HOST  b            IN-LI-SL
##OUTER-HOST  b            UP-IN-LI-SL
##OUTER-HOST  b            ##OUTER-HOST
##INNER-HOST  b            H1
##INNER-HOST  b            ##INNER-HOST
##H1          b            ##H1
##IN-LI-SL    b            SLOT
##IN-LI-SL    b            IN-FR-SL
##IN-LI-SL    b            ##IN-LI-SL
##IN-FR-SL    b            SLOT
##IN-FR-SL    b            ##IN-FR-SL
##UP-IN-LI-SL b            SLOT
##UP-IN-LI-SL b            UP-IN-FR-SL
##UP-IN-LI-SL b            ##UP-IN-LI-SL
##UP-IN-FR-SL b            SLOT
##UP-IN-FR-SL b            ##UP-IN-FR-SL
##LINK-SLOT   b            SLOT
##LINK-SLOT   b            FRAME-SLOT
##LINK-SLOT   b            ##LINK-SLOT
##FRAME-SLOT  b            SLOT
##FRAME-SLOT  b            ##FRAME-SLOT
##HTML        b            SLOT
##HTML        b            ##HTML
`;
    expect(res).to.be.equal(test);
  })
})


