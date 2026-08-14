import stanzaConfigJson from '../../assets/stanza.json';
import {
  fetchVariantResolutionPage,
  type VariantResolutionOffset,
  type VariantResolutionPage,
  type VariantResolutionPageItem,
} from '../../src/api/variantResolution';
import FloatingInfo from '../../src/components/FloatingInfo';

/**
 * TogoVarのレポートページでStanzaを描画するためのエントリポイント。
 *
 * stanza.json の設定を読み込み、環境変数を展開し、URLから取得したreport type / IDを
 * 各Stanzaの属性へ渡して描画する。
 *
 * 主な責務:
 * - ConfigProcessor: stanza.json内の環境変数プレースホルダーを解決する
 * - OptionFormatter: Stanzaへ渡すoptionsをHTML属性用の文字列へ整える
 * - StanzaManager: Stanzaのscript読み込みとDOM挿入を行う
 * - ReportApp: URL解析、ID解決、共通options生成、Stanza描画をまとめて制御する
 * - DOMReadyHandler: DOM構築後に初期化を開始する
 */

import type {
  EnvironmentConfig,
  StanzaConfig,
  ReportConfig,
  RouteInfo,
} from '../../src/types/index';

// ============================================================================
// 型宣言
// ============================================================================

/** Webpack DefinePlugin がビルド時に埋め込む環境変数。 */
declare const TOGOVAR_FRONTEND_API_URL: string | undefined;
declare const TOGOVAR_FRONTEND_REFERENCE: string | undefined;
declare const TOGOVAR_ENDPOINT_SPARQL: string | undefined;
declare const TOGOVAR_ENDPOINT_SPARQLIST: string | undefined;
declare const TOGOVAR_ENDPOINT_SEARCH: string | undefined;
declare const TOGOVAR_ENDPOINT_JBROWSE: string | undefined;
declare const TOGOVAR_FRONTEND_STANZA_URL: string | undefined;

// ============================================================================
// 定数・環境設定
// ============================================================================

/**
 * 環境変数が未設定でもレポートページを描画できるよう、各エンドポイントに既定値を持たせる。
 * 値はビルド時に埋め込まれたグローバル変数から取得する。
 */
const ENV_CONFIG: EnvironmentConfig = {
  TOGOVAR_FRONTEND_API_URL:
    TOGOVAR_FRONTEND_API_URL || 'https://grch37.togovar.org',
  TOGOVAR_FRONTEND_REFERENCE: TOGOVAR_FRONTEND_REFERENCE || 'GRCh37',
  TOGOVAR_STANZA_SPARQL: TOGOVAR_ENDPOINT_SPARQL || '/sparql',
  TOGOVAR_STANZA_SPARQLIST: TOGOVAR_ENDPOINT_SPARQLIST || '/sparqlist',
  TOGOVAR_STANZA_SEARCH: TOGOVAR_ENDPOINT_SEARCH || '/search',
  TOGOVAR_STANZA_JBROWSE: TOGOVAR_ENDPOINT_JBROWSE || '/jbrowse',
};

/** Stanza script の配信先が未指定の場合に使う既定URL。 */
const DEFAULT_STANZA_PATH: string = 'https://togovar.github.io/stanza';

/** 環境ごとにStanza scriptの配信先を差し替えられるよう、環境変数を優先する。 */
const STANZA_PATH: string = TOGOVAR_FRONTEND_STANZA_URL || DEFAULT_STANZA_PATH;

// ============================================================================
// 設定値の展開
// ============================================================================

/**
 * stanza.jsonを環境ごとの値で使えるよう、設定オブジェクト内の環境変数を再帰的に展開する。
 * `$VAR_NAME` と `${VAR_NAME}` の両方の書式をサポートする。
 */
class ConfigProcessor {
  /**
   * ネストした設定にも環境変数を使えるよう、値の型ごとに再帰処理する。
   *
   * @param configObject JSONから読み込んだ未処理の設定オブジェクト
   * @returns 環境変数プレースホルダーを解決した設定オブジェクト
   *
   * @example
   * ```typescript
   * const rawConfig = { url: "$TOGOVAR_FRONTEND_API_URL/api" };
   * const processed = ConfigProcessor.processConfig(rawConfig);
   * // 結果: { url: "https://grch37.togovar.org/api" }
   * ```
   */
  static processConfig(configObject: unknown): unknown {
    const processItemRecursively = (item: unknown): unknown => {
      if (typeof item === 'string' && item.includes('$')) {
        return this._replaceEnvironmentVariables(item);
      }

      if (Array.isArray(item)) {
        return item.map(processItemRecursively);
      }

      if (item && typeof item === 'object') {
        const processedResult: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(item)) {
          processedResult[key] = processItemRecursively(value);
        }
        return processedResult;
      }

      return item;
    };

