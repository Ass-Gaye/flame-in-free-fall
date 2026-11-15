#!/usr/bin/env python3
"""Normalize fields the original scraper stored inconsistently.

Everything here is derived from data that is already in the dataset; nothing is
fetched from the network and nothing is invented.

Repairs:

1. ``investigation_doi`` - the scraper stored the *last* DOI printed on the PSI
   page, which is a publication DOI. The investigation DOI is the first DOI in
   ``detail_text`` and always uses NASA PSI's own ``10.60555/`` namespace. The
   value the scraper stored is preserved in ``scraper_doi_unverified``.
2. ``publications`` - the investigation DOI was also scraped as if it were one
   of the investigation's own publications; such self-references are removed.
3. ``objectives`` / ``approach`` - the scraper kept a ~200 character search
   listing snippet. The full section text is recovered from ``detail_text``.
   Records merged from an ISA archive keep the archive text.
4. ``data_source`` - set from whether an ISA archive was actually merged.

The script is idempotent: a second run reports no changes. Nothing is written
unless ``--write`` is passed.

Usage:
    python normalize_dataset.py
    python normalize_dataset.py --write
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from merge_isa import (  # noqa: E402
    DEFAULT_CSV,
    DEFAULT_JSON,
    EXPECTED_RECORDS,
    write_csv,
    write_json,
)

DETAIL_DOI_RE = re.compile(r"DOI:\s*(10\.\d{4,9}/[^\s]+)")
INVESTIGATION_DOI_RE = re.compile(r"^https://doi\.org/10\.60555/[a-z0-9]+-[a-z0-9]+$", re.I)

PAGE_END = '.!?"\u201d\u2019)'

# Headings rendered by the PSI investigation page, in the order they appear.
AFTER_OBJECTIVES = [
    "Keywords", "Publications", "Publication", "Hardware", "Contact(s)",
    "Files and Documents", "Data files and documents", "Experimental Table",
    "Modeling Table", "Read Me", "Version History", "Representative Images",
    "Related Investigation",
]

# Page furniture that means a section ran past its end and must be rejected.
PAGE_NOISE = [
    "table_view", "menu_book", "pallet", "sim_card", "view_timeline",
    "SITE INFORMATION", "NASA Privacy Policy", "No Fear Act", "menu_open",
]


def squash(value: str) -> str:
    return re.sub(r"\s+", " ", value or "")


def prefix(value: str, length: int = 60) -> str:
    return squash(value).strip()[:length]


def is_boundary(text: str, index: int, heading: str) -> bool:
    before = text[:index].rstrip()
    after = text[index + len(heading):]
    return ((not before) or before[-1] in PAGE_END) and (
        (not after) or after[0] in " /:-" or after[0].isupper() or after[0].isdigit()
    )


def first_heading(text: str, headings: list[str], start: int) -> int | None:
    best: int | None = None
    for heading in headings:
        index = text.find(heading, start)
        while index != -1:
            if is_boundary(text, index, heading):
                if best is None or index < best:
                    best = index
                break
            index = text.find(heading, index + 1)
    return best


def first_mention(text: str, headings: list[str], start: int) -> int | None:
    """Index of the first section heading, without the punctuation check.

    Section headings are sometimes glued to the previous sentence when that
    sentence has no full stop (a quirk of the PSI page), so the punctuation
    check used for optional headings cannot be applied to the primary ones.
    """
    positions = [text.find(heading, start) for heading in headings]
    positions = [index for index in positions if index != -1]
    return min(positions) if positions else None


TRAILING_HEADINGS = [
    "Research Impacts/Earth Benefits",
    "Research Impacts / Earth Benefits",
    "Research Impacts",
    "Hypothesis",
    "Approach",
    "Keywords",
    "Publications",
    "Publication",
    "Hardware",
    "Contact(s)",
    "Files and Documents",
    "Data files and documents",
    "Experimental Table",
    "Modeling Table",
    "Read Me",
    "Version History",
    "Representative Images",
    "Related Investigation",
]


def trim_trailing_heading(value: str) -> str:
    changed = True
    while changed:
        changed = False
        for heading in TRAILING_HEADINGS:
            if value.endswith(heading):
                value = value[:-len(heading)].rstrip()
                changed = True
                break
    return value


def extract_section(
    text: str,
    snippet: str,
    following: list[str],
    primary: list[str],
    secondary: list[str],
) -> str:
    """Recover a full section from the flattened page text, or return ''."""
    anchor = prefix(snippet)
    if not anchor:
        return ""

    start = text.find(anchor)
    if start < 0:
        return ""

    search_from = start + len(anchor)
    end: int | None = None
    for next_snippet in following:
        next_anchor = prefix(next_snippet)
        if not next_anchor:
            continue
        index = text.find(next_anchor, search_from)
        if index != -1 and (end is None or index < end):
            end = index
    if end is None:
        end = first_mention(text, primary, search_from)
    if end is None:
        end = first_heading(text, secondary, search_from)
    if end is None:
        end = len(text)

    value = trim_trailing_heading(text[start:end].strip())
    if not value or not value.startswith(prefix(snippet, 40)):
        return ""
    if any(token in value for token in PAGE_NOISE):
        return ""
    return html.unescape(value)


def detail_investigation_doi(record: dict) -> str:
    """The first DOI in detail_text is the investigation DOI; later ones are publications."""
    for match in DETAIL_DOI_RE.finditer(record.get("detail_text") or ""):
        doi = match.group(1).rstrip(".,;")
        if doi.lower().startswith("10.60555/"):
            return doi
    return ""


def is_self_reference(publication: dict, investigation_doi: str) -> bool:
    own = investigation_doi.replace("https://doi.org/", "").strip().lower()
    values = [
        (publication.get("doi") or "").strip().lower(),
        (publication.get("url") or "").strip().lower().replace("https://doi.org/", ""),
        (publication.get("label") or "").strip().lower(),
    ]
    return bool(own) and any(value and value.rstrip(".") == own for value in values)


def publication_key(publication: dict) -> str:
    """Identify a publication by DOI when there is one, else by its label."""
    doi = (publication.get("doi") or "").strip().lower()
    if not doi:
        url = (publication.get("url") or "").strip().lower()
        if "doi.org/" in url:
            doi = url.split("doi.org/", 1)[1].strip()
    label = re.sub(r"\s+", " ", (publication.get("label") or "")).strip().lower()
    return doi or label


def publication_rank(publication: dict) -> tuple:
    label = (publication.get("label") or "").strip().lower()
    return (
        not label.startswith("10."),
        len(publication.get("authors") or []),
        sum(1 for key in ("label", "url", "doi", "status", "pubmed_id")
            if publication.get(key)),
    )


def dedupe_publications(publications: list[dict]) -> list[dict]:
    """Keep one entry per DOI/title, preferring the most complete one."""
    kept: dict[str, dict] = {}
    for publication in publications:
        key = publication_key(publication)
        if not key:
            continue
        if key not in kept or publication_rank(publication) > publication_rank(kept[key]):
            kept[key] = publication
    return list(kept.values())


def normalize(records: list[dict]) -> tuple[list[dict], dict[str, list[str]]]:
    notes: dict[str, list[str]] = {
        "doi_updated": [],
        "doi_confirmed": [],
        "doi_missing": [],
        "self_reference_removed": [],
        "duplicate_publications_removed": [],
        "data_source_fixed": [],
        "objectives_recovered": [],
        "approach_recovered": [],
        "section_unavailable": [],
        "whitespace_normalized": [],
        "archive_doi_mismatch": [],
    }

    for record in records:
        record_id = record.get("investigation_id", "?")
        detail_doi = detail_investigation_doi(record)
        current = (record.get("investigation_doi") or "").strip()
        archived = "source_archive" in record

        if archived:
            if detail_doi and current.replace("https://doi.org/", "").lower() != detail_doi.lower():
                notes["archive_doi_mismatch"].append(
                    f"{record_id}: archive {current!r} != page {detail_doi!r}"
                )
            else:
                notes["doi_confirmed"].append(record_id)
        elif detail_doi:
            new_doi = f"https://doi.org/{detail_doi}"
            if current != new_doi:
                if current and not record.get("scraper_doi_unverified"):
                    record["scraper_doi_unverified"] = current
                record["investigation_doi"] = new_doi
                notes["doi_updated"].append(record_id)
            else:
                notes["doi_confirmed"].append(record_id)
        elif current:
            notes["doi_missing"].append(record_id)
        else:
            notes["doi_missing"].append(record_id)

        if not record.get("investigation_doi"):
            notes["doi_missing"].append(record_id)

        publications = record.get("publications") or []
        kept = [p for p in publications if not is_self_reference(p, record.get("investigation_doi", ""))]
        if len(kept) != len(publications):
            record["publications"] = kept
            notes["self_reference_removed"].append(
                f"{record_id}: {len(publications) - len(kept)}"
            )

        deduped = dedupe_publications(record.get("publications") or [])
        if len(deduped) != len(record.get("publications") or []):
            notes["duplicate_publications_removed"].append(
                f"{record_id}: {len(record.get('publications') or []) - len(deduped)}"
            )
            record["publications"] = deduped

        expected_source = "zip+scrape" if archived else "scrape"
        if record.get("data_source") != expected_source:
            record["data_source"] = expected_source
            notes["data_source_fixed"].append(record_id)

        for field in ("objectives", "approach"):
            value = record.get(field) or ""
            if value and squash(value) != value:
                record[field] = squash(value)
                notes["whitespace_normalized"].append(f"{record_id}/{field}")

        if archived:
            continue

        page = squash(record.get("detail_text") or "")
        if not page:
            continue

        for field, following, primary, secondary in (
            ("objectives", [record.get("approach") or ""],
             ["Approach", "Hypothesis", "Research Impacts"], AFTER_OBJECTIVES),
            ("approach", [record.get("hypothesis") or "", record.get("impacts") or ""],
             ["Hypothesis", "Research Impacts"], AFTER_OBJECTIVES),
        ):
            old = (record.get(field) or "").strip()
            if not old:
                continue
            new = extract_section(page, old, following, primary, secondary)
            if not new or len(new) <= len(old):
                if not new and old.endswith("..."):
                    notes["section_unavailable"].append(f"{record_id}/{field}")
                continue
            record[field] = new
            notes[f"{field}_recovered"].append(record_id)

    return records, notes


def verify(records: list[dict]) -> list[str]:
    problems = []
    ids = [record.get("investigation_id") for record in records]
    if len(records) != EXPECTED_RECORDS:
        problems.append(f"expected {EXPECTED_RECORDS} records, found {len(records)}")
    if len(ids) != len(set(ids)):
        problems.append("duplicate investigation_id values")

    dois: dict[str, str] = {}
    for record in records:
        record_id = record.get("investigation_id")
        doi = (record.get("investigation_doi") or "").strip()
        if doi:
            if not INVESTIGATION_DOI_RE.match(doi):
                problems.append(f"{record_id}: investigation_doi is not a PSI DOI: {doi!r}")
            key = doi.lower()
            if key in dois:
                problems.append(f"{record_id}: investigation_doi duplicates {dois[key]}")
            dois[key] = record_id

        for publication in record.get("publications") or []:
            if is_self_reference(publication, doi):
                problems.append(f"{record_id}: publications still contain the investigation DOI")

        keys = [publication_key(p) for p in record.get("publications") or [] if publication_key(p)]
        if len(keys) != len(set(keys)):
            problems.append(f"{record_id}: publications still contain duplicates")

        expected_source = "zip+scrape" if "source_archive" in record else "scrape"
        if record.get("data_source") != expected_source:
            problems.append(f"{record_id}: data_source is {record.get('data_source')!r}")

    return problems


def report(notes: dict[str, list[str]], records: list[dict]) -> None:
    def line(label: str, values: list[str]) -> None:
        print(f"{label:<28}: {len(values)}")
        if values and len(values) <= 8:
            print(f"  {', '.join(values)}")

    line("investigation DOI updated", notes["doi_updated"])
    line("investigation DOI confirmed", notes["doi_confirmed"])
    line("investigation DOI unavailable", sorted(set(notes["doi_missing"])))
    line("self-references removed", notes["self_reference_removed"])
    line("duplicate publications", notes["duplicate_publications_removed"])
    line("data_source corrected", notes["data_source_fixed"])
    line("objectives recovered", notes["objectives_recovered"])
    line("approach recovered", notes["approach_recovered"])
    line("section unavailable", notes["section_unavailable"])
    line("whitespace normalized", notes["whitespace_normalized"])
    if notes["archive_doi_mismatch"]:
        line("archive DOI mismatch", notes["archive_doi_mismatch"])

    truncated = [
        record["investigation_id"]
        for record in records
        if (record.get("objectives") or "").endswith("...")
        or (record.get("approach") or "").endswith("...")
    ]
    print(f"{'still truncated':<28}: {len(truncated)}")
    if truncated:
        print(f"  {', '.join(truncated)}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", type=Path, default=DEFAULT_JSON, help="dataset JSON")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV, help="dataset CSV")
    parser.add_argument("--write", action="store_true", help="apply the changes")
    args = parser.parse_args()

    records = json.loads(args.json.read_text(encoding="utf-8"))
    records, notes = normalize(records)

    problems = verify(records)
    if problems:
        for problem in problems:
            print(f"verify: FAIL - {problem}")
        return 1

    report(notes, records)
    print("verify: ok (records, unique IDs, PSI DOIs, no self-references)")

    if not args.write:
        print("\ndry run - pass --write to update the dataset")
        return 0

    write_json(records, args.json)
    write_csv(records, args.csv)
    print(f"\nwrote {args.json}")
    print(f"wrote {args.csv}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
