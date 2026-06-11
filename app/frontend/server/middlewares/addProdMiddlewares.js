import path from 'path';
import express from 'express';
import compression from 'compression';
import { readFile } from 'fs';
import { stat } from 'fs/promises';
import { getSiteOrigin } from '../../config/siteOrigin.js';
import {
  withCanonicalUrl,
  getTrailingSlashUrl,
  getNoTrailingSlashUrl,
} from './middlewareHelpers.js';
import { applyCspNonce } from './securityHeaders.js';

const htmlCache = new Map();
const htmlPathCache = new Map();
const LONG_TERM_CACHE_PATTERN =
  /\.(?:css|js|woff2?|eot|ttf|otf|png|jpe?g|gif|svg|webp)(?:\.gz)?$/i;
const LONG_TERM_CACHE_DIRECTORY_PATTERN = /(?:^|\/)(?:css|js|fonts|images)\//;

// 信頼済みの設定値からcanonical URLを組み立てる。
// Hostやx-forwarded-protoなどのリクエストヘッダーは、canonicalには使わない。
function getCanonicalUrl(req) {
  return `${getSiteOrigin()}${req.originalUrl.split('?')[0]}`;
}

// 本番のビルド済みHTMLはデプロイ中に変わらない前提なので、初回読み込み後はメモリに保持する。
function getCachedHtml(htmlPath, callback) {
  const cachedHtml = htmlCache.get(htmlPath);

  if (cachedHtml) {
    callback(null, cachedHtml);
    return;
  }

  readFile(htmlPath, 'utf8', (err, html) => {
    if (err) {
      callback(err);
      return;
    }

    htmlCache.set(htmlPath, html);
    callback(null, html);
  });
}

function getReportHtml(outputPath, report, callback) {
  getCachedHtml(path.resolve(outputPath, report, 'index.html'), callback);
}

function sendReportHtml(outputPath, req, res) {
  getReportHtml(outputPath, req.params.report, (err, html) => {
    if (err) {
      return res.sendStatus(err.code === 'ENOENT' ? 404 : 500);
    }

    res.setHeader('Cache-Control', 'no-cache');
    return res.send(
      applyCspNonce(
        withCanonicalUrl(html, getCanonicalUrl(req)),
        res.locals.cspNonce
      )
    );
  });
}

async function isSafeHtmlFile(candidatePath, outputRoot) {
  if (
    candidatePath !== outputRoot &&
    !candidatePath.startsWith(`${outputRoot}${path.sep}`)
  ) {
    return false;
  }

  try {
    const stats = await stat(candidatePath);
    return stats.isFile();
  } catch (err) {
    return false;
  }
}

async function getSafeHtmlPath(outputPath, requestPath) {
  const outputRoot = path.resolve(outputPath);
  const cacheKey = `${outputRoot}\0${requestPath}`;

  if (htmlPathCache.has(cacheKey)) {
    return htmlPathCache.get(cacheKey);
  }

  let normalizedRequestPath;

  try {
    normalizedRequestPath = decodeURIComponent(requestPath).split('?')[0];
  } catch (err) {
    return null;
  }

  const relativePath =
    normalizedRequestPath === '/'
      ? 'index.html'
      : normalizedRequestPath.replace(/^\/+/, '');
  const candidatePaths = [];

  if (relativePath.endsWith('.html')) {
    candidatePaths.push(path.resolve(outputPath, relativePath));
  } else {
    candidatePaths.push(path.resolve(outputPath, relativePath, 'index.html'));
    candidatePaths.push(path.resolve(outputPath, `${relativePath}.html`));
  }

  for (const candidatePath of candidatePaths) {
    if (await isSafeHtmlFile(candidatePath, outputRoot)) {
      htmlPathCache.set(cacheKey, candidatePath);
      return candidatePath;
    }
  }

  return null;
}

async function sendStaticHtmlWithNonce(outputPath, req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    next();
    return;
  }

  const extension = path.extname(req.path);
  if (extension && extension !== '.html') {
    next();
    return;
  }

  let htmlPath;
  try {
    htmlPath = await getSafeHtmlPath(outputPath, req.path);
  } catch (err) {
    next(err);
    return;
  }

  if (!htmlPath) {
    next();
    return;
  }

  getCachedHtml(htmlPath, (err, html) => {
    if (err) {
      next();
      return;
    }

    res.setHeader('Cache-Control', 'no-cache');
    res.type('html');
    res.send(applyCspNonce(html, res.locals.cspNonce));
  });
}

function isLongTermCacheAsset(filePath) {
  const normalizedPath = filePath.split(path.sep).join('/');

  return (
    LONG_TERM_CACHE_DIRECTORY_PATTERN.test(normalizedPath) &&
    LONG_TERM_CACHE_PATTERN.test(normalizedPath)
  );
}

function setStaticAssetCacheHeaders(res, filePath) {
  if (isLongTermCacheAsset(filePath)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    res.setHeader('Cache-Control', 'no-cache');
  }
}

// 本番環境用のExpressミドルウェアを追加する。
// dist配下のビルド済みファイルを配信し、レポート詳細ページだけcanonicalを差し替えて返す。
export default function addProdMiddlewares(app, options) {
  const publicPath = options.publicPath || '/';
  const outputPath = options.outputPath || path.resolve(process.cwd(), 'dist');

  // レスポンスをgzip圧縮して転送サイズを小さくする。
  // HTMLだけでなく、CSS/JSなどの静的アセットにも適用される。
  app.use(compression());

  // /variant, /gene, /disease は末尾スラッシュ付きURLへ統一する。
  app.get('/:report(variant|gene|disease)/?', (req, res) => {
    if (!req.path.endsWith('/')) {
      return res.redirect(301, getTrailingSlashUrl(req));
    }

    sendReportHtml(outputPath, req, res);
  });

  // 詳細ページはURLごとにcanonicalが違うため、HTML文字列を読み込んで差し替える。
  app.get('/:report(variant|gene|disease)/:id', (req, res) => {
    if (req.path.endsWith('/')) {
      return res.redirect(301, getNoTrailingSlashUrl(req));
    }

    sendReportHtml(outputPath, req, res);
  });

  app.get('*', (req, res, next) => {
    sendStaticHtmlWithNonce(outputPath, req, res, next);
  });

  app.use(
    publicPath,
    express.static(outputPath, {
      setHeaders: setStaticAssetCacheHeaders,
    })
  );
}
