#!/usr/bin/env python3
"""Enrich the merged Flame in Freefall dataset with a NASA PSI ISA-Tab archive.

The archive is matched to an existing record by its internal ``Study Identifier``,
never by the archive filename: the downloaded archives in this project are named
after a different investigation than the one they contain.

Enrichment applied to the matched record:

* ``investigation_doi``      - taken from ``Comment[DOI]`` (ISA), not from a link
* ``objectives``/``approach`` - full ISA text (the scraper only kept a snippet)
* ``publications``           - rebuilt from the ISA study publications, de-duplicated
* ``isa_metadata``           - archive metadata the scraper never captured
* ``source_archive``         - provenance of the archive that was merged

The script is idempotent: running it again with the same archive produces the
same record. Nothing is written unless ``--write`` is passed.

Every archive is parsed and checked before anything is written, so a single bad
archive aborts the whole batch and leaves the dataset untouched.

Usage:
    python merge_isa.py --zip "<archive.zip>"
    python merge_isa.py --zip "<a.zip>" --zip "<b.zip>" --write
    python merge_isa.py --zip-dir "<folder>" --write
"""

from __future__ import annotations

import argparse
import csv
import difflib
import hashlib
import html
import json
import re
import sys
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "psi_output"
DEFAULT_JSON = DATA_DIR / "merged_master_dataset.json"
DEFAULT_CSV = DATA_DIR / "merged_master_dataset.csv"

# Documented size of the cleaned dataset (see README / roadmap).
EXPECTED_RECORDS = 133

SECTION_RE = re.compile(r"^[A-Z][A-Z0-9 &/,.\-]*$")
DOI_RE = re.compile(r"^(?:https?://(?:dx\.)?doi\.org/)?(10\.\d{4,9}/\S+)$", re.I)

# Minimum title similarity before an archive may overwrite a record.
MIN_TITLE_SIMILARITY = 0.8


class MergeError(Exception):
    """An archive cannot be merged; the batch is aborted without writing."""


@dataclass
class ArchivePlan:
    """A checked merge that has not been applied to the dataset yet."""

    path: Path
    study_id: str
    fields: dict[str, str] = field(repr=False)
    source: dict
    before: dict = field(repr=False)
    after: dict = field(repr=False)
    similarity: float = 0.0

    @property
    def changed_fields(self) -> list[str]:
        keys = set(self.before) | set(self.after)
        return sorted(k for k in keys if self.before.get(k) != self.after.get(k))


def build_plan(path: Path, records: list[dict], force: bool = False) -> ArchivePlan:
    """Load an archive and check that it can safely replace a record."""
    if not path.exists():
        raise MergeError(f"archive not found: {path}")

    fields, source = load_archive(path)
    study_id = source["study_identifier"]

    matches = [r for r in records if r.get("investigation_id") == study_id]
    if not matches:
        raise MergeError(f"{study_id} is not present in the dataset")
    record = matches[0]

    isa_title = html.unescape(fields.get("Study Title", "")).strip()
    similarity = difflib.SequenceMatcher(
        None, squash(isa_title).lower(), squash(record.get("title", "")).lower()
    ).ratio()
    if similarity < MIN_TITLE_SIMILARITY and not force:
        raise MergeError(
            f"refusing to merge {path.name}: ISA title differs from record {study_id} "
            f"(similarity {similarity:.2f}, need {MIN_TITLE_SIMILARITY:.2f}); use --force to override"
        )

    return ArchivePlan(
        path=path,
        study_id=study_id,
        fields=fields,
        source=source,
        before=record,
        after=apply_archive(record, fields, source),
        similarity=similarity,
    )



