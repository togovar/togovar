#!/usr/bin/env python3
from __future__ import annotations
"""
API仕様整合性チェックスクリプト

scripts/<BUILD>/openapi.yaml（Swagger仕様）から以下を自動抽出し、
フロントエンドの設定JSONと整合性を検証する。

  - VariantConsequence.consequence.terms.enum → consequence チェック
  - VariantType.type.terms.enum              → type チェック
  - ClinicalSignificance.terms.enum          → significance チェック
  - SSCVDB.terms.enum                        → sscv_db / splicingvariant チェック
  - Dataset.name.enum                        → dataset / genotype チェック

使い方:
  python3 scripts/check_conditions.py              # GRCh38（デフォルト）
  python3 scripts/check_conditions.py --build GRCh37

対象ファイル（GRCh38 の場合）:
  scripts/GRCh38/openapi.yaml
  app/frontend/assets/GRCh38/search_conditions.json
  app/frontend/assets/GRCh38/advanced_search_conditions.json

チェック対象（search_conditions.json）:
  - dataset.items（has_freq:true のもの）: 仕様外の値がないか確認（余分チェックのみ）
  - type.items:          SO ID の完全一致
  - significance.items:  短縮キーの完全一致
  - consequence.items:   SO ID の完全一致 + consequence_grouping の網羅性
  - splicingvariant.items: N（Unassigned）を除いた完全一致

チェック対象（advanced_search_conditions.json）:
  - dataset.values:    完全一致（不足・余分の両方）
  - significance.values.clinvar: 完全一致
  - significance.values.mgend:   余分チェックのみ（clinvar のサブセット）
  - consequence.values: snake_case 名の完全一致 + 親子関係の整合性
  - genotype.values:   余分チェックのみ（dataset のサブセット）
  - sscv_db.values:    完全一致
  - type.values:       完全一致

制約:
  - dataset の表示ラベルおよびツリー構造（親子関係）は仕様に含まれないため手動管理。
  - search_conditions.json の dataset は top-level のみ（サブデータセット不要）のため不足チェックなし。
  - splicingvariant の N（Unassigned）は UI専用値のため仕様外だが意図的な追加。
  - significance.mgend は clinvar のサブセット（仕様未定義）のため余分チェックのみ。
  - genotype はデータセットのサブセットのため余分チェックのみ。

【重要】このスクリプトは検証のみを行い、JSONファイルを自動更新しません。
  openapi.yaml に新しいデータセットや値が追加された場合は、
  各 JSON ファイルを手動で編集してから本スクリプトで整合性を確認してください。

  手動編集が必要なファイル:
    app/frontend/assets/GRCh38/search_conditions.json
    app/frontend/assets/GRCh38/advanced_search_conditions.json
    （GRCh37 の場合は GRCh37/ 以下の同名ファイル）

仕様が更新されたら scripts/<BUILD>/openapi.yaml を差し替えて本スクリプトを実行すること。
"""

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="API仕様整合性チェック")
    parser.add_argument(
        "--build",
        default="GRCh38",
        choices=["GRCh38", "GRCh37"],
        help="ゲノムビルド（デフォルト: GRCh38）",
    )
    return parser.parse_args()


def resolve_paths(build: str) -> tuple[Path, Path, Path]:
    yaml_path = ROOT / f"scripts/{build}/openapi.yaml"
    sc_path   = ROOT / f"app/frontend/assets/{build}/search_conditions.json"
    asc_path  = ROOT / f"app/frontend/assets/{build}/advanced_search_conditions.json"

    if not yaml_path.exists():
        sys.exit(f"ERROR: {yaml_path} が見つかりません")
    if not sc_path.exists():
        sys.exit(f"ERROR: {sc_path} が見つかりません")
    if not asc_path.exists():
        sys.exit(f"ERROR: {asc_path} が見つかりません")

    return yaml_path, sc_path, asc_path


