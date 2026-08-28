import type { ConditionQuery } from '../types/query';

/** Advanced Search条件のURLエンコード上限（Raw JSON文字数） */
export const ADVANCED_SEARCH_URL_MAX_JSON_LENGTH = 2000;
export const ADVANCED_SEARCH_URL_RESTORE_WARNING =
  'Could not restore the shared Advanced Search URL. Your browser may not support compressed URL parameters.';
const ADVANCED_SEARCH_COMPRESSED_URL_MAX_JSON_LENGTH = 20000;
const ADVANCED_SEARCH_DECOMPRESSED_BYTE_MAX_LENGTH =
  ADVANCED_SEARCH_COMPRESSED_URL_MAX_JSON_LENGTH * 4;
const ADVANCED_SEARCH_COMPRESSED_PARAM_MAX_LENGTH = 20000;
const ADVANCED_SEARCH_COMPRESSION_MIN_LEGACY_LENGTH = 600;
const ADVANCED_SEARCH_COMPRESSION_FORMAT = 'deflate-raw';

type AdvancedSearchURLParam = {
  name: 'q' | 'qz';
  value: string;
};

export type AdvancedSearchURLDecodeResult = {
  condition: ConditionQuery | null;
  hasCompressedParam: boolean;
  hasLegacyParam: boolean;
  restoredFromCompressed: boolean;
  restoredFromLegacy: boolean;
};

/**
 * Advanced Search条件をURLの `q` パラメータ用にエンコードする。
 * JSON.stringify → btoa (Base64) の順で変換する。
 * Raw JSONが上限を超える、またはエンコードに失敗した場合は null を返す。
 */
export function encodeConditionForURL(query: unknown): string | null {
  try {
    const json = JSON.stringify(query);
    if (typeof json !== 'string') return null;
    if (json.length > ADVANCED_SEARCH_URL_MAX_JSON_LENGTH) return null;
    return btoa(json);
  } catch {
    return null;
  }
}

/**
 * Advanced Search条件を共有URLへ載せるため、短い条件は従来Base64、長い条件は圧縮Base64URLを優先する。
 */
export async function encodeConditionForBestURL(
  query: unknown
): Promise<AdvancedSearchURLParam | null> {
  const legacy = encodeConditionForURL(query);
  if (
    legacy !== null &&
    legacy.length <= ADVANCED_SEARCH_COMPRESSION_MIN_LEGACY_LENGTH
  ) {
    return { name: 'q', value: legacy };
  }

  const compressed = await encodeConditionForCompressedURL(query);

  if (legacy === null && compressed === null) return null;
  if (legacy === null) return { name: 'qz', value: compressed! };
  if (compressed === null || legacy.length <= compressed.length) {
    return { name: 'q', value: legacy };
  }
  return { name: 'qz', value: compressed };
}

/**
 * URL長を抑えるため、Compression Streams API対応ブラウザではJSONをdeflate-raw圧縮してBase64URL化する。
 */
async function encodeConditionForCompressedURL(
  query: unknown
): Promise<string | null> {
  try {
    if (!canUseCompressionStreams()) return null;

    const json = JSON.stringify(query);
    if (typeof json !== 'string') return null;
    if (json.length > ADVANCED_SEARCH_COMPRESSED_URL_MAX_JSON_LENGTH) {
      return null;
    }

    const input = new TextEncoder().encode(json);
    const stream = new Blob([toArrayBuffer(input)])
      .stream()
      .pipeThrough(new CompressionStream(ADVANCED_SEARCH_COMPRESSION_FORMAT));
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
    const encoded = bytesToBase64URL(compressed);

    return encoded.length <= ADVANCED_SEARCH_COMPRESSED_PARAM_MAX_LENGTH
      ? encoded
      : null;
  } catch {
    return null;
  }
}

/**
 * URLの `q` パラメータをAdvanced Search条件にデコードする。
 * 既存のURL互換のため、`+` が空白に変換されたケースも補正する。
 */
export function decodeConditionFromURL(
  encoded: string
): ConditionQuery | null {
  try {
    const parsed = JSON.parse(atob(encoded.replace(/ /g, '+')));
    // 配列・プリミティブはAPIのquery bodyに流れると不正リクエストになるため弾く。
    // 空オブジェクトは「条件なし」センチネル(undefined)と整合させるため null を返す。
    if (!isPlainObject(parsed) || Object.keys(parsed).length === 0) return null;
    return parsed as ConditionQuery;
  } catch {
    return null;
  }
}

/**
 * URLのAdvanced Search条件は圧縮版qzを優先し、既存URL互換のため従来qへフォールバックする。
 */
export async function decodeConditionFromURLParams(params: {
  q?: unknown;
  qz?: unknown;
}): Promise<ConditionQuery | null> {
  return (await decodeConditionFromURLParamsWithStatus(params)).condition;
}

/**
 * qz復元失敗時にUI警告を出すため、条件本体だけでなく復元経路も返す。
 */
