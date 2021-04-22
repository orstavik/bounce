import {} from "../HTMLElementNative.js";
import {bounceSequence, toString} from "../BouncedPath.js";

class OuterHost extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = '<upper-inner-link-slot><inner-link-slot><inner-host></inner-host></inner-link-slot></upper-inner-link-slot>';
  }
}

class InnerHost extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({mode: "open"});
    shadowRoot.innerHTML = '<h1>hello sunshine</h1>';
  }
}

class LinkSlot extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({mode: "open"});
    shadowRoot.innerHTML = '<frame-slot><slot></slot></frame-slot>';
  }
}

class FrameSlot extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({mode: "open"});
    shadowRoot.innerHTML = '<slot></slot>';
  }
}

class InnerLinkSlot extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({mode: "open"});
    shadowRoot.innerHTML = '<inner-frame-slot><slot></slot></inner-frame-slot>';
  }
}

class InnerFrameSlot extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({mode: "open"});
    shadowRoot.innerHTML = '<slot></slot>';
  }
}

class UpperInnerLinkSlot extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({mode: "open"});
    shadowRoot.innerHTML = '<upper-inner-frame-slot><slot></slot></upper-inner-frame-slot>';
  }
}

class UpperInnerFrameSlot extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({mode: "open"});
    shadowRoot.innerHTML = '<slot></slot>';
  }
}

customElements.define("outer-host", OuterHost);
customElements.define("inner-host", InnerHost);
customElements.define("link-slot", LinkSlot);
customElements.define("frame-slot", FrameSlot);
customElements.define("inner-link-slot", InnerLinkSlot);
customElements.define("inner-frame-slot", InnerFrameSlot);
customElements.define("upper-inner-link-slot", UpperInnerLinkSlot);
customElements.define("upper-inner-frame-slot", UpperInnerFrameSlot);


const div = document.createElement("div");
const span = document.createElement("span");
const h2 = document.createElement("h2");
const linkSlot = document.createElement("link-slot");
const outerHost = document.createElement("outer-host");
const mostNestedH1 = outerHost.shadowRoot.children[0].children[0].children[0].shadowRoot.children[0].shadowRoot;

document.body.prepend(div)
div.appendChild(linkSlot);
linkSlot.appendChild(span);
span.appendChild(outerHost);
linkSlot.appendChild(h2);


//rule 1: The Bounce sequence always ends with a DocumentFragment, document, or window.
describe('bouncedPath <outer-path> shadowRoot target', function () {

  const res = bounceSequence(outerHost.shadowRoot, window);

  it(".path length", function () {
    expect(res.path.length).to.be.equal(8)
  })

  it(".path sequence", function () {
    expect(res.path.toString()).to.be.equal(
      "[object HTMLElement],[object HTMLSpanElement],[object HTMLElement],[object HTMLDivElement],[object HTMLBodyElement],[object HTMLHtmlElement],[object HTMLDocument],[object Window]")
  })

  it(".contexts number", function () {
    expect(res.contexts.length).to.be.equal(6);
  });

  it(".contexts[0].contexts.length", function () {
    expect(res.contexts[0].contexts.length).to.be.equal(0);
  });

  it(".contexts[0] path", function () {
    expect(res.contexts[0].path[0] instanceof DocumentFragment).to.be.equal(true);
    expect(res.contexts[0].path.toString()).to.be.equal("[object ShadowRoot]");
  });

  it(".contexts[1] is undefined]", function () {
    expect(res.contexts[1]).to.be.equal(undefined);
  });

  it(".contexts[2].path length", function () {
    expect(res.contexts[2].path.length).to.be.equal(3);
  });

  it(".contexts[2].path length", function () {
    expect(res.contexts[2].path.length).to.be.equal(3);
  });

  it(".contexts[2].path sequence", function () {
    expect(res.contexts[2].path.toString()).to.be.equal(
      "[object HTMLSlotElement],[object HTMLElement],[object ShadowRoot]");
  });

  it(".contexts[2] inner context path length", function () {
    expect(res.contexts[2].contexts[1].path.length).to.be.equal(2);
  });

  it(".contexts[2] inner context path sequense", function () {
    expect(res.contexts[2].contexts[1].path.toString()).to.be.equal("[object HTMLSlotElement],[object ShadowRoot]");
  });

  it(".contexts[3] is undefined", function () {
    expect(res.contexts[3]).to.be.equal(undefined);
  });

  it(".contexts[4] is undefined", function () {
    expect(res.contexts[3]).to.be.equal(undefined);
  });

  it(".contexts[5] path length", function () {
    expect(res.contexts[5].path.length).to.be.equal(2);
  });

  it(".contexts[5] path sequence", function () {
    expect(res.contexts[5].path.toString()).to.be.equal("[object HTMLSlotElement],[object DocumentFragment]");
  });

  it("root object", function () {
    expect(res.root).to.be.equal(window);
  });

})

