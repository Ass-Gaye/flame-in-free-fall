#!/usr/bin/env python3
"""Check the merged Flame in Freefall dataset for structural integrity.

This validator is deliberately strict about provenance and honesty:

* counts and identifiers must match the documented dataset;
* an investigation DOI must be a NASA PSI DOI, never a publication DOI;
* an investigation may not cite its own DOI as one of its publications;
* ``data_source`` must agree with whether an ISA archive was merged;
* relevance labels, when present, must be internally consistent;
* a truncated section is only allowed when extraction did not succeed;
* the CSV must contain exactly the same data as the JSON.

Exit code is 1 when any check fails, so it can gate a build or a commit.

Usage:
    python validate_dataset.py
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "psi_output"
DEFAULT_JSON = DATA_DIR / "merged_master_dataset.json"
DEFAULT_CSV = DATA_DIR / "merged_master_dataset.csv"

EXPECTED_RECORDS = 133
REQUIRED_FIELDS = ["investigation_id", "title", "url", "research_area",
                   "project_type", "extraction_status", "data_source"]
PSI_DOI_RE = re.compile(r"^https://doi\.org/10\.60555/[a-z0-9]+-[a-z0-9]+$", re.I)
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
RELEVANCE_CATEGORIES = {"direct", "supporting", "peripheral"}
EXTRACTION_STATUSES = {"success", "incomplete", "failed"}
DATA_SOURCES = {"scrape", "zip+scrape"}


def publication_key(publication: dict) -> str:
    doi = (publication.get("doi") or "").strip().lower()
    if not doi:
        url = (publication.get("url") or "").strip().lower()
        if "doi.org/" in url:
            doi = url.split("doi.org/", 1)[1].strip()
    label = re.sub(r"\s+", " ", (publication.get("label") or "")).strip().lower()
    return doi or label


def is_self_reference(publication: dict, investigation_doi: str) -> bool:
    own = investigation_doi.replace("https://doi.org/", "").strip().lower()
    values = [
        (publication.get("doi") or "").strip().lower(),
        (publication.get("url") or "").strip().lower().replace("https://doi.org/", ""),
        (publication.get("label") or "").strip().lower(),
    ]
    return bool(own) and any(value and value.rstrip(".") == own for value in values)


def validate_records(records: list[dict]) -> list[str]:
    problems: list[str] = []

    if len(records) != EXPECTED_RECORDS:
        problems.append(f"record count is {len(records)}, expected {EXPECTED_RECORDS}")

    ids = [record.get("investigation_id") for record in records]
    duplicates = {record_id for record_id in ids if ids.count(record_id) > 1}
    if duplicates:
        problems.append(f"duplicate investigation_id values: {sorted(duplicates)}")

    seen_dois: dict[str, str] = {}

    for record in records:
        record_id = record.get("investigation_id", "<missing id>")

        for field in REQUIRED_FIELDS:
            if not str(record.get(field) or "").strip():
                problems.append(f"{record_id}: required field {field!r} is empty")

        status = record.get("extraction_status")
        if status not in EXTRACTION_STATUSES:
            problems.append(f"{record_id}: unexpected extraction_status {status!r}")

        source = record.get("data_source")
        if source not in DATA_SOURCES:
            problems.append(f"{record_id}: unexpected data_source {source!r}")
        expected_source = "zip+scrape" if "source_archive" in record else "scrape"
        if source != expected_source:
            problems.append(
                f"{record_id}: data_source is {source!r} but an ISA archive "
                f"{'is' if 'source_archive' in record else 'is not'} merged"
            )

        doi = (record.get("investigation_doi") or "").strip()
        if doi:
            if not PSI_DOI_RE.match(doi):
                problems.append(f"{record_id}: investigation_doi is not a PSI DOI: {doi!r}")
            elif doi.lower() in seen_dois:
                problems.append(f"{record_id}: investigation_doi duplicates {seen_dois[doi.lower()]}")
            else:
                seen_dois[doi.lower()] = record_id

        for field in ("objectives", "approach"):
            value = str(record.get(field) or "")
            if value.endswith("...") and status == "success":
                problems.append(f"{record_id}: {field} is still a truncated snippet")

        publications = record.get("publications") or []
        if not isinstance(publications, list):
            problems.append(f"{record_id}: publications is not a list")
            continue

        keys = []
        for publication in publications:
            if not isinstance(publication, dict):
                problems.append(f"{record_id}: publication entry is not an object")
                continue
            if not publication.get("label"):
                problems.append(f"{record_id}: publication without a label")
            key = publication_key(publication)
            if key:
                keys.append(key)
            if is_self_reference(publication, doi):
                problems.append(f"{record_id}: cites its own investigation DOI as a publication")
            pub_doi = (publication.get("doi") or "").strip().lower()
            pub_url = (publication.get("url") or "").strip().lower()
            if pub_doi and pub_url and not pub_url.endswith(pub_doi):
                problems.append(f"{record_id}: publication url does not match its doi: {pub_url!r}")

        if len(keys) != len(set(keys)):
            problems.append(f"{record_id}: publications contain duplicate entries")

        category = (record.get("relevance_category") or "").strip()
        if category and category not in RELEVANCE_CATEGORIES:
            problems.append(f"{record_id}: unexpected relevance_category {category!r}")
        score = record.get("relevance_score")
        if score not in (None, ""):
            try:
                numeric = float(score)
            except (TypeError, ValueError):
                problems.append(f"{record_id}: relevance_score is not numeric")
            else:
                if not 0.0 <= numeric <= 1.0:
                    problems.append(f"{record_id}: relevance_score is outside 0..1")
        if category and not (record.get("relevance_reason") or "").strip():
            problems.append(f"{record_id}: relevance_category without a reason")
        if (record.get("relevance_reason") or "").strip() and not category:
            problems.append(f"{record_id}: relevance_reason without a category")

        archive = record.get("source_archive")
        if archive is not None:
            if not isinstance(archive, dict):
                problems.append(f"{record_id}: source_archive is not an object")
            else:
                if archive.get("study_identifier") != record_id:
                    problems.append(f"{record_id}: source_archive study identifier mismatch")
                if not SHA256_RE.match(archive.get("sha256") or ""):
                    problems.append(f"{record_id}: source_archive sha256 is not a SHA-256 digest")
                if "isa_metadata" not in record:
                    problems.append(f"{record_id}: source_archive without isa_metadata")

    return problems


def csv_rows(records: list[dict], path: Path) -> list[str]:
    problems: list[str] = []
    with open(path, encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    if len(rows) != len(records):
        problems.append(f"csv has {len(rows)} rows, JSON has {len(records)} records")
        return problems

    by_id = {record["investigation_id"]: record for record in records}
    for row in rows:
        record = by_id.get(row.get("investigation_id"))
        if record is None:
            problems.append(f"csv row {row.get('investigation_id')!r} is not in the JSON")
            continue
        for key, raw in row.items():
            if key is None:
                continue
            original = record.get(key, "")
            if isinstance(original, (list, dict)):
                try:
                    parsed = json.loads(raw)
                except json.JSONDecodeError:
                    problems.append(f"{row['investigation_id']}: csv {key} is not valid JSON")
                    continue
                expected = json.loads(json.dumps(original, ensure_ascii=False))
                if parsed != expected:
                    problems.append(f"{row['investigation_id']}: csv/JSON mismatch in {key}")
            elif original is None:
                if raw != "":
                    problems.append(f"{row['investigation_id']}: csv/JSON mismatch in {key}")
            elif str(original) != raw:
                problems.append(f"{row['investigation_id']}: csv/JSON mismatch in {key}")
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", type=Path, default=DEFAULT_JSON)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    args = parser.parse_args()

    records = json.loads(args.json.read_text(encoding="utf-8"))
    problems = validate_records(records)
    if args.csv.exists():
        problems += csv_rows(records, args.csv)

    for problem in problems:
        print(f"FAIL - {problem}")

    areas: dict[str, int] = {}
    for record in records:
        area = record.get("research_area") or "unknown"
        areas[area] = areas.get(area, 0) + 1

    print(f"records            : {len(records)}")
    print(f"unique ids         : {len({r.get('investigation_id') for r in records})}")
    print(f"investigation DOIs : {sum(1 for r in records if r.get('investigation_doi'))}")
    print(f"merged archives    : {sum(1 for r in records if 'source_archive' in r)}")
    print(f"publications       : {sum(len(r.get('publications') or []) for r in records)} entries")
    print(f"truncated sections : {sum(1 for r in records if str(r.get('objectives') or '').endswith('...') or str(r.get('approach') or '').endswith('...'))}")
    print("research areas     : " + ", ".join(f"{area} {count}" for area, count in sorted(areas.items())))

    relevance: dict[str, int] = {}
    for record in records:
        category = (record.get("relevance_category") or "unlabelled")
        relevance[category] = relevance.get(category, 0) + 1
    print("relevance          : " + ", ".join(
        f"{category} {relevance[category]}" for category in sorted(relevance)
    ))

    if problems:
        print(f"\n{len(problems)} problem(s) found")
        return 1

    print("\nall checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
