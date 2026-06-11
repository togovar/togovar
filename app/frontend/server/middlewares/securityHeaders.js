import crypto from 'crypto';

const ONE_YEAR_SECONDS = 31536000;
export const CSP_NONCE_PLACEHOLDER = '__CSP_NONCE__';

function createCspNonce() {
  return crypto.randomBytes(16).toString('base64');
}

export function applyCspNonce(html, nonce) {
  return String(html).replaceAll(CSP_NONCE_PLACEHOLDER, nonce || '');
}

function buildCspDirectives(nonce) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    // strict-dynamic trusts only nonce/hash-approved scripts in modern browsers.
    // Keep server-rendered script tags on nonce="__CSP_NONCE__".
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'self' https://togovar.github.io`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://togostanza.github.io",
    "font-src 'self' https://fonts.gstatic.com https://togostanza.github.io data:",
    "img-src 'self' data: https:",
    "connect-src 'self' https: wss:",
  ].join('; ');
}

function setSecurityHeaders(req, res, next) {
  const nonce = createCspNonce();
  res.locals.cspNonce = nonce;

  res.setHeader('Content-Security-Policy', buildCspDirectives(nonce));
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      `max-age=${ONE_YEAR_SECONDS}; includeSubDomains`
    );
  }
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
  next();
}

export default setSecurityHeaders;