def parse_isa(text: str) -> dict[str, str]:
    """Parse an ISA-Tab investigation file, including multi-line values."""
    collected: dict[str, list[str]] = {}
    current: str | None = None

    for raw in text.splitlines():
        if "\t" in raw:
            key, value = raw.split("\t", 1)
            current = key.strip()
            # Keep leading tabs: they are empty cells in multi-column fields
            # such as Study Person Mid Initials.
            collected[current] = [value.rstrip()]
            continue

        line = raw.strip()
        if not line:
            continue
        if SECTION_RE.match(line):
            current = None
            continue
        if current is not None:
            collected[current].append(line)

    fields: dict[str, str] = {}
    for key, parts in collected.items():
        value = "\n".join(p for p in parts if p != "")
        trimmed = value.strip()
        if len(trimmed) >= 2 and trimmed.startswith('"') and trimmed.endswith('"'):
            value = trimmed[1:-1]
        fields[key] = value
    return fields


def split_cells(value: str) -> list[str]:
    return [cell.strip() for cell in (value or "").split("\t")]


def split_list(value: str) -> list[str]:
    return [item.strip() for item in re.split(r",\s*", value or "") if item.strip()]


def normalize_doi(value: str) -> str:
    value = (value or "").strip()
    if not value:
        return ""
    match = DOI_RE.match(value)
    return match.group(1).rstrip(".") if match else ""


def doi_url(doi: str) -> str:
    return f"https://doi.org/{doi}" if doi else ""


def squash(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "")).strip()


def parse_contacts(fields: dict[str, str]) -> list[dict[str, str]]:
    columns = {
        "last_name": "Study Person Last Name",
        "first_name": "Study Person First Name",
        "middle_initials": "Study Person Mid Initials",
        "email": "Study Person Email",
        "phone": "Study Person Phone",
        "fax": "Study Person Fax",
        "address": "Study Person Address",
        "affiliation": "Study Person Affiliation",
        "roles": "Study Person Roles",
    }
    parsed = {name: split_cells(fields.get(key, "")) for name, key in columns.items()}
    count = max((len(values) for values in parsed.values()), default=0)

    contacts = []
    for index in range(count):
        contact = {
            name: values[index]
            for name, values in parsed.items()
            if index < len(values) and values[index]
        }
        if contact:
            contacts.append(contact)
    return contacts


def parse_publications(fields: dict[str, str]) -> list[dict]:
    dois = split_cells(fields.get("Study Publication DOI", ""))
    authors = split_cells(fields.get("Study Publication Author List", ""))
    titles = split_cells(fields.get("Study Publication Title", ""))
    statuses = split_cells(fields.get("Study Publication Status", ""))
    pmids = split_cells(fields.get("Study PubMed ID", ""))

    def cell(values: list[str], index: int) -> str:
        return values[index] if index < len(values) else ""

    publications = []
    seen: set[str] = set()

    for index in range(max(len(dois), len(titles))):
        title = html.unescape(cell(titles, index)).strip()
        doi = normalize_doi(cell(dois, index))
        if not title and not doi:
            continue

        key = doi.lower() if doi else squash(title).lower()
        if key in seen:
            continue
        seen.add(key)

        entry = {
            "label": title or doi,
            "url": doi_url(doi),
            "doi": doi,
            "authors": split_list(html.unescape(cell(authors, index))),
            "status": cell(statuses, index).strip(),
        }
        pmid = cell(pmids, index).strip()
        if pmid:
            entry["pubmed_id"] = pmid
        publications.append(entry)

    return publications


def build_isa_metadata(fields: dict[str, str]) -> dict:
    metadata = {
        "study_title": fields.get("Study Title", "").strip(),
        "acronym": fields.get("Comment[Investigation Acronym]", "").strip(),
        "proposal_title": fields.get("Comment[Proposal Title]", "").strip(),
        "sub_research_area": fields.get("Comment[SubResearch Area]", "").strip(),
        "experiment_hardware": fields.get("Comment[Experiment Hardware]", "").strip(),
        "experiment_hardware_links": split_list(
            fields.get("Comment[Experiment Hardware Link]", "")
        ),
        "flight_platform": fields.get("Comment[Flight Platform]", "").strip(),
        "managing_center": fields.get("Comment[Managing NASA Center]", "").strip(),
        "funding": split_list(fields.get("Comment[Funding]", "")),
        "space_program": fields.get("Comment[Space Program]", "").strip(),
        "investigation_start_date": fields.get("Comment[Investigation Start Date]", "").strip(),
        "investigation_end_date": fields.get("Comment[Investigation End Date]", "").strip(),
        "study_submission_date": fields.get("Study Submission Date", "").strip(),
        "study_public_release_date": fields.get("Study Public Release Date", "").strip(),
        "study_design_terms": [t for t in split_cells(fields.get("Study Design Type", "")) if t],
        "contacts": parse_contacts(fields),
    }
    return {key: value for key, value in metadata.items() if value}


