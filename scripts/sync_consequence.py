#!/usr/bin/env python3
from __future__ import annotations
"""
Consequence 条件を openapi.yaml から自動同期するスクリプト。

scripts/GRCh38/openapi.yaml の VariantConsequence.enum を正典として
advanced_search_conditions.json の consequence.values を再生成する。

  - リーフノードの id / value は SO term ID（例: "SO_0001580"）
  - グループノードの id は "group:xxx" 形式（スクリプト内で定義）
  - ラベル・説明文はスクリプト内の辞書から取得（openapi.yaml の description は誤記あり）
  - GRCh38-only の term は GRCh37 から自動除外

使い方:
  python3 scripts/sync_consequence.py              # GRCh38（デフォルト）
  python3 scripts/sync_consequence.py --build GRCh37
  python3 scripts/sync_consequence.py --build all  # 両ビルドを更新

openapi.yaml に新しい SO term が追加されたら:
  1. GROUPS の適切なグループの children に SO term ID を追加
  2. LABELS に表示ラベルを追加
  3. DESCRIPTIONS に説明文を追加（任意）
  4. 新 term が GRCh38 のみなら GRCH38_ONLY に追加
  5. 本スクリプトを実行して JSON を再生成
  6. scripts/check_conditions.py で整合性を確認
"""

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
OPENAPI_PATH = ROOT / "scripts/GRCh38/openapi.yaml"

# GRCh38 にのみ存在する SO term（GRCh37 から自動除外される）
GRCH38_ONLY: set[str] = {
    "SO_0001968",  # coding_transcript_variant
    "SO_0001787",  # splice_donor_5th_base_variant
    "SO_0002170",  # splice_donor_region_variant
    "SO_0002169",  # splice_polypyrimidine_tract_variant
    "SO_0001060",  # sequence_variant
}

# UI 上のグループ階層定義
# children: SO term ID またはサブグループ ID を列挙する
# ここに載っていない SO term は孤立ルートノードとして末尾に追加される
GROUPS: list[dict] = [
    {
        "id": "group:transcript_variant",
        "label": "Transcript variant",
        "children": [
            "group:coding_variant",
            "group:non_coding_variant",
            "group:splice_variant",
            "SO_0001893",  # transcript_ablation
            "SO_0001889",  # transcript_amplification
            "SO_0001968",  # coding_transcript_variant (GRCh38 only)
        ],
    },
    {
        "id": "group:coding_variant",
        "label": "Coding variant",
        "parent": "group:transcript_variant",
        "children": [
            "SO_0001580",  # coding_sequence_variant
            "SO_0001907",  # feature_elongation
            "SO_0001906",  # feature_truncation
            "SO_0001589",  # frameshift_variant
            "SO_0001626",  # incomplete_terminal_codon_variant
            "SO_0001822",  # inframe_deletion
            "SO_0001821",  # inframe_insertion
            "SO_0001583",  # missense_variant
            "SO_0001621",  # NMD_transcript_variant
            "SO_0001818",  # protein_altering_variant
            "SO_0001819",  # synonymous_variant
            "SO_0002012",  # start_lost
            "SO_0001587",  # stop_gained
            "SO_0001578",  # stop_lost
            "SO_0002019",  # start_retained_variant
            "SO_0001567",  # stop_retained_variant
        ],
    },
    {
        "id": "group:non_coding_variant",
        "label": "Non-coding variant",
        "parent": "group:transcript_variant",
        "children": [
            "SO_0001624",  # 3_prime_UTR_variant
            "SO_0001623",  # 5_prime_UTR_variant
            "SO_0001627",  # intron_variant
            "SO_0001792",  # non_coding_transcript_exon_variant
            "SO_0001619",  # non_coding_transcript_variant
        ],
    },
    {
        "id": "group:splice_variant",
        "label": "Splice variant",
        "parent": "group:transcript_variant",
        "children": [
            "SO_0001574",  # splice_acceptor_variant
            "SO_0001575",  # splice_donor_variant
            "SO_0001630",  # splice_region_variant
            "SO_0001787",  # splice_donor_5th_base_variant (GRCh38 only)
            "SO_0002170",  # splice_donor_region_variant (GRCh38 only)
            "SO_0002169",  # splice_polypyrimidine_tract_variant (GRCh38 only)
        ],
    },
    {
        "id": "group:regulatory_variant",
        "label": "Regulatory variant",
        "children": [
            "SO_0001620",  # mature_miRNA_variant
            "SO_0001894",  # regulatory_region_ablation
            "SO_0001891",  # regulatory_region_amplification
            "SO_0001566",  # regulatory_region_variant
            "SO_0001782",  # TF_binding_site_variant
            "SO_0001895",  # TFBS_ablation
            "SO_0001892",  # TFBS_amplification
        ],
    },
    {
        "id": "group:intergenic_variant",
        "label": "Intergenic variant",
        "children": [
            "SO_0001632",  # downstream_gene_variant
            "SO_0001628",  # intergenic_variant
            "SO_0001631",  # upstream_gene_variant
        ],
    },
]

