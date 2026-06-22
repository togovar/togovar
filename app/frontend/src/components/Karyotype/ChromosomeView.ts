import { storeManager } from '../../store/StoreManager';
import { setSimpleSearchCondition } from '../../store/searchManager';
import type { DisplayingRegions } from '../../types/storeState';

// 染色体棒の描画幅とSVG上下余白（px）。
// CSSではなくJSでSVG座標を計算するため定数として保持する。
const WIDTH = 12;
const PADDING = 5;

/** TSVから整形された1サブバンド分のデータ。Karyotype.ts の parseGeneMap が生成する。 */
export interface SubBandEntry {
  start: number;
  end: number;
  band: string;
  subBand: string;
  stainType: string;
}

/** サブバンドを主バンド単位に集約したデータ（ラベル描画用） */
interface BandEntry {
  band: string;
  start: number;
  end: number;
}

/** 染色体上の位置範囲 [start, end] */
type PositionRange = [number, number];

export default class ChromosomeView {
  private readonly _no: string;
  private readonly _map: SubBandEntry[];
  private readonly _elm: HTMLElement;
  private readonly _length: number;
  private readonly _svg: SVGSVGElement;
  private readonly _displayRegion: HTMLElement;
  private _subbands: SVGGElement[];
  private _bands: SVGGElement[];

  /**
   * 染色体棒SVGをelmに描画し、クリックイベントとStore購読を設定する。
   * @param elm  描画先のコンテナ要素
   * @param no   染色体番号（'1'〜'22', 'X', 'Y'）
   * @param map  サブバンドデータ配列（Karyotype.parseGeneMap の出力）
   * @param maxLength  全染色体中の最大塩基数（高さの比率計算に使う）
   */
  constructor(
    elm: HTMLElement,
    no: string,
    map: SubBandEntry[],
    maxLength: number
  ) {
    this._no = no;
    this._map = map;
    this._elm = elm;

    // TODO: .selectedregion と .filteredregion はSCSSにスタイルが定義されているが、
    // .-shown クラスを付与したり top/height を更新するJSコードが存在しないため常に非表示。
    // 未実装の機能か、過去に削除された機能の残骸と思われる。
    // 実装する場合は displayregion と同様にStoreから位置を受け取る仕組みが必要。
    // 不要であればHTML要素とSCSSの両方を削除すること。
    this._elm.innerHTML = `
      <div class="upper">
        <p class="no">${this._no}</p>
      </div>
      <div class="lower">
        <div class="selectedregion"></div>
        <div class="filteredregion"></div>
        <svg class="chromosome"></svg>
        <div class="displayregion"></div>
      </div>
    `;

    this._displayRegion = this._elm.querySelector<HTMLElement>(
      '.lower > .displayregion'
    )!;

    // サブバンドを主バンド単位に集約してラベル描画用データを作る。
    // 隣接するサブバンドが同じ主バンドに属する場合は end を延ばして結合する。
    const lowMap = map.reduce<BandEntry[]>((acc, subBand) => {
      if (acc.length === 0 || acc[acc.length - 1].band !== subBand.band) {
        acc.push({
          band: subBand.band,
          start: subBand.start,
          end: subBand.end,
        });
      } else {
        acc[acc.length - 1].end = subBand.end;
      }
      return acc;
    }, []);

    // 染色体全長から各エレメントの px 座標を算出する。
    // chromosomeHeight / length = rate（bp→pxの変換係数）として使う。
    this._length = map[map.length - 1].end;
    this._svg = this._elm.querySelector<SVGSVGElement>('svg.chromosome')!;
    const chromosomeAreaHeight =
      elm.offsetHeight -
      elm.querySelector<HTMLElement>('.upper')!.offsetHeight -
      PADDING * 2;
    const chromosomeHeight = chromosomeAreaHeight * (this._length / maxLength);
    const rate = chromosomeHeight / this._length;
    this._svg.style.height = `${chromosomeHeight + PADDING * 2}px`;

    this._svg.innerHTML = this._buildSVGInnerHTML(lowMap, rate);

    this._subbands = Array.from(
      this._svg.querySelectorAll<SVGGElement>('g.subband')
    );
    this._bands = Array.from(this._svg.querySelectorAll<SVGGElement>('g.band'));

    this._setupEventListeners();

    // displayingRegionsOnChromosome の変化を受け取るために購読登録する。
    storeManager.subscribe('displayingRegionsOnChromosome', (v) =>
      this.displayingRegionsOnChromosome(v!)
    );
  }

