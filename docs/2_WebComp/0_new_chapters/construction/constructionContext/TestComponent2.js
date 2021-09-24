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
    if (!(res instanceof Array && res[0] === this.#id + ''))
      return;
    res = res[1].pop();
    delete res.el;
    this.render(res);
  }

  render(res) {
    this.#div.innerHTML = `
<div class="row label">
    <div name></div>
    ${Object.entries(res).map(([k, v]) => `<div key="${k}">${k}</div>`).join('\n')}
</div>
<div class="row">
    <div name class="${(this.id)}">${(this.id)}</div>
    ${Object.entries(res).map(([k, v]) => `<div key="${k}" value="${v}"> </div>`).join('\n')}
</div>`;
  }

  slotchange(e) {
    const slotted = this.#slot.assignedElements();
    this.#iframe = this.shadowRoot.children[1];
    if (!slotted.length)
      return this.#div.innerHTML = "", this.#iframe.src = "";
    if (slotted.length > 1 || slotted[0].tagName !== 'NOSCRIPT')
      throw new Error('TestHtml can only contain a single <noscript></noscript> element.');

    this.#iframe.src = `data:text/html;charset=utf-8,${encodeURI(`<base href='${document.location.href}'/>${slotted[0].innerHTML}`)}#${this.#id}`;
    this.render({"hasParentNode":false,"hasAttributes":false,"hasChildNodes":false,"isConnected":false,"isLoading":false,"isCurrentScript":false,"isEventListener":false,"currentElementIsLastElement":false,"currentScriptIsLastElement":false,"syncUpgrade":false,"predictive":false,"NEW":false});
  }
}