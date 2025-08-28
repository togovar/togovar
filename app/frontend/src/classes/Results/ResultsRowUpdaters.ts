import { getSimpleSearchConditionMaster } from '../../store/searchManager';
import {
  DatasetMasterItem,
  TypeMasterItem,
  ConsequenceMasterItem,
  GeneSymbol,
  Frequency,
  TdFrequencies,
  Transcript,
  Significance,
} from '../../types';
import { REF_ALT_SHOW_LENGTH } from './ResultsRowTemplates';

export class ResultsRowUpdaters {
  /** TogoVar ID */
  static updateTogovarId(
    element: HTMLAnchorElement | null,
    value: string,
    url: string
  ) {
    if (!element || !value) {
      if (element) {
        element.href = '';
        element.textContent = '';
      }
      return;
    }

    element.href = url;
    element.textContent = value;
  }

  /** RefSNP ID */
  static updateRefSNP(
    tdRS: HTMLTableCellElement | null,
    tdRSAnchor: HTMLAnchorElement | null,
    values: string[]
  ) {
    if (!tdRS || !tdRSAnchor) return;

    if (!values || values.length === 0) {
      tdRS.dataset.remains = '0';
      tdRSAnchor.href = '';
      tdRSAnchor.textContent = '';
      return;
    }

    tdRS.dataset.remains = (values.length - 1).toString();
    tdRSAnchor.href = `http://identifiers.org/dbsnp/${values[0]}`;
    tdRSAnchor.textContent = values[0];
  }

  /** Position */
  static updatePosition(
    tdPositionChromosome: HTMLDivElement | null,
    tdPositionCoordinate: HTMLDivElement | null,
    chromosome: string,
    position: number
  ) {
    if (tdPositionChromosome) {
      tdPositionChromosome.textContent = chromosome;
    }
    if (tdPositionCoordinate) {
      tdPositionCoordinate.textContent = position.toString();
    }
  }

  /** Ref/Alt */
  static updateRefAlt(
    tdRefAltRef: HTMLSpanElement | null,
    tdRefAltAlt: HTMLSpanElement | null,
    reference: string,
    alternate: string
  ) {
    const refData = this.formatRefAltData(reference || '');
    const altData = this.formatRefAltData(alternate || '');

    if (tdRefAltRef) {
      tdRefAltRef.textContent = refData.display;
      tdRefAltRef.dataset.sum = refData.length.toString();
    }

    if (tdRefAltAlt) {
      tdRefAltAlt.textContent = altData.display;
      tdRefAltAlt.dataset.sum = altData.length.toString();
    }
  }

  static formatRefAltData(sequence: string) {
    return {
      display: this.formatRefAlt(sequence),
      length: sequence.length,
    };
  }

  static formatRefAlt(sequence: string) {
    return (
      sequence.substring(0, REF_ALT_SHOW_LENGTH) +
      (sequence.length > REF_ALT_SHOW_LENGTH ? '...' : '')
    );
  }

  /** Variant Type */
  static updateVariantType(element: HTMLDivElement | null, value: string) {
    if (!element) return;

    const master: TypeMasterItem[] =
      getSimpleSearchConditionMaster('type').items;
    element.textContent = master.find((item) => item.id === value)?.label || '';
  }

  /** Gene */
  static updateGene(
    tdGene: HTMLTableCellElement | null,
    tdGeneAnchor: HTMLAnchorElement | null,
    symbols: GeneSymbol[]
  ) {
    if (!tdGene || !tdGeneAnchor) return;

    if (!symbols || symbols.length === 0) {
      tdGene.dataset.remains = '0';
      tdGeneAnchor.href = '';
      tdGeneAnchor.textContent = '';
      return;
    }

    tdGene.dataset.remains = (symbols.length - 1).toString();
    tdGeneAnchor.href = `/gene/${symbols[0].id}`;
    tdGeneAnchor.textContent = symbols[0].name;
  }

  /** Alt Frequency */
  static updateAltFrequency(
    tdFrequencies: TdFrequencies,
    frequencies: Frequency[]
  ) {
    const master: DatasetMasterItem[] =
      getSimpleSearchConditionMaster('dataset').items;

    master
      .filter((dataset) => dataset.has_freq)
      .forEach((dataset) => {
        const frequency = frequencies?.find(
          (freq) => freq.source === dataset.id
        );
        const element = tdFrequencies[dataset.id];
        if (element) {
          element.frequency = frequency;
        }
      });
  }