    return processItemRecursively(configObject);
  }

  /**
   * stanza.json内で環境変数を書けるよう、文字列中のプレースホルダーを実値へ置換する。
   *
   * @param templateString 環境変数プレースホルダーを含む文字列
   * @returns プレースホルダーを環境値へ置換した文字列
   *
   * @example
   * ```typescript
   * const result = ConfigProcessor._replaceEnvironmentVariables("$TOGOVAR_FRONTEND_API_URL/api");
   * // 戻り値: "https://grch37.togovar.org/api"
   * ```
   */
  private static _replaceEnvironmentVariables(templateString: string): string {
    const environmentVariablePattern = /(\$([A-Z_]+)|\${([A-Z_]+)})/g;
    return templateString.replace(
      environmentVariablePattern,
      (
        match: string,
        _: string,
        variableKey1?: string,
        variableKey2?: string
      ): string => {
        const variableKey = variableKey1 || variableKey2;
        return variableKey
          ? ENV_CONFIG[variableKey as keyof EnvironmentConfig] || ''
          : '';
      }
    );
  }
}

/** 環境変数プレースホルダーを解決済みのレポート設定。 */
const REPORT_CONFIG = ConfigProcessor.processConfig(stanzaConfigJson) as Record<
  string,
  ReportConfig
>;

// ============================================================================
// Stanza属性の整形
// ============================================================================

/**
 * Stanza optionsをHTML属性として安全に渡せるよう、値を文字列へ正規化する。
 * オブジェクトのJSON化、URLの整形、基本型の文字列化をまとめて扱う。
 */
class OptionFormatter {
  /**
   * Stanza要素のsetAttributeへ渡せるよう、optionsの各値を文字列Recordへ変換する。
   *
   * @param options stanza.jsonに書かれた未整形のoptions
   * @returns HTML属性へ設定できる文字列Record
   *
   * @example
   * ```typescript
   * const options = { count: 10, url: "https://example.com?a=1&b=2", data: { key: "value" } };
   * const formatted = OptionFormatter.format(options);
   * // 結果: { count: "10", url: "https://example.com?a=1&b=2", data: '{"key":"value"}' }
   * ```
   */
  static format(
    options: Record<string, unknown> | undefined
  ): Record<string, string> {
    if (!options) return {};

    const formattedAttributes: Record<string, string> = {};

    for (const [attributeName, attributeValue] of Object.entries(options)) {
      if (this._isDataUrl(attributeName, attributeValue)) {
        // pagination-tableのloadDataはnew URL()を使うため、相対URLを絶対URLへ正規化する。
        formattedAttributes[attributeName] = this._formatDataUrl(
          attributeValue
        );
      } else if (attributeValue && typeof attributeValue === 'object') {
        // オブジェクト値は属性へ直接渡せないため、JSON文字列にする。
        formattedAttributes[attributeName] = JSON.stringify(attributeValue);
      } else if (this._isUrl(attributeValue)) {
        // URL文字列はクエリ値を再エンコードして属性値として安定させる。
        formattedAttributes[attributeName] = this._formatUrl(
          attributeValue as string
        );
      } else {
        // それ以外はHTML属性値として文字列化する。
        formattedAttributes[attributeName] = String(attributeValue);
      }
    }

    return formattedAttributes;
  }

  /**
   * URLだけを専用整形へ回すため、http/httpsから始まる文字列に絞り込む。
   *
   * @param value 判定対象の値
   * @returns http/https URL文字列ならtrue
   */
  private static _isUrl(value: unknown): value is string {
    return typeof value === 'string' && /^https?:\/\//.test(value);
  }

  /**
   * MetaStanzaのdata-url処理は絶対URL前提のため、data-urlだけ専用整形へ回す。
   *
   * @param attributeName 判定対象の属性名
   * @param value 判定対象の値
   * @returns data-url文字列ならtrue
   */
  private static _isDataUrl(
    attributeName: string,
    value: unknown
  ): value is string {
    return attributeName === 'data-url' && typeof value === 'string';
  }

