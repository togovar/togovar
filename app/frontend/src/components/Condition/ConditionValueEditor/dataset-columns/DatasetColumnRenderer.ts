import type { HierarchyNode } from 'd3-hierarchy';
import { createEl } from '../../../../utils/dom/createEl';
import { ADVANCED_CONDITION_TYPE } from '../../../../advancedCondition';
import { fetchLoginStatus } from '../../../../auth/authService';
import type { UiNode } from './types';

/**
 * データセットカラムUIのDOM要素を生成する。
 *
 * データモデルをDOM構造へ変換する責務だけを担い、
 * イベント処理や状態管理は親クラスへ委ねる。
 */
export class DatasetColumnRenderer {
  private readonly _instancePrefix: string;

  /**
   * 同一ページに複数インスタンスが存在する場合でもcheckboxのidが重複しないよう、
   * インスタンスごとにプレフィックスを付ける。
   */
  constructor(
    instancePrefix: string = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`
  ) {
    this._instancePrefix = instancePrefix;
  }

  /** 指定ノード配列からカラム用リスト要素を生成する。 */
  generateColumnList(
    datasetNodes: HierarchyNode<UiNode>[],
    userIsLoggedIn: boolean,
    conditionType: string
  ): HTMLUListElement {
    return createEl('ul', {
      children: datasetNodes.map((datasetNode) =>
        this._createListItemElement(datasetNode, userIsLoggedIn, conditionType)
      ),
    });
  }

  /** 1ノード分のリストアイテム要素を生成する。 */
  private _createListItemElement(
    datasetNode: HierarchyNode<UiNode>,
    userIsLoggedIn: boolean,
    conditionType: string
  ): HTMLLIElement {
    const uniqueCheckboxId = `checkbox-${this._instancePrefix}-${datasetNode.data.id}`;

    // 未ログイン状態でJGAデータセットはロックアイコンを表示し、誤操作を防ぐ。
    const selectionElement = this._shouldShowLockIcon(
      datasetNode,
      userIsLoggedIn
    )
      ? createEl('span', { class: 'lock' })
      : createEl('input', {
          attrs: { type: 'checkbox', id: uniqueCheckboxId },
          domProps: { value: datasetNode.data.id },
        });

    const categoryIcon = this._shouldShowDatasetIcon(datasetNode, conditionType)
      ? createEl('span', {
          class: 'dataset-icon',
          dataset: datasetNode.data.value
            ? { dataset: datasetNode.data.value }
            : undefined,
        })
      : null;

    const labelText = createEl('span', { text: datasetNode.data.label });

    const labelElement = createEl('label', {
      attrs:
        selectionElement instanceof HTMLInputElement
          ? { for: uniqueCheckboxId }
          : {},
      children: [
        selectionElement,
        ...(categoryIcon ? [categoryIcon] : []),
        labelText,
      ],
    });

    // 子を持つノードだけにarrowを付け、ドリルダウン可能なことをユーザーへ示す。
    const navigationArrow =
      datasetNode.children !== undefined
        ? createEl('div', {
            class: 'arrow',
            dataset: {
              id: datasetNode.data.id,
              ...(datasetNode.data.value
                ? { value: datasetNode.data.value }
                : {}),
            },
          })
        : null;

    return createEl('li', {
      dataset: {
        id: datasetNode.data.id,
        parent: datasetNode.parent?.data.id ?? '',
        ...(datasetNode.data.value ? { value: datasetNode.data.value } : {}),
      },
      children: [labelElement, ...(navigationArrow ? [navigationArrow] : [])],
    });
  }

  /**
   * 新しいカラム要素を生成する。
   * 既存カラム数をdepthとして付与することで、後退時に不要なカラムを深さで識別できる。
   */
  createColumnElement(columnsContainer: HTMLElement): HTMLDivElement {
    const newColumnElement = document.createElement('div');
    newColumnElement.classList.add('column');
    newColumnElement.dataset.depth = columnsContainer
      .querySelectorAll(':scope > .column')
      .length.toString();
    return newColumnElement;
  }

  /** JGAデータセットへのアクセスにログインが必要なことをユーザーへ案内するカラムを追加する。 */
  async addLoginPromptColumn(columnsContainer: HTMLElement): Promise<void> {
    await fetchLoginStatus();

    const loginPromptColumn = createEl('div', {
      class: 'column',
      dataset: { depth: '2' },
      children: [
        createEl('div', {
          class: 'messages-view',
          children: [
            createEl('div', {
              class: ['note', 'message', '-warning'],
              children: [
                createEl('a', {
                  class: 'link',
                  attrs: { href: '/auth/login' },
                  text: 'Login',
                }),
                ' to select JGAD datasets',
              ],
            }),
          ],
        }),
      ],
    });

    columnsContainer.append(loginPromptColumn);
  }

  /** 未ログイン状態でJGAデータセットを表示する場合だけロックアイコンを使う。 */
  private _shouldShowLockIcon(
    datasetNode: HierarchyNode<UiNode>,
    userIsLoggedIn: boolean
  ): boolean {
    const PUBLIC_JGA_WGS_DATASETS = ['jga_wgs.jgad000758', 'jga_wgs.jgad000868'];
    return (
      userIsLoggedIn === false &&
      (datasetNode.data.value?.includes('jga_wgs.') ?? false) &&
      !PUBLIC_JGA_WGS_DATASETS.includes(datasetNode.data.value ?? '')
    );
  }

  /**
   * dataset/genotypeカテゴリの第1階層にのみデータセットアイコンを表示する。
   * depth === 1（rootの直下）に限定することで、下位カテゴリのアイコン重複を防ぐ。
   */
  private _shouldShowDatasetIcon(
    datasetNode: HierarchyNode<UiNode>,
    conditionType: string
  ): boolean {
    return (
      (conditionType === ADVANCED_CONDITION_TYPE.dataset ||
        conditionType === ADVANCED_CONDITION_TYPE.genotype) &&
      datasetNode.depth === 1
    );
  }
}
