import { storeManager } from '../../store/StoreManager';
import ChromosomeView, { type SubBandEntry } from './ChromosomeView';
import type { SimpleSearchCurrentConditions } from '../../types/search';

// csv-loader が TSV をパースして返す形式: 各行が文字列配列
type TsvRow = string[];

/** 参照ゲノムごとの染色体両端座標 */
interface ChromosomeRegion {
  GRCh37: [number, number];
  GRCh38: [number, number];
}

/** 各染色体の選択状態と座標範囲 */
interface ChromosomeConfig {
  selected: boolean;
  region: ChromosomeRegion;
}

/** localStorage と Store で共有するカリオタイプ設定 */
interface KaryotypeState {
  isOpened: boolean;
  isShowBand: boolean;
  height: number;
  reference: 'GRCh37' | 'GRCh38';
  version: number;
  chromosomes: Record<string, ChromosomeConfig>;
}

/** 染色体上の位置：単一座標または範囲 */
interface LocationEntry {
  chromosome: string;
  position: number | { gte: number; lte: number };
}

/** Advanced Search 条件ツリーのノード（再帰構造）*/
interface AdvancedConditionNode {
  or?: AdvancedConditionNode[];
  and?: AdvancedConditionNode[];
  location?: LocationEntry;
}

// 'MT' はカリオタイプ表示の対象外だが、TSVフィルタで使うため定義に含む
const CHROMOSOME_KEYS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '20',
  '21',
  '22',
  'X',
  'Y',
  'MT',
] as const;

// ドロワー高さ: 閉じた状態=0, 開いた状態=400
const HEIGHTS = [0, 400] as const;

// アプリのバージョンアップ時にlocalStorageの古い設定を破棄するためversionを持つ
const DEFAULT: KaryotypeState = {
  isOpened: false,
  isShowBand: true,
  height: HEIGHTS[0],
  reference: 'GRCh37',
  version: 1,
  chromosomes: {
    1: {
      selected: true,
      region: { GRCh37: [1, 249250621], GRCh38: [1, 248956422] },
    },
    2: {
      selected: true,
      region: { GRCh37: [1, 243199373], GRCh38: [1, 242193529] },
    },
    3: {
      selected: true,
      region: { GRCh37: [1, 198022430], GRCh38: [1, 198295559] },
    },
    4: {
      selected: true,
      region: { GRCh37: [1, 191154276], GRCh38: [1, 190214555] },
    },
    5: {
      selected: true,
      region: { GRCh37: [1, 180915260], GRCh38: [1, 181538259] },
    },
    6: {
      selected: true,
      region: { GRCh37: [1, 171115067], GRCh38: [1, 170805979] },
    },
    7: {
      selected: true,
      region: { GRCh37: [1, 159138663], GRCh38: [1, 159345973] },
    },
    8: {
      selected: true,
      region: { GRCh37: [1, 146364022], GRCh38: [1, 145138636] },
    },
    9: {
      selected: true,
      region: { GRCh37: [1, 141213431], GRCh38: [1, 138394717] },
    },
    10: {
      selected: true,
      region: { GRCh37: [1, 135534747], GRCh38: [1, 133797422] },
    },
    11: {
      selected: true,
      region: { GRCh37: [1, 135006516], GRCh38: [1, 135086622] },
    },
    12: {
      selected: true,
      region: { GRCh37: [1, 133851895], GRCh38: [1, 133275309] },
    },
    13: {
      selected: true,
      region: { GRCh37: [1, 115169878], GRCh38: [1, 114364328] },
    },
    14: {
      selected: true,
      region: { GRCh37: [1, 107349540], GRCh38: [1, 107043718] },
    },
    15: {
      selected: true,
      region: { GRCh37: [1, 102531392], GRCh38: [1, 101991189] },
    },
    16: {
      selected: true,
      region: { GRCh37: [1, 90354753], GRCh38: [1, 90338345] },
    },
    17: {
      selected: true,
      region: { GRCh37: [1, 81195210], GRCh38: [1, 83257441] },
    },
    18: {
      selected: true,
      region: { GRCh37: [1, 78077248], GRCh38: [1, 80373285] },
    },
    19: {
      selected: true,
      region: { GRCh37: [1, 59128983], GRCh38: [1, 58617616] },
    },
    20: {
      selected: true,
      region: { GRCh37: [1, 63025520], GRCh38: [1, 64444167] },
    },
    21: {
      selected: true,
      region: { GRCh37: [1, 48129895], GRCh38: [1, 46709983] },
    },
    22: {
      selected: true,
      region: { GRCh37: [1, 51304566], GRCh38: [1, 50818468] },
    },
    X: {
      selected: true,
      region: { GRCh37: [1, 155270560], GRCh38: [1, 156040895] },
    },
    Y: {
      selected: true,
      region: { GRCh37: [1, 59373566], GRCh38: [1, 57227415] },
    },
    MT: { selected: true, region: { GRCh37: [1, 16569], GRCh38: [1, 16569] } },
  },
};

