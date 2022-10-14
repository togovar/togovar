export default class DropdownButton {
  constructor(_elm) {
    this._elm = _elm;
  }

  dropdown() {
    this._elm.forEach((dropdown) => {
      const select = dropdown.querySelector('.select');
      const caret = dropdown.querySelector('.caret');
      const list = dropdown.querySelector('.list');
      const items = dropdown.querySelector('.list .item');
      const selected = dropdown.querySelector('.selected');

      select.addEventListener('click', () => {
        select.classList.toggle('select-clicked');
        caret.classList.toggle('caret-rotate');
        list.classList.toggle('list-open');
      });

      items.forEach((item) => {
        item.addEventListener('click', () => {
          selected.textContent = item.textcontent;
          select.classList.remove('select-clicked');
          caret.classList.remove('caret-rotate');
          list.classList.remove('list-open');
          items.forEach((item) => {
            item.classList.remove('active');
          });
          item.classList.add('active');
        });
      });
    });
  }
}