  /**
   * 空値を持つクエリもSPARQListでは意味があるため、data-urlでは空値を保持したまま絶対URL化する。
   *
   * @param urlString 整形対象のdata-url
   * @returns 相対URLなら現在originを補った絶対URL
   */
  private static _formatDataUrl(urlString: string): string {
    const url = new URL(urlString, window.location.origin);

    url.search = [...url.searchParams]
      .map(
        ([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
      )
      .join('&');

    return url.href;
  }

  /**
   * URL内のクエリ値に空白などが含まれても壊れないよう、search paramsを組み直す。
   *
   * @param urlString 整形対象のURL文字列
   * @returns クエリ値をエンコードし直したURL文字列
   *
   * @example
   * ```typescript
   * const formatted = OptionFormatter._formatUrl("https://example.com?name=John Doe&age=30");
   * // 戻り値: "https://example.com?name=John%20Doe&age=30"
   * ```
   */
  private static _formatUrl(urlString: string): string {
    const url = new URL(urlString);

    // 空のクエリ値はStanza側で意味を持たないため除外する。
    url.search = [...url.searchParams]
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');

    return url.href;
  }
}

// ============================================================================
// Stanzaの生成・挿入
// ============================================================================

/**
 * stanza.jsonの定義だけでStanzaを差し替えられるよう、script読み込みとDOM挿入を集約する。
 * StanzaはWeb Componentsとして提供されるため、custom element生成と属性設定までここで行う。
 */
class StanzaManager {
  /**
   * stanza.jsonの1要素をそのまま描画単位として扱えるよう、検証からDOM挿入までをまとめる。
   *
   * @param stanzaConfig StanzaのID、挿入先、script URL、個別optionsを持つ設定
   * @param baseOptions すべてのStanzaへ共通で渡すoptions
   *
   * @example
   * ```typescript
   * const config = {
   *   id: "variant-summary",
   *   targetSelector: "#variant-summary",
   *   options: { assembly: "GRCh38" }
   * };
   * StanzaManager.createStanzaAndInsertIntoDOM(config, { sparqlist: "/sparqlist" });
   * ```
   */
  static createStanzaAndInsertIntoDOM(
    stanzaConfig: StanzaConfig,
    baseOptions: Record<string, unknown> = {}
  ): void {
    const { id, targetSelector, scriptUrl, options } = stanzaConfig;

    if (!this._validateStanzaConfig(stanzaConfig)) {
      console.error('Invalid stanza config:', stanzaConfig);
      return;
    }

    this._loadStanzaScript(
      scriptUrl || `${STANZA_PATH}/${id}.js`,
      targetSelector
    );
    this._createAndInsertStanzaElement(
      id,
      targetSelector,
      baseOptions,
      options
    );
  }

  /**
   * 不完全な設定でcustom elementを作らないよう、必須項目だけを事前に確認する。
   *
   * @param config 検証対象のStanza設定
   * @returns 必須項目が揃っていればtrue
   */
  private static _validateStanzaConfig({
    id,
    targetSelector,
  }: StanzaConfig): boolean {
    if (!id) {
      console.error("Missing required stanza property: 'id'");
      return false;
    }

    if (!targetSelector) {
      console.error("Missing required stanza property: 'targetSelector'");
      return false;
    }

    return true;
  }

  /**
   * レポートごとに必要なStanzaだけを読み込めるよう、script要素を動的に追加する。
   *
   * @param scriptSourceUrl StanzaのJavaScriptファイルURL
   * @param targetSelector 読み込み失敗時に非表示にするStanza挿入先
   */
  private static _loadStanzaScript(
    scriptSourceUrl: string,
    targetSelector: string
  ): void {
    const scriptElement = document.createElement('script');
    scriptElement.type = 'module';
    scriptElement.src = scriptSourceUrl;
    scriptElement.async = true;
    scriptElement.addEventListener('error', () => {
      console.error(`Failed to load stanza script: ${scriptSourceUrl}`);
      this.hideStanzaSection(targetSelector);
    });
    document.head.appendChild(scriptElement);
  }

  /**
   * 読み込めないStanzaや現在のID形式に非対応のStanzaは、空の枠を残さずsectionごと非表示にする。
   */
  static hideStanzaSection(targetSelector: string): void {
    const targetElement = document.querySelector(targetSelector);
    const parentSection = targetElement?.closest('section.stanza-view');
    const elementToHide = parentSection || targetElement;

    if (elementToHide instanceof HTMLElement) {
      elementToHide.style.display = 'none';
    }
  }

  /**
   * stanza.jsonのtargetSelectorに従って、生成したcustom elementをページ内へ配置する。
   *
   * @param stanzaId custom element名の元になるStanza ID
   * @param targetSelector 挿入先DOMを指すCSSセレクター
   * @param baseOptions すべてのStanzaへ共通で渡すoptions
   * @param stanzaOptions このStanzaだけに渡す個別options
   */
  private static _createAndInsertStanzaElement(
    stanzaId: string,
    targetSelector: string,
    baseOptions: Record<string, unknown>,
    stanzaOptions?: Record<string, unknown>
  ): void {
    // Stanza ID と custom element 名の規約を合わせて要素を生成する。
    const stanzaElement = document.createElement(`togostanza-${stanzaId}`);

    // 共通optionsとStanza固有optionsをどちらもHTML属性として渡す。
    this._applyAttributesToElement(
      stanzaElement,
      this._convertObjectToStringRecord(baseOptions)
    );
    this._applyAttributesToElement(
      stanzaElement,
      OptionFormatter.format(stanzaOptions)
    );

    // stanza.jsonのtargetSelectorが指す場所へStanza要素を挿入する。
    const targetElement = document.querySelector(targetSelector);

    if (targetElement) {
      targetElement.appendChild(stanzaElement);
    } else {
      console.warn(
        `Target element not found for stanza '${stanzaId}': ${targetSelector}`
      );
    }
  }

  /**
   * DOM属性には文字列しか設定できないため、共通optionsの値をすべて文字列化する。
   *
   * @param objectToConvert 文字列Recordへ変換するオブジェクト
   * @returns すべての値を文字列化したRecord
   */
  private static _convertObjectToStringRecord(
    objectToConvert: Record<string, unknown>
  ): Record<string, string> {
    const stringRecord: Record<string, string> = {};
    for (const [key, value] of Object.entries(objectToConvert)) {
      stringRecord[key] = String(value);
    }
    return stringRecord;
  }

  /**
   * Stanza側がattributeChangedCallbackで値を受け取れるよう、optionsをHTML属性へ反映する。
   *
   * @param element 属性を設定するDOM要素
   * @param attributes HTML属性として設定するキーと値
   */
  private static _applyAttributesToElement(
    element: Element,
    attributes: Record<string, string>
  ): void {
    if (!attributes) return;

    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, value);
    }
  }
}

