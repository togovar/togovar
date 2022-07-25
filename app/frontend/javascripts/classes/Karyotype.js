import StoreManager from './StoreManager.js';
import ChromosomeView from './ChromosomeView.js';

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
];
const HEIGHTS = [0, 400];
const DEFAULT = {
  isOpened: false,
  isShowBand: true,
  height: HEIGHTS[0],
  reference: 'GRCh37', // TODO:,
  version: 1,
  chromosomes: {
    1: {
      selected: true,
      region: {
        GRCh37: [1, 249250621],
        GRCh38: [1, 248956422],
      },
    },
    2: {
      selected: true,
      region: {
        GRCh37: [1, 243199373],
        GRCh38: [1, 242193529],
      },
    },
    3: {
      selected: true,
      region: {
        GRCh37: [1, 198022430],
        GRCh38: [1, 198295559],
      },
    },
    4: {
      selected: true,
      region: {
        GRCh37: [1, 191154276],
        GRCh38: [1, 190214555],
      },
    },
    5: {
      selected: true,
      region: {
        GRCh37: [1, 180915260],
        GRCh38: [1, 181538259],
      },
    },
    6: {
      selected: true,
      region: {
        GRCh37: [1, 171115067],
        GRCh38: [1, 170805979],
      },
    },
    7: {
      selected: true,
      region: {
        GRCh37: [1, 159138663],
        GRCh38: [1, 159345973],
      },
    },
    8: {
      selected: true,
      region: {
        GRCh37: [1, 146364022],
        GRCh38: [1, 145138636],
      },
    },
    9: {
      selected: true,
      region: {
        GRCh37: [1, 141213431],
        GRCh38: [1, 138394717],
      },
    },
    10: {
      selected: true,
      region: {
        GRCh37: [1, 135534747],
        GRCh38: [1, 133797422],
      },
    },
    11: {
      selected: true,
      region: {
        GRCh37: [1, 135006516],
        GRCh38: [1, 135086622],
      },
    },
    12: {
      selected: true,
      region: {
        GRCh37: [1, 133851895],
        GRCh38: [1, 133275309],
      },
    },
    13: {
      selected: true,
      region: {
        GRCh37: [1, 115169878],
        GRCh38: [1, 114364328],
      },
    },
    14: {
      selected: true,
      region: {
        GRCh37: [1, 107349540],
        GRCh38: [1, 107043718],
      },
    },
    15: {
      selected: true,
      region: {
        GRCh37: [1, 102531392],
        GRCh38: [1, 101991189],
      },
    },
    16: {
      selected: true,
      region: {
        GRCh37: [1, 90354753],
        GRCh38: [1, 90338345],
      },
    },
    17: {
      selected: true,
      region: {
        GRCh37: [1, 81195210],
        GRCh38: [1, 83257441],
      },
    },
    18: {
      selected: true,
      region: {
        GRCh37: [1, 78077248],
        GRCh38: [1, 80373285],
      },
    },
    19: {
      selected: true,
      region: {
        GRCh37: [1, 59128983],
        GRCh38: [1, 58617616],
      },
    },
    20: {
      selected: true,
      region: {
        GRCh37: [1, 63025520],
        GRCh38: [1, 64444167],
      },
    },
    21: {
      selected: true,
      region: {
        GRCh37: [1, 48129895],
        GRCh38: [1, 46709983],
      },
    },
    22: {
      selected: true,
      region: {
        GRCh37: [1, 51304566],
        GRCh38: [1, 50818468],
      },
    },
    X: {
      selected: true,
      region: {
        GRCh37: [1, 155270560],
        GRCh38: [1, 156040895],
      },
    },
    Y: {
      selected: true,
      region: {
        GRCh37: [1, 59373566],
        GRCh38: [1, 57227415],
      },
    },
    MT: {
      selected: true,
      region: {
        GRCh37: [1, 16569],
        GRCh38: [1, 16569],
      },
    },
  },
};
const REGEXP = new RegExp(/([1-9]|1\d|2[0-2]|X|Y|MT):(\d+)-?(\d+)?/);

export default class Karyotype {
  constructor(elm) {
    this.elm = elm;
    this.isReady = false;
    this.chromosomes = this.elm.querySelector('.content > .chromosomes');
    this.chromosomeViews;

    // initial settings
    let karyotype = JSON.parse(localStorage.getItem('karyotype'));
    if (!karyotype || karyotype.version !== DEFAULT.version) {
      karyotype = DEFAULT;
    }
    StoreManager.setData('karyotype', karyotype);

    // events
    StoreManager.bind('karyotype', this);
    StoreManager.bind('simpleSearchConditions', this);
    StoreManager.bind('advancedSearchConditions', this);
    // ビューの開閉
    this.elm.querySelector('.header').addEventListener('click', () => {
      const karyotype = StoreManager.getData('karyotype');
      this._changeKaryotype({
        isOpened: !karyotype.isOpened,
        height: karyotype.isOpened ? HEIGHTS[0] : HEIGHTS[1],
      });
      return false;
    });
    // 設定関係
    const buttons = this.elm.querySelectorAll(
      '#KariotypeSwitchBandVisibility > .button'
    );
    buttons.forEach((button) => {
      button.addEventListener('click', (e) => {
        this._changeKaryotype({
          isShowBand: e.target.dataset.value === 'show',
        });
      });
    });
    this._bandShowButton = Array.from(buttons).filter(
      (elm) => elm.dataset.value === 'show'
    )[0];
    this._bandHideButton = Array.from(buttons).filter(
      (elm) => elm.dataset.value === 'hide'
    )[0];

    // 染色体座標データ
    const tsv = require(`../../assets/${karyotype.reference}.tsv`);
    this.geneMap = this.parseGeneMap(tsv);
    this.maxLength = Math.max(
      ...this.geneMap.map((chromosome) => chromosome[chromosome.length - 1].end)
    );
    this._drawChromosome(this.geneMap);
    //fetch(`./assets/${karyotype.reference}.tsv`)
    //  .then(response => response.text())
    //  .then(tsv => {
    //    this.geneMap = this.parseGeneMap(tsv);
    //    this.maxLength = Math.max(...this.geneMap.map(chromosome => chromosome[chromosome.length - 1].end));
    //    this._drawChromosome(this.geneMap);
    //  });

    // ストアの情報を反映
    this.karyotype(StoreManager.getData('karyotype'));
  }