// region 文字列 "chr:start-end" または "chr:pos" にマッチする正規表現
const REGEXP = /([1-9]|1\d|2[0-2]|X|Y|MT):(\d+)-?(\d+)?/;

// localStorage に null が格納されている場合 JSON.parse('null') → null と同じ挙動にする
let karyotype = JSON.parse(
  localStorage.getItem('karyotype') ?? 'null'
) as KaryotypeState | null;

/**
 * localStorage の設定がない、またはバージョン不一致のとき DEFAULT で初期化する。
 * version を比較することで、古い設定構造のまま読み込まれる問題を防ぐ。
 */
function initialiseKaryotype(): void {
  if (!karyotype || karyotype.version !== DEFAULT.version) {
    karyotype = structuredClone(DEFAULT);
  }
}

initialiseKaryotype();

/**
 * 参照ゲノムに対応する karyotype TSV を webpack の動的 import で遅延ロードする。
 * csv-loader が string[][] に変換済みの状態で返ってくる。
 */
async function loadKaryotypeData(
  reference: 'GRCh37' | 'GRCh38'
): Promise<TsvRow[]> {
  const mod = (await import(`../../../assets/${reference}/karyotype.tsv`)) as {
    default?: TsvRow[];
  };
  return mod.default ?? [];
}

export default class Karyotype {
  private readonly elm: HTMLElement;
  private readonly chromosomes: HTMLElement;
  private readonly _bandShowButton: HTMLElement;
  private readonly _bandHideButton: HTMLElement;
  private chromosomeViews: ChromosomeView[] | undefined;
  private geneMap: SubBandEntry[][] | undefined;
  private maxLength: number | undefined;
  private _pendingSimpleSearchConditions: SimpleSearchCurrentConditions | null =
    null;
  private _pendingAdvancedSearchConditions: unknown = null;

