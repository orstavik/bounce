import {composedPath} from "../src/index.js";

describe('Custom dispatchEvent ', function () {

  const outerHost = document.querySelector("outer-host");
  const h1 = outerHost.shadowRoot.children[0].children[0].children[0].shadowRoot.children[0];
  const targets = composedPath(h1, window);
  
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

  const result = [];

  function log(e, capture, node) {
    const propagationRoot = getPropagationRoot(node);
    const b = capture ? 'c' : 'b';
    const root = nodeName(propagationRoot);
    const target = nodeName(node);
    const currentTargetCorrect = e.currentTarget === node;
    const targetCorrect = e.path[0] === e.target;
    const eventPropsCorrect = currentTargetCorrect && targetCorrect
    const str = [root, b, target, eventPropsCorrect].map(s => (s + '           ').substr(0, 13)).join(' ');
    console.log(str);
    return str;
  }

  it('basic, capture', function () {
    let res = "";
    for (let node of targets) {
      node.addEventListener("my-event", function (e) {
        res += log(e, true, node);
      }, true)
    }
    h1.dispatchEvent(new Event('my-event', {composed: true, bubbles: true}));
    expect(res).to.be.equal(
      "window        c            window        true         " +
      "window        c            document      true         " +
      "window        c            HTML          true         " +
      "window        c            BODY          true         " +
      "window        c            DIV           true         " +
      "window        c            LINK-SLOT     true         " +
      "window        c            SPAN          true         " +
      "window        c            OUTER-HOST    true         " +
      "##OUTER-HOST  c            ##OUTER-HOST  true         " +
      "##OUTER-HOST  c            UP-IN-LI-SL   true         " +
      "##OUTER-HOST  c            IN-LI-SL      true         " +
      "##OUTER-HOST  c            INNER-HOST    true         " +
      "##INNER-HOST  c            ##INNER-HOST  true         " +
      "##INNER-HOST  c            H1            true         " +
      "##IN-LI-SL    c            ##IN-LI-SL    true         " +
      "##IN-LI-SL    c            IN-FR-SL      true         " +
      "##IN-LI-SL    c            SLOT          true         " +
      "##IN-FR-SL    c            ##IN-FR-SL    true         " +
      "##IN-FR-SL    c            SLOT          true         " +
      "##UP-IN-LI-SL c            ##UP-IN-LI-SL true         " +
      "##UP-IN-LI-SL c            UP-IN-FR-SL   true         " +
      "##UP-IN-LI-SL c            SLOT          true         " +
      "##UP-IN-FR-SL c            ##UP-IN-FR-SL true         " +
      "##UP-IN-FR-SL c            SLOT          true         " +
      "##LINK-SLOT   c            ##LINK-SLOT   true         " +
      "##LINK-SLOT   c            FRAME-SLOT    true         " +
      "##LINK-SLOT   c            SLOT          true         " +
      "##FRAME-SLOT  c            ##FRAME-SLOT  true         " +
      "##FRAME-SLOT  c            SLOT          true         " +
      "##HTML        c            ##HTML        true         " +
      "##HTML        c            SLOT          true         ");
  })

  it('basic, bubble', function () {
    let res = "";
    for (let node of targets) {
      node.addEventListener("my-event", function (e) {
        res += log(e, false, node);
      }, false)
    }
    h1.dispatchEvent(new Event('my-event', {composed: true, bubbles: true}));

    expect(res).to.be.equal(
      'window        b            OUTER-HOST    true         ' +
      'window        b            SPAN          true         ' +
      'window        b            LINK-SLOT     true         ' +
      'window        b            DIV           true         ' +
      'window        b            BODY          true         ' +
      'window        b            HTML          true         ' +
      'window        b            document      true         ' +
      'window        b            window        true         ' +
      '##OUTER-HOST  b            INNER-HOST    true         ' +
      '##OUTER-HOST  b            IN-LI-SL      true         ' +
      '##OUTER-HOST  b            UP-IN-LI-SL   true         ' +
      '##OUTER-HOST  b            ##OUTER-HOST  true         ' +
      '##INNER-HOST  b            H1            true         ' +
      '##INNER-HOST  b            ##INNER-HOST  true         ' +
      '##IN-LI-SL    b            SLOT          true         ' +
      '##IN-LI-SL    b            IN-FR-SL      true         ' +
      '##IN-LI-SL    b            ##IN-LI-SL    true         ' +
      '##IN-FR-SL    b            SLOT          true         ' +
      '##IN-FR-SL    b            ##IN-FR-SL    true         ' +
      '##UP-IN-LI-SL b            SLOT          true         ' +
      '##UP-IN-LI-SL b            UP-IN-FR-SL   true         ' +
      '##UP-IN-LI-SL b            ##UP-IN-LI-SL true         ' +
      '##UP-IN-FR-SL b            SLOT          true         ' +
      '##UP-IN-FR-SL b            ##UP-IN-FR-SL true         ' +
      '##LINK-SLOT   b            SLOT          true         ' +
      '##LINK-SLOT   b            FRAME-SLOT    true         ' +
      '##LINK-SLOT   b            ##LINK-SLOT   true         ' +
      '##FRAME-SLOT  b            SLOT          true         ' +
      '##FRAME-SLOT  b            ##FRAME-SLOT  true         ' +
      '##HTML        b            SLOT          true         ' +
      '##HTML        b            ##HTML        true         '
    );
  })
})