# SO term ID → 表示ラベル
# openapi.yaml の description 欄は誤記があるためスクリプト内で管理する
LABELS: dict[str, str] = {
    "SO_0001580": "Coding sequence variant",
    "SO_0001907": "Feature elongation",
    "SO_0001906": "Feature truncation",
    "SO_0001589": "Frameshift variant",
    "SO_0001626": "Incomplete terminal codon variant",
    "SO_0001822": "Inframe deletion",
    "SO_0001821": "Inframe insertion",
    "SO_0001583": "Missense variant",
    "SO_0001621": "NMD transcript variant",
    "SO_0001818": "Protein altering variant",
    "SO_0001819": "Synonymous variant",
    "SO_0002012": "Start lost",
    "SO_0001587": "Stop gained",
    "SO_0001578": "Stop lost",
    "SO_0002019": "Start retained variant",
    "SO_0001567": "Stop retained variant",
    "SO_0001624": "3 prime UTR variant",
    "SO_0001623": "5 prime UTR variant",
    "SO_0001627": "Intron variant",
    "SO_0001792": "Non coding transcript exon variant",
    "SO_0001619": "Non coding transcript variant",
    "SO_0001574": "Splice acceptor variant",
    "SO_0001575": "Splice donor variant",
    "SO_0001630": "Splice region variant",
    "SO_0001787": "Splice donor 5th base variant",
    "SO_0002170": "Splice donor region variant",
    "SO_0002169": "Splice polypyrimidine tract variant",
    "SO_0001893": "Transcript ablation",
    "SO_0001889": "Transcript amplification",
    "SO_0001968": "Coding transcript variant",
    "SO_0001620": "Mature miRNA variant",
    "SO_0001894": "Regulatory region ablation",
    "SO_0001891": "Regulatory region amplification",
    "SO_0001566": "Regulatory region variant",
    "SO_0001782": "TF binding site variant",
    "SO_0001895": "TFBS ablation",
    "SO_0001892": "TFBS amplification",
    "SO_0001632": "Downstream gene variant",
    "SO_0001628": "Intergenic variant",
    "SO_0001631": "Upstream gene variant",
    "SO_0001060": "Sequence variant",
}