// ============================================================================
// レポートページ全体の制御
// ============================================================================

/**
 * レポート種別ごとの差分をstanza.jsonへ寄せるため、ページ初期化の流れをここに集約する。
 * URL解析、ID解決、共通options生成、Stanza描画を順に実行する。
 */
class ReportApp {
  /**
   * variant page が chr-pos-ref-alt 形式のURLでもtgvidへ解決してから描画できるよう、非同期化している。
   * 初期化失敗時もページ全体を止めないよう、設定未定義などはログに出して終了する。
   */
  static async initialize(): Promise<void> {
    const routeInfo = this._parseCurrentRoute();
    const reportConfig = this._getReportConfig(routeInfo.reportType);

    if (!reportConfig) {
      console.error(
        `No configuration found for report type: ${routeInfo.reportType}`
      );
      return;
    }

    const { reportId, idKey, additionalBaseOptions } = await this._resolveRouteId(
      routeInfo,
      reportConfig
    );

    const baseOptions = this._prepareBaseOptions(
      reportConfig,
      reportId,
      idKey,
      additionalBaseOptions
    );

    this._updatePageElements(reportId);
    this._renderAllStanzas(
      reportConfig.stanza || [],
      baseOptions,
      reportId,
      idKey
    );
  }

  /** tgvid形式かどうかの判定に使う。tgv-prefix + 数字のみを既存tgvidとみなす。 */
  private static readonly TGV_ID_PATTERN = /^tgv\d+$/i;

  /** chr-pos-ref-alt形式のURLをパースするための正規表現。REF/ALTは空文字のSV表現も許容する。 */
  private static readonly VARIANT_LOCUS_PATTERN =
    /^([^-]+)-(\d+)-([^-]*)-([^-]*)$/;
  /** 1回のAPI取得件数は仕様上1000が上限のため、tgvid解決も同じ単位でページングする。 */
  private static readonly TGV_ID_RESOLUTION_LIMIT = 1000;
  /** 初期描画を長時間止めないよう、tgvid解決で辿るページ数を必要最小限に抑える。 */
  private static readonly TGV_ID_RESOLUTION_MAX_PAGES = 3;
  /** API遅延時はlocus表示へ倒し、レポートページ全体の描画待ちを短くする。 */
  private static readonly TGV_ID_RESOLUTION_TIMEOUT_MS = 1500;

