export class IterableWeakSet {
  constructor(iterable) {
    this._array = [];
    if (!iterable)
      return
    if (!(typeof iterable[Symbol.iterator] === 'function'))
      throw new Error('IterableWeakSet can only take an iterable as its argument.');
    for (let obj of iterable)
      this.add(obj);
  }

  add(obj) {
    this._array.push(new WeakRef(obj));
  }

  has(obj) {
    return !!this._array.find(wr => wr.deref() === obj);
  }

  delete(obj) {
    const index = this._array.findIndex(wr => wr.deref() === obj);
    if (index === -1)
      return false;
    this._array.splice(index, 1);
    return true;
  }

  * [Symbol.iterator]() {
    for (let i = 0; i < this._array.length; i++) {
      let obj = this._array[i].deref();
      if (obj) yield obj;
    }
  }

  * keys() {
    yield* this[Symbol.iterator]();
  }

  * values() {
    yield* this[Symbol.iterator]();
  }

  get size(){
    this._array = this._array.filter(wr => !!wr.deref());
    return this._array.length;
  }

  clear(){
    this._array = [];
  }
}