  /**
   * SVG全体のinnerHTMLを構築する。
   * defs → サブバンド → バンドラベルの順に連結する。
   */
  private _buildSVGInnerHTML(lowMap: BandEntry[], rate: number): string {
    return (
      ChromosomeView._buildGradientDefs() +
      this._buildSubbandElements(rate) +
      this._buildBandElements(lowMap, rate)
    );
  }

  /**
   * グラデーション定義を文字列で返す。
   * 全インスタンスで同一内容のためstaticメソッドとして切り出す。
   */
  private static _buildGradientDefs(): string {
    return `
      <defs>
        <lineargradient id="chromosome-gneg">
          <stop offset="0" stop-color="#A6A6A6"/>
          <stop offset="0.33" stop-color="#FFFFFF"/>
          <stop offset="0.67" stop-color="#FFFFFF"/>
          <stop offset="1" stop-color="#A6A6A6"/>
        </lineargradient>
        <lineargradient id="chromosome-gpos25">
          <stop offset="0" stop-color="#B39BB3"/>
          <stop offset="0.33" stop-color="#EDCEED"/>
          <stop offset="0.67" stop-color="#EDCEED"/>
          <stop offset="1" stop-color="#B39BB3"/>
        </lineargradient>
        <lineargradient id="chromosome-gpos50">
          <stop offset="0" stop-color="#AB78AB"/>
          <stop offset="0.33" stop-color="#DA9CDA"/>
          <stop offset="0.67" stop-color="#DA9CDA"/>
          <stop offset="1" stop-color="#AB78AB"/>
        </lineargradient>
        <lineargradient id="chromosome-gpos75">
          <stop offset="0" stop-color="#9C539C"/>
          <stop offset="0.33" stop-color="#C86BC8"/>
          <stop offset="0.67" stop-color="#C86BC8"/>
          <stop offset="1" stop-color="#9C539C"/>
        </lineargradient>
        <lineargradient id="chromosome-gpos100">
          <stop offset="0" stop-color="#8F2B8F"/>
          <stop offset="0.33" stop-color="#B53AB5"/>
          <stop offset="0.67" stop-color="#B53AB5"/>
          <stop offset="1" stop-color="#8F2B8F"/>
        </lineargradient>
        <lineargradient id="chromosome-stalk">
          <stop offset="0" stop-color="#6e6e6e"/>
          <stop offset="0.33" stop-color="#8F8F8F"/>
          <stop offset="0.67" stop-color="#8F8F8F"/>
          <stop offset="1" stop-color="#6e6e6e"/>
        </lineargradient>
        <lineargradient id="chromosome-acen">
          <stop offset="0" stop-color="#383838"/>
          <stop offset="0.33" stop-color="#444444"/>
          <stop offset="0.67" stop-color="#444444"/>
          <stop offset="1" stop-color="#383838"/>
        </lineargradient>
      </defs>
    `;
  }

  /**
   * サブバンドのrect要素群を文字列で生成する。
   * クリック領域と染色パターンの両方を担う。
   */
  private _buildSubbandElements(rate: number): string {
    return this._map
      .map(
        (subBand) => `
      <g
        class="subband"
        data-band="${subBand.band}"
        data-sub-band="${subBand.subBand}"
        data-start="${subBand.start}"
        data-end="${subBand.end}"
        >
        <title>${subBand.subBand}</title>
        <rect
          class="subbandrect ${subBand.stainType}"
          x="0"
          y="${Math.floor(PADDING + subBand.start * rate)}"
          height="${Math.ceil((subBand.end - subBand.start) * rate)}"
          width="${WIDTH}"
        />
      </g>`
      )
      .join('');
  }

  /**
   * 主バンドのラベルと目盛線要素群を文字列で生成する。
   * rect の右隣に描画するため translate で横にオフセットする。
   */
  private _buildBandElements(lowMap: BandEntry[], rate: number): string {
    return lowMap
      .map((band) => {
        const height = (band.end - band.start) * rate;
        return `
      <g
        class="band"
        data-band="${band.band}"
        data-start="${band.start}"
        data-end="${band.end}"
        transform="translate(${WIDTH + 4.5}, ${PADDING + band.start * rate - 0.5})"
        >
        <text x="8" y="${height * 0.5 + 3}" class="bandtext">${band.band}</text>
        <path d="M0,1 V${height - 1} M0,${Math.round(height * 0.5)} H8" class="line" />
      </g>`;
      })
      .join('');
  }

