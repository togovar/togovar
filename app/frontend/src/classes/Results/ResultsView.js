import { storeManager } from '../../store/StoreManager';
import { ResultsRowView } from './ResultsRowView.ts';
import ScrollBar from './../ScrollBar.js';
import { TR_HEIGHT, COMMON_FOOTER_HEIGHT, COLUMNS } from '../../global.js';
import { keyDownEvent } from '../../utils/keyDownEvent.js';

export class ResultsView {
  constructor(elm) {
    this.elm = elm;
    this.rows = [];
    this.lastScroll = 0;
    this.status = this.elm.querySelector('header.header > .left > .status');
    this.messages = this.elm.querySelector('#Messages');

    storeManager.bind('searchStatus', this);
    storeManager.bind('searchResults', this);
    storeManager.bind('columns', this);
    storeManager.bind('offset', this);
    storeManager.bind('karyotype', this);
    storeManager.bind('searchMessages', this);
    document.addEventListener('keydown', this.keydown.bind(this));
    // スクロールバーの生成
    this.elm
      .querySelector('.tablecontainer')
      .insertAdjacentHTML('afterend', '<div class="scroll-bar"></div>');
    new ScrollBar(this.elm.querySelector('.scroll-bar'));
    // ヘッダ+ ヘッダのツールチップ用のデータ設定
    this.elm.querySelector(
      '.tablecontainer > table.results-view > thead'
    ).innerHTML = `<tr>${COLUMNS.map(
      (column) =>
        `<th class="${column.id}"><p data-tooltip-id="table-header-${column.id}">${column.label}</p></th>`
    ).join('')}</tr>`;

    this.tbody = this.elm.querySelector(
      '.tablecontainer > table.results-view > tbody'
    );

    // スクロール制御
    // スクロールイベント
    const mousewheelevent =
      'onwheel' in document
        ? 'wheel'
        : 'onmousewheel' in document
        ? 'mousewheel'
        : 'DOMMouseScroll';
    this.tbody.addEventListener(mousewheelevent, this.scroll.bind(this));

    // カラムの表示を制御するためのスタイルシート
    this.stylesheet = document.createElement('style');
    this.stylesheet.type = 'text/css';
    document.getElementsByTagName('head')[0].appendChild(this.stylesheet);
    this.columns(storeManager.getData('columns'));
  }

  updateDisplaySize() {
    if (storeManager.getData('isFetching')) {
      // フェッチ中は処理をスキップ
      return;
    }

    // 表示数
    const maxRowCount = Math.floor(
        (window.innerHeight -
          this.tbody.getBoundingClientRect().top -
          storeManager.getData('karyotype').height -
          COMMON_FOOTER_HEIGHT -
          2) /
          TR_HEIGHT
      ),
      numberOfRecords = storeManager.getData('numberOfRecords'),
      offset = storeManager.getData('offset'),
      rowCount = Math.min(maxRowCount, numberOfRecords);
    storeManager.setData('rowCount', rowCount);
    // 行が足らなければ追加
    if (this.rows.length < rowCount) {
      for (let i = this.rows.length; i < rowCount; i++) {
        const tr = new ResultsRowView(i);
        this.rows.push(tr);
        this.tbody.appendChild(tr.tr);
      }
    }
    // オフセット量の調整
    const onScreen = numberOfRecords - offset,
      belowSpace = maxRowCount - onScreen;
    if (belowSpace > 0) {
      // 隙間ができてしまい
      if (offset >= belowSpace) {
        // 上の隙間の方が大きい場合、差分をオフセットにセット
        storeManager.setData('offset', offset - belowSpace);
      } else {
        // 下の隙間が大きい場合、オフセット量をゼロに
        storeManager.setData('offset', 0);
      }
    }

    // 行の更新を確実に行う
    requestAnimationFrame(() => {
      this.rows.forEach((row) => row.updateTableRow());
    });
  }

  scroll(e) {
    e.stopPropagation();
    const totalHeight = storeManager.getData('numberOfRecords') * TR_HEIGHT;
    let availableScrollY =
        totalHeight - storeManager.getData('rowCount') * TR_HEIGHT,
      wheelScroll;
    availableScrollY = availableScrollY < 0 ? 0 : availableScrollY;
    // 縦方向にスクロールしていない場合スルー
    if (e.deltaY === 0) return;
    // ホイールのスクロール量
    wheelScroll = this.lastScroll + e.deltaY;
    wheelScroll = wheelScroll < 0 ? 0 : wheelScroll;
    wheelScroll =
      wheelScroll > availableScrollY ? availableScrollY : wheelScroll;
    if (wheelScroll === this.lastScroll) return;
    // スクロール量決定
    this.lastScroll = wheelScroll;
    // 表示行位置
    let offset = Math.ceil(this.lastScroll / TR_HEIGHT);
    storeManager.setData('offset', offset);
  }

