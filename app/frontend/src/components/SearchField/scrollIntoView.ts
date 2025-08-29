import { directive, AsyncDirective } from 'lit/async-directive.js';
import { PartInfo } from 'lit/directive.js';

/** 表示可能領域の情報 */
interface ViewableArea {
  height: number;
  width: number;
}

/** スクロール計算の結果 */
interface ScrollCalculation {
  scrollTop: number;
  scrollBot: number;
  shouldScrollTop: boolean;
}

/**
 * 選択された要素を親要素の表示可能領域内にスクロールするLitディレクティブ
 */
class ScrollIntoView extends AsyncDirective {
  render(): void {}

  /**
   * ディレクティブの更新処理
   * @param part - Litディレクティブのパート情報
   * @param selected - 要素が選択されているかどうかのフラグ
   */
  update(part: PartInfo, [selected]: [boolean]): void {
    if (!selected) {
      return;
    }

    const element = this._getElementFromPart(part);
    if (!element?.parentElement) {
      return;
    }

    this._scrollParentToChild(element.parentElement, element);
  }

  /**
   * PartInfoから要素を安全に取得する
   * @param part - Litディレクティブのパート情報
   * @returns 要素またはnull
   */
  private _getElementFromPart(part: PartInfo): Element | null {
    // elementプロパティが存在する場合に取得
    if ('element' in part && part.element) {
      return part.element as Element;
    }
    return null;
  }

  /**
   * 要素が表示可能領域内にあるかを判定する
   * @param parentRect - 親要素の位置情報
   * @param childRect - 子要素の位置情報
   * @param viewableArea - 親要素の表示可能領域
   * @returns 表示可能かどうか
   */
  private _isElementViewable(
    parentRect: DOMRect,
    childRect: DOMRect,
    viewableArea: ViewableArea
  ): boolean {
    return (
      childRect.top >= parentRect.top &&
      childRect.bottom <= parentRect.top + viewableArea.height
    );
  }

  /**
   * スクロール方向と量を計算する
   * @param parentRect - 親要素の位置情報
   * @param childRect - 子要素の位置情報
   * @returns スクロール計算結果
   */
  private _calculateScrollDirection(
    parentRect: DOMRect,
    childRect: DOMRect
  ): ScrollCalculation {
    const scrollTop = childRect.top - parentRect.top;
    const scrollBot = childRect.bottom - parentRect.bottom;

    return {
      scrollTop,
      scrollBot,
      shouldScrollTop: Math.abs(scrollTop) < Math.abs(scrollBot),
    };
  }

  /**
   * 子要素を親要素の表示可能領域内にスクロールする
   *
   * 子要素が親要素の表示領域外にある場合、最小限のスクロールで
   * 子要素を表示領域内に移動させる。上下どちらの方向でも
   * より近い方向にスクロールする。
   *
   * @param parent - 親要素（スクロールコンテナ）
   * @param child - 子要素（表示したい要素）
   */
  private _scrollParentToChild(parent: Element, child: Element): void {
    const parentRect = parent.getBoundingClientRect();
    const viewableArea: ViewableArea = {
      height: parent.clientHeight,
      width: parent.clientWidth,
    };

    const childRect = child.getBoundingClientRect();

    // 既に表示可能領域内にある場合は何もしない
    if (this._isElementViewable(parentRect, childRect, viewableArea)) {
      return;
    }

    // スクロール方向と量を計算
    const scrollCalc = this._calculateScrollDirection(parentRect, childRect);

    // より少ないスクロール量の方向にスクロール
    const scrollAmount = scrollCalc.shouldScrollTop
      ? scrollCalc.scrollTop
      : scrollCalc.scrollBot;

    parent.scrollTop += scrollAmount;
  }
}

/**
 * 選択された要素を表示可能領域内にスクロールするLitディレクティブ
 * @param selected 要素が選択されているかどうか
 */
export const scrollIntoView = directive(ScrollIntoView);