def _extract_so_label_pairs(block: str, context: str, yaml_path: Path) -> list[tuple[str, str]]:
    """
    YAML テキストブロックから SO_XXXXXXX と直後の短縮ラベルをペアで抽出する。
    SO番号の次行が必ず短縮ラベルという規則を前提にする（consequence / type 両方で共通）。
    """
    values = re.findall(r'^\s+-\s+(\S+)', block, re.MULTILINE)

    excluded = {'eq', 'ne'}
    values = [v for v in values if v not in excluded]

    terms: list[tuple[str, str]] = []
    i = 0
    while i < len(values):
        v = values[i]
        if re.match(r'^SO_\d+$', v):
            if i + 1 < len(values) and not re.match(r'^SO_\d+$', values[i + 1]):
                terms.append((v, values[i + 1]))
                i += 2
            else:
                sys.exit(f"ERROR: {v} の次にラベルが見つかりません（{context}, index {i}）")
        else:
            i += 1

    if not terms:
        sys.exit(f"ERROR: {yaml_path} から {context} の terms を抽出できませんでした")

    return terms


def load_consequence_terms(yaml_path: Path) -> list[tuple[str, str]]:
    """
    openapi.yaml から VariantConsequence.consequence.terms の enum を解析し、
    (SO番号, snake_case名) のペアリストを返す。PyYAML 不要。
    """
    text = yaml_path.read_text()
    match = re.search(
        r'VariantConsequence:.*?(?=\n    [A-Z][A-Za-z]+:|\Z)',
        text,
        re.DOTALL,
    )
    if not match:
        sys.exit(f"ERROR: {yaml_path} に VariantConsequence が見つかりません")

    return _extract_so_label_pairs(match.group(0), "VariantConsequence", yaml_path)


def load_variant_type_terms(yaml_path: Path) -> list[tuple[str, str]]:
    """
    openapi.yaml から VariantType.type.terms の enum を解析し、
    (SO番号, 大文字短縮ラベル) のペアリストを返す。PyYAML 不要。
    """
    text = yaml_path.read_text()
    match = re.search(
        r'VariantType:.*?(?=\n    [A-Z][A-Za-z]+:|\Z)',
        text,
        re.DOTALL,
    )
    if not match:
        sys.exit(f"ERROR: {yaml_path} に VariantType が見つかりません")

    return _extract_so_label_pairs(match.group(0), "VariantType", yaml_path)


# ──────────────────────────────────────────────────
# Consequence チェック
# ──────────────────────────────────────────────────

def check_consequence_sc(sc_path: Path, spec_so_ids: set[str]) -> list[str]:
    errors = []
    data = json.loads(sc_path.read_text())

    consequence = next((c for c in data if c["id"] == "consequence"), None)
    if not consequence:
        return [f"[{sc_path.name}] consequence セクションが見つからない"]

    json_ids = {item["id"] for item in consequence["items"]}
    for m in sorted(spec_so_ids - json_ids):
        errors.append(f"[{sc_path.name}] consequence.items に不足: {m}")
    for e in sorted(json_ids - spec_so_ids):
        errors.append(f"[{sc_path.name}] consequence.items に余分: {e}")

    def collect_ids(items):
        result = set()
        for item in items:
            if isinstance(item, str) and item.startswith("SO_"):
                result.add(item)
            elif isinstance(item, dict):
                result |= collect_ids(item.get("items", []))
        return result

    grouping = next((c for c in data if c["id"] == "consequence_grouping"), None)
    if grouping:
        grouped_ids = collect_ids(grouping["items"])
        for m in sorted(spec_so_ids - grouped_ids):
            errors.append(f"[{sc_path.name}] consequence_grouping に不足: {m}")

    return errors


def check_consequence_asc(asc_path: Path, spec_snakes: set[str]) -> list[str]:
    errors = []
    data = json.loads(asc_path.read_text())

    values = data.get("conditions", {}).get("consequence", {}).get("values", [])
    if not values:
        return [f"[{asc_path.name}] consequence.values が見つからない"]

    json_snakes = {v["value"] for v in values if "value" in v}
    for m in sorted(spec_snakes - json_snakes):
        errors.append(f"[{asc_path.name}] consequence.values に不足: {m}")
    for e in sorted(json_snakes - spec_snakes):
        errors.append(f"[{asc_path.name}] consequence.values に余分: {e}")

    all_ids = {v["id"] for v in values}
    for v in values:
        if "parent" in v and v["parent"] not in all_ids:
            errors.append(
                f"[{asc_path.name}] id:{v['id']} ({v.get('label')}) の parent:{v['parent']} が存在しない"
            )
    for v in values:
        for child_id in v.get("children", []):
            if child_id not in all_ids:
                errors.append(
                    f"[{asc_path.name}] id:{v['id']} ({v.get('label')}) の children に存在しないID: {child_id}"
                )

    return errors


