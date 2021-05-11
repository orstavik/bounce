// import {HrefVisitedLink} from "../../events/HrefVisitedLink.js";
// import {Clickable} from "../../events/HrefVisitedLink.js";

describe('customElements.mix', function () {

  class Alpha extends HTMLElement {

    constructor(){
      super();
      this.aa = 'aaa';
    }

    connectedCallback() {
      this._a_ = '_a_';
    }

    disconnectedCallback() {
      delete this._a_;
    }

    attributeChangedCallback(name, oldValue, newValue) {
      !this.attA && (this.attA = 0);
      this.attA++;
    }

    setAlice() {
      this.alice = 'alice';
    }

    get a() {
      return this.alice;
    }

    set a(val) {
      this.alice = val;
    }

    static get observedAttributes() {
      return ['alice'];
    }

    static AconstructorA() {
      return 'AAconstructorAA';
    }
  }

  class Beta extends HTMLElement {

    constructor() {
      super();
      this.bb = 'bbb';
    }
    connectedCallback() {
      this._b_ = '_b_';
    }

    disconnectedCallback() {
      delete this._b_;
    }

    attributeChangedCallback(name, oldValue, newValue) {
      !this.attB && (this.attB = 0);
      this.attB++;
    }

    static get observedAttributes() {
      return ['bob', 'b'];
    }
  }

  it('alpha only: constructor', function () {
    const AlphaOne = customElements.mix('alpha-one', [Alpha]);
    expect(AlphaOne.name).to.be.equal('AlphaOne');
    const AlphaProps = Object.getOwnPropertyNames(Alpha);
    const AlphaOneProps = Object.getOwnPropertyNames(AlphaOne);
    expect(AlphaOneProps.sort()).to.deep.equal(AlphaProps.sort());
    for (let name of AlphaProps.filter(prop => prop !== 'name' && prop !== 'prototype'))
      expect(AlphaOne).to.have.ownPropertyDescriptor(name, Object.getOwnPropertyDescriptor(Alpha, name));
  });
  it('alpha only: prototype', function () {
    const AlphaTwo = customElements.mix('alpha-two', [Alpha]);
    const AlphaProps = Object.getOwnPropertyNames(Alpha.prototype);
    const AlphaOneProps = Object.getOwnPropertyNames(AlphaTwo.prototype);
    expect(AlphaOneProps.sort()).to.deep.equal(AlphaProps.sort());
    for (let name of AlphaProps.filter(prop => prop !== 'constructor'))
      expect(AlphaTwo.prototype).to.have.ownPropertyDescriptor(name, Object.getOwnPropertyDescriptor(Alpha.prototype, name));
  });
  it('mix AlphaBeta: constructor', function () {
    const AlphaBeta = customElements.mix('alpha-beta-one', [Alpha, Beta]);
    const AlphaProps = Object.getOwnPropertyNames(Alpha);
    const BetaProps = Object.getOwnPropertyNames(Beta);
    const AlphaBetaProps = Object.getOwnPropertyNames(AlphaBeta);
    const UnionAlphaBetaProps = [...AlphaProps, ...BetaProps].filter((e, i, a) => a.indexOf(e) === i);
    const AconstructorA = Object.getOwnPropertyDescriptor(Alpha, 'AconstructorA');
    expect(AlphaBetaProps.length).to.be.equal(5);
    expect(AlphaBetaProps.sort()).to.deep.equal(UnionAlphaBetaProps.sort());
    expect(AlphaBeta).to.have.ownPropertyDescriptor('AconstructorA', AconstructorA);
    expect(AlphaBeta.observedAttributes).to.deep.equal(['bob', 'b', 'alice']);
  });
  it('mix AlphaBeta: prototype', function () {
    const AlphaBeta = customElements.mix('alpha-beta-two', [Alpha, Beta]);
    const AlphaProps = Object.getOwnPropertyNames(Alpha.prototype);
    const BetaProps = Object.getOwnPropertyNames(Beta.prototype);
    const AlphaBetaProps = Object.getOwnPropertyNames(AlphaBeta.prototype);
    const UnionAlphaBetaProps = [...AlphaProps, ...BetaProps].filter((e, i, a) => a.indexOf(e) === i);
    const setAlice = Object.getOwnPropertyDescriptor(Alpha.prototype, 'setAlice');
    const a = Object.getOwnPropertyDescriptor(Alpha.prototype, 'a');
    expect(AlphaBetaProps.length).to.be.equal(6);
    expect(AlphaBetaProps.sort()).to.deep.equal(UnionAlphaBetaProps.sort());
    expect(AlphaBeta.prototype).to.have.ownPropertyDescriptor('setAlice', setAlice);
    expect(AlphaBeta.prototype).to.have.ownPropertyDescriptor('a', a);
  });
  it('mix AlphaBeta: constructors are wiped out', function () {
    const AlphaBeta = customElements.mix('alpha-beta-three', [Alpha, Beta]);
    const ab = new AlphaBeta();
    assert(!('aa' in ab));
    assert(!('bb' in ab));
  });
  it('mix AlphaBeta: all connectedCallbacks and disconnectedCallbacks are called', function () {
    const AlphaBeta = customElements.mix('alpha-beta-four', [Alpha, Beta]);
    const ab = new AlphaBeta();
    expect(ab._a_).to.be.equal(undefined);
    expect(ab._b_).to.be.equal(undefined);
    document.body.appendChild(ab);
    expect(ab._a_).to.be.equal('_a_');
    expect(ab._b_).to.be.equal('_b_');
    ab.remove();
    expect(ab._a_).to.be.equal(undefined);
    expect(ab._b_).to.be.equal(undefined);
  });
  it('mix AlphaBeta: correct attributeChangedCallbacks', function () {
    const AlphaBeta = customElements.mix('alpha-beta-five', [Alpha, Beta]);
    const ab = new AlphaBeta();
    document.body.appendChild(ab);
    expect(ab.attA).to.be.equal(undefined);
    expect(ab.attB).to.be.equal(undefined);
    ab.setAttribute('alice', '');
    expect(ab.attA).to.be.equal(1);
    expect(ab.attB).to.be.equal(undefined);
    ab.removeAttribute('alice');
    expect(ab.attA).to.be.equal(2);
    expect(ab.attB).to.be.equal(undefined);
    ab.setAttribute('bob', '');
    expect(ab.attA).to.be.equal(2);
    expect(ab.attB).to.be.equal(1);
  });
});

