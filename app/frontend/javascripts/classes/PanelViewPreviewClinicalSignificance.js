import PanelView from "./PanelView.js";
import StoreManager from "./StoreManager.js";

export default class PanelViewPreviewClinicalSignificance extends PanelView {

  constructor(elm) {
    super(elm, 'clinicalSignificance');
    StoreManager.bind('selectedRow', this);
    StoreManager.bind('offset', this);
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
    if (StoreManager.getData('selectedRow') !== undefined) {
      const record = StoreManager.getSelectedRecord();
      if (record && record.significance) {
        const master = StoreManager.getSimpleSearchConditionMaster('significance');

        const deepClone = structuredClone(record.significance);

        function mergeByMedgen(data) {
          const merged = {};

          data.forEach((entry) => {
            if (entry.source === 'mgend') {
              if (entry.conditions.length === 0) {
                entry.conditions.push({ name: 'No MedGen provided', medgen: '' });
              }
            }

            entry.conditions.forEach((condition) => {
              const medgen = condition.medgen;
              const medgenName = condition.name;

              // MedGen IDがまだ存在しなければ初期化
              if (!merged[medgen]) {
                merged[medgen] = {
                  name: medgenName,
                  interpretations: {}, // interpretationsごとにsourceを管理
                };
              }

              entry.interpretations.forEach((interpretation) => {
                // 解釈がまだ存在しなければSetで初期化（ソースの一意な集合を保存）
                if (!merged[medgen].interpretations[interpretation]) {
                  merged[medgen].interpretations[interpretation] = new Set([
                    entry.source,
                  ]);
                } else {
                  // すでに存在する解釈にはソースを追加
                  merged[medgen].interpretations[interpretation].add(entry.source);
                }
              });
            });
          });

          // 最終的にSetを配列に変換して、オブジェクトから配列形式に変換
          return Object.keys(merged).map((medgen) => ({
            medgen,
            name: merged[medgen].name,
            interpretations: Object.keys(merged[medgen].interpretations).map(
              (interpretation) => ({
                interpretation,
                sources: Array.from(merged[medgen].interpretations[interpretation]),
              })
            ),
          }));
        }

        // 関数の実行
        const significanceDataset = mergeByMedgen(deepClone);

        //この大元をrecord.significanceとなるのがいけないとも思う
        html = significanceDataset.map(data => {
          return `
        <dl class="above-headline clinical-significance">
          <dt>
          ${data.medgen === '' ? data.name :
              `<a href="/disease/${data.medgen}" target="_blank" class="hyper-text -internal">
              ${data.name}</a>`}
          </dt>
          ${data.interpretations ?
              data.interpretations.map(interpretation => `
            <dd>
              <div class="clinical-significance" data-value="${interpretation.interpretation}">
                ${master.items.find(item => item.id === interpretation.interpretation).label}
              </div>
              <div class="disease-category">
                ${interpretation.sources.includes("mgend") ? '<span class="mgend">MGeND</span>' : ''}
                ${interpretation.sources.includes("clinvar") ? '<span class="clinvar">ClinVar</span>' : ''}
              </div>
            </dd> `).join('') :
              ''
            }
          </dl>`}).join('');
        this.elm.classList.remove('-notfound');
      }
    } else {
      this.elm.classList.add('-notfound');
    }
    this.content.innerHTML = html;
  }

}
