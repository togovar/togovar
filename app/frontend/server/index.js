import express from 'express';
import { resolve } from 'path';
import logger from './logger.js';
import argv from './argv.js';
import port from './port.js';
import setup from './middlewares/frontendMiddleware.js';

const app = express();

const customHost = argv.host || process.env.HOST;
const host = customHost || null; // Let http.Server use its default IPv6/4 host
const prettyHost = customHost || 'localhost';

// use the gzipped bundle
app.get('*.js', (req, res, next) => {
  req.url = req.url + '.gz';
  res.set('Content-Encoding', 'gzip');
  next();
});

// In production we need to pass these values in instead of relying on webpack
await setup(app, {
  outputPath: resolve(process.cwd(), 'dist'),
  publicPath: '/',
});

// Start your app.
app.listen(port, host, (err) => {
  if (err) {
    return logger.error(err.message);
  }

  logger.appStarted(port, prettyHost);
});
