import { storeManager } from '../store/StoreManager';
import { setSimpleSearchCondition } from '../store/searchManager';

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
    this._no = no;
    this._map = map;
    this._elm = elm;

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

    // 参照
    this._filteredRegion = this._elm.querySelector('.lower > .filteredregion'); // TODO: フィルターで得られた範囲
    this._displayRegion = this._elm.querySelector('.lower > .displayregion'); // 表示領域
    this._selectedRegion = this._elm.querySelector('.lower > .selectedregion'); // 検索条件に region がある場合

    // 粒度の粗いマップ
    const lowMap = map.reduce((acc, subBand) => {
      if (acc.length === 0 || acc[acc.length - 1].band !== subBand.band) {
        acc.push({
          band: subBand.band,
          start: subBand.start,
          end: subBand.end,
        });
        return acc;
      } else {
        acc[acc.length - 1].end = subBand.end;
        return acc;
      }
    }, []);

    // 染色体の描画
    this._length = map[map.length - 1].end;
    this._svg = this._elm.querySelector('svg.chromosome');
    const chromosomeAreaHeight =
        elm.offsetHeight -
        elm.querySelector('.upper').offsetHeight -
        PADDING * 2,
      chromosomeHeight = chromosomeAreaHeight * (this._length / maxLength),
      rate = chromosomeHeight / this._length;
    this._svg.style.height = `${chromosomeHeight + PADDING * 2}px`;
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
    for (const subBand of this._map) {
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
          y="${Math.floor(PADDING + subBand.start * rate)}"
          height="${Math.ceil((subBand.end - subBand.start) * rate)}"
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
        transform="translate(${WIDTH + 4.5}, ${
        PADDING + band.start * rate - 0.5
      })"
        >
        <text x="8" y="${
          (band.end - band.start) * rate * 0.5 + 3
        }" class="bandtext">${band.band}</text>
        <path d="M0,1 V${(band.end - band.start) * rate - 1} M0,${Math.round(
        (band.end - band.start) * rate * 0.5
      )} H8" class="line" />
      </g>
      `;
    }
    this._svg.innerHTML = html + '</g>';

    // event
    storeManager.bind('displayingRegionsOnChromosome', this);

    // whole
    this._elm
      .querySelector(':scope > .upper > .no')
      .addEventListener('click', () => {
        this._selectBand(this._no, 1, this._length);
      });

    // sub bands
    this._subbands = Array.from(this._svg.querySelectorAll('g.subband'));
    this._subbands.forEach((subband) => {
      subband.addEventListener('click', () => {
        this._selectBand(this._no, subband.dataset.start, subband.dataset.end);
      });
    });

    // bands
    this._bands = this._svg.querySelectorAll('g.band');
    this._bands.forEach((band) => {
      if (band.dataset.start) {
        const [start, end] = [+band.dataset.start, +band.dataset.end];
        const includesSubbands = this._subbands.filter(
          (subband) =>
            start <= +subband.dataset.start && +subband.dataset.end <= end
        );
        band.addEventListener('click', () => {
          this._selectBand(this._no, band.dataset.start, band.dataset.end);
        });
        band.addEventListener('mouseenter', () => {
          includesSubbands.forEach((subband) =>
            subband.classList.add('-hover')
          );
        });
        band.addEventListener('mouseleave', () => {
          includesSubbands.forEach((subband) =>
            subband.classList.remove('-hover')
          );
        });
      }
    });

    this._svg.querySelector;
  }

  _selectBand(chr, start, end) {
    switch (storeManager.getData('searchMode')) {
      case 'simple':
        setSimpleSearchCondition('term', `${chr}:${start}-${end}`);
        break;
      case 'advanced': {
        const targetElement = document
          .getElementById('AdvancedSearchBuilderView')
          ?.querySelector(
            ':scope > .inner > .advanced-search-condition-group-view.-root > .advanced-search-toolbar > ul > li > ul > li[data-condition="location"]'
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
    // Karyotype 上の座標編集フィールドが廃止になったため、不要
    //storeManager.setData('region__', {
    //  chromosome: this._no,
    //  start: e.delegateTarget.dataset.start,
    //  end: e.delegateTarget.dataset.end
    //});
  }

  displayingRegionsOnChromosome(displayingRegions) {
    if (displayingRegions[this._no]) {
      // 表示領域をハイライト
      this._displayRegion.classList.add('-shown');
      const displayRegion = displayingRegions[this._no],
        chromosomeAreaHeight = this._svg.clientHeight - PADDING * 2,
        rate = chromosomeAreaHeight / this._length,
        regionHeight = displayRegion.end - displayRegion.start;
      this._displayRegion.style.top = `${Math.floor(
        PADDING + displayRegion.start * rate
      )}px`;
      this._displayRegion.style.height = `${Math.ceil(regionHeight * rate)}px`;
    } else {
      this._displayRegion.classList.remove('-shown');
    }
  }

  updateSelectedPositions(positions) {
    this._subbands.forEach((subband) => {
      const [start, end] = [+subband.dataset.start, +subband.dataset.end];
      let intersection = 0;
      positions.forEach((position) => {
        intersection += this._intersection(position, [start, end]);
      });
      if (intersection > 0) subband.classList.add('-selected');
      else subband.classList.remove('-selected');
    });
    this._bands.forEach((band) => {
      const [start, end] = [+band.dataset.start, +band.dataset.end];
      let intersection = 0;
      positions.forEach((position) => {
        intersection += this._intersection(position, [start, end]);
      });
      if (intersection > 0) band.classList.add('-selected');
      else band.classList.remove('-selected');
    });
  }

  _intersection(range1, range2) {
    return range1[0] <= range2[1] && range2[1] <= range1[1];
    // return (
    //   (range1[0] <= range2[0] && range2[1] <= range1[0]) ||
    //   (range1[1] <= range2[0] && range2[1] <= range1[1]) ||
    //   (range1[0] <= range2[0] && range2[1] <= range1[1])
    // );
    // TODO: 精度が低い
  }

  get no() {
    return this._no;
  }
}
