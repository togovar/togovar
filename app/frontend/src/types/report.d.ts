// -------------------------------------
// Report System Types
// -------------------------------------

/**
 * Environment configuration interface defining all endpoint URLs and settings
 * used by the stanza components.
 */
export interface EnvironmentConfig {
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
export interface StanzaConfig {
  id: string; // Unique identifier for the stanza component
  targetSelector: string; // CSS selector for the DOM element where the stanza will be rendered
  scriptUrl?: string; // Optional custom source URL for the stanza JavaScript file
  options?: Record<string, unknown>; // Optional configuration options passed to the stanza component
}

/**
 * Report page configuration containing all stanzas and base options for a specific report type.
 */
export interface ReportConfig {
  base_options?: Record<string, unknown>; // Base options applied to all stanzas in this report
  stanza?: StanzaConfig[]; // Array of stanza configurations to render on this report page
  id?: string; // Key name for the report identifier (default: 'id')
}

/**
 * Route parsing result containing report type and identifier.
 */
export interface RouteInfo {
  reportType: string; // Type of report (variant, gene, disease, etc.)
  reportId: string; // Unique identifier for the specific report item
}
