import StoreManager from "./StoreManager.js";

const datasets = [];

export default class FrequencyGraphView {
  
  constructor(container) {
    if (datasets.length === 0) {
      const master = StoreManager.getSearchConditionMaster('dataset');
      datasets.push(...master.items.filter(item => item.has_freq));
    }
    container.innerHTML = `<span class="frequency-graph">
      ${datasets.map(dataset => `<span class="dataset" data-dataset="${dataset.id}" data-frequency=""><span class="taking freq"></span></span>`).join('<span class="taking">,</span>')}
    </span>`;
    const freqGraph = container.querySelector(':scope > .frequency-graph');
    this._datasetNodes = Object.fromEntries(datasets.map(dataset => {
      const node = freqGraph.querySelector(`:scope > [data-dataset="${dataset.id}"]`);
      return [
        dataset.id,
        {
          dataset: node,
          freq: node.querySelector(':scope > .freq')
        }
      ];
    }))
  }

  setValues(frequencies) {
    for (const dataset of datasets) {
      const frequency = frequencies ? frequencies.find(frequency => frequency.source === dataset.id) : undefined;
      let frequencyValue;
      if (frequency) {
        switch (true) {
          case frequency.allele.count == 1:
            frequencyValue = 'singleton';
            break;
          case frequency.allele.frequency >= .5:
            frequencyValue = '≥0.5';
            break;
          case frequency.allele.frequency > .05:
            frequencyValue = '<0.5';
            break;
          case frequency.allele.frequency > .01:
            frequencyValue = '<0.05';
            break;
          case frequency.allele.frequency > .001:
            frequencyValue = '<0.01';
            break;
          case frequency.allele.frequency > .0001:
            frequencyValue = '<0.001';
            break;
          case frequency.allele.frequency > 0:
            frequencyValue = '<0.0001';
            break;
          default:
            frequencyValue = 'monomorphic';
            break;
        }
      } else {
        frequencyValue = 'na';
      }
      this._datasetNodes[dataset.id].dataset.dataset.frequency = frequencyValue;
      this._datasetNodes[dataset.id].freq.textContent = frequency ? frequency.allele.frequency : '';
    }

  }

}