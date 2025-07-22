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

    // タッチスクロール用の変数
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.touchLastY = 0;
    this.isScrolling = false;
    this.lastTouchTime = 0;

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
    this.setupScrollEvents();

    // カラムの表示を制御するためのスタイルシート
    this.stylesheet = document.createElement('style');
    this.stylesheet.type = 'text/css';
    document.getElementsByTagName('head')[0].appendChild(this.stylesheet);
    this.columns(storeManager.getData('columns'));

    // this.lastScrollを初期化
    this.updateLastScrollFromOffset();
  }

  // offsetからthis.lastScrollを更新するメソッド
  updateLastScrollFromOffset() {
    const currentOffset = storeManager.getData('offset') || 0;
    this.lastScroll = currentOffset * TR_HEIGHT;
  }

  setupScrollEvents() {
    // PC用のホイールイベント
    const mousewheelevent =
      'onwheel' in document
        ? 'wheel'
        : 'onmousewheel' in document
        ? 'mousewheel'
        : 'DOMMouseScroll';
    this.tbody.addEventListener(mousewheelevent, this.scroll.bind(this));

    // tablecontainerの要素を取得
    this.tablecontainer = this.elm.querySelector('.tablecontainer');

    // モバイル・タブレット用のタッチイベント（ResultsViewの範囲内のみ）
    const touchElements = [this.tablecontainer, this.tbody];

    touchElements.forEach((element) => {
      element.addEventListener('touchstart', this.handleTouchStart.bind(this), {
        passive: false,
        capture: true,
      });
      element.addEventListener('touchmove', this.handleTouchMove.bind(this), {
        passive: false,
        capture: true,
      });
      element.addEventListener('touchend', this.handleTouchEnd.bind(this), {
        passive: false,
        capture: true,
      });
    });
  }

  handleTouchStart(e) {
    // ResultsViewの範囲内かどうかをチェック
    if (!this.elm.contains(e.target) && !this.elm.contains(e.currentTarget)) {
      return;
    }

    // tablecontainerまたはtbodyで処理する
    if (
      e.currentTarget !== this.tablecontainer &&
      e.currentTarget !== this.tbody
    ) {
      return;
    }

    if (e.touches.length !== 1) return;

    this.touchStartY = e.touches[0].clientY;
    this.touchLastY = this.touchStartY;
    this.touchStartTime = Date.now();
    this.lastTouchTime = this.touchStartTime; // lastTouchTimeを初期化
    this.isScrolling = true;

    // スクロールバーのドラッグ処理と同じように開始位置を記録
    this.touchStartOffset = storeManager.getData('offset') || 0;

    // ここで現在のoffsetからlastScrollを記録
    this.lastScroll = (storeManager.getData('offset') || 0) * TR_HEIGHT;

    this.initializeScrollBarPosition();
  }

  handleTouchMove(e) {
    if (!this.isScrolling || e.touches.length !== 1) return;

    // ResultsViewの範囲内かどうかをチェック
    if (!this.elm.contains(e.target) && !this.elm.contains(e.currentTarget)) {
      return;
    }

    // tablecontainerまたはtbodyで処理する
    if (
      e.currentTarget !== this.tablecontainer &&
      e.currentTarget !== this.tbody
    ) {
      return;
    }

    const currentY = e.touches[0].clientY;

    const totalDeltaY = currentY - this.touchStartY;

    this.touchLastY = currentY;

    this.handleScrollWithScrollBarFeedback(-totalDeltaY * 0.1);
  }

  handleTouchEnd(e) {
    if (!this.isScrolling) return;

    this.isScrolling = false;

    // タッチ終了時にスクロールバーのアクティブ状態を解除
    this.deactivateScrollBar();
  }

  // スクロールバーのアクティブ状態を解除
  deactivateScrollBar() {
    const scrollBar = this.elm.querySelector('.scroll-bar');
    if (scrollBar) {
      scrollBar.classList.remove('-active');
    }
  }

  handleScroll(deltaY) {
    const totalHeight = storeManager.getData('numberOfRecords') * TR_HEIGHT;
    let availableScrollY =
        totalHeight - storeManager.getData('rowCount') * TR_HEIGHT,
      wheelScroll;
    availableScrollY = availableScrollY < 0 ? 0 : availableScrollY;

    // スクロール量の計算
    wheelScroll = this.lastScroll + deltaY;
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

  // スクロールバーを直接操作している感覚のスクロール処理
  handleScrollWithScrollBarFeedback(deltaY) {
    const rowCount = storeManager.getData('rowCount');
    const numberOfRecords = storeManager.getData('numberOfRecords');

    // スクロールバーのドラッグ処理と同じように開始位置からの累積移動量を使用
    const availableHeight = rowCount * TR_HEIGHT;
    const offsetRate = deltaY / availableHeight;
    let newOffset =
      Math.ceil(offsetRate * numberOfRecords) + this.touchStartOffset;

    // 境界チェック
    newOffset = newOffset < 0 ? 0 : newOffset;
    newOffset =
      newOffset + rowCount > numberOfRecords
        ? numberOfRecords - rowCount
        : newOffset;

    // lastScrollを更新
    this.lastScroll = newOffset * TR_HEIGHT;

    // スクロールバーを直接操作している感覚でoffsetを更新
    this.updateScrollBarDirectly(newOffset);

    // データ更新（遅延読み込み機能を維持）
    storeManager.setData('offset', newOffset);
  }

  // スクロールバーの位置を初期化
  initializeScrollBarPosition() {
    const scrollBar = this.elm.querySelector('.scroll-bar');
    if (scrollBar) {
      scrollBar.classList.add('-active');
    }
  }

  // スクロールバーを直接操作している感覚で更新
  updateScrollBarDirectly(offset) {
    const scrollBar = this.elm.querySelector('.scroll-bar');
    if (!scrollBar) return;

    const rowCount = storeManager.getData('rowCount');
    const numberOfRecords = storeManager.getData('numberOfRecords');
    const totalHeight = numberOfRecords * TR_HEIGHT;
    const displayHeight = rowCount * TR_HEIGHT;
    const displayRate = displayHeight / totalHeight;

    // スクロールバーの高さと位置を計算
    let barHeight = Math.ceil(displayHeight * displayRate);
    barHeight = barHeight < 30 ? 30 : barHeight; // MIN_HEIGHT

    const availableHeight = displayHeight - barHeight;
    const availableRate = availableHeight / totalHeight;
    const barTop = Math.ceil(offset * TR_HEIGHT * availableRate);

    // スクロールバーの位置を直接更新
    const bar = scrollBar.querySelector('.bar');
    if (bar) {
      bar.style.height = `${barHeight}px`;
      bar.style.top = `${barTop}px`;

      // 位置表示も更新
      const position = bar.querySelector('.position');
      if (position) {
        position.textContent = offset + 1;
      }
    }

    // アクティブ状態を維持
    scrollBar.classList.add('-active');
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
    // 縦方向にスクロールしていない場合スルー
    if (e.deltaY === 0) return;
    this.handleScroll(e.deltaY);
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