# SO term ID → 説明文（VEP/SO Ontology 由来）
DESCRIPTIONS: dict[str, str] = {
    "SO_0001580": "A sequence variant that changes the coding sequence",
    "SO_0001907": "A sequence variant that causes the extension of a genomic feature, with regard to the reference sequence",
    "SO_0001906": "A sequence variant that causes the reduction of a genomic feature, with regard to the reference sequence",
    "SO_0001589": "A sequence variant which causes a disruption of the translational reading frame, because the number of nucleotides inserted or deleted is not a multiple of three",
    "SO_0001626": "A sequence variant where at least one base of the final codon of an incompletely annotated transcript is changed",
    "SO_0001822": "An inframe non synonymous variant that deletes bases from the coding sequence",
    "SO_0001821": "An inframe non synonymous variant that inserts bases into in the coding sequence",
    "SO_0001583": "A sequence variant, that changes one or more bases, resulting in a different amino acid sequence but where the length is preserved",
    "SO_0001621": "A variant in a transcript that is the target of NMD",
    "SO_0001818": "A sequence_variant which is predicted to change the protein encoded in the coding sequence",
    "SO_0001819": "A sequence variant where there is no resulting change to the encoded amino acid",
    "SO_0002012": "A codon variant that changes at least one base of the canonical start codon",
    "SO_0001587": "A sequence variant whereby at least one base of a codon is changed, resulting in a premature stop codon, leading to a shortened transcript",
    "SO_0001578": "A sequence variant where at least one base of the terminator codon (stop) is changed, resulting in an elongated transcript",
    "SO_0002019": "A sequence variant where at least one base in the start codon is changed, but the start remains",
    "SO_0001567": "A sequence variant where at least one base in the terminator codon is changed, but the terminator remains",
    "SO_0001624": "A UTR variant of the 3' UTR",
    "SO_0001623": "A UTR variant of the 5' UTR",
    "SO_0001627": "A transcript variant occurring within an intron",
    "SO_0001792": "A sequence variant that changes non-coding exon sequence in a non-coding transcript",
    "SO_0001619": "A transcript variant of a non coding RNA gene",
    "SO_0001574": "A splice variant that changes the 2 base region at the 3' end of an intron",
    "SO_0001575": "A splice variant that changes the 2 base region at the 5' end of an intron",
    "SO_0001630": "A sequence variant in which a change has occurred within the region of the splice site, either within 1-3 bases of the exon or 3-8 bases of the intron",
    "SO_0001787": "A sequence variant that falls in the region between the 5th and 6th base of the 5' end of an intron",
    "SO_0002170": "A sequence variant that falls in the region between the 3rd and 6th base of the 5' end of an intron",
    "SO_0002169": "A sequence variant that falls in the polypyrimidine tract at the 3' end of an intron",
    "SO_0001893": "A feature ablation whereby the deleted region includes a transcript feature",
    "SO_0001889": "A feature amplification of a region containing a transcript",
    "SO_0001968": "A transcript variant of a protein coding gene",
    "SO_0001620": "A transcript variant located with the sequence of the mature miRNA",
    "SO_0001894": "A feature ablation whereby the deleted region includes a regulatory region",
    "SO_0001891": "A feature amplification of a region containing a regulatory region",
    "SO_0001566": "A sequence variant located within a regulatory region",
    "SO_0001782": "A sequence variant located within a transcription factor binding site",
    "SO_0001895": "A feature ablation whereby the deleted region includes a transcription factor binding site",
    "SO_0001892": "A feature amplification of a region containing a transcription factor binding site",
    "SO_0001632": "A sequence variant located 3' of a gene",
    "SO_0001628": "A sequence variant located in the intergenic region, between genes",
    "SO_0001631": "A sequence variant located 5' of a gene",
    "SO_0001060": "A non exact copy of a sequence_feature or genome exhibiting one or more sequence_alteration",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="consequence.values を openapi.yaml から同期する")
    parser.add_argument(
        "--build",
        default="GRCh38",
        choices=["GRCh38", "GRCh37", "all"],
        help="対象ゲノムビルド（デフォルト: GRCh38）",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="JSON を更新せず変更内容だけ表示する",
    )
    return parser.parse_args()


def load_so_terms_from_openapi(yaml_path: Path) -> list[str]:
    """openapi.yaml の VariantConsequence.enum から SO term ID リストを順番通りに返す。"""
    text = yaml_path.read_text()
    match = re.search(
        r'VariantConsequence:.*?(?=\n    [A-Z][A-Za-z]+:|\Z)',
        text,
        re.DOTALL,
    )
    if not match:
        sys.exit(f"ERROR: {yaml_path} に VariantConsequence が見つかりません")

    values = re.findall(r'^\s+-\s+(\S+)', match.group(0), re.MULTILINE)
    so_terms = [v for v in values if re.match(r'^SO_\d+$', v)]
    if not so_terms:
        sys.exit(f"ERROR: {yaml_path} から SO term を抽出できませんでした")
    return so_terms