  /** Consequence */
  static updateConsequence(
    tdConsequence: HTMLTableCellElement | null,
    tdConsequenceItem: HTMLDivElement | null,
    mostConsequence: string,
    transcripts: Transcript[]
  ) {
    if (!tdConsequence || !tdConsequenceItem) return;

    if (!mostConsequence) {
      tdConsequence.dataset.remains = '0';
      tdConsequenceItem.textContent = '';
      return;
    }

    const master: ConsequenceMasterItem[] =
      getSimpleSearchConditionMaster('consequence').items;
    const uniqueConsequences = Array.from(
      new Set(transcripts.flatMap((transcript) => transcript.consequence))
    );

    tdConsequence.dataset.remains = (uniqueConsequences.length - 1).toString();
    tdConsequenceItem.textContent =
      master.find((consequence) => consequence.id === mostConsequence)?.label ||
      '';
  }

  /** Clinical significance */
  static updateClinicalSignificance(
    tdClinicalSign: HTMLDivElement | null,
    tdClinicalAnchor: HTMLAnchorElement | null,
    tdClinicalIcon: HTMLSpanElement | null,
    significances: Significance[]
  ) {
    if (!tdClinicalSign || !tdClinicalAnchor || !tdClinicalIcon) return;

    if (!significances || significances.length === 0) {
      this.resetClinicalSignificance(
        tdClinicalSign,
        tdClinicalAnchor,
        tdClinicalIcon
      );
      return;
    }

    const firstSignificance = significances[0];
    const firstCondition = firstSignificance.conditions?.[0];

    // Set interpretations value
    tdClinicalSign.dataset.value = firstSignificance.interpretations[0];

    this.updateClinicalCondition(
      tdClinicalSign,
      tdClinicalAnchor,
      firstCondition
    );
    this.updateClinicalMetadata(tdClinicalIcon, significances);
  }

  static resetClinicalSignificance(
    tdClinicalSign: HTMLDivElement,
    tdClinicalAnchor: HTMLAnchorElement,
    tdClinicalIcon: HTMLSpanElement
  ) {
    tdClinicalSign.dataset.value = '';
    tdClinicalAnchor.textContent = '';
    tdClinicalAnchor.setAttribute('href', '');
    tdClinicalIcon.dataset.remains = '0';
    tdClinicalIcon.dataset.mgend = 'false';
  }

  static updateClinicalCondition(
    tdClinicalSign: HTMLDivElement,
    tdClinicalAnchor: HTMLAnchorElement,
    firstCondition: any
  ) {
    if (firstCondition) {
      tdClinicalSign.textContent = '';
      tdClinicalAnchor.textContent = firstCondition.name || '';

      if (firstCondition.medgen) {
        tdClinicalAnchor.setAttribute(
          'href',
          `/disease/${firstCondition.medgen}`
        );
      } else {
        // Display in div instead of anchor when no medgen
        tdClinicalSign.textContent = firstCondition.name;
        tdClinicalAnchor.textContent = '';
        tdClinicalAnchor.className = '';
      }
    } else {
      // No conditions exist
      tdClinicalSign.textContent = 'others';
      tdClinicalAnchor.textContent = '';
    }
  }

  static updateClinicalMetadata(
    tdClinicalIcon: HTMLSpanElement,
    significances: Significance[]
  ) {
    // Set remaining significance count
    tdClinicalIcon.dataset.remains = (significances.length - 1).toString();

    // Check if mgend source exists in significances
    const hasMedgen = significances.some(
      (significance) => significance.source === 'mgend'
    );
    tdClinicalIcon.dataset.mgend = hasMedgen.toString();
  }

  /** Function prediction common logic */
  static updateFunctionPrediction(
    element: HTMLDivElement | null,
    value: number | null,
    getFunctionClass: (value: number) => string
  ) {
    if (!element) return;

    if (value === null) {
      element.textContent = '';
      element.dataset.function = '';
      return;
    }

    element.textContent = value.toString();
    element.dataset.function = getFunctionClass(value);
  }

  /** AlphaMissense */
  static updateAlphaMissense(element: HTMLDivElement | null, value: number) {
    this.updateFunctionPrediction(element, value, (val) => {
      if (val < 0.34) return 'LB';
      if (val > 0.564) return 'LP';
      return 'A';
    });
  }

  /** SIFT */
  static updateSift(element: HTMLDivElement | null, value: number) {
    this.updateFunctionPrediction(element, value, (val) =>
      val >= 0.05 ? 'T' : 'D'
    );
  }

  /** PolyPhen */
  static updatePolyphen(element: HTMLDivElement | null, value: number) {
    this.updateFunctionPrediction(element, value, (val) => {
      if (val > 0.908) return 'PROBD';
      if (val > 0.446) return 'POSSD';
      if (val >= 0) return 'B';
      return 'U';
    });
  }
}
