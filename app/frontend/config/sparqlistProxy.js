export const LOCAL_SPARQLIST_PROXY_PATH = '/sparqlist';

const LOCAL_SPARQLIST_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '[::1]',
]);

// 開発時のstanza設定とdevServer proxyが同じ条件で切り替わるよう、ローカル判定を共有する。
export function shouldUseLocalSparqlistProxy(endpoint) {
  if (process.env.NODE_ENV !== 'development' || !endpoint) {
    return false;
  }

  try {
    const url = new URL(endpoint);
    return LOCAL_SPARQLIST_HOSTNAMES.has(url.hostname);
  } catch {
    return false;
  }
}

// ローカルSPARQListはCORS設定なしで動かすことがあるため、開発サーバーから同一オリジンで中継する。
export function createLocalSparqlistProxy(endpoint) {
  if (!shouldUseLocalSparqlistProxy(endpoint)) {
    return [];
  }

  const endpointUrl = new URL(endpoint);
  const endpointPath = endpointUrl.pathname.replace(/\/$/, '');

  return [
    {
      context: [LOCAL_SPARQLIST_PROXY_PATH],
      target: endpointUrl.origin,
      changeOrigin: true,
      pathRewrite: {
        [`^${LOCAL_SPARQLIST_PROXY_PATH}`]: endpointPath,
      },
    },
  ];
}
