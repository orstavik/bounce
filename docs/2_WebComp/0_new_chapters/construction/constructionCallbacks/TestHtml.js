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
  static #counter = 0;
  #id;
  #slot;
  #iframe;
  #div;

  constructor() {
    super();
    this.#id = TestHtml.#counter++;
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
    if (res instanceof Array && res[0] === this.#id + '')
      this.render(analyze(res[1]));
  }

  render(ar) {
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

    const htmlText = slotted[0].innerHTML;
    this.setAttribute('title', htmlText);
    this.#iframe.src =
      `data:text/html;charset=utf-8,${encodeURI(`<base href='${document.location.href}'/>${htmlText}`)}#${this.#id}`;
  }
}