#!/usr/bin/env python3
"""Classify investigations by how directly they address fire safety.

The classifier is deliberately simple and auditable. It never reads
``detail_text`` (that field contains navigation, citations and publication
lists and would trigger on unrelated wording), and it records the exact phrases
that produced each decision.

Evidence is collected from:

* ``title`` and ``research_area`` (used for the category decision)
* ``objectives`` and ``approach`` (recorded in the reason and score)
* ``hypothesis``, ``impacts`` and ``keywords`` (supporting context only)

Two vocabularies are used:

* **fire-safety phrases** - explicit fire topics: fire safety, fire growth,
  flame spread, flammability, suppression, extinguishment, ignition, ...
* **combustion phrases** - general combustion science: flame, soot, smoke,
  pyrolysis, cool flame, droplet combustion, ...

Categories:

* ``direct``     - the title names explicit fire-safety work (fire safety,
  spacecraft fire, flame spread, burning and suppression, extinguishment, ...)
  or a smoke/aerosol measurement experiment. ``flame`` alone is not enough.
* ``supporting`` - the record is Combustion Science but the title does not name
  fire-safety work explicitly.
* ``peripheral`` - no clear combustion or fire-safety connection.

Every category is accompanied by ``relevance_reason`` (matched phrases and the
rule that fired) and ``relevance_score`` (0-1). The score is a prioritisation
heuristic, not a measure of scientific quality.

Usage:
    python classify_relevance.py            # dry run, shows every decision
    python classify_relevance.py --review   # non-peripheral decisions only
    python classify_relevance.py --write
    python classify_relevance.py --record PSI-98
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from merge_isa import DEFAULT_CSV, DEFAULT_JSON, write_csv, write_json  # noqa: E402

# (display label, pattern, weight)
FIRE_TERMS: list[tuple[str, str, int]] = [
    ("fire safety", r"\bfire[\s-]+safety\b", 3),
    ("spacecraft fire", r"\bspacecraft[\s-]+fire\b", 3),
    ("fire experiment", r"\bfire[\s-]+experiment", 3),
    ("fire growth", r"\bfire[\s-]+growth\b", 3),
    ("fire spread", r"\bfire[\s-]+spread\b", 3),
    ("fire behavior", r"\bfire[\s-]+behavior\b", 3),
    ("fire hazard", r"\bfire[\s-]+hazard", 3),
    ("fire protection", r"\bfire[\s-]+protection\b", 3),
    ("fire suppression", r"\bfire[\s-]+suppression\b", 3),
    ("fire detection", r"\bfire[\s-]+detection\b", 3),
    ("fire extinguishing", r"\bfire[\s-]+extinguish\w*", 3),
    ("fire retardant", r"\bfire[\s-]+retardant\b", 3),
    ("burning and suppression", r"\bburning\s+and\s+suppression\b", 3),
    ("material flammability", r"\bmaterial\w*\s+flammab\w*", 3),
    ("flammability", r"\bflammab\w*", 2),
    ("flame spread", r"\bflame\s+spread\w*", 2),
    ("extinguishment", r"\bextinguish\w*", 2),
    ("suppression", r"\bsuppress\w*", 2),
    ("smoke detection", r"\bsmoke\s+detect\w*", 2),
    ("ignition", r"\bignit\w*", 1),
    ("fire", r"\bfire\b", 1),
]

COMBUSTION_TERMS: list[tuple[str, str, int]] = [
    ("combustion", r"\bcombust\w*", 2),
    ("flame", r"\bflame\w*", 2),
    ("burning", r"\bburn(?:ing|ed|s)?\b", 2),
    ("soot", r"\bsoot\w*", 2),
    ("smoke", r"\bsmoke\w*", 2),
    ("pyrolysis", r"\bpyroly\w*", 2),
    ("cool flame", r"\bcool[\s-]+flame\w*", 2),
    ("incineration", r"\bincinerat\w*", 2),
    ("extinction", r"\bextinct\w*", 2),
    ("ignition", r"\bignit\w*", 2),
    ("quenching", r"\bquench\w*", 1),
    ("fuel", r"\bfuel\w*", 1),
    ("oxidation", r"\boxidat\w*", 1),
    ("burner", r"\bburner\w*", 1),
    ("droplet", r"\bdroplet\w*", 1),
    ("aerosol", r"\baerosol\w*", 1),
    ("dust", r"\bdust\w*", 1),
    ("emissions", r"\bemission\w*", 1),
]

COMPILED = {
    label: re.compile(pattern, re.I)
    for label, pattern, _ in FIRE_TERMS + COMBUSTION_TERMS
}


def find_terms(text: str, terms: list[tuple[str, str, int]]) -> list[str]:
    return [label for label, _, _ in terms if COMPILED[label].search(text or "")]


def weight_of(label: str, terms: list[tuple[str, str, int]]) -> int:
    return next(weight for name, _, weight in terms if name == label)


def weighted(labels: list[str], terms: list[tuple[str, str, int]], factor: int = 1) -> int:
    return sum(weight_of(label, terms) * factor for label in labels)


def quote(labels: list[str], limit: int = 4) -> str:
    shown = labels[:limit]
    suffix = "" if len(labels) <= limit else f" (+{len(labels) - limit} more)"
    return ", ".join(f"'{label}'" for label in shown) + suffix


def describe_locations(
    prefix: str,
    title: list[str],
    body: list[str],
    context: list[str],
) -> list[str]:
    parts = []
    if title:
        parts.append(f"{prefix} in the title: {quote(title)}")
    if body:
        parts.append(f"{prefix} in objectives/approach: {quote(body)}")
    if context:
        parts.append(f"{prefix} in impacts/keywords: {quote(context)}")
    return parts


def decide(record: dict) -> tuple[str, float, str]:
    title = record.get("title") or ""
    area = record.get("research_area") or ""
    body = " ".join(str(record.get(field) or "") for field in ("objectives", "approach"))
    context = " ".join(str(record.get(field) or "")
                       for field in ("hypothesis", "impacts", "keywords"))

    title_fire = find_terms(title, FIRE_TERMS)
    body_fire = find_terms(body, FIRE_TERMS)
    context_fire = find_terms(context, FIRE_TERMS)
    title_comb = find_terms(title, COMBUSTION_TERMS)
    body_comb = find_terms(body, COMBUSTION_TERMS)
    context_comb = find_terms(context, COMBUSTION_TERMS)

    is_combustion_area = "combustion" in area.lower()

    title_strong_fire = [p for p in title_fire if weight_of(p, FIRE_TERMS) >= 2]
    smoke_experiment = (
        "smoke" in title_comb
        and "aerosol" in title_comb
        and re.search(r"\bexperiment\b", title, re.I)
        and not re.search(r"\b(utilization|analysis|modelling|modeling|computational)\b", title, re.I)
    )

    fire_weight = (
        weighted(title_fire, FIRE_TERMS, 3)
        + weighted(body_fire, FIRE_TERMS)
        + weighted(context_fire, FIRE_TERMS)
    )
    combustion_weight = (
        weighted(title_comb, COMBUSTION_TERMS, 3)
        + weighted(body_comb, COMBUSTION_TERMS)
        + weighted(context_comb, COMBUSTION_TERMS)
    )
    raw = fire_weight * 2 + combustion_weight

    evidence: list[str] = []
    if title_strong_fire:
        category = "direct"
        evidence.append(f"title names explicit fire-safety work: {quote(title_strong_fire)}")
    elif smoke_experiment:
        category = "direct"
        evidence.append("title names a smoke/aerosol measurement experiment used for fire detection")
    elif is_combustion_area:
        category = "supporting"
        evidence.append("research area is Combustion Science; fire safety is indirect")
    else:
        category = "peripheral"
        evidence.append("no fire-safety or combustion vocabulary in the title")

    evidence += describe_locations("fire terms", title_fire, body_fire, context_fire)
    evidence += describe_locations("combustion terms", title_comb, body_comb, context_comb)

    if category == "direct":
        score = 0.8 + 0.2 * min(1.0, raw / 40.0)
    elif category == "supporting":
        score = 0.3 + 0.3 * min(1.0, raw / 40.0)
    else:
        score = 0.2 * min(1.0, raw / 40.0)

    return category, round(min(1.0, score), 2), f"{category}: " + "; ".join(evidence)


def apply(records: list[dict]) -> list[dict]:
    for record in records:
        category, score, reason = decide(record)
        record["relevance_category"] = category
        record["relevance_score"] = score
        record["relevance_reason"] = reason
    return records


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", type=Path, default=DEFAULT_JSON)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--write", action="store_true", help="apply the changes")
    parser.add_argument("--review", action="store_true",
                        help="print non-peripheral decisions only")
    parser.add_argument("--record", help="show one investigation in detail")
    args = parser.parse_args()

    records = json.loads(args.json.read_text(encoding="utf-8"))
    apply(records)

    if args.record:
        record = next((r for r in records if r["investigation_id"] == args.record), None)
        if not record:
            raise SystemExit(f"{args.record} not found")
        print(json.dumps({key: record[key] for key in
                          ("investigation_id", "title", "research_area",
                           "relevance_category", "relevance_score", "relevance_reason")},
                         indent=2, ensure_ascii=False))
        return 0

    for record in records:
        if args.review and record["relevance_category"] == "peripheral":
            continue
        print(f"{record['investigation_id']:<8} {record['relevance_category']:<11} "
              f"{record['relevance_score']:>4}  {record['relevance_reason']}")

    counts: dict[str, int] = {}
    for record in records:
        counts[record["relevance_category"]] = counts.get(record["relevance_category"], 0) + 1

    print()
    for category in ("direct", "supporting", "peripheral"):
        print(f"{category:<12}: {counts.get(category, 0)}")

    by_area: dict[str, dict[str, int]] = {}
    for record in records:
        area = record.get("research_area") or "unknown"
        bucket = by_area.setdefault(area, {})
        bucket[record["relevance_category"]] = bucket.get(record["relevance_category"], 0) + 1
    print()
    for area in sorted(by_area):
        parts = ", ".join(f"{key} {value}" for key, value in sorted(by_area[area].items()))
        print(f"{area:<30} {parts}")

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