def load_archive(path: Path) -> tuple[dict[str, str], dict]:
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        investigation = next((name for name in names if name.startswith("i_")), None)
        if not investigation:
            raise MergeError(f"{path.name}: no i_Investigation.txt entry")
        text = archive.read(investigation).decode("utf-8", "replace")

    fields = parse_isa(text)
    study_id = fields.get("Study Identifier", "").strip()
    if not study_id:
        raise MergeError(f"{path.name}: no Study Identifier in archive")

    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    return fields, {
        "file": path.name,
        "format": "ISA-Tab",
        "study_identifier": study_id,
        "sha256": digest,
        "filename_matches_content": study_id in path.name,
    }


def apply_archive(record: dict, fields: dict[str, str], source: dict) -> dict:
    updated = dict(record)
    updated["investigation_doi"] = doi_url(normalize_doi(fields.get("Comment[DOI]", "")))
    updated["objectives"] = squash(fields.get("Comment[Objective]", ""))
    updated["approach"] = squash(fields.get("Comment[Approach]", ""))
    updated["publications"] = parse_publications(fields)
    updated["data_source"] = "zip+scrape"

    metadata = build_isa_metadata(fields)
    if metadata:
        updated["isa_metadata"] = metadata
    updated["source_archive"] = source
    return updated


def write_json(records: list[dict], path: Path) -> None:
    with open(path, "w", encoding="utf-8", newline="\r\n") as handle:
        json.dump(records, handle, indent=2, ensure_ascii=False)


