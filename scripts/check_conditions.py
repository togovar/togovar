#!/usr/bin/env python3
"""
API仕様整合性チェックスクリプト

scripts/<BUILD>/openapi.yaml（Swagger仕様）から以下を自動抽出し、
フロントエンドの設定JSONと整合性を検証する。

  - VariantConsequence.consequence.terms.enum → consequence チェック
  - VariantType.type.terms.enum              → type チェック

使い方:
  python3 scripts/check_consequence.py              # GRCh38（デフォルト）
  python3 scripts/check_consequence.py --build GRCh37

対象ファイル（GRCh38 の場合）:
  scripts/GRCh38/openapi.yaml
  app/frontend/assets/GRCh38/search_conditions.json
  app/frontend/assets/GRCh38/advanced_search_conditions.json

仕様が更新されたら scripts/<BUILD>/openapi.yaml を差し替えるだけでよい。
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
    print(f"VariantConsequence: {len(consequence_terms)} 件の term を読み込みました")

    # Variant Type
    type_terms = load_variant_type_terms(yaml_path)
    type_so_ids = {so for so, _ in type_terms}
    type_labels = {label for _, label in type_terms}
    print(f"VariantType:        {len(type_terms)} 件の term を読み込みました\n")

    errors = []
    errors += check_consequence_sc(sc_path, consequence_so_ids)
    errors += check_consequence_asc(asc_path, consequence_snakes)
    errors += check_type_sc(sc_path, type_so_ids)
    errors += check_type_asc(asc_path, type_labels)

    if errors:
        print("❌ エラーが見つかりました:\n")
        for e in errors:
            print(f"  {e}")
        print(f"\n合計: {len(errors)} 件")
        sys.exit(1)
    else:
        total = len(consequence_terms) + len(type_terms)
        print(f"✅ 問題なし — consequence {len(consequence_terms)} 件 + type {len(type_terms)} 件、すべて整合しています")
        sys.exit(0)


if __name__ == "__main__":
    main()
