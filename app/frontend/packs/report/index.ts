/**
 * Report Stanza Application
 * 
 * This module handles the initialization and management of stanza elements
 * for TogoVar report pages. It processes configuration, manages DOM elements,
 * and coordinates the rendering of interactive stanza components.
 * 
 * @module ReportStanzaApp
 */

// Type declarations for global variables
declare const TOGOVAR_FRONTEND_API_URL: string | undefined;
declare const TOGOVAR_FRONTEND_REFERENCE: string | undefined;
declare const TOGOVAR_ENDPOINT_SPARQL: string | undefined;
declare const TOGOVAR_ENDPOINT_SPARQLIST: string | undefined;
declare const TOGOVAR_ENDPOINT_SEARCH: string | undefined;
declare const TOGOVAR_ENDPOINT_JBROWSE: string | undefined;
declare const TOGOVAR_FRONTEND_STANZA_URL: string | undefined;

/**
 * Environment configuration interface
 */
interface EnvironmentConfig {
  readonly TOGOVAR_FRONTEND_API_URL: string;
  readonly TOGOVAR_FRONTEND_REFERENCE: string;
  readonly TOGOVAR_STANZA_SPARQL: string;
  readonly TOGOVAR_STANZA_SPARQLIST: string;
  readonly TOGOVAR_STANZA_SEARCH: string;
  readonly TOGOVAR_STANZA_JBROWSE: string;
}

/**
 * Stanza configuration interface
 */
interface StanzaConfig {
  id: string;
  dom: string;
  src?: string;
  options?: Record<string, unknown>;
}

/**
 * Report configuration interface
 */
interface ReportConfig {
  base_options?: Record<string, unknown>;
  stanza?: StanzaConfig[];
  id?: string;
}

/**
 * Route parsing result interface
 */
interface RouteInfo {
  reportType: string;
  reportId: string;
}

/**
 * Environment configuration with fallbacks
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

const DEFAULT_STANZA_PATH: string = 'https://togovar.github.io/stanza';
const STANZA_PATH: string = TOGOVAR_FRONTEND_STANZA_URL || DEFAULT_STANZA_PATH;

/**
 * Configuration processor with recursive environment variable replacement
 */
class ConfigProcessor {
  static processConfig(configObject: unknown): unknown {
    const replaceRecursively = (obj: unknown): unknown => {
      if (typeof obj === 'string' && obj.includes('$')) {
        return this.replaceEnvironmentVariables(obj);
      }

      if (Array.isArray(obj)) {
        return obj.map(replaceRecursively);
      }

      if (obj && typeof obj === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = replaceRecursively(value);
        }
        return result;
      }

      return obj;
    };

    return replaceRecursively(configObject);
  }

  static replaceEnvironmentVariables(str: string): string {
    const envVarRegex = /(\$([A-Z_]+)|\${([A-Z_]+)})/g;
    return str.replace(envVarRegex, (match: string, _: string, key1?: string, key2?: string): string => {
      const key = key1 || key2;
      return key ? ENV_CONFIG[key as keyof EnvironmentConfig] || '' : '';
    });
  }
}

const config = ConfigProcessor.processConfig(
  require('../../config/stanza.yaml')
) as Record<string, ReportConfig>;

/**
 * Option formatter for stanza configuration
 */
class OptionFormatter {
  static format(config: Record<string, unknown> | undefined): Record<string, string> {
    if (!config) return {};

    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(config)) {
      if (value && typeof value === 'object') {
        result[key] = JSON.stringify(value);
      } else if (this.isUrl(value)) {
        result[key] = this.formatUrl(value as string);
      } else {
        result[key] = String(value);
      }
    }

    return result;
  }

  static isUrl(value: unknown): value is string {
    return typeof value === 'string' && /^https?:\/\//.test(value);
  }

  static formatUrl(urlString: string): string {
    const url = new URL(urlString);

    // Rebuild search params with proper encoding
    url.search = [...url.searchParams]
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');

    return url.href;
  }
}

/**
 * Stanza manager for handling stanza elements
 */
