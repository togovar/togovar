import { getSimpleSearchConditionMaster } from '../../store/searchManager';
import type {
  DatasetMasterItem,
  TypeMasterItem,
  ConsequenceMasterItem,
  GeneSymbol,
  Frequency,
  TdFrequencies,
  Transcript,
  Significance,
} from '../../types';
import { REF_ALT_SHOW_LENGTH } from './ResultsColumnTemplates';

/**
 * 検索結果テーブルの各列に、バリアント情報を反映するためのユーティリティクラス。
 *
 * 各メソッドは列ごとのDOM要素を受け取り、表示テキスト、リンク先、
 * 補助情報用のdata属性などを更新する。
 */
export class ResultsColumnUpdater {
  /**
   * リンクとして表示する内容がない場合に、a要素を空の状態へ戻す。
   */
  static resetAnchor(element: HTMLAnchorElement) {
    element.removeAttribute('href');
    element.removeAttribute('aria-label');
    element.textContent = '';
    element.hidden = true;
  }

  /**
   * a要素にリンク先、表示文字列、スクリーンリーダー向けラベルを設定する。
   */
  static updateAnchor(
    element: HTMLAnchorElement,
    url: string,
    text: string,
    label: string
  ) {
    element.setAttribute('href', url);
    element.textContent = text;
    element.setAttribute('aria-label', label);
    element.hidden = false;
  }

  /**
   * TogoVar ID列を更新する。
   *
   * @param element - 更新対象のa要素
   * @param value - 表示するTogoVar ID
   * @param url - バリアント詳細ページのURL
   */
  static updateTogovarId(
    element: HTMLAnchorElement | null,
    value: string,
    url: string
  ) {
    if (!element || !value) {
      if (element) {
        this.resetAnchor(element);
      }
      return;
    }

    this.updateAnchor(element, url, value, `View variant ${value} details`);
  }

  /**
   * RefSNP ID列を更新する。
   *
   * @param tdRS - RefSNP列のtd要素
   * @param tdRSAnchor - RefSNP IDを表示するa要素
   * @param values - RefSNP IDの配列
   */
  static updateRefSNP(
    tdRS: HTMLTableCellElement | null,
    tdRSAnchor: HTMLAnchorElement | null,
    values: string[]
  ) {
    if (!tdRS || !tdRSAnchor) return;

    if (!values || values.length === 0) {
      tdRS.dataset.remains = '0';
      this.resetAnchor(tdRSAnchor);
      return;
    }

    // 画面には先頭のrsIDだけを表示し、残りの件数はdata-remainsに保持する。
    tdRS.dataset.remains = (values.length - 1).toString();
    this.updateAnchor(
      tdRSAnchor,
      `https://identifiers.org/dbsnp/${values[0]}`,
      values[0],
      `Open dbSNP record ${values[0]}`
    );
  }

  /**
   * Position列を更新する。
   *
   * @param tdPositionChromosome - 染色体名を表示するdiv要素
   * @param tdPositionCoordinate - 座標を表示するdiv要素
   * @param chromosome - 染色体名
   * @param position - ゲノム上の座標
   */
  static updatePosition(
    tdPositionChromosome: HTMLDivElement | null,
    tdPositionCoordinate: HTMLDivElement | null,
    chromosome: string,
    position: number
  ) {
    if (tdPositionChromosome) {
      tdPositionChromosome.textContent = chromosome;
    }
    if (tdPositionCoordinate) {
      tdPositionCoordinate.textContent = position.toString();
    }
  }

  /**
   * Ref/Alt列を更新する。
   *
   * @param tdRefAltRef - Reference alleleを表示するspan要素
   * @param tdRefAltAlt - Alternate alleleを表示するspan要素
   * @param reference - Reference allele
   * @param alternate - Alternate allele
   */
  static updateRefAlt(
    tdRefAltRef: HTMLSpanElement | null,
    tdRefAltAlt: HTMLSpanElement | null,
    reference: string,
    alternate: string
  ) {
    const refData = this.formatRefAltData(reference || '');
    const altData = this.formatRefAltData(alternate || '');

    if (tdRefAltRef) {
      tdRefAltRef.textContent = refData.display;
      tdRefAltRef.dataset.sum = refData.length.toString();
    }

    if (tdRefAltAlt) {
      tdRefAltAlt.textContent = altData.display;
      tdRefAltAlt.dataset.sum = altData.length.toString();
    }
  }

  /**
   * Ref/Alt表示用の文字列と、元の長さを生成する。
   *
   * @param sequence - 整形対象の塩基配列
   * @returns 表示文字列と元の文字数
   */
  static formatRefAltData(sequence: string) {
    return {
      display: this.formatRefAlt(sequence),
      length: sequence.length,
    };
  }