describe('bounced path <h1> most nested element', function () {


  const res = bounceSequence(mostNestedH1, window);

  it("contexts number", function () {
    expect(res.contexts.length).to.be.equal(6);
  });

  it(".contexts[0] path length]", function () {
    expect(res.contexts[0].path.length).to.be.equal(4);
  });

  it(".contexts[0] path sequence]", function () {
    expect(res.contexts[0].path.toString()).to.be.equal(
      "[object HTMLElement],[object HTMLElement],[object HTMLElement],[object ShadowRoot]");
  });

  it(".contexts[0].contexts[0].path length]", function () {
    expect(res.contexts[0].contexts[0].path.length).to.be.equal(2);
  });

  it(".contexts[0].contexts[0].path sequence]", function () {
    expect(res.contexts[0].contexts[0].path.toString()).to.be.equal("[object HTMLHeadingElement],[object ShadowRoot]");
  });

  it("contexts[0].contexts[0].contexts[0].path length]", function () {
    expect(res.contexts[0].contexts[0].contexts[0].path.length).to.be.equal(1);
  });

  it(".contexts[0].contexts[0].contexts[0].path sequence]", function () {
    expect(res.contexts[0].contexts[0].contexts[0].path.toString()).to.be.equal("[object DocumentFragment]");
  });


  it(".contexts[0].contexts[1].path.length]", function () {
    expect(res.contexts[0].contexts[1].path.length).to.be.equal(3);
  });

  it(".contexts[0].contexts[1].path sequence]", function () {
    expect(res.contexts[0].contexts[1].path.toString()).to.be.equal(
      "[object HTMLSlotElement],[object HTMLElement],[object ShadowRoot]");
  });

  it(".contexts[0].contexts[1].contexts[1].path.length]", function () {
    expect(res.contexts[0].contexts[1].contexts[1].path.length).to.be.equal(2);
  });

  it(".contexts[0].contexts[1].contexts[1].path sequence]", function () {
    expect(res.contexts[0].contexts[1].contexts[1].path.toString()).to.be.equal(
      "[object HTMLSlotElement],[object ShadowRoot]");
  });

  it(".contexts[0].contexts[2].path.length]", function () {
    expect(res.contexts[0].contexts[2].path.length).to.be.equal(3);
  });

  it(".contexts[0].contexts[2].path sequence]", function () {
    expect(res.contexts[0].contexts[2].path.toString()).to.be.equal(
      "[object HTMLSlotElement],[object HTMLElement],[object ShadowRoot]");
  });

  it(".contexts[0].contexts[2].contexts[1].path.length]", function () {
    expect(res.contexts[0].contexts[2].contexts[1].path.length).to.be.equal(2);
  });

  it(".contexts[0].contexts[2].path sequence]", function () {
    expect(res.contexts[0].contexts[2].contexts[1].path.toString()).to.be.equal(
      "[object HTMLSlotElement],[object ShadowRoot]");
  });

  it(".contexts[1] is undefined]", function () {
    expect(res.contexts[1]).to.be.equal(undefined);
  });

  it(".contexts[2] path length]", function () {
    expect(res.contexts[2].path.length).to.be.equal(3);
  });

  it(".contexts[2] path sequence]", function () {
    expect(res.contexts[2].path.toString()).to.be.equal(
      "[object HTMLSlotElement],[object HTMLElement],[object ShadowRoot]");
  });

  it(".contexts[2].contexts[1] path length]", function () {
    expect(res.contexts[2].contexts[1].path.length).to.be.equal(2);
  });

  it(".contexts[2].contexts[1] path sequence]", function () {
    expect(res.contexts[2].contexts[1].path.toString()).to.be.equal("[object HTMLSlotElement],[object ShadowRoot]");
  });

  it(".contexts[3] is undefined]", function () {
    expect(res.contexts[3]).to.be.equal(undefined);
  });

  it(".contexts[4] is undefined]", function () {
    expect(res.contexts[4]).to.be.equal(undefined);
  });

  it(".contexts[5] path length]", function () {
    expect(res.contexts[5].path.length).to.be.equal(2);
  });

  it(".contexts[5] path sequence]", function () {
    expect(res.contexts[5].path.toString()).to.be.equal("[object HTMLSlotElement],[object DocumentFragment]");
  });

})