# ──────────────────────────────────────────────────
# search_conditions.json 専用チェック
# ──────────────────────────────────────────────────

def check_structure_sc(sc_path: Path) -> list[str]:
    """
    search_conditions.json の全セクションについて存在と items の構成を確認する。
    API仕様に対応する enum がないセクション（term/frequency/quality/cadd/alphamissense/sift/polyphen/consequence_grouping）が対象。
    cadd/alphamissense/sift/polyphen の items は予測ツール固有の UI カテゴリのため仕様外だが、
    意図しない削除・名前変更を検出するために期待値を固定して照合する。
    """
    EXPECTED: dict[str, set[str] | None] = {
        "term":               None,                        # items なし（フリーテキスト）
        "frequency":          {"from", "to", "invert", "match"},
        "quality":            None,                        # items なし（boolean フラグ）
        "consequence_grouping": None,                      # items の中身は check_consequence_sc で確認済み
        "cadd":               {"N", "D", "POSSD", "T"},
        "alphamissense":      {"N", "LP", "A", "LB"},
        "sift":               {"N", "D", "T"},
        "polyphen":           {"N", "PROBD", "POSSD", "B", "U"},
    }

    errors = []
    data = json.loads(sc_path.read_text())

    for sid, expected_ids in EXPECTED.items():
        section = next((c for c in data if c["id"] == sid), None)
        if not section:
            errors.append(f"[{sc_path.name}] {sid} セクションが見つからない")
            continue
        if expected_ids is None:
            continue
        actual_ids = {item["id"] for item in section.get("items", []) if "id" in item}
        for m in sorted(expected_ids - actual_ids):
            errors.append(f"[{sc_path.name}] {sid}.items に不足: {m}")
        for e in sorted(actual_ids - expected_ids):
            errors.append(f"[{sc_path.name}] {sid}.items に余分: {e}")

    return errors


def check_dataset_sc(sc_path: Path, spec_datasets: set[str]) -> list[str]:
    """
    search_conditions.json の dataset.items のうち has_freq:true のものが
    仕様の Dataset.name.enum に含まれるか確認する（余分チェックのみ）。
    Simple Search は top-level dataset のみ使用するため不足チェックは行わない。
    mgend / clinvar は has_freq:false のため自動除外される。
    """
    errors = []
    data = json.loads(sc_path.read_text())

    dataset = next((c for c in data if c["id"] == "dataset"), None)
    if not dataset:
        return [f"[{sc_path.name}] dataset セクションが見つからない"]

    freq_ids = {item["id"] for item in dataset.get("items", []) if item.get("has_freq")}
    for e in sorted(freq_ids - spec_datasets):
        errors.append(f"[{sc_path.name}] dataset.items に仕様外の値: {e}")

    return errors


def check_significance_sc(sc_path: Path, spec_keys: set[str]) -> list[str]:
    """
    search_conditions.json の significance.items と仕様の ClinicalSignificance 短縮キーを照合する。
    """
    errors = []
    data = json.loads(sc_path.read_text())

    sig = next((c for c in data if c["id"] == "significance"), None)
    if not sig:
        return [f"[{sc_path.name}] significance セクションが見つからない"]

    json_keys = {item["id"] for item in sig.get("items", [])}
    for m in sorted(spec_keys - json_keys):
        errors.append(f"[{sc_path.name}] significance.items に不足: {m}")
    for e in sorted(json_keys - spec_keys):
        errors.append(f"[{sc_path.name}] significance.items に余分: {e}")

    return errors


def check_sscvdb_sc(sc_path: Path, spec_keys: set[str]) -> list[str]:
    """
    search_conditions.json の splicingvariant.items と仕様の SSCVDB 短縮キーを照合する。
    'N'（Unassigned = SSCV DB に未登録）は UI専用値のため仕様外だが意図的な追加として除外する。
    """
    EXCLUDED = {'N'}
    errors = []
    data = json.loads(sc_path.read_text())

    sscv = next((c for c in data if c["id"] == "splicingvariant"), None)
    if not sscv:
        return [f"[{sc_path.name}] splicingvariant セクションが見つからない"]

    json_keys = {item["id"] for item in sscv.get("items", [])} - EXCLUDED
    for m in sorted(spec_keys - json_keys):
        errors.append(f"[{sc_path.name}] splicingvariant.items に不足: {m}")
    for e in sorted(json_keys - spec_keys):
        errors.append(f"[{sc_path.name}] splicingvariant.items に余分: {e}")

    return errors


