/**
 * URL共有値の圧縮形式を揃え、Simple/Advanced Searchで別々の実装を持たないようにする。
 */
export const SEARCH_URL_COMPRESSION_FORMAT = 'deflate-raw';
export const SEARCH_URL_COMPRESSION_MIN_LEGACY_LENGTH = 300;
export const SEARCH_URL_COMPRESSED_MAX_JSON_LENGTH = 20000;
export const SEARCH_URL_DECOMPRESSED_BYTE_MAX_LENGTH =
  SEARCH_URL_COMPRESSED_MAX_JSON_LENGTH * 4;
export const SEARCH_URL_COMPRESSED_PARAM_MAX_LENGTH = 20000;

export type SearchURLParam = {
  name: 'q' | 'qz';
  value: string;
};

/**
 * qzの生成手順を共通化し、Simple/Advanced Searchで圧縮方式がずれないようにする。
 */
export async function encodeJSONToCompressedURL(
  value: unknown,
  maxJSONLength = SEARCH_URL_COMPRESSED_MAX_JSON_LENGTH,
  maxParamLength = SEARCH_URL_COMPRESSED_PARAM_MAX_LENGTH
): Promise<string | null> {
  try {
    if (!canUseCompressionStreams()) return null;

    const json = JSON.stringify(value);
    if (typeof json !== 'string') return null;
    if (json.length > maxJSONLength) return null;

    const input = new TextEncoder().encode(json);
    const stream = new Blob([toArrayBuffer(input)])
      .stream()
      .pipeThrough(new CompressionStream(SEARCH_URL_COMPRESSION_FORMAT));
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
    const encoded = bytesToBase64URL(compressed);

    return encoded.length <= maxParamLength ? encoded : null;
  } catch {
    return null;
  }
}

/**
 * qzの復元手順を共通化し、展開後サイズ制限を必ず通してからJSONとして読む。
 */
export async function decodeCompressedURLToJSON(
  encoded: string,
  errorMessage: string,
  maxParamLength = SEARCH_URL_COMPRESSED_PARAM_MAX_LENGTH,
  maxByteLength = SEARCH_URL_DECOMPRESSED_BYTE_MAX_LENGTH,
  maxJSONLength = SEARCH_URL_COMPRESSED_MAX_JSON_LENGTH
): Promise<unknown | null> {
  try {
    if (!canUseCompressionStreams() || encoded.length > maxParamLength) {
      return null;
    }

    const compressed = base64URLToBytes(encoded);
    const stream = new Blob([toArrayBuffer(compressed)])
      .stream()
      .pipeThrough(new DecompressionStream(SEARCH_URL_COMPRESSION_FORMAT));
    const bytes = await readLimitedStream(stream, maxByteLength, errorMessage);
    const json = new TextDecoder().decode(bytes);
    if (json.length > maxJSONLength) return null;

    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * URL由来のJSONはunknownとして扱い、配列やnullを条件オブジェクトとして誤採用しないようにする。
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * btoaは文字列をLatin-1として扱うため、UTF-8バイト列を小分けにして安全に渡す。
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize)
    );
  }

  return btoa(binary);
}

/**
 * 圧縮済みバイト列をURLで扱いやすくするため、`+` `/` `=` を含まないBase64URLへ変換する。
 */
export function bytesToBase64URL(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

/**
 * URLSearchParamsやqs.parseで空白化された`+`を補正し、Base64をUTF-8バイト列へ戻す。
 */
export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value.replace(/ /g, '+'));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/**
 * qzの不正文字を先に弾き、atob()には通常Base64へ戻した値だけを渡す。
 */
export function base64URLToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) {
    throw new Error('Invalid Base64URL value.');
  }

  const base64 = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');

  return base64ToBytes(base64);
}

/**
 * 展開後サイズを読み取り中に制限し、巨大な圧縮入力でタブのメモリを使い切らないようにする。
 */
export async function readLimitedStream(
  stream: ReadableStream<Uint8Array>,
  maxBytes: number,
  errorMessage: string
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value === undefined) continue;

      totalLength += value.byteLength;
      if (totalLength > maxBytes) {
        await reader.cancel(errorMessage);
        throw new Error(errorMessage);
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
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

/**
 * Compression Streams API非対応ブラウザでは従来q形式へフォールバックするため、実行前に機能検出する。
 */
export function canUseCompressionStreams(): boolean {
  return (
    typeof CompressionStream !== 'undefined' &&
    typeof DecompressionStream !== 'undefined'
  );
}

/**
 * URLSearchParamsとqs.parse()の両方から同じように単一文字列を取り出す。
 */
export function getFirstString(value: unknown): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return typeof candidate === 'string' ? candidate : undefined;
}
