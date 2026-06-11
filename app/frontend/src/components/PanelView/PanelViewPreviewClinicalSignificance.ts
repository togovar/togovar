import PanelView from './PanelView';
import { storeManager } from '../../store/StoreManager';
import { getSimpleSearchConditionMaster } from '../../store/searchManager';
import { selectRequired } from '../../utils/dom/select';
import type { Significance } from '../../types/api';
import type { MasterConditionItem } from '../../types';

// ----------------------------------------
// 型定義
// ----------------------------------------

/** 解釈ラベルと、その解釈を報告しているソース一覧 */
type InterpretationWithSources = {
  interpretation: string;
  sources: string[];
};

/** mergeByMedgen が返す MedGen エントリ1件 */
type MergedResult = {
  medgen: string;
  name: string;
  interpretations: InterpretationWithSources[];
};

/** mergeByMedgen 内部でのみ使う集約中間構造 */
type MergedIntermediate = {
  name: string;
  /** 解釈ラベル → 報告ソースの Set（重複排除のため Set を使う） */
  interpretations: Record<string, Set<string>>;
};

// ----------------------------------------
// モジュールスコープ関数
// ----------------------------------------

/**
 * MedGen IDをキーにエントリを統合し、解釈ごとにソースのSetを持つ構造に変換する。
 * 同じ疾患・解釈を複数ソース（ClinVar・MGeND）から重複なく集約するためモジュールスコープに置く
 */
function mergeByMedgen(data: Significance[]): MergedResult[] {
  const merged: Record<string, MergedIntermediate> = {};

  data.forEach((entry) => {
    // MGeND は conditions が空の場合に "others" を補完する仕様
    if (entry.source === 'mgend' && entry.conditions.length === 0) {
      entry.conditions.push({ name: 'others', medgen: '' });
    }

    entry.conditions.forEach((condition) => {
      const { medgen, name: medgenName } = condition;

      if (!merged[medgen]) {
        merged[medgen] = { name: medgenName, interpretations: {} };
      }

      entry.interpretations.forEach((interpretation) => {
        if (!merged[medgen].interpretations[interpretation]) {
          merged[medgen].interpretations[interpretation] = new Set([
            entry.source,
          ]);
        } else {
          merged[medgen].interpretations[interpretation].add(entry.source);
        }
      });
    });
  });

  const results: MergedResult[] = Object.keys(merged).map((medgen) => ({
    medgen,
    name: merged[medgen].name,
    interpretations: Object.keys(merged[medgen].interpretations).map(
      (interpretation) => ({
        interpretation,
        sources: Array.from(merged[medgen].interpretations[interpretation]),
      })
    ),
  }));

  return groupAndSortByInterpretation(results);
}

/**
 * interpretationキーでグループ化し、グループ内をname順にソートする。
 * 同じ解釈分類のエントリをまとめて表示するために使う
 */
function groupAndSortByInterpretation(data: MergedResult[]): MergedResult[] {
  const grouped: Record<string, MergedResult[]> = {};

  data.forEach((entry) => {
    // 解釈ラベル配列を文字列キーに変換して分類する（JSの暗黙変換と同等の動作）
    const key = entry.interpretations
      .map((i) => i.interpretation)
      .join(',');

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(entry);
  });

  Object.keys(grouped).forEach((key) => {
    grouped[key].sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    });
  });

  return Object.values(grouped).flat();
}

// ----------------------------------------
// クラス定義
// ----------------------------------------

/**
 * 臨床的意義（ClinicalSignificance）プレビューパネル。
 * selectedRow / offset の変化で選択バリアントの significance を再描画する
 */
export default class PanelViewPreviewClinicalSignificance extends PanelView {
  private content: Element;

  constructor(elm: Element) {
    super(elm, 'clinicalSignificance');
    storeManager.bind('selectedRow', this);
    storeManager.bind('offset', this);
    // テンプレート崩れを早期検出するため、存在必須要素は selectRequired で取得する
    this.content = selectRequired(this.elm, '.content', 'PanelViewPreviewClinicalSignificance');
  }

  /** storeManager.bind により selectedRow 変化時に呼ばれる */
  selectedRow(): void {
    this.update();
  }

  /** storeManager.bind により offset 変化時に呼ばれる（ページ送りで行選択が変わるため） */
  offset(): void {
    this.update();
  }

  /** 選択行の significance データを取得し、HTML を再構築してパネルに反映する */
  update(): void {
    let html = '';
    if (storeManager.getData('selectedRow') !== undefined) {
      const record = storeManager.getSelectedRecord();
      if (record && record.significance) {
        const master = getSimpleSearchConditionMaster('significance');

        const deepClone = structuredClone(record.significance);
        const significanceDataset = mergeByMedgen(deepClone);
        html = significanceDataset
          .map((data) => {
            return `
        <dl class="above-headline clinical-significance">
          <dt>
          ${
            data.medgen === 'undefined' || data.medgen === ''
              ? data.name
              : `<a href="/disease/${data.medgen}" target="_blank" rel="noopener noreferrer" class="hyper-text -internal">
              ${data.name}</a>`
          }
          </dt>
          ${
            data.interpretations
              ? data.interpretations
                  .map(
                    (interpretation) => `
            <dd>
              <div class="clinical-significance" data-value="${
                interpretation.interpretation
              }">
                ${
                  master?.items?.find(
                    (item: MasterConditionItem) =>
                      item.id === interpretation.interpretation
                  )?.label ?? interpretation.interpretation
                }
              </div>
              <div class="disease-category">
                ${
                  interpretation.sources.includes('mgend')
                    ? '<span class="mgend">MGeND</span>'
                    : ''
                }
                ${
                  interpretation.sources.includes('clinvar')
                    ? '<span class="clinvar">ClinVar</span>'
                    : ''
                }
              </div>
            </dd> `
                  )
                  .join('')
              : ''
          }
          </dl>`;
          })
          .join('');
      }
    }
    // html が空のケース（行未選択・レコードnull・significanceなし）を一括で扱い、
    // 個別の remove/add より漏れにくい構造にする
    this.elm.classList.toggle('-notfound', html === '');
    this.content.innerHTML = html;
  }
}
