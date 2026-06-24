#!/usr/bin/env python3
"""
API仕様整合性チェックスクリプト

scripts/<BUILD>/openapi.yaml（Swagger仕様）から以下を自動抽出し、
フロントエンドの設定JSONと整合性を検証する。

  - VariantConsequence.consequence.terms.enum → consequence チェック
  - VariantType.type.terms.enum              → type チェック
  - ClinicalSignificance.terms.enum          → significance チェック
  - SSCVDB.terms.enum                        → sscv_db チェック
  - Dataset.name.enum                        → dataset / genotype チェック

使い方:
  python3 scripts/check_conditions.py              # GRCh38（デフォルト）
  python3 scripts/check_conditions.py --build GRCh37

対象ファイル（GRCh38 の場合）:
  scripts/GRCh38/openapi.yaml
  app/frontend/assets/GRCh38/search_conditions.json
  app/frontend/assets/GRCh38/advanced_search_conditions.json

制約:
  - dataset の表示ラベルおよびツリー構造（親子関係）は仕様に含まれないため手動管理。
  - significance.mgend は clinvar のサブセット（仕様未定義）のため余分チェックのみ。
  - genotype はデータセットのサブセットのため余分チェックのみ。

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

    # Consequence
    consequence_terms = load_consequence_terms(yaml_path)
    consequence_so_ids = {so for so, _ in consequence_terms}
    consequence_snakes = {snake for _, snake in consequence_terms}
    print(f"VariantConsequence:   {len(consequence_terms)} 件の term を読み込みました")

    # Variant Type
    type_terms = load_variant_type_terms(yaml_path)
    type_so_ids = {so for so, _ in type_terms}
    type_labels = {label for _, label in type_terms}
    print(f"VariantType:          {len(type_terms)} 件の term を読み込みました")

    # Clinical Significance
    significance_keys = load_significance_terms(yaml_path)
    print(f"ClinicalSignificance: {len(significance_keys)} 件の term を読み込みました")

    # SSCV DB
    sscvdb_keys = load_sscvdb_terms(yaml_path)
    print(f"SSCVDB:               {len(sscvdb_keys)} 件の term を読み込みました")

    # Dataset
    dataset_names = load_dataset_names(yaml_path)
    print(f"Dataset:              {len(dataset_names)} 件のデータセット名を読み込みました\n")

    errors = []
    errors += check_consequence_sc(sc_path, consequence_so_ids)
    errors += check_consequence_asc(asc_path, consequence_snakes)
    errors += check_type_sc(sc_path, type_so_ids)
    errors += check_type_asc(asc_path, type_labels)
    errors += check_significance_asc(asc_path, significance_keys)
    errors += check_sscvdb_asc(asc_path, sscvdb_keys)
    # dataset: 完全一致チェック（不足・余分の両方）
    errors += check_dataset_condition_asc(asc_path, dataset_names, "dataset", check_missing=True)
    # genotype: サブセットのため余分チェックのみ
    errors += check_dataset_condition_asc(asc_path, dataset_names, "genotype", check_missing=False)

    if errors:
        print("❌ エラーが見つかりました:\n")
        for e in errors:
            print(f"  {e}")
        print(f"\n合計: {len(errors)} 件")
        sys.exit(1)
    else:
        print(
            f"✅ 問題なし — "
            f"consequence {len(consequence_terms)} 件 + "
            f"type {len(type_terms)} 件 + "
            f"significance {len(significance_keys)} 件 + "
            f"sscv_db {len(sscvdb_keys)} 件 + "
            f"dataset {len(dataset_names)} 件、すべて整合しています"
        )
        sys.exit(0)


if __name__ == "__main__":
    main()