  /**
   * 染色体番号・サブバンド・バンドへのクリック/ホバーイベントをまとめて登録する。
   * SVG innerHTML 設定後に呼ぶ必要があるため、コンストラクタ末尾で呼ぶ。
   */
  private _setupEventListeners(): void {
    // 染色体番号クリックで染色体全体を検索条件に設定する。
    this._elm
      .querySelector<HTMLElement>(':scope > .upper > .no')!
      .addEventListener('click', () => {
        this._selectBand(this._no, 1, this._length);
      });

    // サブバンドのクリックでそのサブバンドの範囲を検索条件に設定する。
    this._subbands.forEach((subband) => {
      subband.addEventListener('click', () => {
        this._selectBand(
          this._no,
          Number(subband.dataset.start),
          Number(subband.dataset.end)
        );
      });
    });

    // 主バンドのクリックでその範囲を検索条件に設定し、
    // ホバーで配下のサブバンドをハイライトする。
    this._bands.forEach((band) => {
      if (!band.dataset.start) return;
      const start = Number(band.dataset.start);
      const end = Number(band.dataset.end);
      const includesSubbands = this._subbands.filter(
        (subband) =>
          start <= Number(subband.dataset.start) &&
          Number(subband.dataset.end) <= end
      );
      band.addEventListener('click', () => {
        this._selectBand(this._no, start, end);
      });
      band.addEventListener('mouseenter', () => {
        includesSubbands.forEach((subband) => subband.classList.add('-hover'));
      });
      band.addEventListener('mouseleave', () => {
        includesSubbands.forEach((subband) =>
          subband.classList.remove('-hover')
        );
      });
    });
  }

  /**
   * searchModeに応じて染色体バンドの座標範囲を検索条件に反映する。
   * SimpleモードはStoreへ直接セット、AdvancedモードはBuilderViewへCustomEventで委譲する。
   */
  private _selectBand(chr: string, start: number, end: number): void {
    switch (storeManager.getData('searchMode')) {
      case 'simple':
        setSimpleSearchCondition('term', `${chr}:${start}-${end}`);
        break;
      case 'advanced': {
        const targetElement = document
          .getElementById('AdvancedSearchBuilderView')
          ?.querySelector<HTMLElement>(
            '.advanced-search-condition-group-view.-root > .advanced-search-toolbar button[data-condition="location"]'
          );
        if (targetElement) {
          targetElement.dispatchEvent(
            new CustomEvent('click', {
              detail: { chr, start, end },
              bubbles: true,
              cancelable: true,
            })
          );
        }
        break;
      }
    }
  }

  /**
   * Storeから表示領域が更新されたとき、該当染色体の displayregion の位置・高さを更新する。
   * 全染色体分のデータが来るため、自身の染色体番号(_no)に対応するエントリだけを使う。
   *
   * 呼ばれるタイミング: 結果テーブルのoffset（スクロール位置）が変化したとき。
   * ResultsViewDataManager.handleOffsetChange() が全レコードのstart位置min〜maxを計算し
   * 'displayingRegionsOnChromosome' としてStoreに書き込むことでこのメソッドが発火する。
   * つまり displayregion は「検索結果が染色体上のどこに分布しているか」を示す。
   */
  displayingRegionsOnChromosome(displayingRegions: DisplayingRegions): void {
    const region = displayingRegions[this._no];
    if (region) {
      this._displayRegion.classList.add('-shown');
      const chromosomeAreaHeight = this._svg.clientHeight - PADDING * 2;
      const rate = chromosomeAreaHeight / this._length;
      this._displayRegion.style.top = `${Math.floor(PADDING + region.start * rate)}px`;
      this._displayRegion.style.height = `${Math.ceil((region.end - region.start) * rate)}px`;
    } else {
      this._displayRegion.classList.remove('-shown');
    }
  }

  /**
   * Advanced SearchのLocation条件が変化したとき、該当バンドに '-selected' を付ける。
   * Karyotype.js から外部呼び出しされる公開メソッド。
   */
  updateSelectedPositions(positions: PositionRange[]): void {
    this._subbands.forEach((subband) => {
      const range: PositionRange = [
        Number(subband.dataset.start),
        Number(subband.dataset.end),
      ];
      const hit = positions.some((pos) => this._intersection(pos, range));
      subband.classList.toggle('-selected', hit);
    });
    this._bands.forEach((band) => {
      const range: PositionRange = [
        Number(band.dataset.start),
        Number(band.dataset.end),
      ];
      const hit = positions.some((pos) => this._intersection(pos, range));
      band.classList.toggle('-selected', hit);
    });
  }

  /**
   * range1の範囲内にrange2の終端が含まれるか判定する。
   * 完全包含ではなく片端一致でも交差とみなす（精度は粗いがカスタム動作として維持）。
   */
  private _intersection(range1: PositionRange, range2: PositionRange): boolean {
    return range1[0] <= range2[1] && range2[1] <= range1[1];
  }

  /**
   * Karyotype.ts が染色体ビューを配列管理するために染色体番号を参照する。
   */
  get no(): string {
    return this._no;
  }
}
