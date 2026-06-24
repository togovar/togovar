#!/usr/bin/env python3
"""
Consequence 整合性チェックスクリプト

scripts/<BUILD>/openapi.yaml（Swagger仕様）の VariantConsequence.consequence.terms.enum から
SO番号とスネークケース名のペアを自動抽出し、フロントエンドの設定JSONと整合性を検証する。

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
    parser = argparse.ArgumentParser(description="Consequence 整合性チェック")
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


def load_spec_terms(yaml_path: Path) -> list[tuple[str, str]]:
    """
    openapi.yaml から VariantConsequence.consequence.terms の enum を解析し、
    (SO番号, snake_case名) のペアリストを返す。

    PyYAML 不要 — YAML の enum リストを行ごとに読んでペアを組む。
    SO_XXXXXXX パターンの行が先に来て、次行がスネークケース名という規則を利用する。
    """
    text = yaml_path.read_text()

    # VariantConsequence スキーマのブロックだけ切り出す
    match = re.search(
        r'VariantConsequence:.*?(?=\n    [A-Z][A-Za-z]+:|\Z)',
        text,
        re.DOTALL,
    )
    if not match:
        sys.exit(f"ERROR: {yaml_path} に VariantConsequence が見つかりません")

    block = match.group(0)

    # enum ブロック内の "- <値>" 行をすべて抽出
    values = re.findall(r'^\s+-\s+(\S+)', block, re.MULTILINE)

    # relation の enum (eq/ne) を除外
    excluded = {'eq', 'ne'}
    values = [v for v in values if v not in excluded]

    # SO_XXXXXXX の後に必ずスネークケース名が来るという規則でペアを組む
    terms: list[tuple[str, str]] = []
    i = 0
    while i < len(values):
        v = values[i]
        if re.match(r'^SO_\d+$', v):
            if i + 1 < len(values) and not re.match(r'^SO_\d+$', values[i + 1]):
                terms.append((v, values[i + 1]))
                i += 2
            else:
                sys.exit(f"ERROR: {v} の次にスネークケース名が見つかりません（index {i}）")
        else:
            i += 1

    if not terms:
        sys.exit(f"ERROR: {yaml_path} から consequence terms を抽出できませんでした")

    return terms


def check_search_conditions(sc_path: Path, spec_so_ids: set[str]) -> list[str]:
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


def check_advanced_search_conditions(asc_path: Path, spec_snakes: set[str]) -> list[str]:
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


def main():
    args = parse_args()
    build = args.build

    print(f"=== Consequence 整合性チェック [{build}] ===\n")

    yaml_path, sc_path, asc_path = resolve_paths(build)
    spec_terms  = load_spec_terms(yaml_path)
    spec_so_ids = {so for so, _ in spec_terms}
    spec_snakes = {snake for _, snake in spec_terms}

    print(f"openapi.yaml から {len(spec_terms)} 件の consequence term を読み込みました\n")

    errors = []
    errors += check_search_conditions(sc_path, spec_so_ids)
    errors += check_advanced_search_conditions(asc_path, spec_snakes)

    if errors:
        print("❌ エラーが見つかりました:\n")
        for e in errors:
            print(f"  {e}")
        print(f"\n合計: {len(errors)} 件")
        sys.exit(1)
    else:
        print(f"✅ 問題なし — {len(spec_terms)} 件すべて整合しています")
        sys.exit(0)


if __name__ == "__main__":
    main()
