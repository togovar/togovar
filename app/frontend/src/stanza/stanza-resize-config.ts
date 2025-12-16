export interface StanzaResizeConfig {
  minHeight: number;
  maxInitialHeight: number;
}

export const STANZA_RESIZE_CONFIG: Record<string, StanzaResizeConfig> = {
  'variant-frequency': {
    minHeight: 65,
    maxInitialHeight: 250,
  },
};
