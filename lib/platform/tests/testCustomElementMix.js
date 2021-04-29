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


