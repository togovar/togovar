import stanzaConfigJson from '../../assets/stanza.json';
import FloatingInfo from '../../src/components/FloatingInfo';

/**
 * This module provides a comprehensive system for rendering TogoVar report pages
 * with interactive stanza components. It handles configuration processing,
 * environment variable resolution, DOM manipulation, and stanza lifecycle management.
 *
 * ## Architecture Overview
 *
 * The application is built around several key classes:
 *
 * - **ConfigProcessor**: Processes JSON configuration and resolves environment variables
 * - **OptionFormatter**: Formats stanza options for HTML attribute assignment
 * - **StanzaManager**: Manages stanza creation, validation, and DOM insertion
 * - **ReportApp**: Orchestrates the entire report rendering process
 * - **DOMReadyHandler**: Handles application bootstrap and DOM ready detection
 *
 * ## Usage
 *
 * The application automatically initializes when the DOM is ready:
 *
 * ```typescript
 * // Automatic initialization - no manual setup required
 * // 1. Parses current URL route (e.g., /variant/tgv123456)
 * // 2. Loads configuration for the report type
 * // 3. Renders all configured stanza components
 * ```
 *
 * ## Stanza Components
 *
 * Stanzas are reusable web components that render specific data visualizations.
 * Each stanza is defined in the YAML configuration with:
 *
 * - **id**: Unique identifier for the stanza type
 * - **targetSelector**: CSS selector for the target DOM element
 * - **scriptUrl**: Optional custom JavaScript source URL
 * - **options**: Configuration parameters passed to the stanza
 *
 * ## Environment Variables
 *
 * The system supports template variables in configuration:
 *
 * - `$TOGOVAR_FRONTEND_API_URL` - Base API endpoint (e.g., https://grch37.togovar.org)
 * - `$TOGOVAR_FRONTEND_REFERENCE` - Reference genome assembly (GRCh37/GRCh38)
 * - `$TOGOVAR_STANZA_SPARQLIST` - SPARQLiST endpoint for predefined queries
 * - `$TOGOVAR_STANZA_JBROWSE` - JBrowse genomic browser endpoint
 * - `$TOGOVAR_ENDPOINT_SPARQL` - SPARQL endpoint for semantic queries
 * - `$TOGOVAR_ENDPOINT_SEARCH` - Search endpoint for variant searches
 * - `$TOGOVAR_FRONTEND_STANZA_URL` - Custom stanza JavaScript source URL
 *
 */

import type {
  EnvironmentConfig,
  StanzaConfig,
  ReportConfig,
  RouteInfo,
} from '../../src/types/index';

// ============================================================================
// Type Declarations
// ============================================================================

/** Global environment variables injected at build time */
declare const TOGOVAR_FRONTEND_API_URL: string | undefined;
declare const TOGOVAR_FRONTEND_REFERENCE: string | undefined;
declare const TOGOVAR_ENDPOINT_SPARQL: string | undefined;
declare const TOGOVAR_ENDPOINT_SPARQLIST: string | undefined;
declare const TOGOVAR_ENDPOINT_SEARCH: string | undefined;
declare const TOGOVAR_ENDPOINT_JBROWSE: string | undefined;
declare const TOGOVAR_FRONTEND_STANZA_URL: string | undefined;

// ============================================================================
// Constants and Configuration
// ============================================================================

/**
 * Environment configuration with fallback values for all required endpoints.
 * These values are populated from global variables injected at build time.
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

/** Default base URL for stanza component JavaScript files */
const DEFAULT_STANZA_PATH: string = 'https://togovar.github.io/stanza';

/** Actual stanza path with override capability */
const STANZA_PATH: string = TOGOVAR_FRONTEND_STANZA_URL || DEFAULT_STANZA_PATH;

// ============================================================================
// Configuration Processing
// ============================================================================

/**
 * Processes JSON configuration by recursively replacing environment variables
 * with their actual values from ENV_CONFIG.
 *
 * Supports both `$VAR_NAME` and `${VAR_NAME}` syntax for environment variable references.
 */
