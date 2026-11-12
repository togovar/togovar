// パネル下端が画面端や Karyotype バーに接しないよう、操作用の余白を残す。
const PANEL_BOTTOM_MARGIN_PX = 8;

/** 検索結果上のパネルが画面端や Karyotype に隠れないよう、CSS の上限と表示可能範囲の小さい方に収める。 */
export function fitResultsPanelHeight(panel: HTMLElement): void {
  panel.style.maxHeight = '';
  const style = getComputedStyle(panel);
  const cssMaxHeight = parseFloat(style.maxHeight);
  let visibleBottom = window.innerHeight;
  for (const selector of ['.LayoutMain', '#ResultsView']) {
    const container = panel.closest<HTMLElement>(selector);
    if (container) visibleBottom = Math.min(visibleBottom, container.getBoundingClientRect().bottom);
  }
  // 非表示で高さが 0 の Karyotype は上端も 0 になり得るため、制限に使わない。
  const karyotype = document.getElementById('Karyotype')?.getBoundingClientRect();
  if (karyotype && karyotype.height > 0) visibleBottom = Math.min(visibleBottom, karyotype.top);

  // Columns の開閉アニメーション中も、移動が終わった位置を基準に高さを決める。
  const translateY = style.transform === 'none' ? 0 : new DOMMatrixReadOnly(style.transform).m42;
  const top = panel.getBoundingClientRect().top - translateY;
  const height = Math.max(0, Math.floor(visibleBottom - top - PANEL_BOTTOM_MARGIN_PX));
  if (Number.isNaN(cssMaxHeight) || height < cssMaxHeight) panel.style.maxHeight = `${height}px`;
}
