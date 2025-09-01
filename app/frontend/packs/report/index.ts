/**
 * This module provides a comprehensive system for rendering TogoVar report pages
 * with interactive stanza components. It handles configuration processing,
 * environment variable resolution, DOM manipulation, and stanza lifecycle management.
 *
 * ## Architecture Overview
 *
 * The application is built around several key classes:
 *
 * - **ConfigProcessor**: Processes YAML configuration and resolves environment variables
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
 * - **dom**: CSS selector for the target DOM element
 * - **src**: Optional custom JavaScript source URL
 * - **options**: Configuration parameters passed to the stanza
 *
 * ## Environment Variables
 *
 * The system supports template variables in configuration:
 *
 * - `$TOGOVAR_FRONTEND_API_URL` - Base API endpoint
 * - `$TOGOVAR_FRONTEND_REFERENCE` - Reference genome assembly
 * - `$TOGOVAR_STANZA_SPARQLIST` - SPARQLiST endpoint
 * - And more...
 *
 */

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
// Interface Definitions
// ============================================================================

/**
 * Environment configuration interface defining all endpoint URLs and settings
 * used by the stanza components.
 */
interface EnvironmentConfig {
  readonly TOGOVAR_FRONTEND_API_URL: string; // Base API URL for TogoVar services
  readonly TOGOVAR_FRONTEND_REFERENCE: string; // Reference genome assembly (GRCh37/GRCh38)
  readonly TOGOVAR_STANZA_SPARQL: string; // SPARQL endpoint URL for semantic queries
  readonly TOGOVAR_STANZA_SPARQLIST: string; // SPARQLiST endpoint URL for predefined queries
  readonly TOGOVAR_STANZA_SEARCH: string; // Search endpoint URL for variant searches
  readonly TOGOVAR_STANZA_JBROWSE: string; // JBrowse genomic browser endpoint URL
}

/**
 * Configuration for a single stanza component, defining its behavior and placement.
 */
interface StanzaConfig {
  id: string; // Unique identifier for the stanza component
  targetSelector: string; // CSS selector for the DOM element where the stanza will be rendered
  scriptUrl?: string; // Optional custom source URL for the stanza JavaScript file
  options?: Record<string, unknown>; // Optional configuration options passed to the stanza component
}

/**
 * Report page configuration containing all stanzas and base options for a specific report type.
 */
interface ReportConfig {
  base_options?: Record<string, unknown>; // Base options applied to all stanzas in this report
  stanza?: StanzaConfig[]; // Array of stanza configurations to render on this report page
  id?: string; // Key name for the report identifier (default: 'id')
}

/**
 * Route parsing result containing report type and identifier.
 */
interface RouteInfo {
  reportType: string; // Type of report (variant, gene, disease, etc.)
  reportId: string; // Unique identifier for the specific report item
}

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
 * Processes YAML configuration by recursively replacing environment variables
 * with their actual values from ENV_CONFIG.
 *
 * Supports both `$VAR_NAME` and `${VAR_NAME}` syntax for environment variable references.
 */