  /**
   * variant pageのURLがtgvid形式でない場合、chr-pos-ref-altから検索APIでtgvidを解決する。
   * バックエンドは tgvid にマップできない chr-pos-ref-alt を404にしており、リダイレクトへ倒すと
   * 無限ループになるため、この解決はフロント側だけで完結させる（URLの書き換えは行わない）。
   *
   * @returns 解決できた場合は tgvid、できなかった場合は元のlocus文字列と、それぞれに応じたidKey
   */
  private static async _resolveRouteId(
    routeInfo: RouteInfo,
    reportConfig: ReportConfig
  ): Promise<{
    reportId: string;
    idKey: string;
    additionalBaseOptions?: Record<string, string>;
  }> {
    const defaultIdKey = reportConfig.id || 'id';

    if (
      routeInfo.reportType !== 'variant' ||
      this.TGV_ID_PATTERN.test(routeInfo.reportId)
    ) {
      return { reportId: routeInfo.reportId, idKey: defaultIdKey };
    }

    const variant = this._parseVariantLocusRouteId(routeInfo.reportId);

    if (!variant) {
      return { reportId: routeInfo.reportId, idKey: defaultIdKey };
    }

    const tgvId = await this._fetchTgvId(variant);
    const variantId = this._formatVariantLocusId(variant);

    if (tgvId) {
      return {
        reportId: tgvId,
        idKey: defaultIdKey,
        additionalBaseOptions: {
          [reportConfig.fallback_id || 'variant']: variantId,
        },
      };
    }

    return {
      reportId: variantId,
      idKey: reportConfig.fallback_id || 'variant',
    };
  }

  /**
   * URLエンコードされたlocus要素を個別に戻すことで、REF/ALTに予約文字が含まれてもAPI条件へ戻せるようにする。
   */
  private static _parseVariantLocusRouteId(routeId: string): {
    chromosome: string;
    position: number;
    reference: string;
    alternate: string;
  } | null {
    const locusMatch = routeId.match(this.VARIANT_LOCUS_PATTERN);

    if (!locusMatch) {
      return null;
    }

    try {
      const [, chromosome, position, reference, alternate] = locusMatch;
      const parsedPosition = Number(position);

      if (!Number.isFinite(parsedPosition)) {
        return null;
      }

      return {
        chromosome: decodeURIComponent(chromosome),
        position: parsedPosition,
        reference: decodeURIComponent(reference),
        alternate: decodeURIComponent(alternate),
      };
    } catch (error) {
      console.error('Failed to decode variant locus from route', error);
      return null;
    }
  }

  /**
   * tgvid未解決時も画面表示とfallback_id属性には人間が読めるlocus文字列を渡す。
   */
  private static _formatVariantLocusId(variant: {
    chromosome: string;
    position: number;
    reference: string;
    alternate: string;
  }): string {
    return `${variant.chromosome}-${variant.position}-${variant.reference}-${variant.alternate}`;
  }