def build_consequence_values(so_terms: list[str], grch38_only: set[str]) -> list[dict]:
    """
    SO term リストとグループ定義から consequence.values 配列を生成する。

    順序:
      1. GROUPS の定義順にグループノードを出力（GRCh38-only の子を除外したグループのみ）
      2. 各グループのリーフノードをグループ直後に出力
      3. どのグループにも属さない SO term を末尾に追加（親なしルートノード）
    """
    # SO term → 親グループ ID のマッピングを構築
    so_to_parent: dict[str, str] = {}
    for group in GROUPS:
        for child in group["children"]:
            if child.startswith("SO_"):
                so_to_parent[child] = group["id"]

    # グループ ID セット
    group_ids = {g["id"] for g in GROUPS}

    values: list[dict] = []
    emitted_so: set[str] = set()

    def make_leaf(so_id: str, parent_id: str | None) -> dict:
        node: dict = {"id": so_id, "value": so_id}
        label = LABELS.get(so_id)
        if not label:
            # フォールバック: openapi.yaml に存在するが LABELS 未登録の場合
            node["label"] = so_id
            print(f"  WARNING: {so_id} の label が LABELS に未登録です")
        else:
            node["label"] = label
        if so_id in DESCRIPTIONS:
            node["description"] = DESCRIPTIONS[so_id]
        if parent_id:
            node["parent"] = parent_id
        return node

    # グループ順に出力
    for group in GROUPS:
        # このビルドで有効な子 ID のみに絞る
        effective_children = [
            c for c in group["children"]
            if not (c in grch38_only)
        ]

        # 有効な子が0件のグループはスキップ
        if not effective_children:
            continue

        # グループノードを出力
        group_node: dict = {"id": group["id"], "label": group["label"]}
        if "parent" in group:
            group_node["parent"] = group["parent"]
        group_node["children"] = effective_children
        values.append(group_node)

        # グループに属するリーフノードを出力
        for child_id in effective_children:
            if child_id in group_ids:
                continue  # サブグループは後でグループとして出力される
            if child_id in so_terms and child_id not in emitted_so:
                values.append(make_leaf(child_id, group["id"]))
                emitted_so.add(child_id)

    # どのグループにも属さない SO term を末尾に追加（孤立ルートノード）
    for so_id in so_terms:
        if so_id not in emitted_so and so_id not in grch38_only:
            values.append(make_leaf(so_id, None))
            emitted_so.add(so_id)

    return values


def sync_build(build: str, so_terms_grch38: list[str], dry_run: bool) -> None:
    """指定ビルドの advanced_search_conditions.json を更新する。"""
    asc_path = ROOT / f"app/frontend/assets/{build}/advanced_search_conditions.json"
    if not asc_path.exists():
        sys.exit(f"ERROR: {asc_path} が見つかりません")

    grch38_only = GRCH38_ONLY if build == "GRCh37" else set()
    so_terms = [s for s in so_terms_grch38 if s not in grch38_only]

    # openapi.yaml に存在するが LABELS 未登録の SO term を警告
    unlabeled = [s for s in so_terms if s not in LABELS]
    if unlabeled:
        print(f"[{build}] WARNING: LABELS に未登録の SO term があります:")
        for s in unlabeled:
            print(f"  {s}")
        print("  → LABELS / DESCRIPTIONS / GROUPS を更新してから再実行してください")
        sys.exit(1)

    # openapi.yaml に存在しない SO term が GROUPS に含まれていたら警告
    so_set = set(so_terms)
    for group in GROUPS:
        for child in group["children"]:
            if child.startswith("SO_") and child not in so_set and child not in grch38_only:
                print(f"[{build}] WARNING: GROUPS に {child} が含まれていますが openapi.yaml に存在しません")

    new_values = build_consequence_values(so_terms, grch38_only)

    data = json.loads(asc_path.read_text())
    old_values = data["conditions"]["consequence"]["values"]

    old_ids = [v["id"] for v in old_values]
    new_ids = [v["id"] for v in new_values]

    added   = [i for i in new_ids if i not in old_ids]
    removed = [i for i in old_ids if i not in new_ids]

    print(f"\n[{build}] {asc_path.name}")
    print(f"  ノード数: {len(old_values)} → {len(new_values)}")
    if added:
        print(f"  追加: {added}")
    if removed:
        print(f"  削除: {removed}")
    if not added and not removed:
        print("  変更なし（ラベル・説明文の更新のみの可能性あり）")

    if dry_run:
        print("  [dry-run] JSON は更新しませんでした")
        return

    data["conditions"]["consequence"]["values"] = new_values
    asc_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"  ✅ 更新しました: {asc_path}")


def main() -> None:
    args = parse_args()

    if not OPENAPI_PATH.exists():
        sys.exit(f"ERROR: {OPENAPI_PATH} が見つかりません")

    so_terms = load_so_terms_from_openapi(OPENAPI_PATH)
    print(f"openapi.yaml から {len(so_terms)} 件の SO term を読み込みました")

    builds = ["GRCh38", "GRCh37"] if args.build == "all" else [args.build]
    for build in builds:
        sync_build(build, so_terms, args.dry_run)

    print("\n完了。整合性確認: python3 scripts/check_conditions.py [--build GRCh37]")


if __name__ == "__main__":
    main()