  /**
   * DOM 参照・Store バインド・イベント設定を行い、TSV の非同期読み込みを開始する。
   * TSV 読み込み完了前に検索条件が来た場合は保留し、読み込み後に適用する。
   */
  constructor(elm: HTMLElement) {
    this.elm = elm;
    this.chromosomes = elm.querySelector<HTMLElement>(
      '.content > .chromosomes'
    )!;

    storeManager.setData('karyotype', karyotype);
    storeManager.subscribe('karyotype', (v) => this.karyotype(v as KaryotypeState));
    storeManager.subscribe('simpleSearchConditions', (v) => this.simpleSearchConditions(v));
    storeManager.subscribe('advancedSearchConditions', (v) => this.advancedSearchConditions(v));

    // ヘッダークリックで開閉状態をトグルする
    elm.querySelector<HTMLElement>('.header')!.addEventListener('click', () => {
      const current = storeManager.getData('karyotype') as KaryotypeState;
      this._changeKaryotype({
        isOpened: !current.isOpened,
        height: current.isOpened ? HEIGHTS[0] : HEIGHTS[1],
      });
    });

    // バンドラベル表示切り替えボタン
    const buttons = Array.from(
      elm.querySelectorAll<HTMLElement>(
        '#KariotypeSwitchBandVisibility > .button'
      )
    );
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        this._changeKaryotype({ isShowBand: button.dataset.value === 'show' });
      });
    });
    this._bandShowButton = buttons.find((b) => b.dataset.value === 'show')!;
    this._bandHideButton = buttons.find((b) => b.dataset.value === 'hide')!;

    // TSV 読み込み完了後に染色体を描画し、保留中の検索条件があれば適用する
    loadKaryotypeData(karyotype!.reference).then((tsv) => {
      this.geneMap = this.parseGeneMap(tsv);
      this.maxLength = Math.max(
        ...this.geneMap.map((chr) => chr[chr.length - 1].end)
      );
      this._drawChromosome(this.geneMap);

      if (this._pendingSimpleSearchConditions) {
        this.simpleSearchConditions(this._pendingSimpleSearchConditions);
        this._pendingSimpleSearchConditions = null;
      }
      if (this._pendingAdvancedSearchConditions) {
        this.advancedSearchConditions(this._pendingAdvancedSearchConditions);
        this._pendingAdvancedSearchConditions = null;
      }
    });

    this.karyotype(storeManager.getData('karyotype') as KaryotypeState);
  }

  /**
   * csv-loader がパースした TSV 行配列を、染色体ごとの SubBandEntry 配列に変換する。
   * CHROMOSOME_KEYS の順でフィルタしてソートを不要にする。
   */
  parseGeneMap(tsv: TsvRow[]): SubBandEntry[][] {
    return CHROMOSOME_KEYS.map((key) =>
      tsv
        .filter((row) => row[0] === `chr${key}`)
        .map((row) => ({
          start: parseInt(row[1], 10),
          end: parseInt(row[2], 10),
          band: row[3].split('.')[0],
          subBand: row[3],
          stainType: row[4],
        }))
    );
  }

  /**
   * geneMap から ChromosomeView を生成して chromosomes コンテナに追加する。
   * innerHTML で一括生成してから querySelector で参照を取ることで DOM 操作を最小化する。
   */
  private _drawChromosome(geneMap: SubBandEntry[][]): void {
    this.chromosomeViews = [];
    this.chromosomes.innerHTML = CHROMOSOME_KEYS.map(
      (key) => `<div id="chromosome${key}" class="chromosome-view"></div>`
    ).join('');
    for (let i = 0; i < geneMap.length; i++) {
      this.chromosomeViews.push(
        new ChromosomeView(
          this.chromosomes.querySelector<HTMLElement>(
            `#chromosome${CHROMOSOME_KEYS[i]}`
          )!,
          CHROMOSOME_KEYS[i],
          geneMap[i],
          this.maxLength!
        )
      );
    }
  }

  /**
   * karyotype の一部を更新して Store と localStorage を同期する。
   * スプレッドでコピーしてから上書きすることで Store の参照が変わり、
   * bind したリスナーが変化を検出できる。
   */
  private _changeKaryotype(params: Partial<KaryotypeState>): void {
    const current = storeManager.getData('karyotype') as KaryotypeState;
    const updated: KaryotypeState = { ...current, ...params };
    storeManager.setData('karyotype', updated);
    localStorage.setItem('karyotype', JSON.stringify(updated));
  }

  /**
   * Store の karyotype が変化したとき、開閉状態とバンドラベル表示を DOM に反映する。
   * body クラス `-drawer-opened` を通じて CSS がドロワー高さを制御する。
   */
  karyotype(state: KaryotypeState): void {
    document.body.classList.toggle('-drawer-opened', state.isOpened);
    this.elm.classList.toggle('-show-band-label', state.isShowBand);
    this._bandShowButton.classList.toggle('-current', state.isShowBand);
    this._bandHideButton.classList.toggle('-current', !state.isShowBand);
  }

  /**
   * Simple Search の term 文字列を正規表現でパースし、染色体ハイライトに反映する。
   * データ未読込時は保留して、読込完了後に再実行する（コンストラクタの then 参照）。
   */
  simpleSearchConditions(conditions: SimpleSearchCurrentConditions): void {
    if (!this.chromosomeViews) {
      this._pendingSimpleSearchConditions = conditions;
      return;
    }

    const result = REGEXP.exec(conditions.term ?? '');
    if (!result) {
      this._updateLocations([]);
      return;
    }

    const chr = result[1];
    const start = Number(result[2]);
    const end = result[3] ? Number(result[3]) : undefined;

    if (end !== undefined) {
      if (start > end) return;
      this._updateLocations([
        { chromosome: chr, position: { gte: start, lte: end } },
      ]);
    } else {
      this._updateLocations([{ chromosome: chr, position: start }]);
    }
  }

  /**
   * Advanced Search 条件ツリーから location 条件を再帰的に収集し、染色体ハイライトに反映する。
   * 条件ツリーは OR/AND のネスト構造を持つため、再帰で全ノードを走査する。
   * データ未読込時は保留して、読込完了後に再実行する。
   */
  advancedSearchConditions(conditions: unknown): void {
    if (!this.chromosomeViews) {
      this._pendingAdvancedSearchConditions = conditions;
      return;
    }

    const locations: LocationEntry[] = [];
    const collect = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const n = node as AdvancedConditionNode;
      n.or?.forEach(collect);
      n.and?.forEach(collect);
      if (n.location) locations.push(n.location);
    };
    collect(conditions);
    this._updateLocations(locations);
  }

  /**
   * 収集した location 一覧を染色体番号ごとに Map で集約し、各 ChromosomeView に渡す。
   * 単一座標は [pos, pos] に正規化して PositionRange 型に統一する。
   */
  private _updateLocations(locations: LocationEntry[]): void {
    this.elm.dataset.isSelectingChromosome = String(locations.length > 0);
    if (!this.chromosomeViews) return;

    const byChromosome = new Map<string, [number, number][]>();
    for (const location of locations) {
      const range: [number, number] =
        typeof location.position === 'number'
          ? [location.position, location.position]
          : [location.position.gte, location.position.lte];
      const existing = byChromosome.get(location.chromosome) ?? [];
      existing.push(range);
      byChromosome.set(location.chromosome, existing);
    }

    this.chromosomeViews.forEach((view) => {
      view.updateSelectedPositions(byChromosome.get(view.no) ?? []);
    });
  }
}
