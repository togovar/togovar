import { storeManager } from '../../store/StoreManager';
import { ResultsViewDisplayManager } from './ResultsViewDisplayManager';
import type {
  SearchMessages,
  SearchStatus,
  ColumnConfig,
} from '../../types';
import type { DisplayingRegions } from '../../types/storeState';

interface SelectionState {
  currentIndex: number | undefined;
  rowCount: number;
  offset: number;
  numberOfRecords: number;
}

export class ResultsViewDataManager {
  private container: HTMLElement;
  private status: HTMLElement;
  private messages: HTMLElement;
  private isDestroyed = false;
  private displayManager: ResultsViewDisplayManager;

  constructor(
    container: HTMLElement,
    status: HTMLElement,
    messages: HTMLElement,
    tbody: HTMLElement,
    stylesheet: HTMLStyleElement
  ) {
    this.container = container;
    this.status = status;
    this.messages = messages;
    this.displayManager = new ResultsViewDisplayManager(tbody, stylesheet);
  }

  // ========================================
  // Display Management
  // ========================================

  updateDisplaySize(
    isTouchDevice: boolean,
    setTouchElementsPointerEvents: (_enabled: boolean) => void
  ): void {
    if (this.isDestroyed) return;
    this.displayManager.updateDisplaySize(isTouchDevice, setTouchElementsPointerEvents);
  }

  handleSearchResults(
    _results: unknown,
    isTouchDevice: boolean,
    setTouchElementsPointerEvents: (_enabled: boolean) => void
  ): void {
    this.displayManager.handleSearchResults(isTouchDevice, setTouchElementsPointerEvents);
  }

  handleColumnsChange(columns: ColumnConfig[]): void {
    this.displayManager.handleColumnsChange(columns);
  }

  // ========================================
  // Status and Messages Handling
  // ========================================

  handleSearchMessages(messages: SearchMessages): void {
    this.messages.innerHTML = '';
    this.appendMessageIfExists(messages.notice, 'notice');
    this.appendMessageIfExists(messages.warning, 'warning');
    this.appendMessageIfExists(messages.error, 'error');
  }

  handleSearchStatus(status: SearchStatus): void {
    const { available, filtered } = status;
    this.status.innerHTML =
      `The number of available variations is ${available.toLocaleString()} ` +
      `out of <span class="highlight">${filtered.toLocaleString()}</span>.`;
    this.updateNotFoundState(filtered === 0);
  }

  // ========================================
  // Offset and Selection Handling
  // ========================================

  /**
   * offset変更時の行再描画はDisplayManagerへ集約し、行ごとの同期購読を避ける。
   */
  handleOffsetChange(
    _offset: number,
    isTouchDevice: boolean,
    setTouchElementsPointerEvents: (_enabled: boolean) => void
  ): void {
    if (this.isDestroyed) return;

    this.displayManager.requestRowsUpdate(
      isTouchDevice,
      setTouchElementsPointerEvents
    );

    if (this.shouldSkipOffsetUpdate()) return;

    const displayingRegions = this.calculateDisplayingRegions();
    storeManager.setData('displayingRegionsOnChromosome', displayingRegions);
  }

  shiftSelectedRow(direction: number): void {
    const state = this.getSelectionState();
    const newIndex = this.calculateNewIndex(state, direction);
    const adjustedOffset = this.adjustOffsetForSelection(state, newIndex, direction);

    if (adjustedOffset !== state.offset) {
      storeManager.setData('offset', adjustedOffset);
    }

    storeManager.setData('selectedRow', newIndex);
  }

  // ================================================================
  // Lifecycle Management
  // ================================================================

  destroy(): void {
    if (this.isDestroyed) return;

    this.displayManager.destroy();
    this.isDestroyed = true;
  }

  // ========================================
  // Private Methods
  // ========================================

  private shouldSkipOffsetUpdate(): boolean {
    return (
      storeManager.getData('isSearchResultsUpdating') ||
      storeManager.getData('isSearchDataFetching')
    );
  }

  private calculateDisplayingRegions(): DisplayingRegions {
    const rowCount = storeManager.getData('rowCount');
    const chromosomePositions: { [key: string]: number[] } = {};

    for (let i = 0; i < rowCount; i++) {
      const record = storeManager.getRecordByIndex(i);
      if (typeof record !== 'string') {
        (chromosomePositions[record.chromosome] ??= []).push(record.start);
      }
    }

    return this.convertToRegions(chromosomePositions);
  }

  private convertToRegions(chromosomePositions: { [key: string]: number[] }): DisplayingRegions {
    const regions: DisplayingRegions = {};

    for (const chromosome in chromosomePositions) {
      const positions = chromosomePositions[chromosome];
      regions[chromosome] = {
        start: Math.min(...positions),
        end: Math.max(...positions),
      };
    }

    return regions;
  }

  private appendMessageIfExists(message: string | undefined, type: string): void {
    if (message) {
      this.messages.innerHTML += `<div class="message -${type}">${message}</div>`;
    }
  }

  private updateNotFoundState(isNotFound: boolean): void {
    if (isNotFound) {
      this.container.classList.add('-not-found');
    } else {
      this.container.classList.remove('-not-found');
    }
  }

  private getSelectionState(): SelectionState {
    return {
      currentIndex: storeManager.getData('selectedRow'),
      rowCount: storeManager.getData('rowCount'),
      offset: storeManager.getData('offset'),
      numberOfRecords: storeManager.getData('numberOfRecords'),
    };
  }

  private calculateNewIndex(state: SelectionState, direction: number): number {
    const newIndex = (state.currentIndex ?? 0) + direction;
    return Math.max(0, Math.min(newIndex, state.rowCount - 1));
  }

  private adjustOffsetForSelection(
    state: SelectionState,
    newIndex: number,
    direction: number
  ): number {
    let { offset } = state;

    if (direction < 0 && newIndex === 0 && offset > 0) {
      offset--;
    } else if (direction > 0 && newIndex === state.rowCount - 1) {
      if (offset + newIndex < state.numberOfRecords - 1) {
        offset++;
      }
    }

    return offset;
  }
}