# ──────────────────────────────────────────────────
# Variant Type チェック
# ──────────────────────────────────────────────────

def check_type_sc(sc_path: Path, spec_so_ids: set[str]) -> list[str]:
    """
    search_conditions.json の type.items と仕様の SO ID を照合する。
    """
    errors = []
    data = json.loads(sc_path.read_text())

    type_section = next((c for c in data if c["id"] == "type"), None)
    if not type_section:
        return [f"[{sc_path.name}] type セクションが見つからない"]

    json_ids = {item["id"] for item in type_section["items"]}
    for m in sorted(spec_so_ids - json_ids):
        errors.append(f"[{sc_path.name}] type.items に不足: {m}")
    for e in sorted(json_ids - spec_so_ids):
        errors.append(f"[{sc_path.name}] type.items に余分: {e}")

    return errors


def check_type_asc(asc_path: Path, spec_labels: set[str]) -> list[str]:
    """
    advanced_search_conditions.json の type.values と仕様の短縮ラベル（小文字）を照合する。
    仕様の短縮ラベルは大文字（SNV, INS, ...）なので小文字に揃えて比較する。
    """
    errors = []
    data = json.loads(asc_path.read_text())

    values = data.get("conditions", {}).get("type", {}).get("values", [])
    if not values:
        return [f"[{asc_path.name}] type.values が見つからない"]

    json_labels  = {v["value"] for v in values if "value" in v}
    spec_lower   = {label.lower() for label in spec_labels}

    for m in sorted(spec_lower - json_labels):
        errors.append(f"[{asc_path.name}] type.values に不足: {m}")
    for e in sorted(json_labels - spec_lower):
        errors.append(f"[{asc_path.name}] type.values に余分: {e}")

    return errors


# ──────────────────────────────────────────────────
# ClinicalSignificance チェック
# ──────────────────────────────────────────────────

def load_significance_terms(yaml_path: Path) -> set[str]:
    """
    openapi.yaml の ClinicalSignificance.terms.enum から短縮キー（大文字のみ）を抽出する。
    enum は短縮キーと snake_case が交互に並ぶ（NA/not_available, P/pathogenic …）。
    大文字アルファベットのみの値が短縮キー。
    """
    text = yaml_path.read_text()
    match = re.search(
        r'ClinicalSignificance:.*?(?=\n    [A-Z][A-Za-z]+:|\Z)',
        text,
        re.DOTALL,
    )
    if not match:
        sys.exit(f"ERROR: {yaml_path} に ClinicalSignificance が見つかりません")

    values = re.findall(r'^\s+-\s+(\S+)', match.group(0), re.MULTILINE)
    keys = {v for v in values if re.match(r'^[A-Z]+$', v)}
    if not keys:
        sys.exit(f"ERROR: {yaml_path} の ClinicalSignificance から terms を抽出できませんでした")
    return keys


def check_significance_asc(asc_path: Path, spec_clinvar_keys: set[str]) -> list[str]:
    """
    advanced_search_conditions.json の significance.values.clinvar を仕様と完全照合する。
    mgend は clinvar のサブセット（仕様未定義）のため、仕様外の値のみチェックする。
    """
    errors = []
    data = json.loads(asc_path.read_text())
    sig_values = data.get("conditions", {}).get("significance", {}).get("values", {})

    clinvar = sig_values.get("clinvar", [])
    if not clinvar:
        return [f"[{asc_path.name}] significance.values.clinvar が見つからない"]
    json_clinvar = {item["value"] for item in clinvar if "value" in item}
    for m in sorted(spec_clinvar_keys - json_clinvar):
        errors.append(f"[{asc_path.name}] significance.values.clinvar に不足: {m}")
    for e in sorted(json_clinvar - spec_clinvar_keys):
        errors.append(f"[{asc_path.name}] significance.values.clinvar に余分: {e}")

    mgend = sig_values.get("mgend", [])
    json_mgend = {item["value"] for item in mgend if "value" in item}
    for e in sorted(json_mgend - spec_clinvar_keys):
        errors.append(f"[{asc_path.name}] significance.values.mgend に仕様外の値: {e}")

    return errors