let testString = "";
let contextA;
let contextB;

class mixinA extends HTMLElement {
  connectedCallback() {
    testString += "a";
    contextA = this;
  }
}

class mixinB extends HTMLSpanElement {
  connectedCallback() {
    testString += "b";
    contextB = this;
  }
}

class mixinC extends HTMLDivElement {
  connectedCallback() {
    testString += "c";
  }
}

class mixinD extends HTMLElement {

  connectedCallback() {
    testString += "d";
  }
}

class mixinBACC extends HTMLElement {
  static get observedAttributes() {
    return ["hello"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    testString += "bACC";
  }
}


class mixinAACC extends HTMLElement {
  static get observedAttributes() {
    return ["hello"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    testString += "aACC";
  }
}


//todo: parent inheritance without super()

class parentClass extends HTMLElement {

  customCallback() {
     return testString += "parent"
  }
}

class childClass extends parentClass {

}


class nonExtend {
  customCallback() {
    alert("boo")
  }
}

class nonExtendChild extends nonExtend {
  customCallback() {
    alert("ooops")
  }
}


describe("basic tests", function () {
  it("Defined properties values", function () {
    customElements.mix("a-b-property", [mixinA, mixinB]);
    const element = document.createElement("a-b-property");
    document.body.appendChild(element);
    let propertiesA = Object.getOwnPropertyDescriptors(contextA.constructor);
    let propertiesB = Object.getOwnPropertyDescriptors(contextB.constructor);
    expect(propertiesA.name.value).to.be.equals("ABProperty");
    expect(propertiesB.name.value).to.be.equals("ABProperty");
  });
  it("Running the callback in reverse order", function () {
    testString = "";
    customElements.mix("a-b-reverse-combo", [mixinA, mixinB]);
    const element = document.createElement("a-b-reverse-combo");
    document.body.appendChild(element);
    expect(testString).to.be.equals("ba");
  });
  it('Combine two components', function () {
    testString = "";
    customElements.mix("a-b-combo", [mixinA, mixinB]);
    const element = document.createElement("a-b-combo");
    document.body.appendChild(element);
    expect(testString).to.be.equals("ba");
  });
  it('Combine three components', function () {
    testString = "";
    customElements.mix("a-b-c-combo", [mixinA, mixinB, mixinC]);
    const element = document.createElement("a-b-c-combo");
    document.body.appendChild(element);
    expect(testString).to.be.equals("cba");
  });
  it('Combine the same component', function () {
    testString = "";
    customElements.mix("a-a-combo", [mixinA, mixinA]);
    const element = document.createElement("a-a-combo");
    document.body.appendChild(element);
    expect(testString).to.be.equals("aa");
  });
  it('Combine one component which extend HTMLSpanElement', function () {
    testString = "";
    customElements.mix("b-combo", [mixinB]);
    const element = document.createElement("b-combo");
    document.body.appendChild(element);
    expect(testString).to.be.equals("b");
  });

//   it("Component extend another component", function () {
//     testString = "";
//     customElements.mix("cc-cc-combo", [mixinA, childClass]);
//     const element = document.createElement("cc-cc-combo");
//     element.customCallback();  //call parent method
//     document.body.appendChild(element);
//     expect(testString).to.be.equals("a");
//   })
})


describe(" mix() AttributeChangedCallback", function () {

  it("Both components with AttributeChangedCallback() and observedAttributes()", function () {
    testString = "";
    customElements.mix("acc-bcc-combo", [mixinAACC, mixinBACC]);
    const element = document.createElement("acc-bcc-combo");
    document.body.appendChild(element);
    element.setAttribute("hello", "world");
    // element.setAttribute("hello", "sunshine");
    expect(testString).to.be.equals("bACCaACC");
  });
  it("One components with AttributeChangedCallback() and observedAttributes() another without", function () {
    testString = "";
    customElements.mix("acc-b-combo", [mixinAACC, mixinB])
    const element = document.createElement("acc-b-combo");
    // element.setAttribute("hello", "world");
    document.body.appendChild(element);
    element.setAttribute("hello", "sunshine");
    expect(testString).to.be.equals("baACC");
  });
  it("Change attributes several times, both components with AttributeChangedCallback() and observedAttributes() ",
    function () {
      testString = "";
      customElements.mix("acc-bcc-combo-2", [mixinAACC, mixinBACC])
      const element = document.createElement("acc-bcc-combo-2");
      element.setAttribute("hello", "world");
      element.setAttribute("hello", "sky");
      document.body.appendChild(element);
      element.setAttribute("hello", "sunshine");
      expect(testString).to.be.equals("bACCaACCbACCaACCbACCaACC");
    });
});
describe("Error tests", function () {
  it("Custom element сlass does not extend HTMLElement", function () {
    try {
      customElements.mix("a-n-combo", [nonExtend, mixinC])
      const element = document.createElement("a-n-combo");
      document.body.appendChild(element);
    } catch (e) {
      expect(e.message).to.be.equals(
        `ElementMixins must be a direct descendant on HTMLElement, ie. "nonExtend extends HTMLElement".`);
    }
  });
  it("Custom element class extend HTMLElement which does not", function () {
    try {
      customElements.mix("a-nn-combo", [nonExtendChild, mixinA])
      const element = document.createElement("a-nn-combo");
      document.body.appendChild(element);
    } catch (e) {
      expect(e.message).to.be.equals(
        `ElementMixins must be a direct descendant on HTMLElement, ie. "nonExtendChild extends HTMLElement".`);
    }
  });
})