  offset(offset) {
    this.lastScroll = offset * TR_HEIGHT;

    // データ更新中は処理をスキップ
    if (
      storeManager.getData('isStoreUpdating') ||
      storeManager.getData('isFetching')
    ) {
      return;
    }

    // 染色体位置
    const displayingRegions1 = {},
      displayingRegions2 = {};

    for (let i = 0; i <= storeManager.getData('rowCount') - 1; i++) {
      const record = storeManager.getRecordByIndex(i);

      // recordが実際のデータオブジェクトの場合のみ処理
      if (record && typeof record === 'object' && record.chromosome) {
        if (displayingRegions1[record.chromosome] === undefined) {
          displayingRegions1[record.chromosome] = [];
        }
        displayingRegions1[record.chromosome].push(record.start);
      }
    }

    // データが存在する場合のみ処理
    if (Object.keys(displayingRegions1).length > 0) {
      for (const key in displayingRegions1) {
        displayingRegions2[key] = {
          start: Math.min(...displayingRegions1[key]),
          end: Math.max(...displayingRegions1[key]),
        };
      }
      storeManager.setData('displayingRegionsOnChromosome', displayingRegions2);
    }
  }

  searchMessages(messages) {
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
    this.status.innerHTML = `The number of available variations is ${status.available.toLocaleString()} out of <span class="bigger">${status.filtered.toLocaleString()}</span>.`;
    // this.status.textContent = `The number of available variations is ${status.available.toLocaleString()} out of ${status.filtered.toLocaleString()}.`;
    if (status.filtered === 0) {
      this.elm.classList.add('-not-found');
    } else {
      this.elm.classList.remove('-not-found');
    }
  }

  searchResults(_results) {
    // 更新中フラグのチェックを1回だけに
    const isUpdating = storeManager.getData('isStoreUpdating');
    const isFetching = storeManager.getData('isFetching');

    if (isUpdating || isFetching) {
      requestAnimationFrame(() => this.searchResults(_results));
      return;
    }

    if (!this._validateData()) {
      console.warn('データの検証に失敗しました');
      return;
    }

    this.updateDisplaySize();
  }

  _validateData() {
    const results = storeManager.getData('searchResults');
    const numberOfRecords = storeManager.getData('numberOfRecords');

    return (
      Array.isArray(results) &&
      typeof numberOfRecords === 'number' &&
      numberOfRecords >= 0
    );
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
      this.stylesheet.sheet.insertRule(
        `
      .tablecontainer > table.results-view th.${
        column.id
      }, .tablecontainer > table.results-view td.${column.id} {
        display: ${column.isUsed ? 'table-cell' : 'none'}
      }`,
        i
      );
    }
  }

  // 上下カーソルタイプで選択行の移動 & ESCで選択解除
  keydown(e) {
    if (storeManager.getData('selectedRow') === undefined) return;

    if (keyDownEvent('selectedRow')) {
      switch (e.key) {
        case 'ArrowUp': // ↑
          this.shiftSelectedRow(-1);
          break;
        case 'ArrowDown': // ↓
          this.shiftSelectedRow(1);
          break;
        case 'Escape': // 選択解除
          storeManager.setData('selectedRow', undefined);
          break;
      }
    }
  }

  shiftSelectedRow(value) {
    let currentIndex = storeManager.getData('selectedRow'),
      shiftIndex = currentIndex + value,
      rowCount = storeManager.getData('rowCount'),
      offset = storeManager.getData('offset'),
      numberOfRecords = storeManager.getData('numberOfRecords');
    if (shiftIndex < 0) {
      shiftIndex = 0;
      if (offset > 0) {
        // 上にスクロール
        offset--;
        storeManager.setData('offset', offset);
      }
    } else if (shiftIndex > rowCount - 1) {
      shiftIndex = rowCount - 1;
      if (offset + shiftIndex < numberOfRecords - 1) {
        // 下にスクロール
        offset++;
        storeManager.setData('offset', offset);
      }
    }
    storeManager.setData('selectedRow', shiftIndex);
  }

  karyotype(_karyotype) {
    this.updateDisplaySize();
  }
}
