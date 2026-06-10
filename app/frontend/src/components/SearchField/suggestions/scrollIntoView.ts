import { directive, AsyncDirective } from 'lit/async-directive.js';
import type { PartInfo } from 'lit/directive.js';

/** 垂直方向の表示可能領域の高さ。水平スクロールは不要なため height のみ保持する */
interface ViewableArea {
  height: number;
}

/** スクロール量の計算結果。上端・下端それぞれの距離を保持することで、より近い方向を選べるようにする */
interface ScrollCalculation {
  scrollTop: number;
  scrollBot: number;
  shouldScrollTop: boolean;
}

/** キーボード操作でハイライトが変わるたびに候補をスクロールさせるLitディレクティブ */
class ScrollIntoView extends AsyncDirective {
  /**
   * AsyncDirectiveはrender()の実装が必須だが、このディレクティブはDOMを生成しないため空にする
   */
  render(): void {}

  /**
   * selected=trueになったタイミングでスクロールを実行する。
   * update()はDOMアクセスが必要なためrender()ではなくupdate()で処理する
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
   * PartInfoのelement型はLitの内部型で直接アクセスできないため、in演算子でプロパティの存在を確認してから取得する
   */
  private _getElementFromPart(part: PartInfo): Element | null {
    if ('element' in part && part.element) {
      return part.element as Element;
    }
    return null;
  }

  /**
   * getBoundingClientRectは画面座標を返すため、親の上端を基準に子が収まっているか判定する
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
   * 上端・下端それぞれのスクロール量を同時に計算することで、呼び出し元で2回計算しなくて済むようにする
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
   * 最小スクロール量で候補を見えるようにするため、上端・下端のうち移動量が少ない方向にスクロールする
   */
  private _scrollParentToChild(parent: Element, child: Element): void {
    const parentRect = parent.getBoundingClientRect();
    const viewableArea: ViewableArea = { height: parent.clientHeight };
    const childRect = child.getBoundingClientRect();

    if (this._isElementViewable(parentRect, childRect, viewableArea)) {
      return;
    }

    const scrollCalc = this._calculateScrollDirection(parentRect, childRect);
    parent.scrollTop += scrollCalc.shouldScrollTop
      ? scrollCalc.scrollTop
      : scrollCalc.scrollBot;
  }
}

/**
 * selected=trueになった候補要素を自動スクロールで表示領域内に収めるLitディレクティブ。
 * キーボードナビゲーション時にリストがスクロールしないと選択位置がわからなくなるため使用する
 */
export const scrollIntoView = directive(ScrollIntoView);
