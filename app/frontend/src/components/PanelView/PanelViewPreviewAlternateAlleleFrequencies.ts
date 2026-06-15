import PanelView from './PanelView';
import { storeManager } from '../../store/StoreManager';
import { getSimpleSearchConditionMaster } from '../../store/searchManager';
import type { MasterConditionItem } from '../../types';

/** アレル頻度の表示桁数。小数点以下4桁を上限として丸める。 */
const DECIMAL_DIGIT = 4;

/** 各データセット行の表示セル参照をまとめた型 */
type DatasetCells = {
  alt: Element;
  total: Element;
  frequency: Element;
};

/**
 * アレル頻度プレビューパネル。
 * 選択行のバリアントについて、データセットごとの ac / an / af を表示する。
 */
export default class PanelViewPreviewAlternateAlleleFrequencies extends PanelView {
  /** 頻度情報を持つデータセットのマスター定義一覧 */
  private _master: MasterConditionItem[];
  /** データセットIDをキーに、各表示セルへの参照を保持するマップ */
  private _datasets: Record<string, DatasetCells> = {};

  /**
   * マスター定義から tbody を構築し、セル参照を取得してStore 購読を登録する。
   * kind は 'frequencies' とし、他パネルと LocalStorage キーが重複しないようにする。
   * 旧 JS では 'frenquecies' というタイポがあったが、ここで修正している（localStorage キーが変わることに注意）。
   */
  constructor(elm: Element) {
    super(elm, 'frequencies');

    storeManager.bind('selectedRow', this);
    storeManager.bind('offset', this);

    const master = getSimpleSearchConditionMaster('dataset');
    this._master = master?.items ?? [];

    const tbody = this.elm.querySelector<HTMLTableSectionElement>(
      '.frequency-detail > tbody'
    )!;

    tbody.innerHTML = this._master
      .map((dataset) =>
        dataset.has_freq
          ? `<tr data-dataset="${dataset.id}">
              <td>
                <div class="dataset-icon" data-dataset="${dataset.id}">
                  <div class="properties"></div>
                </div>
                ${dataset.label}
              </td>
              <td class="alt"></td>
              <td class="total"></td>
              <td class="frequency"></td>
            </tr>`
          : ''
      )
      .join('');

    for (const dataset of this._master) {
      if (!dataset.has_freq || dataset.id === undefined) continue;

      const tr = tbody.querySelector<HTMLTableRowElement>(
        `tr[data-dataset="${dataset.id}"]`
      )!;
      this._datasets[dataset.id] = {
        alt: tr.querySelector('.alt')!,
        total: tr.querySelector('.total')!,
        frequency: tr.querySelector('.frequency')!,
      };
    }
  }

  /**
   * 選択行が変わったときに storeManager から呼ばれるコールバック。
   * 表示更新は _update に委譲し、このメソッドはトリガーとしてのみ機能させる。
   */
  selectedRow(): void {
    this._update();
  }

  /**
   * ページオフセットが変わったときに storeManager から呼ばれるコールバック。
   * ページ送りで選択行のバリアントが変わるため、表示を更新する。
   */
  offset(): void {
    this._update();
  }

  /**
   * 選択中バリアントの頻度情報を各データセット行に反映する。
   * 選択行が未定義のときは何もしないことで、初期描画前の空更新を防ぐ。
   */
  private _update(): void {
    if (storeManager.getData('selectedRow') === undefined) return;

    const record = storeManager.getSelectedRecord();
    if (!record) return;
    const frequencies = record.frequencies ?? [];

    for (const dataset of this._master) {
      if (!dataset.has_freq || dataset.id === undefined) continue;

      const frequency = frequencies.find((freq) => freq.source === dataset.id);
      const cells = this._datasets[dataset.id];

      if (frequency) {
        cells.alt.textContent = frequency.ac?.toLocaleString() ?? '';
        cells.total.textContent = frequency.an?.toLocaleString() ?? '';
        cells.frequency.textContent = this._formatAF(frequency.af);
      } else {
        cells.alt.textContent = '';
        cells.total.textContent = '';
        cells.frequency.textContent = '';
      }
    }
  }

  /**
   * アレル頻度を4桁の小数文字列に変換する。
   * 文字列長が規定桁数を超える非常に小さい値は指数表記にフォールバックする。
   * 丸めると0になる値は精度を失わず指数で表示するためこの分岐が必要。
   */
  private _formatAF(af: number | undefined): string {
    if (af == null) return '';

    if (String(af).length > DECIMAL_DIGIT + 2) {
      const numOfDigits = String(af).length;
      const integerized = String(af * 10 ** numOfDigits).padStart(
        numOfDigits,
        '0'
      );
      const rounded = Math.round(
        parseFloat(
          integerized.slice(0, DECIMAL_DIGIT) +
            '.' +
            integerized.slice(DECIMAL_DIGIT)
        )
      );
      const floated = rounded / 10 ** DECIMAL_DIGIT;
      return floated > 0
        ? String(floated)
        : af.toExponential(DECIMAL_DIGIT - 1);
    }

    const rounded = Math.round(af * 10 ** DECIMAL_DIGIT);
    if (rounded === 0 && af !== 0) {
      return af.toExponential(DECIMAL_DIGIT - 1);
    }
    return strIns(
      String(rounded).padStart(DECIMAL_DIGIT + 1, '0'),
      -DECIMAL_DIGIT,
      '.'
    );
  }
}

/** 小数点挿入など「末尾N桁前に文字を差し込む」用途が多いため、負の idx を末尾起点として扱えるようにしている。 */
function strIns(str: string, idx: number, val: string): string {
  return str.slice(0, idx) + val + str.slice(idx);
}
