export class TestHtml extends HTMLElement {
  #id;
  #div;
  #slot;
  #iframe;

  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.addEventListener('slotchange', e => this.slotchange(e));
    this.shadowRoot.innerHTML = `<slot></slot><iframe hidden></iframe><div></div><link rel="stylesheet" href="test.css">`;
    this.#id = this.id.replaceAll(' ', '');
    this.#slot = this.shadowRoot.children[0];
    this.#iframe = this.shadowRoot.children[1];
    this.#div = this.shadowRoot.children[2];
    window.addEventListener('message', e => this.onMessage(e));
  }

  onMessage(e) {
    let res = JSON.parse(e.data);
    if (res instanceof Array && res[0] === this.#id + '')
      this.render(res[1]);
  }

  render(res) {
    //todo add the number, flip the script, so that the name is one box, and the content is another
    delete res.el;
    this.#div.insertAdjacentHTML('beforeend', `
<div class="row label">
    <div name></div>
    ${Object.entries(res).map(([k, v]) => `<div key="${k}">${k}</div>`).join('\n')}
</div>
<div class="row">
    <div name class="${this.id}">${this.id}</div>
    ${Object.entries(res).map(([k, v]) => `<div key="${k}" value="${v}"> </div>`).join('\n')}
</div>`);
  }

  slotchange(e) {
    const slotted = this.#slot.assignedElements();
    this.#iframe = this.shadowRoot.children[1];
    if (!slotted.length)
      return this.#div.innerHTML = "", this.#iframe.src = "";
    if (slotted.length > 1 || slotted[0].tagName !== 'NOSCRIPT')
      throw new Error('TestHtml can only contain a single <noscript></noscript> element.');

    const txt = `
<base href='${document.location.href}'/>
<script src='log.js'></script>
<script src="window_constructionContext.js"></script>
<script src="window_legalConstruction.js"></script>
${slotted[0].innerHTML}`;
    this.#iframe.src = `data:text/html;charset=utf-8,${encodeURI(`${txt}`)}#${this.#id}`;
    //todo print the error
    // this.render({"hasParentNode":false,"hasAttributes":false,"hasChildNodes":false,"isConnected":false,"isLoading":false,"isCurrentScript":false,"isEventListener":false,"currentElementIsLastElement":false,"currentScriptIsLastElement":false,"syncUpgrade":false,"predictive":false,"NEW":false});
  }
}