class ConfigProcessor {
  /**
   * Recursively processes a configuration object, replacing environment variables.
   *
   * @param configObject - Raw configuration object from JSON file
   * @returns Processed configuration with environment variables resolved
   *
   * @example
   * ```typescript
   * const rawConfig = { url: "$TOGOVAR_FRONTEND_API_URL/api" };
   * const processed = ConfigProcessor.processConfig(rawConfig);
   * // Result: { url: "https://grch37.togovar.org/api" }
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
   * Replaces environment variable placeholders in a string with actual values.
   *
   * @param templateString - String containing environment variable references
   * @returns String with variables replaced by their values
   *
   * @example
   * ```typescript
   * const result = ConfigProcessor._replaceEnvironmentVariables("$TOGOVAR_FRONTEND_API_URL/api");
   * // Returns: "https://grch37.togovar.org/api"
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

/** Processed configuration loaded from JSON with environment variables resolved */
const REPORT_CONFIG = ConfigProcessor.processConfig(stanzaConfigJson) as Record<
  string,
  ReportConfig
>;

// ============================================================================
// Option Formatting
// ============================================================================

/**
 * Formats and normalizes stanza options for HTML attribute assignment.
 * Handles object serialization, URL formatting, and type conversion.
 */
class OptionFormatter {
  /**
   * Converts stanza options to a string-based record suitable for HTML attributes.
   *
   * @param options - Raw stanza options from configuration
   * @returns String-based record ready for HTML attribute assignment
   *
   * @example
   * ```typescript
   * const options = { count: 10, url: "https://example.com?a=1&b=2", data: { key: "value" } };
   * const formatted = OptionFormatter.format(options);
   * // Result: { count: "10", url: "https://example.com?a=1&b=2", data: '{"key":"value"}' }
   * ```
   */
  static format(
    options: Record<string, unknown> | undefined
  ): Record<string, string> {
    if (!options) return {};

    const formattedAttributes: Record<string, string> = {};

    for (const [attributeName, attributeValue] of Object.entries(options)) {
      if (attributeValue && typeof attributeValue === 'object') {
        // Serialize objects to JSON strings
        formattedAttributes[attributeName] = JSON.stringify(attributeValue);
      } else if (this._isUrl(attributeValue)) {
        // Format URLs with proper encoding
        formattedAttributes[attributeName] = this._formatUrl(
          attributeValue as string
        );
      } else {
        // Convert all other values to strings
        formattedAttributes[attributeName] = String(attributeValue);
      }
    }

    return formattedAttributes;
  }

  /**
   * Type guard to check if a value is a URL string.
   *
   * @param value - Value to check
   * @returns True if value is a URL string starting with http/https
   */
  private static _isUrl(value: unknown): value is string {
    return typeof value === 'string' && /^https?:\/\//.test(value);
  }

  /**
   * Formats a URL string with proper parameter encoding.
   *
   * @param urlString - URL string to format
   * @returns Properly formatted URL with encoded parameters
   *
   * @example
   * ```typescript
   * const formatted = OptionFormatter._formatUrl("https://example.com?name=John Doe&age=30");
   * // Returns: "https://example.com?name=John%20Doe&age=30"
   * ```
   */
  private static _formatUrl(urlString: string): string {
    const url = new URL(urlString);

    // Rebuild search params with proper encoding
    url.search = [...url.searchParams]
      .filter(([, value]) => value) // Remove empty parameters
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');

    return url.href;
  }
}

// ============================================================================
// Stanza Management
// ============================================================================

/**
 * Manages the creation, validation, and DOM insertion of stanza components.
 *
 * Stanzas are reusable web components that render specific data visualizations
 * or interactive elements. This class handles their lifecycle from script loading
 * to DOM element creation and attribute assignment.
 */
class StanzaManager {
  /**
   * Creates and appends a stanza component to the DOM.
   *
   * This is the main entry point for stanza creation. It validates the configuration,
   * loads the required JavaScript module, creates the custom element, and inserts
   * it into the target DOM location.
   *
   * @param stanzaConfig - Configuration defining the stanza behavior
   * @param baseOptions - Base options applied to all stanzas
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

    this._loadStanzaScript(scriptUrl || `${STANZA_PATH}/${id}.js`);
    this._createAndInsertStanzaElement(
      id,
      targetSelector,
      baseOptions,
      options
    );
  }

  /**
   * Validates that a stanza configuration contains all required properties.
   *
   * @param config - Stanza configuration to validate
   * @returns True if configuration is valid, false otherwise
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
   * Dynamically loads a stanza JavaScript module by creating a script element.
   *
   * @param scriptSourceUrl - URL of the stanza JavaScript file
   */
  private static _loadStanzaScript(scriptSourceUrl: string): void {
    const scriptElement = document.createElement('script');
    scriptElement.type = 'module';
    scriptElement.src = scriptSourceUrl;
    scriptElement.async = true;
    document.head.appendChild(scriptElement);
  }

