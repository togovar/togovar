import { getSimpleSearchConditionMaster } from '../../store/searchManager';
import type {
  DatasetMasterItem,
  TypeMasterItem,
  ConsequenceMasterItem,
  GeneSymbol,
  GeneSummary,
  Frequency,
  TdFrequencies,
  Transcript,
  Significance,
  SscvDbItem,
  ExternalLinkItem,
} from '../../types';
import { REF_ALT_SHOW_LENGTH } from './ResultsColumnTemplates';

type NormalizedGeneSummary = {
  total: number;
  items: GeneSymbol[];
};

/**
 * 検索結果テーブルの各列に、バリアント情報を反映するためのユーティリティクラス。
 *
 * 各メソッドは列ごとのDOM要素を受け取り、表示テキスト、リンク先、
 * 補助情報用のdata属性などを更新する。
 */
export class ResultsColumnUpdater {
  /**
   * セル内に残っているリンクを削除する。
   * hrefのない空リンクはLighthouseで「クロールできないリンク」と判定されるため、
   * 値がない場合はa要素自体をDOMに置かない。
   */
  static resetAnchor(cell: HTMLElement) {
    cell.querySelector('a.hyper-text')?.remove();
  }

  /**
   * リンクにしない補助テキストを再描画時に残さないため、専用classの要素だけを削除する。
   */
  static resetInlineText(cell: HTMLElement, className: string) {
    cell.querySelector(`.${className}`)?.remove();
  }

  /**
   * hrefなしのa要素を避けつつ、remainsバッジの直前へ通常テキストを差し込む。
   */
  static updateInlineText(
    cell: HTMLElement,
    className: string,
    text: string,
    insertBefore?: Element | null
  ) {
    this.resetInlineText(cell, className);

    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;

    if (insertBefore) {
      cell.insertBefore(span, insertBefore);
    } else {
      cell.appendChild(span);
    }
  }

  /**
   * セル内のa要素を取得し、存在しない場合は作成する。
   */
  static ensureAnchor(
    cell: HTMLElement,
    className: string,
    insertBefore?: Element | null
  ) {
    const currentAnchor = cell.querySelector<HTMLAnchorElement>('a.hyper-text');

    if (currentAnchor) return currentAnchor;

    const anchor = document.createElement('a');

    anchor.className = className;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';

    if (insertBefore) {
      cell.insertBefore(anchor, insertBefore);
    } else {
      cell.appendChild(anchor);
    }

    return anchor;
  }

  /**
   * セル内のa要素にリンク先、表示文字列、スクリーンリーダー向けラベルを設定する。
   */
  static updateAnchor(
    cell: HTMLElement,
    className: string,
    url: string,
    text: string,
    label: string,
    insertBefore?: Element | null
  ) {
    const anchor = this.ensureAnchor(cell, className, insertBefore);

    anchor.setAttribute('href', url);
    anchor.textContent = text;
    anchor.setAttribute('aria-label', label);
  }

  /**
   * TogoVar ID列を更新する。
   *
   * @param cell - TogoVar ID列のtd要素
   * @param value - 表示するTogoVar ID
   * @param url - バリアント詳細ページのURL
   */
  static updateTogovarId(
    cell: HTMLTableCellElement | null,
    value: string,
    url: string
  ) {
    if (!cell || !value) {
      if (cell) {
        this.resetAnchor(cell);
      }
      return;
    }

    this.updateAnchor(
      cell,
      'hyper-text -internal',
      url,
      value,
      `View variant ${value} details`
    );
  }

