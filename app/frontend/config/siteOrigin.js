const DEFAULT_REFERENCE = 'GRCh38';

const SITE_ORIGINS = {
  GRCh37: 'https://grch37.togovar.org',
  GRCh38: 'https://grch38.togovar.org',
};

function normalizeOrigin(origin) {
  return origin.replace(/\/+$/, '');
}

function getDefaultSiteOrigin(reference) {
  return SITE_ORIGINS[reference] || SITE_ORIGINS[DEFAULT_REFERENCE];
}

function getSiteOrigin(env = process.env) {
  if (env.TOGOVAR_SITE_ORIGIN) {
    return normalizeOrigin(env.TOGOVAR_SITE_ORIGIN);
  }

  return getDefaultSiteOrigin(env.TOGOVAR_REFERENCE || DEFAULT_REFERENCE);
}

module.exports = {
  DEFAULT_REFERENCE,
  SITE_ORIGINS,
  getSiteOrigin,
};
