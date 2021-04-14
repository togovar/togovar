import StoreManager from "./StoreManager.js";
import ResultsRowView from "./ResultsRowView.js";
import ScrollBar from "./ScrollBar.js";
import { TR_HEIGHT, COMMON_FOOTER_HEIGHT, COLUMNS } from '../global.js';


export default class ResultsView {

  constructor(elm) {
    this.elm = elm;
    this.rows = [];
    this.lastScroll = 0;
    this.status = this.elm.querySelector('header.header > .status');
    this.messages = this.elm.querySelector('#Messages');

    StoreManager.bind('searchStatus', this);
    StoreManager.bind('searchResults', this);
    StoreManager.bind('columns', this);
    StoreManager.bind('offset', this);
    StoreManager.bind('karyotype', this);
    StoreManager.bind('searchMessages', this);
    $(document).on('keydown.resultview', this.keydown.bind(this));
    // スクロールバーの生成
    this.elm.querySelector('.tablecontainer').insertAdjacentHTML('afterend', '<div class="scroll-bar"></div>');
    new ScrollBar(this.elm.querySelector('.scroll-bar'));
    // ヘッダの生成
    this.elm.querySelector('.tablecontainer > table.results-view > thead > tr').innerHTML = COLUMNS.map(column => `<th class="${column.id}"><p data-tooltip-id="table-header-${column.id}">${column.label}</p></th>`).join('');
    // ボディの参照
    this.tbody = this.elm.querySelector('.tablecontainer > table.results-view > tbody');

    // スクロール制御
    // スクロールイベント
    const mousewheelevent = 'onwheel' in document ? 'wheel' : 'onmousewheel' in document ? 'mousewheel' : 'DOMMouseScroll';
    this.tbody.addEventListener(mousewheelevent, this.scroll.bind(this));

    // カラムの表示を制御するためのスタイルシート
    this.stylesheet = document.createElement('style');
    this.stylesheet.type = 'text/css';
    document.getElementsByTagName('head')[0].appendChild(this.stylesheet);
    this.columns(StoreManager.getData('columns'));
  }

  updateDisplaySize() {
    // 表示数
    const
      maxRowCount = Math.floor((window.innerHeight - this.tbody.getBoundingClientRect().top - StoreManager.getData('karyotype').height - COMMON_FOOTER_HEIGHT - 2) / TR_HEIGHT),
      numberOfRecords = StoreManager.getData('numberOfRecords'),
      offset = StoreManager.getData('offset'),
      rowCount = Math.min(maxRowCount, numberOfRecords);
    StoreManager.setData('rowCount', rowCount);
    // 行が足らなければ追加
    if (this.rows.length < rowCount) {
      for (let i = this.rows.length; i < rowCount; i++) {
        const tr = new ResultsRowView(i);
        this.rows.push(tr);
        this.tbody.appendChild(tr.tr);
      }
    }
    // オフセット量の調整
    const
      onScreen = numberOfRecords - offset,
      belowSpace = maxRowCount - onScreen;
    if (belowSpace > 0) { // 隙間ができてしまい
      if (offset >= belowSpace) { // 上の隙間の方が大きい場合、差分をオフセットにセット
        StoreManager.setData('offset', offset - belowSpace);
      } else { // 下の隙間が大きい場合、オフセット量をゼロに
        StoreManager.setData('offset', 0);
      }
    }
  }

  scroll(e) {
    e.stopPropagation();
    const
      totalHeight = StoreManager.getData('numberOfRecords') * TR_HEIGHT;
    let
      availableScrollY = totalHeight - StoreManager.getData('rowCount') * TR_HEIGHT,
      wheelScroll;
    availableScrollY = availableScrollY < 0 ? 0 : availableScrollY;
    // 縦方向にスクロールしていない場合スルー
    if (e.deltaY === 0) return;
    // ホイールのスクロール量
    wheelScroll = this.lastScroll + e.deltaY;
    wheelScroll = wheelScroll < 0 ? 0 : wheelScroll;
    wheelScroll = wheelScroll > availableScrollY ? availableScrollY : wheelScroll;
    if (wheelScroll === this.lastScroll) return;
    // スクロール量決定
    this.lastScroll = wheelScroll;
    // 表示行位置
    let offset = Math.ceil(this.lastScroll / TR_HEIGHT);
    StoreManager.setData('offset', offset);
  }