  /**
   * RefSNP ID列を更新する。
   *
   * @param tdRS - RefSNP列のtd要素
   * @param values - RefSNP IDの配列
   */
  static updateRefSNP(
    tdRS: HTMLDivElement | null,
    tdRSRemains: HTMLSpanElement | null,
    values: string[]
  ) {
    if (!tdRS || !tdRSRemains) return;

    if (!values || values.length === 0) {
      this.updateRemainsBadge(tdRSRemains, 0);
      this.resetAnchor(tdRS);
      return;
    }

    // 画面には先頭のrsIDだけを表示し、残りの件数はdata-remainsに保持する。
    this.updateRemainsBadge(tdRSRemains, values.length - 1);
    this.updateAnchor(
      tdRS,
      'hyper-text -external',
      `https://identifiers.org/dbsnp/${values[0]}`,
      values[0],
      `Open dbSNP record ${values[0]}`,
      tdRSRemains
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
   * マスター未ロード時も結果行の描画を止めないため、取得できたラベルだけを表示する。
   *
   * @param element - 更新対象のdiv要素
   * @param value - バリアントタイプID
   */
  static updateVariantType(element: HTMLDivElement | null, value: string) {
    if (!element) return;

    const master = getSimpleSearchConditionMaster('type')?.items as
      | TypeMasterItem[]
      | undefined;
    element.textContent =
      master?.find((item) => item.id === value)?.label || '';
  }

  /**
   * Gene列を更新する。
   *
   * @param tdGene - Gene列のtd要素
   * @param genes - 遺伝子の総数と表示用items
   */
  static updateGene(
    tdGene: HTMLDivElement | null,
    tdGeneRemains: HTMLSpanElement | null,
    genes: GeneSummary | GeneSymbol[] | undefined
  ) {
    if (!tdGene || !tdGeneRemains) return;

    const geneSummary = this.normalizeGeneSummary(genes);
    const validSymbols = geneSummary.items.filter(Boolean);
    this.resetInlineText(tdGene, 'gene-count-text');

    if (validSymbols.length === 0) {
      this.updateRemainsBadge(tdGeneRemains, 0);
      this.resetAnchor(tdGene);
      if (geneSummary.total > 0) {
        this.updateInlineText(
          tdGene,
          'gene-count-text',
          `${geneSummary.total.toLocaleString()} genes`,
          tdGeneRemains
        );
      }
      return;
    }

    // 画面には先頭の遺伝子だけを表示し、APIが返した総遺伝子数との差分をdata-remainsに保持する。
    this.updateRemainsBadge(tdGeneRemains, Math.max(0, geneSummary.total - 1));
    this.updateAnchor(
      tdGene,
      'hyper-text -internal',
      `/gene/${validSymbols[0].id}`,
      validSymbols[0].name,
      `View gene ${validSymbols[0].name} details`,
      tdGeneRemains
    );
  }

  /**
   * ステージング移行中の旧配列レスポンスでも表示を止めないため、GeneSummaryへ正規化する。
   */
  static normalizeGeneSummary(
    genes: GeneSummary | GeneSymbol[] | undefined
  ): NormalizedGeneSummary {
    if (Array.isArray(genes)) {
      return { total: genes.length, items: genes };
    }

    const items = Array.isArray(genes?.items) ? genes.items : [];

    return {
      total: Math.max(items.length, genes?.total ?? 0),
      items,
    };
  }

  /**
   * datasetマスター未ロード時も結果行描画を止めないため、取得できた頻度要素だけを更新する。
   *
   * @param tdFrequencies - データセットIDごとの頻度表示要素
   * @param frequencies - 頻度データの配列
   */
  static updateAltFrequency(
    tdFrequencies: TdFrequencies,
    frequencies: Frequency[]
  ) {
    const master =
      (getSimpleSearchConditionMaster('dataset')?.items as
        | DatasetMasterItem[]
        | undefined) ?? [];

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
   * consequenceマスター欠落時も結果行描画を継続し、解決できるラベルだけを表示する。
   *
   * @param tdConsequence - Consequence列のtd要素
   * @param tdConsequenceItem - Consequence名を表示するdiv要素
   * @param mostConsequence - 最も重要なConsequence ID
   * @param transcripts - Transcript情報の配列
   */
  static updateConsequence(
    tdConsequenceItem: HTMLDivElement | null,
    tdConsequenceRemains: HTMLSpanElement | null,
    mostConsequence: string,
    transcripts: Transcript[]
  ) {
    if (!tdConsequenceItem || !tdConsequenceRemains) return;

    if (!mostConsequence) {
      this.updateRemainsBadge(tdConsequenceRemains, 0);
      tdConsequenceItem.textContent = '';
      return;
    }

    const master =
      (getSimpleSearchConditionMaster('consequence')?.items as
        | ConsequenceMasterItem[]
        | undefined) ?? [];
    const uniqueConsequences = Array.from(
      new Set(transcripts.flatMap((transcript) => transcript.consequence ?? []))
    );

    this.updateRemainsBadge(
      tdConsequenceRemains,
      uniqueConsequences.length - 1
    );
    tdConsequenceItem.textContent =
      master.find((consequence) => consequence.id === mostConsequence)?.label ||
      '';
  }

  /**
   * 追加件数バッジを更新する。
   *
   * @param element - 追加件数表示要素
   * @param remains - 追加件数
   */
  static updateRemainsBadge(element: HTMLSpanElement, remains: number) {
    element.dataset.remains = remains.toString();
    element.textContent = remains > 0 ? `+${remains}` : '';
  }

  /**
   * Clinical significance列を更新する。
   *
   * @param tdClinicalSign - Clinical significanceを表示するdiv要素
   * @param clinicalContainer - Clinical significance列の内容コンテナ
   * @param tdClinicalRemains - 追加件数を表示するspan要素
   * @param tdClinicalIcon - 追加情報の有無を示すspan要素
   * @param significances - Clinical significance情報の配列
   */
  static updateClinicalSignificance(
    tdClinicalSign: HTMLDivElement | null,
    clinicalContainer: HTMLDivElement | null,
    tdClinicalRemains: HTMLSpanElement | null,
    tdClinicalIcon: HTMLSpanElement | null,
    significances: Significance[]
  ) {
    if (
      !tdClinicalSign ||
      !clinicalContainer ||
      !tdClinicalRemains ||
      !tdClinicalIcon
    )
      return;

    if (!significances || significances.length === 0) {
      this.resetClinicalSignificance(
        tdClinicalSign,
        clinicalContainer,
        tdClinicalRemains,
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
      clinicalContainer,
      tdClinicalRemains,
      firstCondition
    );
    this.updateClinicalMetadata(
      clinicalContainer,
      tdClinicalRemains,
      tdClinicalIcon,
      significances
    );
  }

  /**
   * Clinical significance列を空の状態へ戻す。
   *
   * @param tdClinicalSign - Clinical significanceを表示するdiv要素
   * @param clinicalContainer - Clinical significance列の内容コンテナ
   * @param tdClinicalRemains - 追加件数を表示するspan要素
   * @param tdClinicalIcon - 追加情報の有無を示すspan要素
   */
  static resetClinicalSignificance(
    tdClinicalSign: HTMLDivElement,
    clinicalContainer: HTMLDivElement,
    tdClinicalRemains: HTMLSpanElement,
    tdClinicalIcon: HTMLSpanElement
  ) {
    tdClinicalSign.dataset.value = '';
    tdClinicalSign.textContent = '';
    this.resetAnchor(clinicalContainer);
    clinicalContainer.dataset.remains = '0';
    clinicalContainer.dataset.mgend = 'false';
    tdClinicalRemains.dataset.remains = '0';
    tdClinicalRemains.textContent = '';
    tdClinicalIcon.dataset.mgend = 'false';
  }

  /**
   * Clinical significanceに紐づく疾患情報を更新する。
   *
   * @param tdClinicalSign - Clinical significanceを表示するdiv要素
   * @param clinicalContainer - Clinical significance列の内容コンテナ
   * @param tdClinicalRemains - 追加件数を表示するspan要素
   * @param firstCondition - 先頭の疾患情報
   */
  static updateClinicalCondition(
    tdClinicalSign: HTMLDivElement,
    clinicalContainer: HTMLDivElement,
    tdClinicalRemains: HTMLSpanElement,
    firstCondition: { name: string; medgen?: string } | undefined
  ) {
    if (firstCondition) {
      tdClinicalSign.textContent = '';

      if (firstCondition.medgen) {
        this.updateAnchor(
          clinicalContainer,
          'hyper-text -internal',
          `/disease/${firstCondition.medgen}`,
          firstCondition.name || '',
          `View disease ${firstCondition.name} details`,
          tdClinicalRemains
        );
      } else {
        // MedGen IDがない場合はリンクにせず、通常テキストとして表示する。
        tdClinicalSign.textContent = firstCondition.name;
        this.resetAnchor(clinicalContainer);
      }
    } else {
      // 疾患情報がない場合はothersとして表示する。
      tdClinicalSign.textContent = 'others';
      this.resetAnchor(clinicalContainer);
    }
  }

  /**
   * Clinical significance列の補助情報を更新する。
   *
   * @param clinicalContainer - Clinical significance列の内容コンテナ
   * @param tdClinicalRemains - 追加件数を表示するspan要素
   * @param tdClinicalIcon - 追加情報の有無を示すspan要素
   * @param significances - Clinical significance情報の配列
   */
  static updateClinicalMetadata(
    clinicalContainer: HTMLDivElement,
    tdClinicalRemains: HTMLSpanElement,
    tdClinicalIcon: HTMLSpanElement,
    significances: Significance[]
  ) {
    // 画面に表示している先頭1件以外の件数を保持する。
    const remains = (significances.length - 1).toString();
    clinicalContainer.dataset.remains = remains;
    tdClinicalRemains.dataset.remains = remains;
    this.updateClinicalRemainsText(tdClinicalRemains, remains);

    // MGeND由来の情報が含まれるかを保持する。
    const hasMedgen = significances.some(
      (significance) => significance.source === 'mgend'
    );
    clinicalContainer.dataset.mgend = hasMedgen.toString();
    tdClinicalIcon.dataset.mgend = hasMedgen.toString();
  }

  /**
   * Clinical significanceの追加件数を表示する。
   *
   * @param tdClinicalRemains - 追加件数を表示するspan要素
   * @param remains - 追加件数
   */
  static updateClinicalRemainsText(
    tdClinicalRemains: HTMLSpanElement,
    remains: string
  ) {
    const text = remains === '0' ? '' : `+${remains}`;

    tdClinicalRemains.textContent = text;
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
    score: number | null | undefined,
    classifyScore: (score: number) => string
  ) {
    if (!element) return;

    if (score == null) {
      element.textContent = '';
      element.dataset.function = '';
      return;
    }

    element.textContent = score.toString();
    element.dataset.function = classifyScore(score);
  }

  /**
   * CADDスコア（PHRED）を更新する。
   * 閾値はスライダーの色区分と合わせている: ≥20 → 'D'（赤）、≥10 → 'POSSD'（橙）、<10 → 'T'（緑）
   *
   * @param element - 更新対象のdiv要素
   * @param score - CADD PHREDスコア
   */
  static updateCadd(element: HTMLDivElement | null, score: number | undefined) {
    this.updateFunctionPrediction(element, score ?? null, (s) => {
      if (s >= 20) return 'D';
      if (s >= 10) return 'POSSD';
      return 'T';
    });
  }

  /**
   * AlphaMissenseスコアを更新する。
   *
   * @param element - 更新対象のdiv要素
   * @param score - AlphaMissenseスコア
   */
  static updateAlphaMissense(
    element: HTMLDivElement | null,
    score: number | null | undefined
  ) {
    this.updateFunctionPrediction(element, score, (s) => {
      if (s < 0.34) return 'LB';
      if (s > 0.564) return 'LP';
      return 'A';
    });
  }

  /**
   * SIFTスコアを更新する。
   *
   * @param element - 更新対象のdiv要素
   * @param score - SIFTスコア
   */
  static updateSift(
    element: HTMLDivElement | null,
    score: number | null | undefined
  ) {
    this.updateFunctionPrediction(element, score, (s) =>
      s >= 0.05 ? 'T' : 'D'
    );
  }

  /**
   * PolyPhenスコアを更新する。
   *
   * @param element - 更新対象のdiv要素
   * @param score - PolyPhenスコア
   */
  static updatePolyphen(
    element: HTMLDivElement | null,
    score: number | null | undefined
  ) {
    this.updateFunctionPrediction(element, score, (s) => {
      if (s > 0.908) return 'PROBD';
      if (s > 0.446) return 'POSSD';
      if (s >= 0) return 'B';
      return 'U';
    });
  }

  /**
   * スプライシング予測（SSCV DB）列を更新する。
   * 1バリアントに複数エントリが返るケースはほぼないため先頭の predicted_splicing_type のみ表示する。
   *
   * @param element - 予測タイプ表示div要素
   * @param items - SSCV DB予測結果の配列
   */
  static updateSplicingVariant(
    element: HTMLAnchorElement | null,
    items: SscvDbItem[] | undefined,
    links: ExternalLinkItem[] | undefined
  ) {
    if (!element) return;
    if (process.env.NODE_ENV !== 'production' && items && items.length > 1) {
      console.warn(
        '[ResultsColumnUpdater] sscv_db が複数件返っています。remains バッジの追加を検討してください。',
        items
      );
    }
    const text = items?.[0]?.predicted_splicing_type ?? '';
    const rawUrl = links?.[0]?.xref ?? '';
    element.textContent = text;
    let safeUrl = '';
    try {
      const parsed = new URL(String(rawUrl), window.location.href);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        safeUrl = parsed.toString();
      }
    } catch {
      // ignore invalid URLs
    }
    if (text && safeUrl) {
      element.href = safeUrl;
    } else {
      element.removeAttribute('href');
    }
  }
}
