window.BouncePath = class BouncePath {
  static #key = false;
  #target;
  #root;
  #path;
  #children;

  constructor(target, root, path, children) {
    if (!BouncePath.#key)
      throw new Error('You cannot create "new BouncePath(...)" objects. Use "BouncePath.make(target)".')
    this.#target = target;
    this.#root = root;
    this.#path = path;
    this.#children = children;
  }

  get root() {
    return this.#root;
  }

  get target() {
    return this.#target;
  }

  get path() {
    Object.freeze(this.#path);
    return this.#path;
  }

  * [Symbol.iterator](depth = 0) {
    yield this;
    for (let child of this.#children)
      if (child)
        yield* child[Symbol.iterator](depth+1);
  }

  * depthIterator(pos = 0, depth = 0) {
    yield {context: this, pos, depth};
    for (let i = 0; i < this.#children.length; i++) {
      let child = this.#children[i];
      if (child)
        yield* child.depthIterator(i, depth+ 1);
    }
  }

  toString(){
    let res = '';
    for (let {context, pos, depth} of this.depthIterator()) {
      const dots = Array(depth * 2).fill('.').join('');
      const path = context.path.map(n => n.nodeName).join(',');
      res += `${dots}${pos}:${path}\n`;
    }
    return res.trim();
  }

  //the bouncePath is either composed or not. If you need to get a partially composed bouncepath, then
  //make the composed path and then ask for the child context.
  getChildContext(root) {
    for (let c of this)
      if (c.#root === root)
        return c;
  }

  static make(target, composed) {
    this.#key = true;
    const res = this.#make(target, composed);
    this.#key = false;
    return res;
  }

  static #make(target, composed, contextChildren = []) {
    //1. make path
    const path = [];
    let root = target;
    for (let n = target; n; n = n.parentNode)
      path.push(root = n);
    //2. make slotted contextChildren
    for (let i = 0; i < path.length - 2; i++) {  //-1 => document, -2 => topMost element
      const slot = path[i].assignedSlot;
      if (slot)
        contextChildren[i + 1] = this.#make(slot, false);
    }
    const context = new BouncePath(target, root, path, contextChildren);
    //3. if composed, try to pursue the host node.
    if (composed && root instanceof DocumentFragment && root.host)
      return this.#make(root.host, composed, [context]);
    return context;
  }

  static calculateRoot(target, root, e) {
    if (target === window) return window;
    if (root === false) return target.getRootNode();
    if (root === true) return target.getRootNode({composed: true});
    if (root instanceof Element || root instanceof DocumentFragment || root instanceof Document) return root;
    return target.getRootNode(e);
  }

  //if you need a partially composed path, such as with focus events, then simply slice a fully composedPath afterwards.
  static composedPath(target, composed) {
    const res = [];
    while (target) {
      res.push(target);
      target = target.assignedSlot || target.parentNode || composed && target.host;
    }
    return res;
  }
}