def write_csv(records: list[dict], path: Path) -> None:
    fieldnames: list[str] = []
    for record in records:
        for key in record:
            if key not in fieldnames:
                fieldnames.append(key)

    with open(path, "w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for record in records:
            row = {}
            for key in fieldnames:
                value = record.get(key, "")
                if isinstance(value, (list, dict)):
                    value = json.dumps(value, ensure_ascii=False)
                row[key] = value
            writer.writerow(row)


def verify(records: list[dict], plans: list[ArchivePlan]) -> list[str]:
    problems = []
    ids = [record.get("investigation_id") for record in records]
    if len(ids) != len(set(ids)):
        problems.append("duplicate investigation_id values")
    if len(records) != EXPECTED_RECORDS:
        problems.append(f"expected {EXPECTED_RECORDS} records, found {len(records)}")

    by_id = {record.get("investigation_id"): record for record in records}
    for plan in plans:
        target = by_id.get(plan.study_id)
        if target is None:
            problems.append(f"{plan.study_id}: matched record is missing")
            continue

        expected_doi = doi_url(normalize_doi(plan.fields.get("Comment[DOI]", "")))
        if target.get("investigation_doi") != expected_doi:
            problems.append(f"{plan.study_id}: investigation_doi does not match the ISA DOI")
        if target.get("objectives") != squash(plan.fields.get("Comment[Objective]", "")):
            problems.append(f"{plan.study_id}: objectives do not match the ISA text")
        if target.get("approach") != squash(plan.fields.get("Comment[Approach]", "")):
            problems.append(f"{plan.study_id}: approach does not match the ISA text")

        keys = [
            publication.get("doi") or squash(publication.get("label", "")).lower()
            for publication in target.get("publications") or []
        ]
        if len(keys) != len(set(keys)):
            problems.append(f"{plan.study_id}: publications still contain duplicates")

    return problems


def describe(plan: ArchivePlan) -> None:
    before, after = plan.before, plan.after
    metadata = after.get("isa_metadata", {})
    print(f"  archive        : {plan.source['file']}")
    print(f"  study id       : {plan.study_id}")
    print(f"  title match    : {plan.similarity:.2f}"
          f" ({'ok' if plan.source['filename_matches_content'] else 'filename does not match content'})")
    print(f"  DOI            : {before.get('investigation_doi')!r} -> {after.get('investigation_doi')!r}")
    print(f"  objectives     : {len(before.get('objectives') or '')} -> {len(after.get('objectives') or '')} chars")
    print(f"  approach       : {len(before.get('approach') or '')} -> {len(after.get('approach') or '')} chars")
    print(f"  publications   : {len(before.get('publications') or [])} -> {len(after.get('publications') or [])} entries")
    print(f"  isa_metadata   : {len(metadata)} fields, {len(metadata.get('contacts', []))} contacts")
    print(f"  changed fields : {', '.join(plan.changed_fields) or '(none)'}")


def collect_archives(args: argparse.Namespace) -> list[Path]:
    paths: list[Path] = []
    for path in list(args.zip) + list(args.zip_dir):
        for candidate in ([path] if path.is_file() else sorted(path.glob("*.zip"))):
            if candidate not in paths:
                paths.append(candidate)
    return paths


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--zip", action="append", type=Path, default=[],
                        help="ISA-Tab archive to merge; repeat for several archives")
    parser.add_argument("--zip-dir", action="append", type=Path, default=[],
                        help="directory whose *.zip archives are all merged")
    parser.add_argument("--json", type=Path, default=DEFAULT_JSON, help="dataset JSON")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV, help="dataset CSV")
    parser.add_argument("--write", action="store_true", help="apply the changes")
    parser.add_argument("--force", action="store_true", help="skip the title sanity check")
    args = parser.parse_args()

    archives = collect_archives(args)
    if not archives:
        parser.error("pass at least one --zip or --zip-dir")

    records = json.loads(args.json.read_text(encoding="utf-8"))
    order = [record.get("investigation_id") for record in records]

    plans: list[ArchivePlan] = []
    seen: dict[str, Path] = {}
    errors: list[str] = []
    for path in archives:
        try:
            plan = build_plan(path, records, force=args.force)
        except MergeError as exc:
            errors.append(f"{path.name}: {exc}")
            continue
        if plan.study_id in seen:
            errors.append(
                f"{path.name}: {plan.study_id} already supplied by {seen[plan.study_id].name}"
            )
            continue
        seen[plan.study_id] = path
        plans.append(plan)

    if errors:
        print("merge aborted; nothing written")
        for error in errors:
            print(f"  error: {error}")
        return 1

    print(f"checked {len(plans)} archive(s) against {len(records)} records\n")
    for plan in plans:
        describe(plan)
        print()

    before_total = sum(len(record.get("publications") or []) for record in records)
    by_id = {record.get("investigation_id"): record for record in records}
    updated_records = [by_id.get(record_id) for record_id in order]
    for plan in plans:
        updated_records[order.index(plan.study_id)] = plan.after

    problems = verify(updated_records, plans)
    if problems:
        for problem in problems:
            print(f"verify: FAIL - {problem}")
        return 1

    after_total = sum(len(record.get("publications") or []) for record in updated_records)
    targets = ", ".join(plan.study_id for plan in plans)
    print(f"records to update : {len(plans)} ({targets})")
    print(f"publications      : {before_total} -> {after_total} entries")
    print(f"verify            : ok ({len(updated_records)} records, unique IDs, no duplicate publications)")

    if not args.write:
        print("\ndry run - pass --write to update the dataset")
        return 0

    write_json(updated_records, args.json)
    write_csv(updated_records, args.csv)
    print(f"\nwrote {args.json}")
    print(f"wrote {args.csv}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