class StanzaManager {
  static appendStanzaTag(stanzaConfig: StanzaConfig, baseOptions: Record<string, unknown> = {}): void {
    const { id, dom, src, options } = stanzaConfig;

    if (!this.validateConfig(stanzaConfig)) {
      console.error('Invalid stanza config:', stanzaConfig);
      return;
    }

    this.createScript(src || `${STANZA_PATH}/${id}.js`);
    this.createStanzaElement(id, dom, baseOptions, options);
  }

  static validateConfig({ id, dom }: StanzaConfig): boolean {
    if (!id) {
      console.error("Missing required key: 'id'");
      return false;
    }

    if (!dom) {
      console.error("Missing required key: 'dom'");
      return false;
    }

    return true;
  }

  static createScript(src: string): void {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = src;
    script.async = true;
    document.head.appendChild(script);
  }

  static createStanzaElement(
    id: string, 
    domSelector: string, 
    baseOptions: Record<string, unknown>, 
    options?: Record<string, unknown>
  ): void {
    const stanzaElement = document.createElement(`togostanza-${id}`);

    this.setAttributes(stanzaElement, this.convertToStringRecord(baseOptions));
    this.setAttributes(stanzaElement, OptionFormatter.format(options));

    const targetElement = document.querySelector(domSelector);
    
    if (targetElement) {
      targetElement.appendChild(stanzaElement);
    } else {
      console.warn(`Target element not found: ${domSelector}`);
    }
  }

  static convertToStringRecord(obj: Record<string, unknown>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = String(value);
    }
    return result;
  }

  static setAttributes(element: Element, attributes: Record<string, string>): void {
    if (!attributes) return;

    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, value);
    }
  }
}

/**
 * Report application initializer
 */
class ReportApp {
  static initialize(): void {
    const { reportType, reportId } = this.parseRoute();
    
    const reportConfig = this.getReportConfig(reportType);

    if (!reportConfig) {
      console.error(`No configuration found for report type: ${reportType}`);
      return;
    }

    const baseOptions = this.prepareBaseOptions(reportConfig, reportId);

    this.updateReportIdElements(reportId);
    this.processStanzas(
      reportConfig.stanza || [],
      baseOptions,
      reportId,
      reportConfig.id
    );
  }

  static parseRoute(): RouteInfo {
    const pathSegments = window.location.pathname.split('/').slice(-2);
    return {
      reportType: pathSegments[0],
      reportId: pathSegments[1],
    };
  }

  static getReportConfig(reportType: string): ReportConfig | undefined {
    return config[reportType];
  }

  static prepareBaseOptions(reportConfig: ReportConfig, reportId: string): Record<string, unknown> {
    const baseOptions = reportConfig.base_options ? { ...reportConfig.base_options } : {};
    const idKey = reportConfig.id || 'id';
    baseOptions[idKey] = reportId;
    return baseOptions;
  }

  static updateReportIdElements(reportId: string): void {
    const reportIdElements = document.querySelectorAll('.report_id');
    reportIdElements.forEach((element) => {
      element.textContent = reportId;
    });
  }

  static processStanzas(
    stanzas: StanzaConfig[], 
    baseOptions: Record<string, unknown>, 
    reportId: string, 
    idKey: string = 'id'
  ): void {
    stanzas.forEach((stanza) => {
      const processedStanza = this.processStanzaOptions(
        stanza,
        reportId,
        idKey
      );
      StanzaManager.appendStanzaTag(processedStanza, baseOptions);
    });
  }

  static processStanzaOptions(stanza: StanzaConfig, reportId: string, idKey: string): StanzaConfig {
    if (!stanza.options) {
      return stanza;
    }

    const processedStanza: StanzaConfig = { ...stanza };
    processedStanza.options = { ...stanza.options };

    for (const [key, value] of Object.entries(processedStanza.options)) {
      if (typeof value === 'string' && value.includes('$')) {
        const idRegex = new RegExp(`\\$(${idKey}|{${idKey}})`, 'g');
        processedStanza.options[key] = value.replace(idRegex, reportId);
      }
    }

    return processedStanza;
  }
}

/**
 * DOM ready handler
 */
class DOMReadyHandler {
  static initialize(): void {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () =>
        ReportApp.initialize()
      );
    } else {
      ReportApp.initialize();
    }
  }
}

// Start the application
DOMReadyHandler.initialize();