  /**
   * chr-pos-ref-altからtgvidを検索する。見つからない場合やAPIエラー時はnullを返し、
   * 呼び出し元でlocusベースのフォールバック表示へ倒せるようにする。
   */
  private static async _fetchTgvId(variant: {
    chromosome: string;
    position: number;
    reference: string;
    alternate: string;
  }): Promise<string | null> {
    const abortController = new AbortController();
    const timeoutId = window.setTimeout(() => {
      abortController.abort();
    }, this.TGV_ID_RESOLUTION_TIMEOUT_MS);

    try {
      let offset: VariantResolutionOffset | undefined;

      for (let page = 0; page < this.TGV_ID_RESOLUTION_MAX_PAGES; page += 1) {
        const result = await fetchVariantResolutionPage(
          ENV_CONFIG.TOGOVAR_FRONTEND_API_URL,
          variant,
          offset,
          abortController.signal,
          this.TGV_ID_RESOLUTION_LIMIT
        );
        const matchedVariant = result.data.find((item) =>
          this._isSameVariantAllele(item, variant)
        );

        if (matchedVariant?.id) {
          return matchedVariant.id;
        }

        if (result.data.length < this.TGV_ID_RESOLUTION_LIMIT) {
          return null;
        }

        offset = this._getNextVariantResolutionOffset(result.data);

        if (!offset) {
          return null;
        }
      }

      console.error(
        'Stopped TogoVar ID resolution because page limit was reached'
      );
      return null;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.error('Timed out while resolving TogoVar ID from variant locus');
        return null;
      }

      console.error('Failed to resolve TogoVar ID from variant locus', error);
      return null;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  /**
   * APIレスポンスではalternate/alternativeが移行中で混在し得るため、両方を同じALTとして比較する。
   */
  private static _isSameVariantAllele(
    item: VariantResolutionPageItem,
    variant: {
      reference: string;
      alternate: string;
    }
  ): boolean {
    const alternate = item.alternate ?? item.alternative;
    return (
      item.reference === variant.reference && alternate === variant.alternate
    );
  }

  /**
   * 1000件ちょうど返った場合は続きがあり得るため、最後の行をsearch-after offsetに変換する。
   */
  private static _getNextVariantResolutionOffset(
    data: VariantResolutionPage['data']
  ): VariantResolutionOffset | undefined {
    const last = data[data.length - 1];
    const alternate = last?.alternate ?? last?.alternative;

    if (
      !last?.chromosome ||
      typeof last.position !== 'number' ||
      typeof last.reference !== 'string' ||
      typeof alternate !== 'string'
    ) {
      return undefined;
    }

    return [last.chromosome, last.position, last.reference, alternate];
  }

  /**
   * ルーティングライブラリを使わず静的配信できるよう、現在URLの末尾2セグメントからレポート情報を読む。
   *
   * 想定するURL形式: `/[report-type]/[report-id]`
   * 例: `/variant/tgv123456`, `/gene/BRCA1`, `/disease/C0006142`
   *
   * @returns URLから取り出したレポート種別とID
   *
   * @example
   * ```typescript
   * // 現在URL: https://example.com/variant/tgv123456
   * const route = ReportApp._parseCurrentRoute();
   * // 戻り値: { reportType: "variant", reportId: "tgv123456" }
   * ```
   */
  private static _parseCurrentRoute(): RouteInfo {
    const pathSegments = window.location.pathname.split('/').slice(-2);
    return {
      reportType: pathSegments[0],
      reportId: pathSegments[1],
    };
  }

  /**
   * レポート種別ごとの分岐をコードに増やさないよう、stanza.jsonから対応する設定を取得する。
   *
   * @param reportType variant、gene、diseaseなどのレポート種別
   * @returns レポート設定。見つからない場合はundefined
   */
  private static _getReportConfig(
    reportType: string
  ): ReportConfig | undefined {
    return REPORT_CONFIG[reportType];
  }

  /**
   * idKeyと追加属性を呼び出し元(_resolveRouteId)から明示的に受け取る。
   * chr-pos-ref-altをtgvidへ解決できた場合でも、variant-* stanza が元のvariant値も使えるよう両方渡す。
   *
   * @param reportConfig 現在のレポート種別に対応する設定
   * @param reportId Stanzaへ主IDとして渡す識別子
   * @param idKey 主IDを公開する属性名
   * @param additionalBaseOptions すべてのStanzaへ追加で公開する属性
   * @returns Stanzaへ渡す共通options
   *
   * @example
   * ```typescript
   * const config = { base_options: { sparqlist: "/api" } };
   * const options = ReportApp._prepareBaseOptions(config, "tgv123456", "tgv_id");
   * // 戻り値: { sparqlist: "/api", tgv_id: "tgv123456" }
   * ```
   */
  private static _prepareBaseOptions(
    reportConfig: ReportConfig,
    reportId: string,
    idKey: string,
    additionalBaseOptions: Record<string, string> = {}
  ): Record<string, unknown> {
    const baseOptions = reportConfig.base_options
      ? { ...reportConfig.base_options }
      : {};

    if (reportConfig.id && reportConfig.fallback_id) {
      baseOptions[reportConfig.id] = '';
      baseOptions[reportConfig.fallback_id] = '';
    }

    baseOptions[idKey] = reportId;
    Object.assign(baseOptions, additionalBaseOptions);

    return baseOptions;
  }

  /**
   * Pugテンプレート側に個別ロジックを書かずに済むよう、report_id表示箇所をまとめて更新する。
   *
   * @param reportId ページ上に表示するレポート識別子
   */
  private static _updatePageElements(reportId: string): void {
    const reportIdElements = document.querySelectorAll('.report_id');
    reportIdElements.forEach((element) => {
      element.textContent = reportId;
    });
  }

  /**
   * stanza.jsonの並び順を表示順として扱えるよう、対象referenceのStanzaだけを順に描画する。
   *
   * @param stanzas 描画対象のStanza設定配列
   * @param baseOptions すべてのStanzaへ共通で渡すoptions
   * @param reportId テンプレート変数へ埋め込むレポート識別子
   * @param idKey テンプレート変数として探すID属性名
   */
  private static _renderAllStanzas(
    stanzas: StanzaConfig[],
    baseOptions: Record<string, unknown>,
    reportId: string,
    idKey: string = 'id'
  ): void {
    const currentReference = ENV_CONFIG.TOGOVAR_FRONTEND_REFERENCE;

    stanzas.forEach((stanza) => {
      // referencesが指定されているStanzaは、現在の参照ゲノムに合うものだけ表示する。
      if (stanza.references && !stanza.references.includes(currentReference)) {
        // Stanza本体だけでなく見出しを含むsectionごと隠す。
        StanzaManager.hideStanzaSection(stanza.targetSelector);
        return;
      }

      const processedStanza = this._processStanzaTemplateVariables(
        stanza,
        reportId,
        idKey,
        baseOptions
      );
      StanzaManager.createStanzaAndInsertIntoDOM(processedStanza, baseOptions);
    });
  }

  /**
   * idKeyNameはtgvid解決の成否で'tgv_id'/'variant'などに切り替わるため、
   * stanza.jsonがキー名を直書きできるよう`${id_param}`/`${id_value}`という
   * 固定トークンも合わせて置換する（idKeyName側の置換だけだと、未解決時に
   * stanza.json上のリテラルなクエリキー名との組み合わせが崩れるため）。
   *
   * `${tgv_id}` と `$tgv_id` のように、波括弧あり・なしの両方に対応する。
   *
   * @param stanzaConfig 置換前のStanza設定
   * @param reportId テンプレート変数へ代入する値
   * @param idKeyName テンプレート内で探す変数名
   * @param baseOptions Stanza属性として渡す共通値。data-url内のtgv_id/variantなどにも使う。
   * @returns テンプレート変数を解決したStanza設定
   *
   * @example
   * ```typescript
   * const stanza = {
   *   id: "variant-summary",
   *   targetSelector: "#summary",
   *   options: { url: "/api/variant/${tgv_id}" }
   * };
   * const processed = ReportApp._processStanzaTemplateVariables(stanza, "tgv123456", "tgv_id", { tgv_id: "tgv123456" });
   * // 結果: { ...stanza, options: { url: "/api/variant/tgv123456" } }
   * ```
   */
  private static _processStanzaTemplateVariables(
    stanzaConfig: StanzaConfig,
    reportId: string,
    idKeyName: string,
    baseOptions: Record<string, unknown> = {}
  ): StanzaConfig {
    if (!stanzaConfig.options) {
      return stanzaConfig;
    }

    const processedStanzaConfig: StanzaConfig = { ...stanzaConfig };
    processedStanzaConfig.options = { ...stanzaConfig.options };

    const tokens = this._buildStanzaTemplateTokens(
      reportId,
      idKeyName,
      baseOptions
    );

    // option値のうち、テンプレート変数を含む文字列だけを置換対象にする。
    for (const [optionKey, optionValue] of Object.entries(
      processedStanzaConfig.options
    )) {
      if (typeof optionValue !== 'string' || !optionValue.includes('$')) {
        continue;
      }

      // 置換文字列に$&や$1などが含まれていても特殊構文として解釈されないよう、
      // 第2引数はコールバック形式で渡す
      processedStanzaConfig.options[optionKey] = tokens.reduce(
        (value, [tokenName, tokenValue]) =>
          value.replace(
            new RegExp(`\\$(${tokenName}|{${tokenName}})`, 'g'),
            () => tokenValue
          ),
        optionValue
      );
    }

    return processedStanzaConfig;
  }

  /**
   * locus URL由来のvariant値がある場合は、SPARQListのtgvid検索失敗を避けるためvariant条件を優先する。
   */
  private static _buildStanzaTemplateTokens(
    reportId: string,
    idKeyName: string,
    baseOptions: Record<string, unknown>
  ): Array<[string, string]> {
    const tokens: Array<[string, string]> = Object.entries(baseOptions).map(
      ([key, value]) => [key, String(value)]
    );

    const variantValue =
      typeof baseOptions.variant === 'string' ? baseOptions.variant : '';

    const variantOrIdQuery = variantValue
      ? new URLSearchParams({
          tgv_id: '',
          variant: variantValue,
        }).toString()
      : new URLSearchParams({
          [idKeyName]: reportId,
        }).toString();

    tokens.push(
      [idKeyName, reportId],
      ['id_param', idKeyName],
      ['id_value', encodeURIComponent(reportId)],
      ['variant_or_id_query', variantOrIdQuery]
    );

    return tokens;
  }
}

// ============================================================================
// セクションリンクのコピー
// ============================================================================

/**
 * セクション見出しのリンクアイコンをクリックしたときに、共有用URLをクリップボードへ保存する。
 */
class TitleLinkClipboard {
  /**
   * Pug側の各見出しへ個別に処理を書かず、reportページ共通の挙動として一括で設定する。
   */
  static initialize(): void {
    document
      .querySelectorAll<HTMLAnchorElement>('.titlelink-wrapper > .titlelink')
      .forEach((titleLink) => {
        titleLink.addEventListener('click', (event) => {
          event.preventDefault();
          void this._handleTitleLinkClick(titleLink);
        });

        titleLink.setAttribute('aria-label', 'Copy link to this section');
        titleLink.title = 'Copy link to this section';
      });
  }

