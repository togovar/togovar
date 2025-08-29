import { getSimpleSearchConditionMaster } from '../../store/searchManager';
import {
  DatasetMasterItem,
  TypeMasterItem,
  ConsequenceMasterItem,
  GeneSymbol,
  Frequency,
  TdFrequencies,
  Transcript,
  Significance,
} from '../../types';
import { REF_ALT_SHOW_LENGTH } from './ResultsRowTemplates';

/**
 * 結果行の各カラムデータ更新を担当するユーティリティクラス
 *
 * 各メソッドは静的メソッドとして実装され、特定のカラムタイプのDOM要素を
 * 対応するデータで更新する責任を持つ
 */
export class ResultsRowUpdaters {
  /**
   * TogoVar IDカラムを更新
   *
   * @param element - 更新対象のアンカー要素
   * @param value - TogoVar ID値
   * @param url - リンク先URL
   */
  static updateTogovarId(
    element: HTMLAnchorElement | null,
    value: string,
    url: string
  ) {
    if (!element || !value) {
      if (element) {
        element.href = '';
        element.textContent = '';
      }
      return;
    }

    element.href = url;
    element.textContent = value;
  }

  /**
   * RefSNP IDカラムを更新
   *
   * @param tdRS - RefSNPのテーブルセル要素
   * @param tdRSAnchor - RefSNPのアンカー要素
   * @param values - RefSNP ID配列
   */
  static updateRefSNP(
    tdRS: HTMLTableCellElement | null,
    tdRSAnchor: HTMLAnchorElement | null,
    values: string[]
  ) {
    if (!tdRS || !tdRSAnchor) return;

    if (!values || values.length === 0) {
      tdRS.dataset.remains = '0';
      tdRSAnchor.href = '';
      tdRSAnchor.textContent = '';
      return;
    }

    tdRS.dataset.remains = (values.length - 1).toString();
    tdRSAnchor.href = `http://identifiers.org/dbsnp/${values[0]}`;
    tdRSAnchor.textContent = values[0];
  }

  /**
   * Positionカラムを更新
   *
   * @param tdPositionChromosome - 染色体表示用のDiv要素
   * @param tdPositionCoordinate - 座標表示用のDiv要素
   * @param chromosome - 染色体名
   * @param position - 座標位置
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
   * Ref/Altカラムを更新
   *
   * @param tdRefAltRef - Reference表示用のSpan要素
   * @param tdRefAltAlt - Alternate表示用のSpan要素
   * @param reference - Referenceアレル配列
   * @param alternate - Alternateアレル配列
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
   * Ref/Altデータのフォーマット情報を生成
   *
   * @param sequence - フォーマット対象の配列文字列
   * @returns 表示用文字列と元の長さを含むオブジェクト
   */
  static formatRefAltData(sequence: string) {
    return {
      display: this.formatRefAlt(sequence),
      length: sequence.length,
    };
  }

  /**
   * Ref/Alt配列を表示用にフォーマット
   * 指定された長さを超える場合は省略記号を追加
   *
   * @param sequence - フォーマット対象の配列文字列
   * @returns フォーマット済み文字列
   */
  static formatRefAlt(sequence: string) {
    return (
      sequence.substring(0, REF_ALT_SHOW_LENGTH) +
      (sequence.length > REF_ALT_SHOW_LENGTH ? '...' : '')
    );
  }

  /**
   * Variant Typeカラムを更新
   *
   * @param element - 更新対象のDiv要素
   * @param value - バリアントタイプID
   */
  static updateVariantType(element: HTMLDivElement | null, value: string) {
    if (!element) return;

    const master: TypeMasterItem[] =
      getSimpleSearchConditionMaster('type').items;
    element.textContent = master.find((item) => item.id === value)?.label || '';
  }

  /**
   * Geneカラムを更新
   *
   * @param tdGene - 遺伝子のテーブルセル要素
   * @param tdGeneAnchor - 遺伝子のアンカー要素
   * @param symbols - 遺伝子シンボル配列
   */
  static updateGene(
    tdGene: HTMLTableCellElement | null,
    tdGeneAnchor: HTMLAnchorElement | null,
    symbols: GeneSymbol[]
  ) {
    if (!tdGene || !tdGeneAnchor) return;

    if (!symbols || symbols.length === 0) {
      tdGene.dataset.remains = '0';
      tdGeneAnchor.href = '';
      tdGeneAnchor.textContent = '';
      return;
    }

    tdGene.dataset.remains = (symbols.length - 1).toString();
    tdGeneAnchor.href = `/gene/${symbols[0].id}`;
    tdGeneAnchor.textContent = symbols[0].name;
  }

