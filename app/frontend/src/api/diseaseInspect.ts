import { API_URL } from '../global';
import { cachedAxios } from '../utils/cachedAxios';

/**
 * 疾患オントロジーの1ノード分の情報。
 * リンク生成に必要な cui と表示名だけを扱うため、親子ノードなどは型に含めない。
 */
export type DiseaseNodeSummary = {
  id: string;
  cui?: string;
  label?: string;
};

// 結果更新のたびに同じノードを問い合わせないよう、モジュール単位でキャッシュを共有する
const inspectApi = new cachedAxios(`${API_URL}/api/inspect`);

/**
 * Advanced Search の疾患条件は MONDO ID で保存される一方、疾患ページは MedGen CUI で開くため、
 * ノード情報を取得して CUI と表示名を得る。
 */
export async function fetchDiseaseNode(id: string): Promise<DiseaseNodeSummary> {
  const { data } = await inspectApi.get<DiseaseNodeSummary>(
    `/disease?node=${encodeURIComponent(id)}`
  );
  return data;
}