  /**
   * アンカー本来のURL更新とスクロールを維持しつつ、共有用URLもコピーする。
   */
  private static async _handleTitleLinkClick(
    titleLink: HTMLAnchorElement
  ): Promise<void> {
    const titleLinkUrl = this._buildTitleLinkUrl(titleLink);

    this._updateCurrentUrl(titleLinkUrl);
    this._scrollToLinkedSection(titleLink);

    try {
      await this._writeTextToClipboard(titleLinkUrl);
      this._markAsCopied(titleLink);
    } catch (error) {
      console.error('Failed to copy title link URL', error);
    }
  }

  /**
   * 相対hashだけのhrefでも、variant/gene/disease ID を含む完全なURLとしてコピーできるようにする。
   */
  private static _buildTitleLinkUrl(titleLink: HTMLAnchorElement): string {
    const url = new URL(window.location.href);

    url.hash = titleLink.hash;

    return url.href;
  }

  /**
   * preventDefault後もアドレスバーにsection id付きURLを残せるよう、履歴へ明示的に積む。
   */
  private static _updateCurrentUrl(url: string): void {
    window.history.pushState(null, '', url);
  }

  /**
   * JS側でクリックを処理するため、アンカーの標準スクロール相当の動きを補う。
   */
  private static _scrollToLinkedSection(titleLink: HTMLAnchorElement): void {
    const targetId = decodeURIComponent(titleLink.hash.slice(1));
    const targetElement = document.getElementById(targetId);

    targetElement?.scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Clipboard API が使えない環境でもコピー操作を試せるよう、従来APIへフォールバックする。
   */
  private static async _writeTextToClipboard(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // 権限拒否や非セキュアコンテキストでは、従来APIで再試行する。
      }
    }