  /**
   * Alt frequencyカラムを更新
   *
   * @param tdFrequencies - 頻度表示要素のマップ
   * @param frequencies - 頻度データ配列
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
   * Consequenceカラムを更新
   *
   * @param tdConsequence - 結果のテーブルセル要素
   * @param tdConsequenceItem - 結果表示用のDiv要素
   * @param mostConsequence - 最も重要な結果
   * @param transcripts - 転写産物データ配列
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
   * Clinical significanceカラムを更新
   *
   * @param tdClinicalSign - Clinical significance表示用のDiv要素
   * @param tdClinicalAnchor - Clinical significanceのアンカー要素
   * @param tdClinicalIcon - Clinical significanceアイコン用のSpan要素
   * @param significances - Clinical significanceデータ配列
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

    // Set interpretations value
    tdClinicalSign.dataset.value = firstSignificance.interpretations[0];

    this.updateClinicalCondition(
      tdClinicalSign,
      tdClinicalAnchor,
      firstCondition
    );
    this.updateClinicalMetadata(tdClinicalIcon, significances);
  }

  /**
   * Clinical significanceのリセット処理
   *
   * @param tdClinicalSign - Clinical significance表示用のDiv要素
   * @param tdClinicalAnchor - Clinical significanceのアンカー要素
   * @param tdClinicalIcon - Clinical significanceアイコン用のSpan要素
   */
  static resetClinicalSignificance(
    tdClinicalSign: HTMLDivElement,
    tdClinicalAnchor: HTMLAnchorElement,
    tdClinicalIcon: HTMLSpanElement
  ) {
    tdClinicalSign.dataset.value = '';
    tdClinicalAnchor.textContent = '';
    tdClinicalAnchor.setAttribute('href', '');
    tdClinicalIcon.dataset.remains = '0';
    tdClinicalIcon.dataset.mgend = 'false';
  }

  /**
   * Clinical significanceの状態情報を更新
   *
   * @param tdClinicalSign - Clinical significance表示用のDiv要素
   * @param tdClinicalAnchor - Clinical significanceのアンカー要素
   * @param firstCondition - 最初の状態データ
   */
  static updateClinicalCondition(
    tdClinicalSign: HTMLDivElement,
    tdClinicalAnchor: HTMLAnchorElement,
    firstCondition: any
  ) {
    if (firstCondition) {
      tdClinicalSign.textContent = '';
      tdClinicalAnchor.textContent = firstCondition.name || '';

      if (firstCondition.medgen) {
        tdClinicalAnchor.setAttribute(
          'href',
          `/disease/${firstCondition.medgen}`
        );
      } else {
        // Display in div instead of anchor when no medgen
        tdClinicalSign.textContent = firstCondition.name;
        tdClinicalAnchor.textContent = '';
        tdClinicalAnchor.className = '';
      }
    } else {
      // No conditions exist
      tdClinicalSign.textContent = 'others';
      tdClinicalAnchor.textContent = '';
    }
  }

  /**
   * Clinical significanceのメタデータを更新
   *
   * @param tdClinicalIcon - Clinical significanceアイコン用のSpan要素
   * @param significances - Clinical significanceデータ配列
   */
  static updateClinicalMetadata(
    tdClinicalIcon: HTMLSpanElement,
    significances: Significance[]
  ) {
    // Set remaining significance count
    tdClinicalIcon.dataset.remains = (significances.length - 1).toString();

    // Check if mgend source exists in significances
    const hasMedgen = significances.some(
      (significance) => significance.source === 'mgend'
    );
    tdClinicalIcon.dataset.mgend = hasMedgen.toString();
  }

  /**
   * 機能予測の共通更新ロジック
   *
   * @param element - 更新対象のDiv要素
   * @param value - 機能予測値
   * @param getFunctionClass - 値から機能クラスを決定する関数
   */
  static updateFunctionPrediction(
    element: HTMLDivElement | null,
    value: number | null,
    getFunctionClass: (value: number) => string
  ) {
    if (!element) return;

    if (value === null) {
      element.textContent = '';
      element.dataset.function = '';
      return;
    }

    element.textContent = value.toString();
    element.dataset.function = getFunctionClass(value);
  }

  /**
   * AlphaMissenseスコアを更新
   *
   * @param element - 更新対象のDiv要素
   * @param value - AlphaMissenseスコア
   */
  static updateAlphaMissense(element: HTMLDivElement | null, value: number) {
    this.updateFunctionPrediction(element, value, (val) => {
      if (val < 0.34) return 'LB';
      if (val > 0.564) return 'LP';
      return 'A';
    });
  }

  /**
   * SIFTスコアを更新
   *
   * @param element - 更新対象のDiv要素
   * @param value - SIFTスコア
   */
  static updateSift(element: HTMLDivElement | null, value: number) {
    this.updateFunctionPrediction(element, value, (val) =>
      val >= 0.05 ? 'T' : 'D'
    );
  }

  /**
   * PolyPhenスコアを更新
   *
   * @param element - 更新対象のDiv要素
   * @param value - PolyPhenスコア
   */
  static updatePolyphen(element: HTMLDivElement | null, value: number) {
    this.updateFunctionPrediction(element, value, (val) => {
      if (val > 0.908) return 'PROBD';
      if (val > 0.446) return 'POSSD';
      if (val >= 0) return 'B';
      return 'U';
    });
  }
}
