export function DblclickMixin(Base) {
  return class DblclickMixin extends Base {
    constructor() {
      super();
      this.addEventListener('click', function (e) {
        //todo
      });
    }
  }
}