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
import { REF_ALT_SHOW_LENGTH } from './ResultsColumnTemplates';

/**
 * Utility class responsible for updating data in each column of result rows
 *
 * Each method is implemented as a static method and is responsible for updating
 * DOM elements of specific column types with corresponding data
 */
export class ResultsColumnUpdater {
  /**
   * Update TogoVar ID column
   *
   * @param element - Target anchor element to update
   * @param value - TogoVar ID value
   * @param url - Link destination URL
   */
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

  /**
   * Update RefSNP ID column
   *
   * @param tdRS - RefSNP table cell element
   * @param tdRSAnchor - RefSNP anchor element
   * @param values - RefSNP ID array
   */
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

  /**
   * Update Position column
   *
   * @param tdPositionChromosome - Div element for chromosome display
   * @param tdPositionCoordinate - Div element for coordinate display
   * @param chromosome - Chromosome name
   * @param position - Coordinate position
   */
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

  /**
   * Update Ref/Alt column
   *
   * @param tdRefAltRef - Span element for Reference display
   * @param tdRefAltAlt - Span element for Alternate display
   * @param reference - Reference allele array
   * @param alternate - Alternate allele array
   */
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

  /**
   * Generate formatting information for Ref/Alt data
   *
   * @param sequence - Sequence string to format
   * @returns Object containing display string and original length
   */
  static formatRefAltData(sequence: string) {
    return {
      display: this.formatRefAlt(sequence),
      length: sequence.length,
    };
  }

  /**
   * Format Ref/Alt sequence for display
   * Adds ellipsis if sequence exceeds specified length
   *
   * @param sequence - Sequence string to format
   * @returns Formatted string
   */
  static formatRefAlt(sequence: string) {
    return (
      sequence.substring(0, REF_ALT_SHOW_LENGTH) +
      (sequence.length > REF_ALT_SHOW_LENGTH ? '...' : '')
    );
  }

  /**
   * Update Variant Type column
   *
   * @param element - Target Div element to update
   * @param value - Variant type ID
   */
  static updateVariantType(element: HTMLDivElement | null, value: string) {
    if (!element) return;

    const master: TypeMasterItem[] =
      getSimpleSearchConditionMaster('type').items;
    element.textContent = master.find((item) => item.id === value)?.label || '';
  }

  /**
   * Update Gene column
   *
   * @param tdGene - Gene table cell element
   * @param tdGeneAnchor - Gene anchor element
   * @param symbols - Gene symbol array
   */
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

  /**
   * Update Alt frequency column
   *
   * @param tdFrequencies - Map of frequency display elements
   * @param frequencies - Frequency data array
   */
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

  /**
   * Update Consequence column
   *
   * @param tdConsequence - Consequence table cell element
   * @param tdConsequenceItem - Consequence display Div element
   * @param mostConsequence - Most significant consequence
   * @param transcripts - Transcript data array
   */
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

  /**
   * Update Clinical significance column
   *
   * @param tdClinicalSign - Clinical significance display Div element
   * @param tdClinicalAnchor - Clinical significance anchor element
   * @param tdClinicalIcon - Clinical significance icon Span element
   * @param significances - Clinical significance data array
   */
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

  /**
   * Reset Clinical significance processing
   *
   * @param tdClinicalSign - Clinical significance display Div element
   * @param tdClinicalAnchor - Clinical significance anchor element
   * @param tdClinicalIcon - Clinical significance icon Span element
   */
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

  /**
   * Update Clinical significance condition information
   *
   * @param tdClinicalSign - Clinical significance display Div element
   * @param tdClinicalAnchor - Clinical significance anchor element
   * @param firstCondition - First condition data
   */
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

  /**
   * Update Clinical significance metadata
   *
   * @param tdClinicalIcon - Clinical significance icon Span element
   * @param significances - Clinical significance data array
   */
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

  /**
   * Common update logic for function prediction
   *
   * @param element - Target Div element to update
   * @param score - Function prediction score value
   * @param classifyScore - Function to determine function class from score value
   */
  static updateFunctionPrediction(
    element: HTMLDivElement | null,
    score: number | null,
    classifyScore: (_score: number) => string
  ) {
    if (!element) return;

    if (score === null) {
      element.textContent = '';
      element.dataset.function = '';
      return;
    }

    element.textContent = score.toString();
    element.dataset.function = classifyScore(score);
  }

  /**
   * Update AlphaMissense score
   *
   * @param element - Target Div element to update
   * @param score - AlphaMissense score
   */
  static updateAlphaMissense(element: HTMLDivElement | null, score: number) {
    this.updateFunctionPrediction(element, score, (_score) => {
      if (_score < 0.34) return 'LB';
      if (_score > 0.564) return 'LP';
      return 'A';
    });
  }

  /**
   * Update SIFT score
   *
   * @param element - Target Div element to update
   * @param score - SIFT score
   */
  static updateSift(element: HTMLDivElement | null, score: number) {
    this.updateFunctionPrediction(element, score, (_score) =>
      _score >= 0.05 ? 'T' : 'D'
    );
  }

  /**
   * Update PolyPhen score
   *
   * @param element - Target Div element to update
   * @param score - PolyPhen score
   */
  static updatePolyphen(element: HTMLDivElement | null, score: number) {
    this.updateFunctionPrediction(element, score, (_score) => {
      if (_score > 0.908) return 'PROBD';
      if (_score > 0.446) return 'POSSD';
      if (_score >= 0) return 'B';
      return 'U';
    });
  }
}
