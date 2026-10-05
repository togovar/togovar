import type { AdvancedSearchFetchOption } from '../types';
import { fetchSearchJSON } from './searchFetch';

export type VariantResolutionOffset = [string, number, string, string];

export type VariantResolutionPageItem = {
  id?: string;
  chromosome?: string;
  position?: number;
  reference?: string;
  alternate?: string;
  alternative?: string;
};

export type VariantResolutionLocus = {
  chromosome: string;
  position: number;
};

export type VariantResolutionPage = {
  data: VariantResolutionPageItem[];
};

type VariantResolutionRequestBody = {
  query: {
    location: VariantResolutionLocus;
  };
  limit: number;
  offset?: VariantResolutionOffset;
};

/**
 * レポート画面に検索APIのURL仕様を漏らさないよう、tgvid解決用エンドポイントをここで組み立てる。
 */
function buildVariantResolutionEndpoint(apiBaseUrl: string): string {
  const params = new URLSearchParams({
    stat: '0',
    data: '1',
  });

  return `${apiBaseUrl}/api/search/variant?${params.toString()}`;
}

/**
 * レポート画面に検索APIのPOST仕様を漏らさないよう、tgvid解決用optionsをここで組み立てる。
 */
function getVariantResolutionRequestOptions(
  variant: VariantResolutionLocus,
  offset: VariantResolutionOffset | undefined,
  signal: AbortSignal,
  limit: number
): AdvancedSearchFetchOption {
  const body: VariantResolutionRequestBody = {
    query: {
      location: {
        chromosome: variant.chromosome,
        position: variant.position,
      },
    },
    limit,
  };

  if (offset) {
    body.offset = offset;
  }

  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    mode: 'cors',
    signal,
    body: JSON.stringify(body),
  };
}

/**
 * レポート画面のtgvid解決をAPI層へ寄せるため、HTTP実行とレスポンス整形をまとめて担う。
 */
export async function fetchVariantResolutionPage(
  apiBaseUrl: string,
  variant: VariantResolutionLocus,
  offset: VariantResolutionOffset | undefined,
  signal: AbortSignal,
  limit: number
): Promise<VariantResolutionPage> {
  const result = (await fetchSearchJSON(
    buildVariantResolutionEndpoint(apiBaseUrl),
    getVariantResolutionRequestOptions(variant, offset, signal, limit)
  )) as {
    data?: VariantResolutionPageItem[];
  };

  return { data: result.data ?? [] };
}