    this._writeTextToClipboardWithTextarea(text);
  }

  /**
   * 非表示textareaを選択してコピーすることで、古いブラウザでも同じ操作に近づける。
   */
  private static _writeTextToClipboardWithTextarea(text: string): void {
    const textarea = document.createElement('textarea');

    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';

    document.body.appendChild(textarea);
    textarea.select();

    const didCopy = document.execCommand('copy');
    textarea.remove();

    if (!didCopy) {
      throw new Error('Copy command was rejected');
    }
  }

  /**
   * コピーできたことを短時間だけ状態として残し、スクリーンリーダーにも操作結果が伝わるようにする。
   */
  private static _markAsCopied(titleLink: HTMLAnchorElement): void {
    titleLink.dataset.copied = 'true';
    titleLink.setAttribute('aria-label', 'Copied section link');
    titleLink.title = 'Copied section link';

    window.setTimeout(() => {
      titleLink.removeAttribute('data-copied');
      titleLink.setAttribute('aria-label', 'Copy link to this section');
      titleLink.title = 'Copy link to this section';
    }, 1200);
  }
}

// ============================================================================
// アプリケーション起動
// ============================================================================

/**
 * scriptの読み込みタイミングに左右されないよう、DOM構築済みかどうかを見て初期化を開始する。
 * DOMContentLoaded前後のどちらで読み込まれても同じ初期化処理を実行する。
 */
class DOMReadyHandler {
  /**
   * DOM要素へ安全にアクセスできるタイミングで、レポートページ共通の初期化を実行する。
   */
  static initialize(): void {
    if (document.readyState !== 'loading') {
      // DOM構築済みなら待たずに初期化する。
      ReportApp.initialize();
      new FloatingInfo();
      TitleLinkClipboard.initialize();
      return;
    }

    // DOM構築中なら、DOMContentLoaded後に初期化する。
    document.addEventListener('DOMContentLoaded', () => {
      ReportApp.initialize();
      new FloatingInfo();
      TitleLinkClipboard.initialize();
    });
  }
}

// ============================================================================
// エントリーポイント
// ============================================================================

/**
 * このファイルが読み込まれた時点で、レポートページの初期化フローを開始する。
 * DOMReadyHandler側でDOM構築状態を吸収するため、ここでは一度だけ呼び出す。
 */
DOMReadyHandler.initialize();