export async function decodeConditionFromURLParamsWithStatus(params: {
  q?: unknown;
  qz?: unknown;
}): Promise<AdvancedSearchURLDecodeResult> {
  const compressed = getFirstString(params.qz);
  if (compressed) {
    const condition = await decodeCompressedConditionFromURL(compressed);
    if (condition !== null) {
      return {
        condition,
        hasCompressedParam: true,
        hasLegacyParam: getFirstString(params.q) !== undefined,
        restoredFromCompressed: true,
        restoredFromLegacy: false,
      };
    }
  }

  const legacy = getFirstString(params.q);
  const legacyCondition = legacy ? decodeConditionFromURL(legacy) : null;
  return {
    condition: legacyCondition,
    hasCompressedParam: compressed !== undefined,
    hasLegacyParam: legacy !== undefined,
    restoredFromCompressed: false,
    restoredFromLegacy: legacyCondition !== null,
  };
}

/**
 * qzを含む共有URLがどの経路でも復元できなかった場合だけ、ユーザーへ警告する。
 */
export function shouldWarnAdvancedSearchURLRestoreFailure(
  result: AdvancedSearchURLDecodeResult,
  restoredCondition: ConditionQuery | null
): boolean {
  return (
    result.hasCompressedParam &&
    !result.restoredFromCompressed &&
    !result.restoredFromLegacy &&
    restoredCondition === null
  );
}

/**
 * qzは圧縮済みバイト列のBase64URL表現なので、Base64URL復元後に展開してJSONとして読む。
 */
async function decodeCompressedConditionFromURL(
  encoded: string
): Promise<ConditionQuery | null> {
  try {
    if (
      !canUseCompressionStreams() ||
      encoded.length > ADVANCED_SEARCH_COMPRESSED_PARAM_MAX_LENGTH
    ) {
      return null;
    }

    const compressed = base64URLToBytes(encoded);
    const stream = new Blob([toArrayBuffer(compressed)])
      .stream()
      .pipeThrough(
        new DecompressionStream(ADVANCED_SEARCH_COMPRESSION_FORMAT)
      );
    const bytes = await readLimitedStream(
      stream,
      ADVANCED_SEARCH_DECOMPRESSED_BYTE_MAX_LENGTH
    );
    const json = new TextDecoder().decode(bytes);
    if (json.length > ADVANCED_SEARCH_COMPRESSED_URL_MAX_JSON_LENGTH) {
      return null;
    }

    const parsed = JSON.parse(json);
    if (!isPlainObject(parsed) || Object.keys(parsed).length === 0) return null;
    return parsed as ConditionQuery;
  } catch {
    return null;
  }
}

/**
 * URL/画面復元用のメタ情報を取り除き、検索APIへ送れるqueryだけにする。
 * 現在はGene symbolの表示名(labels)だけが対象。
 */
export function stripAdvancedSearchMetadata(query: unknown): unknown {
  if (Array.isArray(query)) {
    return query.map((item) => stripAdvancedSearchMetadata(item));
  }

  if (!isPlainObject(query)) return query;

  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(query)) {
    if (key === 'labels') continue;
    next[key] = stripAdvancedSearchMetadata(value);
  }
  return next;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Compression Streams API非対応ブラウザでは従来q形式へフォールバックするため、実行前に機能検出する。
 */
function canUseCompressionStreams(): boolean {
  return (
    typeof CompressionStream !== 'undefined' &&
    typeof DecompressionStream !== 'undefined'
  );
}

/**
 * URLSearchParamsとqs.parse()の両方から同じように単一文字列を取り出す。
 */
function getFirstString(value: unknown): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return typeof candidate === 'string' ? candidate : undefined;
}

/**
 * 圧縮済みバイト列をURLで扱いやすくするため、`+` `/` `=` を含まないBase64URLへ変換する。
 */
function bytesToBase64URL(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize)
    );
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

/**
 * qzの不正文字を先に弾き、atob()には通常Base64へ戻した値だけを渡す。
 */
function base64URLToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) {
    throw new Error('Invalid Base64URL value.');
  }

  const base64 = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/**
 * 展開後サイズを読み取り中に制限し、巨大な圧縮入力でタブのメモリを使い切らないようにする。
 */
async function readLimitedStream(
  stream: ReadableStream<Uint8Array>,
  maxBytes: number
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalLength += value.byteLength;
      if (totalLength > maxBytes) {
        await reader.cancel('Decompressed Advanced Search URL is too large.');
        throw new Error('Decompressed Advanced Search URL is too large.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return concatenateUint8Arrays(chunks, totalLength);
}

/**
 * ReadableStreamのchunk配列を一つのUint8Arrayへまとめ、TextDecoderへ渡せる形にする。
 */
function concatenateUint8Arrays(
  chunks: Uint8Array[],
  totalLength: number
): Uint8Array {
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return result;
}

/**
 * BlobPartの型をArrayBufferへ揃え、SharedArrayBuffer混在の型エラーを避ける。
 */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}