  // TSVから総位置データ取り出し
  parseGeneMap(tsv) {
    const geneMap = [];
    //const positions = tsv.split('\n').map(row => row.split('\t'));
    for (const chromosomeKey of CHROMOSOME_KEYS) {
      // 染色体ごとの位置データ
      const chromosome = tsv.filter(
        (position) => position[0] === `chr${chromosomeKey}`
      );
      //const chromosome = positions.filter(position => position[0] === `chr${chromosomeKey}`);
      // データ整形
      geneMap.push(
        chromosome.map((position) => {
          return {
            start: parseInt(position[1]),
            end: parseInt(position[2]),
            band: position[3].split('.')[0],
            subBand: position[3],
            stainType: position[4],
          };
        })
      );
    }
    return geneMap;
  }

  // 染色体の描画
  _drawChromosome(geneMap) {
    this.chromosomeViews = [];
    this.chromosomes.innerHTML = CHROMOSOME_KEYS.map(
      (key) => `<div id="chromosome${key}" class="chromosome-view"></div>`
    ).join('');
    for (let i = 0; i < geneMap.length; i++) {
      this.chromosomeViews.push(
        new ChromosomeView(
          this.chromosomes.querySelector(`#chromosome${CHROMOSOME_KEYS[i]}`),
          CHROMOSOME_KEYS[i],
          geneMap[i],
          this.maxLength
        )
      );
    }
  }

  // 核型の設定変更
  _changeKaryotype(params) {
    const karyotype = StoreManager.getData('karyotype');
    for (const key in params) {
      karyotype[key] = params[key];
    }
    StoreManager.setData('karyotype', karyotype);
    localStorage.setItem('karyotype', JSON.stringify(karyotype));
  }

  // 核型の設定変更後に呼ばれる
  karyotype(karyotype) {
    // 開閉
    if (karyotype.isOpened) {
      document.getElementsByTagName('body')[0].classList.add('-drawer-opened');
    } else {
      document
        .getElementsByTagName('body')[0]
        .classList.remove('-drawer-opened');
    }
    // バンドの表示
    if (karyotype.isShowBand) {
      this.elm.classList.add('-show-band-label');
      this._bandShowButton.classList.add('-current');
      this._bandHideButton.classList.remove('-current');
    } else {
      this.elm.classList.remove('-show-band-label');
      this._bandShowButton.classList.remove('-current');
      this._bandHideButton.classList.add('-current');
    }
    // リファレンスゲノム
    // 染色体の選択
    // 染色体の範囲の選択
  }

  simpleSearchConditions(conditions) {
    const result = REGEXP.exec(conditions.term);
    if (result) {
      const location = { chromosome: result[1] };
      if (result[3]) {
        if (+result[2] > +result[3]) return;
        location.position = { gte: +result[2], lte: +result[3] };
      } else {
        location.position = +result[2];
      }
      this._updateLocations([location]);
    } else {
      this._updateLocations([]);
    }
  }
  advancedSearchConditions(conditions) {
    const locations = [];
    const takeOutLocations = (conditions) => {
      Object.keys(conditions).forEach((key) => {
        switch (key) {
          case 'or':
          case 'and':
            conditions[key].forEach((condition) => takeOutLocations(condition));
            break;
          case 'location':
            locations.push(conditions[key]);
            break;
        }
      });
    };
    takeOutLocations(conditions);
    this._updateLocations(locations);
  }
  _updateLocations(locations) {
    this.elm.dataset.isSelectingChromosome = locations.length > 0;
    if (locations.length === 0) return;
    const collectedLocations = {};
    locations.forEach((location) => {
      if (!collectedLocations[location.chromosome])
        collectedLocations[location.chromosome] = { positions: [] };
      collectedLocations[location.chromosome].positions.push(
        typeof location.position === 'number'
          ? [location.position, location.position]
          : [location.position.gte, location.position.lte]
      );
    });
    this.chromosomeViews.forEach((chromosomeView) => {
      chromosomeView.updateSelectedPositions(
        collectedLocations[chromosomeView.no]?.positions ?? []
      );
    });
  }
}