  /**
   * Ref/Altの塩基配列を表示用に整形する。
   * 長すぎる場合は、指定文字数で省略して末尾に...を付ける。
   *
   * @param sequence - 整形対象の塩基配列
   * @returns 整形後の表示文字列
   */
  static formatRefAlt(sequence: string) {
    return (
      sequence.substring(0, REF_ALT_SHOW_LENGTH) +
      (sequence.length > REF_ALT_SHOW_LENGTH ? '...' : '')
    );
  }

  /**
   * Variant Type列を更新する。
   *
   * @param element - 更新対象のdiv要素
   * @param value - バリアントタイプID
   */
  static updateVariantType(element: HTMLDivElement | null, value: string) {
    if (!element) return;

    const master: TypeMasterItem[] =
      getSimpleSearchConditionMaster('type').items;
    element.textContent = master.find((item) => item.id === value)?.label || '';
  }

  /**
   * Gene列を更新する。
   *
   * @param tdGene - Gene列のtd要素
   * @param tdGeneAnchor - Gene名を表示するa要素
   * @param symbols - 遺伝子シンボルの配列
   */
  static updateGene(
    tdGene: HTMLTableCellElement | null,
    tdGeneAnchor: HTMLAnchorElement | null,
    symbols: GeneSymbol[]
  ) {
    if (!tdGene || !tdGeneAnchor) return;

    if (!symbols || symbols.length === 0) {
      tdGene.dataset.remains = '0';
      this.resetAnchor(tdGeneAnchor);
      return;
    }

    // 画面には先頭の遺伝子だけを表示し、残りの件数はdata-remainsに保持する。
    tdGene.dataset.remains = (symbols.length - 1).toString();
    this.updateAnchor(
      tdGeneAnchor,
      `/gene/${symbols[0].id}`,
      symbols[0].name,
      `View gene ${symbols[0].name} details`
    );
  }

  /**
   * Alt frequency列を更新する。
   *
   * @param tdFrequencies - データセットIDごとの頻度表示要素
   * @param frequencies - 頻度データの配列
   */
  static updateAltFrequency(
    tdFrequencies: TdFrequencies,
    frequencies: Frequency[]
  ) {
    const master: DatasetMasterItem[] =
      getSimpleSearchConditionMaster('dataset').items;

    master
      .filter((dataset) => dataset.has_freq)
      .forEach((dataset) => {
        const frequency = frequencies?.find(
          (freq) => freq.source === dataset.id
        );
        const element = tdFrequencies[dataset.id];
        if (element) {
          element.frequency = frequency;
        }
      });
  }

  /**
   * Consequence列を更新する。
   *
   * @param tdConsequence - Consequence列のtd要素
   * @param tdConsequenceItem - Consequence名を表示するdiv要素
   * @param mostConsequence - 最も重要なConsequence ID
   * @param transcripts - Transcript情報の配列
   */
  static updateConsequence(
    tdConsequence: HTMLTableCellElement | null,
    tdConsequenceItem: HTMLDivElement | null,
    mostConsequence: string,
    transcripts: Transcript[]
  ) {
    if (!tdConsequence || !tdConsequenceItem) return;

    if (!mostConsequence) {
      tdConsequence.dataset.remains = '0';
      tdConsequenceItem.textContent = '';
      return;
    }

    const master: ConsequenceMasterItem[] =
      getSimpleSearchConditionMaster('consequence').items;
    const uniqueConsequences = Array.from(
      new Set(transcripts.flatMap((transcript) => transcript.consequence))
    );

    tdConsequence.dataset.remains = (uniqueConsequences.length - 1).toString();
    tdConsequenceItem.textContent =
      master.find((consequence) => consequence.id === mostConsequence)?.label ||
      '';
  }

  /**
   * Clinical significance列を更新する。
   *
   * @param tdClinicalSign - Clinical significanceを表示するdiv要素
   * @param tdClinicalAnchor - 疾患名をリンク表示するa要素
   * @param tdClinicalIcon - 追加情報の有無を示すspan要素
   * @param significances - Clinical significance情報の配列
   */
  static updateClinicalSignificance(
    tdClinicalSign: HTMLDivElement | null,
    tdClinicalAnchor: HTMLAnchorElement | null,
    tdClinicalIcon: HTMLSpanElement | null,
    significances: Significance[]
  ) {
    if (!tdClinicalSign || !tdClinicalAnchor || !tdClinicalIcon) return;

    if (!significances || significances.length === 0) {
      this.resetClinicalSignificance(
        tdClinicalSign,
        tdClinicalAnchor,
        tdClinicalIcon
      );
      return;
    }

    const firstSignificance = significances[0];
    const firstCondition = firstSignificance.conditions?.[0];

    // interpretationの値は、色分けなどの表示制御に使う。
    tdClinicalSign.dataset.value = firstSignificance.interpretations[0];

    this.updateClinicalCondition(
      tdClinicalSign,
      tdClinicalAnchor,
      firstCondition
    );
    this.updateClinicalMetadata(tdClinicalIcon, significances);
  }

