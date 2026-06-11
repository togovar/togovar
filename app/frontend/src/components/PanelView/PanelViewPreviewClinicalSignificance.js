import PanelView from './PanelView.ts';
import { storeManager } from '../../store/StoreManager';
import { getSimpleSearchConditionMaster } from '../../store/searchManager';

/**
 * MedGen IDをキーにエントリを統合し、解釈ごとにソースのSetを持つ構造に変換する。
 * 同じ疾患・解釈を複数ソース（ClinVar・MGeND）から重複なく集約するためモジュールスコープに置く
 */
function mergeByMedgen(data) {
  const merged = {};

  data.forEach((entry) => {
    if (entry.source === 'mgend') {
      if (entry.conditions.length === 0) {
        entry.conditions.push({ name: 'others', medgen: '' });
      }
    }

    entry.conditions.forEach((condition) => {
      const medgen = condition.medgen;
      const medgenName = condition.name;

      if (!merged[medgen]) {
        merged[medgen] = {
          name: medgenName,
          interpretations: {},
        };
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

  const results = Object.keys(merged).map((medgen) => ({
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
function groupAndSortByInterpretation(data) {
  const grouped = {};

  data.forEach((entry) => {
    let interpretationKeys = [];
    entry.interpretations.forEach((interpretationObj) => {
      interpretationKeys.push(interpretationObj.interpretation);
    });

    if (!grouped[interpretationKeys]) {
      grouped[interpretationKeys] = [];
    }
    grouped[interpretationKeys].push(entry);
    interpretationKeys = [];
  });

  Object.keys(grouped).forEach((key) => {
    grouped[key] = grouped[key].sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    });
  });

  return Object.values(grouped).flat();
}

export default class PanelViewPreviewClinicalSignificance extends PanelView {
  constructor(elm) {
    super(elm, 'clinicalSignificance');
    storeManager.bind('selectedRow', this);
    storeManager.bind('offset', this);
    this.content = this.elm.querySelector('.content');
  }

  selectedRow() {
    this.update();
  }

  offset() {
    this.update();
  }

  update() {
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
              : `<a href="/disease/${data.medgen}" target="_blank" class="hyper-text -internal">
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
                  master.items.find(
                    (item) => item.id === interpretation.interpretation
                  ).label
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
        this.elm.classList.remove('-notfound');
      }
    } else {
      this.elm.classList.add('-notfound');
    }
    this.content.innerHTML = html;
  }
}