# ──────────────────────────────────────────────────
# SSCV DB チェック
# ──────────────────────────────────────────────────

def load_sscvdb_terms(yaml_path: Path) -> set[str]:
    """
    openapi.yaml の SSCVDB.terms.enum から短縮キー（大文字のみ）を抽出する。
    """
    text = yaml_path.read_text()
    match = re.search(
        r'SSCVDB:.*?(?=\n    [A-Z][A-Za-z]+:|\Z)',
        text,
        re.DOTALL,
    )
    if not match:
        sys.exit(f"ERROR: {yaml_path} に SSCVDB が見つかりません")

    values = re.findall(r'^\s+-\s+(\S+)', match.group(0), re.MULTILINE)
    keys = {v for v in values if re.match(r'^[A-Z]+$', v)}
    if not keys:
        sys.exit(f"ERROR: {yaml_path} の SSCVDB から terms を抽出できませんでした")
    return keys


def check_sscvdb_asc(asc_path: Path, spec_keys: set[str]) -> list[str]:
    """
    advanced_search_conditions.json の sscv_db.values を仕様と照合する。
    """
    errors = []
    data = json.loads(asc_path.read_text())
    values = data.get("conditions", {}).get("sscv_db", {}).get("values", [])
    if not values:
        return [f"[{asc_path.name}] sscv_db.values が見つからない"]

    json_keys = {item["value"] for item in values if "value" in item}
    for m in sorted(spec_keys - json_keys):
        errors.append(f"[{asc_path.name}] sscv_db.values に不足: {m}")
    for e in sorted(json_keys - spec_keys):
        errors.append(f"[{asc_path.name}] sscv_db.values に余分: {e}")

    return errors


# ──────────────────────────────────────────────────
# Dataset / Genotype チェック
# ──────────────────────────────────────────────────

def load_dataset_names(yaml_path: Path) -> set[str]:
    """
    openapi.yaml の Dataset.name.enum からデータセット名を抽出する。
    enum 値は 12 スペースインデント。required の '- name' は 8 スペースのため除外される。
    """
    text = yaml_path.read_text()
    match = re.search(
        r'\n    Dataset:.*?(?=\n    [A-Z][A-Za-z]+:|\Z)',
        text,
        re.DOTALL,
    )
    if not match:
        sys.exit(f"ERROR: {yaml_path} に Dataset が見つかりません")

    names = re.findall(r'^ {12,}-\s+(\S+)', match.group(0), re.MULTILINE)
    if not names:
        sys.exit(f"ERROR: {yaml_path} の Dataset から enum を抽出できませんでした")
    return set(names)


def _collect_values_recursive(items: list) -> set[str]:
    """ネストした値ツリーから 'value' フィールドを再帰的に収集する。"""
    result = set()
    for item in items:
        if not isinstance(item, dict):
            continue
        if "value" in item:
            result.add(item["value"])
        if "children" in item:
            result |= _collect_values_recursive(item["children"])
    return result


def check_dataset_condition_asc(
    asc_path: Path,
    spec_datasets: set[str],
    condition_key: str,
    check_missing: bool = True,
) -> list[str]:
    """
    advanced_search_conditions.json の dataset または genotype の全 value を仕様と照合する。
    check_missing=False のときは余分チェックのみ（genotype はサブセットのため）。
    """
    errors = []
    data = json.loads(asc_path.read_text())
    items = data.get("conditions", {}).get(condition_key, {}).get("values", [])
    if not items:
        return [f"[{asc_path.name}] {condition_key}.values が見つからない"]

    json_datasets = _collect_values_recursive(items)

    if check_missing:
        for m in sorted(spec_datasets - json_datasets):
            errors.append(f"[{asc_path.name}] {condition_key}.values に不足: {m}")
    for e in sorted(json_datasets - spec_datasets):
        errors.append(f"[{asc_path.name}] {condition_key}.values に仕様外の値: {e}")

    return errors


# ──────────────────────────────────────────────────
# メイン
# ──────────────────────────────────────────────────