  /**
   * Clinical significance列を空の状態へ戻す。
   *
   * @param tdClinicalSign - Clinical significanceを表示するdiv要素
   * @param tdClinicalAnchor - 疾患名をリンク表示するa要素
   * @param tdClinicalIcon - 追加情報の有無を示すspan要素
   */
  static resetClinicalSignificance(
    tdClinicalSign: HTMLDivElement,
    tdClinicalAnchor: HTMLAnchorElement,
    tdClinicalIcon: HTMLSpanElement
  ) {
    tdClinicalSign.dataset.value = '';
    this.resetAnchor(tdClinicalAnchor);
    tdClinicalIcon.dataset.remains = '0';
    tdClinicalIcon.dataset.mgend = 'false';
  }

  /**
   * Clinical significanceに紐づく疾患情報を更新する。
   *
   * @param tdClinicalSign - Clinical significanceを表示するdiv要素
   * @param tdClinicalAnchor - 疾患名をリンク表示するa要素
   * @param firstCondition - 先頭の疾患情報
   */
  static updateClinicalCondition(
    tdClinicalSign: HTMLDivElement,
    tdClinicalAnchor: HTMLAnchorElement,
    firstCondition: { name: string; medgen?: string } | undefined
  ) {
    if (firstCondition) {
      tdClinicalSign.textContent = '';

      if (firstCondition.medgen) {
        this.updateAnchor(
          tdClinicalAnchor,
          `/disease/${firstCondition.medgen}`,
          firstCondition.name || '',
          `View disease ${firstCondition.name} details`
        );
      } else {
        // MedGen IDがない場合はリンクにせず、通常テキストとして表示する。
        tdClinicalSign.textContent = firstCondition.name;
        this.resetAnchor(tdClinicalAnchor);
      }
    } else {
      // 疾患情報がない場合はothersとして表示する。
      tdClinicalSign.textContent = 'others';
      this.resetAnchor(tdClinicalAnchor);
    }
  }

  /**
   * Clinical significance列の補助情報を更新する。
   *
   * @param tdClinicalIcon - 追加情報の有無を示すspan要素
   * @param significances - Clinical significance情報の配列
   */
  static updateClinicalMetadata(
    tdClinicalIcon: HTMLSpanElement,
    significances: Significance[]
  ) {
    // 画面に表示している先頭1件以外の件数を保持する。
    tdClinicalIcon.dataset.remains = (significances.length - 1).toString();

    // MGeND由来の情報が含まれるかを保持する。
    const hasMedgen = significances.some(
      (significance) => significance.source === 'mgend'
    );
    tdClinicalIcon.dataset.mgend = hasMedgen.toString();
  }

  /**
   * 機能予測スコア列の共通更新処理。
   *
   * @param element - 更新対象のdiv要素
   * @param score - 機能予測スコア
   * @param classifyScore - スコアから表示用クラスを判定する関数
   */
  static updateFunctionPrediction(
    element: HTMLDivElement | null,
    score: number | null,
    classifyScore: (_score: number) => string
  ) {
    if (!element) return;

    if (score === null) {
      element.textContent = '';
      element.dataset.function = '';
      return;
    }

    element.textContent = score.toString();
    element.dataset.function = classifyScore(score);
  }

  /**
   * AlphaMissenseスコアを更新する。
   *
   * @param element - 更新対象のdiv要素
   * @param score - AlphaMissenseスコア
   */
  static updateAlphaMissense(element: HTMLDivElement | null, score: number) {
    this.updateFunctionPrediction(element, score, (_score) => {
      if (_score < 0.34) return 'LB';
      if (_score > 0.564) return 'LP';
      return 'A';
    });
  }

  /**
   * SIFTスコアを更新する。
   *
   * @param element - 更新対象のdiv要素
   * @param score - SIFTスコア
   */
  static updateSift(element: HTMLDivElement | null, score: number) {
    this.updateFunctionPrediction(element, score, (_score) =>
      _score >= 0.05 ? 'T' : 'D'
    );
  }

  /**
   * PolyPhenスコアを更新する。
   *
   * @param element - 更新対象のdiv要素
   * @param score - PolyPhenスコア
   */
  static updatePolyphen(element: HTMLDivElement | null, score: number) {
    this.updateFunctionPrediction(element, score, (_score) => {
      if (_score > 0.908) return 'PROBD';
      if (_score > 0.446) return 'POSSD';
      if (_score >= 0) return 'B';
      return 'U';
    });
  }
}
