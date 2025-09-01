/**
 * Report Stanza Application
 *
 * This module handles the initialization and management of stanza elements
 * for TogoVar report pages. It processes configuration, manages DOM elements,
 * and coordinates the rendering of interactive stanza components.
 *
 * @module ReportStanzaApp
 */

/**
 * Environment configuration with fallbacks
 */
const ENV_CONFIG = {
  TOGOVAR_FRONTEND_API_URL:
    TOGOVAR_FRONTEND_API_URL || 'https://grch37.togovar.org',
  TOGOVAR_FRONTEND_REFERENCE: TOGOVAR_FRONTEND_REFERENCE || 'GRCh37',
  TOGOVAR_STANZA_SPARQL: TOGOVAR_ENDPOINT_SPARQL || '/sparql',
  TOGOVAR_STANZA_SPARQLIST: TOGOVAR_ENDPOINT_SPARQLIST || '/sparqlist',
  TOGOVAR_STANZA_SEARCH: TOGOVAR_ENDPOINT_SEARCH || '/search',
  TOGOVAR_STANZA_JBROWSE: TOGOVAR_ENDPOINT_JBROWSE || '/jbrowse',
};

const DEFAULT_STANZA_PATH = 'https://togovar.github.io/stanza';
const STANZA_PATH = TOGOVAR_FRONTEND_STANZA_URL || DEFAULT_STANZA_PATH;

/**
 * Configuration processor with recursive environment variable replacement
 */
class ConfigProcessor {
  static processConfig(configObject) {
    const replaceRecursively = (obj) => {
      if (typeof obj === 'string' && obj.includes('$')) {
        return this.replaceEnvironmentVariables(obj);
      }

      if (Array.isArray(obj)) {
        return obj.map(replaceRecursively);
      }

      if (obj && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = replaceRecursively(value);
        }
        return result;
      }

      return obj;
    };

    return replaceRecursively(configObject);
  }

  static replaceEnvironmentVariables(str) {
    const envVarRegex = /(\$([A-Z_]+)|\${([A-Z_]+)})/g;
    return str.replace(envVarRegex, (match, _, key1, key2) => {
      const key = key1 || key2;
      return ENV_CONFIG[key] || '';
    });
  }
}

const config = ConfigProcessor.processConfig(
  require('../../config/stanza.yaml')
);

/**
 * Option formatter for stanza configuration
 */
class OptionFormatter {
  static format(config) {
    if (!config) return {};

    const result = {};

    for (const [key, value] of Object.entries(config)) {
      if (value && typeof value === 'object') {
        result[key] = JSON.stringify(value);
      } else if (this.isUrl(value)) {
        result[key] = this.formatUrl(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  static isUrl(value) {
    return typeof value === 'string' && /^https?:\/\//.test(value);
  }

  static formatUrl(urlString) {
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
  static appendStanzaTag(stanzaConfig, baseOptions = {}) {
    const { id, dom, src, options } = stanzaConfig;

    if (!this.validateConfig(stanzaConfig)) {
      return;
    }

    this.createScript(src || `${STANZA_PATH}/${id}.js`);
    this.createStanzaElement(id, dom, baseOptions, options);
  }

  static validateConfig({ id, dom }) {
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

  static createScript(src) {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = src;
    script.async = true;
    document.head.appendChild(script);
  }

  static createStanzaElement(id, domSelector, baseOptions, options) {
    const stanzaElement = document.createElement(`togostanza-${id}`);

    this.setAttributes(stanzaElement, baseOptions);
    this.setAttributes(stanzaElement, OptionFormatter.format(options));

    const targetElement = document.querySelector(domSelector);
    if (targetElement) {
      targetElement.appendChild(stanzaElement);
    } else {
      console.warn(`Target element not found: ${domSelector}`);
    }
  }

  static setAttributes(element, attributes) {
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
  static initialize() {
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

  static parseRoute() {
    const pathSegments = window.location.pathname.split('/').slice(-2);
    return {
      reportType: pathSegments[0],
      reportId: pathSegments[1],
    };
  }

  static getReportConfig(reportType) {
    return config[reportType];
  }

  static prepareBaseOptions(reportConfig, reportId) {
    const baseOptions = { ...reportConfig.base_options } || {};
    const idKey = reportConfig.id || 'id';
    baseOptions[idKey] = reportId;
    return baseOptions;
  }

  static updateReportIdElements(reportId) {
    const reportIdElements = document.querySelectorAll('.report_id');
    reportIdElements.forEach((element) => {
      element.textContent = reportId;
    });
  }

  static processStanzas(stanzas, baseOptions, reportId, idKey = 'id') {
    stanzas.forEach((stanza) => {
      const processedStanza = this.processStanzaOptions(
        stanza,
        reportId,
        idKey
      );
      StanzaManager.appendStanzaTag(processedStanza, baseOptions);
    });
  }

  static processStanzaOptions(stanza, reportId, idKey) {
    if (!stanza.options) {
      return stanza;
    }

    const processedStanza = { ...stanza };
    processedStanza.options = { ...stanza.options };

    for (const [key, value] of Object.entries(processedStanza.options)) {
      if (typeof value === 'string' && value.includes('$')) {
        const idRegex = new RegExp(`\\$(${idKey}|{${idKey}})`, 'g');
        processedStanza.options[key] = value.replaceAll(idRegex, reportId);
      }
    }

    return processedStanza;
  }
}

/**
 * DOM ready handler
 */
class DOMReadyHandler {
  static initialize() {
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
