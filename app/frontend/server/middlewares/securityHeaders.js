const ONE_YEAR_SECONDS = 31536000;

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://togovar.github.io",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://togostanza.github.io",
  "font-src 'self' https://fonts.gstatic.com https://togostanza.github.io data:",
  "img-src 'self' data: https:",
  "connect-src 'self' https:",
].join('; ');

function setSecurityHeaders(req, res, next) {
  res.setHeader('Content-Security-Policy', CSP_DIRECTIVES);
  res.setHeader(
    'Strict-Transport-Security',
    `max-age=${ONE_YEAR_SECONDS}; includeSubDomains`
  );
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

module.exports = setSecurityHeaders;