  offset(offset) {
    this.lastScroll = offset * TR_HEIGHT;
    // 染色体位置
    const displayingRegions1 = {}, displayingRegions2 = {};
    for (let i = 0; i <= StoreManager.getData('rowCount') - 1; i++) {
      const record = StoreManager.getRecordByIndex(i);
      if (displayingRegions1[record.chromosome] === undefined) {
        displayingRegions1[record.chromosome] = [];
      }
      displayingRegions1[record.chromosome].push(record.start);
    }
    for (const key in displayingRegions1) {
      displayingRegions2[key] = {
        start: Math.min(...displayingRegions1[key]),
        end: Math.max(...displayingRegions1[key])
      }
    }
    StoreManager.setData('displayingRegionsOnChromosome', displayingRegions2);
  }

  searchMessages(messages) {
    console.log(messages)
    this.messages.innerHTML = '';

    if (messages.notice) {
      this.messages.innerHTML += `<div class="message -notice">${messages.notice}</div>`;
    }
    if (messages.warning) {
      this.messages.innerHTML += `<div class="message -warning">${messages.warning}</div>`;
    }
    if (messages.error) {
      this.messages.innerHTML += `<div class="message -error">${messages.error}</div>`;
    }
  }

  
  // bindings ///////////////////////////

  searchStatus(status) {
    this.status.textContent = `The number of available variations is ${status.available.toLocaleString()} out of ${status.filtered.toLocaleString()}.`;
    if (status.filtered === 0) {
      this.elm.classList.add('-not-found');
    } else {
      this.elm.classList.remove('-not-found');
    }
  }

  searchResults(_results) {
    this.updateDisplaySize();
  }

  // カラムの表示／非表示
  columns(columns) {
    // 既存のスタイルの削除
    while (this.stylesheet.sheet.cssRules.length > 0) {
      this.stylesheet.sheet.deleteRule(0);
    }
    // スタイルの追加
    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];
      this.stylesheet.sheet.insertRule(`
      .tablecontainer > table.results-view th.${column.id}, .tablecontainer > table.results-view td.${column.id} {
        display: ${ column.isUsed ? 'table-cell' : 'none' }
      }`, i);
    }
  }

  // 上下カーソルタイプで選択行の移動 & ESCで選択解除
  keydown(e) {
    if (StoreManager.getData('selectedRow') === undefined) return;
    switch (e.key) {
      case 'ArrowUp': // ↑
        this.shiftSelectedRow(-1);
        break;
      case 'ArrowDown': // ↓
        this.shiftSelectedRow(1);
        break;
      case 'Escape': // 選択解除
        StoreManager.setData('selectedRow', undefined);
        break;
    }
  }

  shiftSelectedRow(value) {
    let
      currentIndex = StoreManager.getData('selectedRow'),
      shiftIndex = currentIndex + value,
      rowCount = StoreManager.getData('rowCount'),
      offset = StoreManager.getData('offset'),
      numberOfRecords = StoreManager.getData('numberOfRecords');
    if (shiftIndex < 0) {
      shiftIndex = 0
      if (offset > 0) {
        // 上にスクロール
        offset--;
        StoreManager.setData('offset', offset);
      }
    } else if (shiftIndex > (rowCount - 1)) {
      shiftIndex = rowCount - 1;
      if ((offset + shiftIndex) < (numberOfRecords - 1)) {
        // 下にスクロール
        offset++;
        StoreManager.setData('offset', offset);
      }
    }
    StoreManager.setData('selectedRow', shiftIndex);
  }

  karyotype(_karyotype) {
    this.updateDisplaySize();
  }

}
