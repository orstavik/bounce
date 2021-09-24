function analyze(sequence) {
  let res = [];
  for (let i = 0; i < sequence.length; i++) {
    let nowData = sequence[i];
    let prevData = {attributesLength: 0, childNodesLength: 0, hasParentNode: false};
    for (let j = i - 1; j >= 0; j--) {
      const maybePrev = sequence[j];
      if (maybePrev.id === nowData.id) {
        prevData = maybePrev;
        break;
      }
    }
    //1. add setAttribute multi/single
    const addedAtts = nowData.attributesLength - prevData.attributesLength;
    if (addedAtts)
      res.push({id: nowData.id, name: 'set attribute l' + addedAtts});
    //2. add setParentNode
    if (nowData.hasParentNode !== prevData.hasParentNode)
      res.push({id: nowData.id, name: 'set parent'});
    //3. appendChild / appendChildren
    const addedChildNodes = nowData.childNodesLength - prevData.childNodesLength;
    if (addedChildNodes)
      res.push({id: nowData.id, name: 'set child l' + addedChildNodes});
    res.push(nowData);
  }
  return res;
}

export class TestHtml extends HTMLElement {
  #id;
  #slot;
  #iframe;
  #div;
  #mode = 'normal';
  #txt;
  #sequence = [];

  constructor() {
    super();
    this.#id = this.id.replace(' ', '');
    this.attachShadow({mode: "open"});
    this.shadowRoot.addEventListener('slotchange', e => this.slotchange(e));
    this.shadowRoot.innerHTML = `<link rel="stylesheet" href="test.css"/><slot></slot><iframe hidden></iframe><div></div>`;
    this.#slot = this.shadowRoot.children[1];
    this.#iframe = this.shadowRoot.children[2];
    this.#div = this.shadowRoot.children[3];
    window.addEventListener('message', e=> this.onMessage(e));
  }

  onMessage(e) {
    let res = JSON.parse(e.data);
    if (res instanceof Array && res[0] === this.#id + ''){
      this.#sequence.push(res[1]);
      this.render();
    }
  }

  changeMode(mode){
    this.#mode = mode;
    this.runTest();
  }

  render() {
    const ar = analyze(this.#sequence);
    this.#div.innerHTML = `
<div class="row">
    <div name class="${this.id}">${this.id}</div>
    ${ar.map(({name, id}) => `<div class="el${id} ${name}" title="${name}"></div>`).join('\n')}
</div>`;
  }

  slotchange(e) {
    const slotted = this.#slot.assignedElements();
    if (!slotted.length)
        return this.#div.innerHTML = "", this.#iframe.src = "";
    if (slotted.length > 1 || slotted[0].tagName !== 'NOSCRIPT')
      throw new Error('TestHtml can only contain a single <noscript></noscript> element.');
    this.#txt = slotted[0].innerHTML;
    this.changeMode('normal');
  }

  runTest() {
    this.#sequence = [];
    let txt = this.#txt.trim();
    if(this.#mode === 'ready')
       txt = txt.replace('<script src="./WebCompNormal.js"></script>', '<script src="./ready.js"></script><script src="./WebCompReady.js"></script>')
    if(this.#mode === 'childChanged')
       txt = txt.replace('<script src="./WebCompNormal.js"></script>', '<script src="./child.js"></script><script src="./WebCompChildChanged.js"></script>')
    txt = '<script src="./log.js"></script>' + txt;
    this.setAttribute('title', txt);
    this.#iframe.src =
      `data:text/html;charset=utf-8,${encodeURI(`<base href='${document.location.href}'/>${txt}`)}#${this.#id}`;
  }
}