class ConfigProcessor {
  /**
   * Recursively processes a configuration object, replacing environment variables.
   *
   * @param configObject - Raw configuration object from YAML file
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
        return this.replaceEnvironmentVariables(item);
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
   * const result = ConfigProcessor.replaceEnvironmentVariables("$TOGOVAR_FRONTEND_API_URL/api");
   * // Returns: "https://grch37.togovar.org/api"
   * ```
   */
  private static replaceEnvironmentVariables(templateString: string): string {
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
const REPORT_CONFIG = ConfigProcessor.processConfig(
  require('../../assets/stanza.json')
) as Record<string, ReportConfig>;

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
      } else if (this.isUrl(attributeValue)) {
        // Format URLs with proper encoding
        formattedAttributes[attributeName] = this.formatUrl(
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
  private static isUrl(value: unknown): value is string {
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
   * const formatted = OptionFormatter.formatUrl("https://example.com?name=John Doe&age=30");
   * // Returns: "https://example.com?name=John%20Doe&age=30"
   * ```
   */
  private static formatUrl(urlString: string): string {
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

    if (!this.validateStanzaConfig(stanzaConfig)) {
      console.error('Invalid stanza config:', stanzaConfig);
      return;
    }

    this.loadStanzaScript(scriptUrl || `${STANZA_PATH}/${id}.js`);
    this.createAndInsertStanzaElement(id, targetSelector, baseOptions, options);
  }

  /**
   * Validates that a stanza configuration contains all required properties.
   *
   * @param config - Stanza configuration to validate
   * @returns True if configuration is valid, false otherwise
   */
  private static validateStanzaConfig({
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
  private static loadStanzaScript(scriptSourceUrl: string): void {
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
  private static createAndInsertStanzaElement(
    stanzaId: string,
    targetSelector: string,
    baseOptions: Record<string, unknown>,
    stanzaOptions?: Record<string, unknown>
  ): void {
    // Create the custom element with standardized naming convention
    const stanzaElement = document.createElement(`togostanza-${stanzaId}`);

    // Apply all options as HTML attributes
    this.applyAttributesToElement(
      stanzaElement,
      this.convertObjectToStringRecord(baseOptions)
    );
    this.applyAttributesToElement(
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
  private static convertObjectToStringRecord(
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
  private static applyAttributesToElement(
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
   * Initializes the report application and renders all configured stanzas.
   *
   * This is the main entry point that coordinates the entire report rendering process.
   * It handles error cases gracefully and provides detailed logging for debugging.
   */
  static initialize(): void {
    const routeInfo = this.parseCurrentRoute();
    const reportConfig = this.getReportConfig(routeInfo.reportType);

    if (!reportConfig) {
      console.error(
        `No configuration found for report type: ${routeInfo.reportType}`
      );
      return;
    }

    const baseOptions = this.prepareBaseOptions(
      reportConfig,
      routeInfo.reportId
    );

    this.updatePageElements(routeInfo.reportId);
    this.renderAllStanzas(
      reportConfig.stanza || [],
      baseOptions,
      routeInfo.reportId,
      reportConfig.id
    );
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
   * const route = ReportApp.parseCurrentRoute();
   * // Returns: { reportType: "variant", reportId: "tgv123456" }
   * ```
   */
  private static parseCurrentRoute(): RouteInfo {
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
  private static getReportConfig(reportType: string): ReportConfig | undefined {
    return REPORT_CONFIG[reportType];
  }

  /**
   * Prepares base options that will be applied to all stanzas in the report.
   *
   * Base options include common configuration like endpoints and the report ID
   * mapped to the appropriate key name (configurable per report type).
   *
   * @param reportConfig - Configuration for the current report type
   * @param reportId - Identifier for the specific report item
   * @returns Base options object ready for stanza application
   *
   * @example
   * ```typescript
   * const config = { base_options: { sparqlist: "/api" }, id: "tgv_id" };
   * const options = ReportApp.prepareBaseOptions(config, "tgv123456");
   * // Returns: { sparqlist: "/api", tgv_id: "tgv123456" }
   * ```
   */
  private static prepareBaseOptions(
    reportConfig: ReportConfig,
    reportId: string
  ): Record<string, unknown> {
    const baseOptions = reportConfig.base_options
      ? { ...reportConfig.base_options }
      : {};

    // Add the report ID using the configured key name (default: 'id')
    const idKey = reportConfig.id || 'id';
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
  private static updatePageElements(reportId: string): void {
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
  private static renderAllStanzas(
    stanzas: StanzaConfig[],
    baseOptions: Record<string, unknown>,
    reportId: string,
    idKey: string = 'id'
  ): void {
    stanzas.forEach((stanza) => {
      const processedStanza = this.processStanzaTemplateVariables(
        stanza,
        reportId,
        idKey
      );
      StanzaManager.createStanzaAndInsertIntoDOM(processedStanza, baseOptions);
    });
  }

  /**
   * Processes template variables in stanza options, replacing placeholders with actual values.
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
   * const processed = ReportApp.processStanzaTemplateVariables(stanza, "tgv123456", "tgv_id");
   * // Result: { ...stanza, options: { url: "/api/variant/tgv123456" } }
   * ```
   */
  private static processStanzaTemplateVariables(
    stanzaConfig: StanzaConfig,
    reportId: string,
    idKeyName: string
  ): StanzaConfig {
    if (!stanzaConfig.options) {
      return stanzaConfig;
    }

    const processedStanzaConfig: StanzaConfig = { ...stanzaConfig };
    processedStanzaConfig.options = { ...stanzaConfig.options };

    // Process each option value for template variables
    for (const [optionKey, optionValue] of Object.entries(
      processedStanzaConfig.options
    )) {
      if (typeof optionValue === 'string' && optionValue.includes('$')) {
        // Replace both ${var} and $var syntax
        const templateVariablePattern = new RegExp(
          `\\$(${idKeyName}|{${idKeyName}})`,
          'g'
        );
        processedStanzaConfig.options[optionKey] = optionValue.replace(
          templateVariablePattern,
          reportId
        );
      }
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
    if (document.readyState === 'loading') {
      // DOM is still loading, wait for it to complete
      document.addEventListener('DOMContentLoaded', () => {
        ReportApp.initialize();
      });
    } else {
      // DOM is already loaded, start immediately
      ReportApp.initialize();
    }
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