  /**
   * Creates a stanza custom element and inserts it into the target DOM location.
   *
   * @param stanzaId - Stanza identifier used to create the custom element name
   * @param targetSelector - CSS selector for the target DOM element
   * @param baseOptions - Base options applied to all stanzas
   * @param stanzaOptions - Specific options for this stanza instance
   */
  private static _createAndInsertStanzaElement(
    stanzaId: string,
    targetSelector: string,
    baseOptions: Record<string, unknown>,
    stanzaOptions?: Record<string, unknown>
  ): void {
    // Create the custom element with standardized naming convention
    const stanzaElement = document.createElement(`togostanza-${stanzaId}`);

    // Apply all options as HTML attributes
    this._applyAttributesToElement(
      stanzaElement,
      this._convertObjectToStringRecord(baseOptions)
    );
    this._applyAttributesToElement(
      stanzaElement,
      OptionFormatter.format(stanzaOptions)
    );

    // Find target element and insert stanza
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
   * Converts an object with unknown value types to string-only record.
   *
   * @param objectToConvert - Object to convert
   * @returns Record with all values converted to strings
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
   * Applies a set of attributes to a DOM element.
   *
   * @param element - Target DOM element
   * @param attributes - Key-value pairs to set as HTML attributes
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
// Report Application
// ============================================================================

/**
 * Main application class responsible for initializing and managing TogoVar report pages.
 *
 * This class orchestrates the entire report rendering process:
 * 1. Parses the current page route to determine report type and ID
 * 2. Loads the appropriate configuration for the report type
 * 3. Prepares base options and processes stanza configurations
 * 4. Updates page elements and renders all stanzas
 */
class ReportApp {
  /**
   * variant page が chr-pos-ref-alt 形式のURLでもtgvidへ解決してから描画できるよう、非同期化している。
   *
   * This is the main entry point that coordinates the entire report rendering process.
   * It handles error cases gracefully and provides detailed logging for debugging.
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

    const { reportId, idKey } = await this._resolveRouteId(
      routeInfo,
      reportConfig
    );

    const baseOptions = this._prepareBaseOptions(reportConfig, reportId, idKey);

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

  /** chr-pos-ref-alt形式のURLをパースするための正規表現。各要素内のハイフンはURLエンコード済みである前提。 */
  private static readonly VARIANT_LOCUS_PATTERN =
    /^([^-]+)-(\d+)-([^-]+)-([^-]+)$/;
  /** 1回のAPI取得件数は仕様上1000が上限のため、tgvid解決も同じ単位でページングする。 */
  private static readonly TGV_ID_RESOLUTION_LIMIT = 1000;
  /** 想定外のレスポンスで無限に辿らないよう、search-afterページングの安全上限を置く。 */
  private static readonly TGV_ID_RESOLUTION_MAX_PAGES = 100;

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
  ): Promise<{ reportId: string; idKey: string }> {
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

    if (tgvId) {
      return { reportId: tgvId, idKey: defaultIdKey };
    }

    return {
      reportId: this._formatVariantLocusId(variant),
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
    try {
      let offset: [string, number, string, string] | undefined;

      for (let page = 0; page < this.TGV_ID_RESOLUTION_MAX_PAGES; page += 1) {
        const result = await this._fetchVariantResolutionPage(variant, offset);
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
      console.error('Failed to resolve TogoVar ID from variant locus', error);
      return null;
    }
  }

  /**
   * location条件だけでは同一座標の候補が1000件を超える可能性があるため、
   * search-after用offsetを渡せる形で1ページずつ取得する。
   */
  private static async _fetchVariantResolutionPage(
    variant: {
      chromosome: string;
      position: number;
    },
    offset?: [string, number, string, string]
  ): Promise<{
    data: Array<{
      id?: string;
      chromosome?: string;
      position?: number;
      reference?: string;
      alternate?: string;
      alternative?: string;
    }>;
  }> {
    const body: {
      query: {
        location: {
          chromosome: string;
          position: number;
        };
      };
      offset?: [string, number, string, string];
    } = {
      query: {
        location: {
          chromosome: variant.chromosome,
          position: variant.position,
        },
      },
    };

    if (offset) {
      body.offset = offset;
    }

    const response = await fetch(
      `${ENV_CONFIG.TOGOVAR_FRONTEND_API_URL}/api/search/variant?stat=0&data=1&limit=${this.TGV_ID_RESOLUTION_LIMIT}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error(`Unexpected response status: ${response.status}`);
    }

    const result = (await response.json()) as {
      data?: Array<{
        id?: string;
        chromosome?: string;
        position?: number;
        reference?: string;
        alternate?: string;
        alternative?: string;
      }>;
    };

    return { data: result.data ?? [] };
  }

  /**
   * APIレスポンスではalternate/alternativeが移行中で混在し得るため、両方を同じALTとして比較する。
   */
  private static _isSameVariantAllele(
    item: {
      reference?: string;
      alternate?: string;
      alternative?: string;
    },
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
    data: Array<{
      chromosome?: string;
      position?: number;
      reference?: string;
      alternate?: string;
      alternative?: string;
    }>
  ): [string, number, string, string] | undefined {
    const last = data[data.length - 1];
    const alternate = last?.alternate ?? last?.alternative;

    if (
      !last?.chromosome ||
      typeof last.position !== 'number' ||
      !last.reference ||
      !alternate
    ) {
      return undefined;
    }

    return [last.chromosome, last.position, last.reference, alternate];
  }

  /**
   * Parses the current URL to extract report type and identifier.
   *
   * Expects URLs in the format: `/[report-type]/[report-id]`
   * Examples: `/variant/tgv123456`, `/gene/BRCA1`, `/disease/C0006142`
   *
   * @returns Object containing parsed route information
   *
   * @example
   * ```typescript
   * // URL: https://example.com/variant/tgv123456
   * const route = ReportApp._parseCurrentRoute();
   * // Returns: { reportType: "variant", reportId: "tgv123456" }
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
   * Retrieves the configuration for a specific report type.
   *
   * @param reportType - Type of report (variant, gene, disease, etc.)
   * @returns Report configuration or undefined if not found
   */
  private static _getReportConfig(
    reportType: string
  ): ReportConfig | undefined {
    return REPORT_CONFIG[reportType];
  }

  /**
   * idKeyを呼び出し元(_resolveRouteId)から明示的に受け取る。tgvid解決の成否によって
   * 'tgv_id' と fallback_id('variant' など)が切り替わるため、ここでは導出しない。
   * fallback_idがあるレポートでは未使用側も空文字で渡し、Stanza側のlength判定を安定させる。
   *
   * @param reportConfig - Configuration for the current report type
   * @param reportId - Identifier for the specific report item
   * @param idKey - Attribute key name used to expose the report ID to stanzas
   * @returns Base options object ready for stanza application
   *
   * @example
   * ```typescript
   * const config = { base_options: { sparqlist: "/api" } };
   * const options = ReportApp._prepareBaseOptions(config, "tgv123456", "tgv_id");
   * // Returns: { sparqlist: "/api", tgv_id: "tgv123456" }
   * ```
   */
  private static _prepareBaseOptions(
    reportConfig: ReportConfig,
    reportId: string,
    idKey: string
  ): Record<string, unknown> {
    const baseOptions = reportConfig.base_options
      ? { ...reportConfig.base_options }
      : {};

    if (reportConfig.id && reportConfig.fallback_id) {
      baseOptions[reportConfig.id] = '';
      baseOptions[reportConfig.fallback_id] = '';
    }

    baseOptions[idKey] = reportId;

    return baseOptions;
  }

  /**
   * Updates all page elements that should display the report ID.
   *
   * Searches for elements with the CSS class 'report_id' and updates their
   * text content to show the current report identifier.
   *
   * @param reportId - Identifier to display in page elements
   */
  private static _updatePageElements(reportId: string): void {
    const reportIdElements = document.querySelectorAll('.report_id');
    reportIdElements.forEach((element) => {
      element.textContent = reportId;
    });
  }

  /**
   * Processes and renders all stanzas configured for this report type.
   *
   * For each stanza configuration:
   * 1. Processes any template variables in the options
   * 2. Creates and inserts the stanza element via StanzaManager
   *
   * @param stanzas - Array of stanza configurations to render
   * @param baseOptions - Base options applied to all stanzas
   * @param reportId - Report identifier for template variable replacement
   * @param idKey - Key name for the report ID in template variables
   */
  private static _renderAllStanzas(
    stanzas: StanzaConfig[],
    baseOptions: Record<string, unknown>,
    reportId: string,
    idKey: string = 'id'
  ): void {
    const currentReference = ENV_CONFIG.TOGOVAR_FRONTEND_REFERENCE;

    stanzas.forEach((stanza) => {
      // Skip stanza if references are specified and current reference doesn't match
      if (stanza.references && !stanza.references.includes(currentReference)) {
        // Hide the target element if it exists
        const targetElement = document.querySelector(stanza.targetSelector);
        if (targetElement) {
          const parentSection = targetElement.closest(
            'section.stanza-view'
          ) as HTMLElement;
          if (parentSection) {
            parentSection.style.display = 'none';
          }
        }
        return;
      }

      const processedStanza = this._processStanzaTemplateVariables(
        stanza,
        reportId,
        idKey
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
   * Supports template syntax like `${report_id}` or `$report_id` where the variable
   * name matches the configured ID key for the report type.
   *
   * @param stanzaConfig - Original stanza configuration
   * @param reportId - Value to substitute for template variables
   * @param idKeyName - Variable name to look for in templates
   * @returns Stanza configuration with template variables resolved
   *
   * @example
   * ```typescript
   * const stanza = {
   *   id: "variant-summary",
   *   targetSelector: "#summary",
   *   options: { url: "/api/variant/${tgv_id}" }
   * };
   * const processed = ReportApp._processStanzaTemplateVariables(stanza, "tgv123456", "tgv_id");
   * // Result: { ...stanza, options: { url: "/api/variant/tgv123456" } }
   * ```
   */
  private static _processStanzaTemplateVariables(
    stanzaConfig: StanzaConfig,
    reportId: string,
    idKeyName: string
  ): StanzaConfig {
    if (!stanzaConfig.options) {
      return stanzaConfig;
    }

    const processedStanzaConfig: StanzaConfig = { ...stanzaConfig };
    processedStanzaConfig.options = { ...stanzaConfig.options };

    const tokens: Array<[string, string]> = [
      [idKeyName, reportId],
      ['id_param', idKeyName],
      ['id_value', encodeURIComponent(reportId)],
    ];

    // Process each option value for template variables
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
}

// ============================================================================
// Application Bootstrap
// ============================================================================

/**
 * Handles DOM ready state detection and application initialization.
 *
 * Ensures the report application only starts after the DOM is fully loaded,
 * supporting both scenarios where the script loads before or after DOM completion.
 */
class DOMReadyHandler {
  /**
   * Initializes the report application when the DOM is ready.
   */
  static initialize(): void {
    if (document.readyState !== 'loading') {
      // DOM is already loaded, start immediately
      ReportApp.initialize();
      new FloatingInfo();
      return;
    }

    // DOM is still loading, wait for it to complete
    document.addEventListener('DOMContentLoaded', () => {
      ReportApp.initialize();
      new FloatingInfo();
    });
  }
}

// ============================================================================
// Application Entry Point
// ============================================================================

/**
 * Start the TogoVar report application.
 *
 * This begins the initialization process that will:
 * 1. Wait for DOM ready state
 * 2. Parse the current route
 * 3. Load report configuration
 * 4. Render all configured stanzas
 */
DOMReadyHandler.initialize();
