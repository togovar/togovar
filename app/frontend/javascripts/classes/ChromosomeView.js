import StoreManager from "./StoreManager.js";

const WIDTH = 12;
const PADDING = 5;

export default class ChromosomeView {

  /* @param elm:HTMLElement
   * @param no:Number Chromosome number
   * @param map:Array Position data
   * @param maxLength:Number Max length of chromosomes
   */
  constructor(elm, no, map, maxLength) {
    //return;
    this.no = no;
    this.map = map;
    this.elm = elm;

    this.elm.innerHTML = `
      <div class="upper">
        <p class="no">${this.no}</p>
      </div>
      <div class="lower">
        <div class="selectedregion"></div>
        <div class="filteredregion"></div>
        <svg class="chromosome"></svg>
        <div class="displayregion"></div>
      </div>
    `;

    // 参照
    this.filteredRegion = this.elm.querySelector('.lower > .filteredregion'); // TODO: フィルターで得られた範囲
    this.displayRegion = this.elm.querySelector('.lower > .displayregion'); // 表示領域
    this.selectedRegion = this.elm.querySelector('.lower > .selectedregion'); // 検索条件に region がある場合

    // 粒度の粗いマップ
    const lowMap = map.reduce((acc, subBand) => {
      if (acc.length === 0 || acc[acc.length - 1].band !== subBand.band) {
        acc.push({
          band: subBand.band,
          start: subBand.start,
          end: subBand.end
        });
        return acc;
      } else {
        acc[acc.length - 1].end = subBand.end;
        return acc;
      }
    }, []);

    // 染色体の描画
    this.length = map[map.length - 1].end;
    this.svg = this.elm.querySelector('svg.chromosome');
    const
      chromosomeAreaHeight = elm.offsetHeight - elm.querySelector('.upper').offsetHeight - PADDING * 2,
      chromosomeHeight = chromosomeAreaHeight * (this.length / maxLength),
      rate = chromosomeHeight / this.length;
    this.svg.style.height = `${chromosomeHeight + PADDING * 2}px`;
    let html = `
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

    // draw subbands (drawing area)
    for (const subBand of this.map) {
      html += `
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
          y="${PADDING + subBand.start * rate}"
          height="${(subBand.end - subBand.start) * rate}"
          width="${WIDTH}"
        />
      </g>`;
    }

    // draw bands (text area)
    for (const band of lowMap) {
      html += `
      <g
        class="band"
        data-band="${band.band}"
        data-start="${band.start}"
        data-end="${band.end}"
        transform="translate(${WIDTH + 4.5}, ${PADDING + band.start * rate - .5})"
        >
        <text x="8" y="${(band.end - band.start) * rate * 0.5 + 3}" class="bandtext">${band.band}</text>
        <path d="M0,1 V${(band.end - band.start) * rate - 1} M0,${Math.round((band.end - band.start) * rate * 0.5)} H8" class="line" />
      </g>
      `;
    }
    this.svg.innerHTML = html + '</g>';

    // イベント
    StoreManager.bind('displayingRegionsOnChromosome', this);

    // bands
    this.svg.querySelectorAll('g.band').forEach(g => {
      $(g).on('click', e => {
        StoreManager.setSearchCondition('term', `${this.no}:${e.delegateTarget.dataset.start}-${e.delegateTarget.dataset.end}`);
        // Karyotype 上の座標編集フィールドが廃止になったため、不要
        //StoreManager.setData('region__', {
        //  chromosome: this.no,
        //  start: e.delegateTarget.dataset.start,
        //  end: e.delegateTarget.dataset.end
        //});
      });
    });

    // sub bands
    this.svg.querySelectorAll('g.subband').forEach(g => {
      $(g).on('click', e => {
        StoreManager.setSearchCondition('term', `${this.no}:${e.delegateTarget.dataset.start}-${e.delegateTarget.dataset.end}`);
        // Karyotype 上の座標編集フィールドが廃止になったため、不要
        //StoreManager.setData('region__', {
        //  chromosome: this.no,
        //  start: e.delegateTarget.dataset.start,
        //  end: e.delegateTarget.dataset.end
        //});
      });
    });
  }

  displayingRegionsOnChromosome(displayingRegions) {
    if (displayingRegions[this.no]) {
      // 表示領域をハイライト
      this.displayRegion.classList.add('-shown');
      const
        displayRegion = displayingRegions[this.no],
        chromosomeAreaHeight = this.svg.clientHeight - PADDING * 2,
        rate = chromosomeAreaHeight / this.length,
        regionHeight = displayRegion.end - displayRegion.start;
      this.displayRegion.style.top = `${Math.floor(PADDING + displayRegion.start * rate)}px`;
      this.displayRegion.style.height = `${Math.ceil(regionHeight * rate)}px`;
    } else {
      this.displayRegion.classList.remove('-shown');
    }
  }

}