def main():
    args = parse_args()
    build = args.build

    print(f"=== API仕様整合性チェック [{build}] ===\n")

    yaml_path, sc_path, asc_path = resolve_paths(build)

    # 仕様から各セクションの term を読み込む
    dataset_names      = load_dataset_names(yaml_path)
    significance_keys  = load_significance_terms(yaml_path)
    consequence_terms  = load_consequence_terms(yaml_path)
    consequence_so_ids = {so for so, _ in consequence_terms}
    consequence_snakes = {snake for _, snake in consequence_terms}
    sscvdb_keys        = load_sscvdb_terms(yaml_path)
    type_terms         = load_variant_type_terms(yaml_path)
    type_so_ids        = {so for so, _ in type_terms}
    type_labels        = {label for _, label in type_terms}

    print("[仕様読み込み]")
    print(f"  dataset:      {len(dataset_names)} 件")
    print(f"  significance: {len(significance_keys)} 件")
    print(f"  consequence:  {len(consequence_terms)} 件")
    print(f"  sscv_db:      {len(sscvdb_keys)} 件")
    print(f"  type:         {len(type_terms)} 件")
    print()

    print(f"[{sc_path.name}]")
    print(f"  term:                存在確認のみ")
    print(f"  dataset:             余分チェックのみ（has_freq:true のデータセットを確認）")
    print(f"  frequency:           存在・items 構造確認（from/to/invert/match）")
    print(f"  quality:             存在確認のみ")
    print(f"  type:                {len(type_so_ids)} 件（SO ID）")
    print(f"  significance:        {len(significance_keys)} 件")
    print(f"  consequence:         {len(consequence_so_ids)} 件（SO ID）")
    print(f"  consequence_grouping: 存在確認（SO ID 網羅性は consequence チェック内）")
    print(f"  cadd:                存在・items 構造確認（N/D/POSSD/T）")
    print(f"  alphamissense:       存在・items 構造確認（N/LP/A/LB）")
    print(f"  sift:                存在・items 構造確認（N/D/T）")
    print(f"  polyphen:            存在・items 構造確認（N/PROBD/POSSD/B/U）")
    print(f"  splicingvariant:     {len(sscvdb_keys)} 件（N=Unassigned 除く）")
    print()

    print(f"[{asc_path.name}]")
    print(f"  dataset:      {len(dataset_names)} 件（完全一致）")
    print(f"  significance: {len(significance_keys)} 件（clinvar 完全一致、mgend 余分のみ）")
    print(f"  consequence:  {len(consequence_snakes)} 件（snake_case + 親子関係）")
    print(f"  genotype:     余分チェックのみ（dataset のサブセット）")
    print(f"  sscv_db:      {len(sscvdb_keys)} 件")
    print(f"  type:         {len(type_labels)} 件")
    print()

    errors = []

    # search_conditions.json チェック
    errors += check_structure_sc(sc_path)           # term/frequency/quality/consequence_grouping/cadd/alphamissense/sift/polyphen
    errors += check_dataset_sc(sc_path, dataset_names)
    errors += check_type_sc(sc_path, type_so_ids)
    errors += check_significance_sc(sc_path, significance_keys)
    errors += check_consequence_sc(sc_path, consequence_so_ids)
    errors += check_sscvdb_sc(sc_path, sscvdb_keys)

    # advanced_search_conditions.json チェック（conditions の順）
    errors += check_dataset_condition_asc(asc_path, dataset_names, "dataset", check_missing=True)
    errors += check_significance_asc(asc_path, significance_keys)
    errors += check_consequence_asc(asc_path, consequence_snakes)
    errors += check_dataset_condition_asc(asc_path, dataset_names, "genotype", check_missing=False)
    errors += check_sscvdb_asc(asc_path, sscvdb_keys)
    errors += check_type_asc(asc_path, type_labels)

    if errors:
        print("❌ エラーが見つかりました:\n")
        for e in errors:
            print(f"  {e}")
        print(f"\n合計: {len(errors)} 件")
        sys.exit(1)
    else:
        print(
            f"✅ 問題なし — "
            f"dataset {len(dataset_names)} 件 + "
            f"significance {len(significance_keys)} 件 + "
            f"consequence {len(consequence_terms)} 件 + "
            f"sscv_db {len(sscvdb_keys)} 件 + "
            f"type {len(type_terms)} 件、すべて整合しています"
        )
        sys.exit(0)


if __name__ == "__main__":
    main()
