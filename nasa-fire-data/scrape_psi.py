
import asyncio
import csv
import json
import re
from pathlib import Path
from urllib.parse import urljoin

from playwright.async_api import async_playwright

BASE_URL = "https://psi.nasa.gov"
SEARCH_URL = (
    "https://psi.nasa.gov/physci/repo/search"
    "?q=&data_source=psi&data_type=investigation"
)

OUTPUT_DIR = Path("psi_output")
OUTPUT_DIR.mkdir(exist_ok=True)

KEYWORDS = [
    "combustion", "flame", "fire", "burning",
    "extinction", "saffire", "bass", "flex",
    "acme", "smoke", "droplet", "ignition"
]


def clean(text):
    return re.sub(r"\s+", " ", text or "").strip()


def is_relevant(record):
    text = " ".join([
        record.get("title", ""),
        record.get("research_area", ""),
        record.get("objectives", ""),
        record.get("approach", ""),
        record.get("detail_text", "")
    ]).lower()

    return any(word in text for word in KEYWORDS)


async def collect_listing(page):
    records = []
    seen = set()

    while True:
        await page.locator("table.searchResultTable").first.wait_for(
            state="visible", timeout=30000
        )

        cards = page.locator(
            "table.searchResultTable"
        )

        count = await cards.count()

        for i in range(count):
            table = cards.nth(i)
            card = table.locator(
                "xpath=ancestor::div[contains(@class,'flex-container')][1]"
            )

            link = card.locator("p.title a").first

            if await link.count() == 0:
                continue

            title = clean(await link.inner_text())
            href = await link.get_attribute("href")

            if not href:
                continue

            url = urljoin(BASE_URL, href)
            match = re.search(r"(PSI-\d+)", url)

            if not match:
                continue

            investigation_id = match.group(1)

            if investigation_id in seen:
                continue

            seen.add(investigation_id)

            cells = table.locator("tbody tr td")
            cell_text = []

            for j in range(await cells.count()):
                cell_text.append(clean(await cells.nth(j).inner_text()))

            record = {
                "investigation_id": investigation_id,
                "title": title,
                "url": url,
                "research_area": cell_text[0] if len(cell_text) > 0 else "",
                "project_type": cell_text[1] if len(cell_text) > 1 else "",
                "objectives": cell_text[2] if len(cell_text) > 2 else "",
                "approach": cell_text[3] if len(cell_text) > 3 else "",
            }

            records.append(record)

        range_label = page.locator(
            ".mat-paginator-range-label"
        ).first
        current_range = clean(await range_label.inner_text())

        print(f"Collected {len(records)} records | {current_range}")

        next_button = page.locator(
            'button[aria-label="Next page"]'
        ).first

        if await next_button.is_disabled():
            break

        await next_button.click()

        try:
            await page.wait_for_function(
                """previous => {
                    const el = document.querySelector(
                        '.mat-paginator-range-label'
                    );
                    return el && el.innerText.trim() !== previous;
                }""",
                arg=current_range,
                timeout=15000
            )
        except Exception:
            print("Pagination did not advance. Stopping safely.")
            break

        await page.wait_for_timeout(700)

    return records


async def extract_detail(page, record):
    result = dict(record)
    result.update({
        "detail_text": "",
        "doi": "",
        "publications": [],
        "files_and_documents": [],
        "all_links": [],
        "extraction_status": "failed",
        "extraction_error": ""
    })

    try:
        await page.goto(
            record["url"],
            wait_until="domcontentloaded",
            timeout=60000
        )

        # Wait for real investigation content, not just the page shell.
        loaded = False

        for attempt in range(30):
            body = clean(await page.locator("body").inner_text())

            has_content = (
                "Objectives" in body
                and "Approach" in body
                and "Loading Details..." not in body
                and len(body) > 1000
            )

            if has_content:
                loaded = True
                break

            await page.wait_for_timeout(1000)

        body = clean(await page.locator("body").inner_text())
        result["detail_text"] = body

        if not loaded:
            result["extraction_status"] = "incomplete"
            result["extraction_error"] = (
                "Investigation details did not fully load"
            )
        else:
            result["extraction_status"] = "success"

        links = await page.locator("a[href]").evaluate_all(
            """elements => elements.map(a => ({
                label: (a.innerText || a.getAttribute('aria-label') || '').trim(),
                href: a.href
            }))"""
        )

        for item in links:
            href = item.get("href", "")
            label = clean(item.get("label", ""))

            if not href:
                continue

            link_record = {"label": label, "url": href}
            result["all_links"].append(link_record)

            lower = (label + " " + href).lower()

            if "doi.org/" in lower:
                result["doi"] = href

            if any(ext in lower for ext in [
                ".pdf", ".csv", ".xlsx", ".xls",
                ".zip", ".txt", ".json", ".docx"
            ]):
                result["files_and_documents"].append(link_record)

            if "doi.org/" in lower or any(
                word in lower for word in [
                    "publication", "journal", "proceedings"
                ]
            ):
                result["publications"].append(link_record)

        # Keep a copy of the detail text for inspection.
        (OUTPUT_DIR / f"{record['investigation_id']}.txt").write_text(
            body, encoding="utf-8"
        )

    except Exception as exc:
        result["extraction_error"] = str(exc)
        print(f"Error on {record['investigation_id']}: {exc}")

    return result


async def main():
    async with async_playwright() as p:
        # Use locally installed Chrome because the Playwright browser download
        # is unavailable in this environment.
        browser = await p.chromium.launch(
            headless=True,
            channel="chrome",
        )

        page = await browser.new_page()
        page.set_default_timeout(30000)

        print("Opening NASA PSI search...")
        await page.goto(
            SEARCH_URL,
            wait_until="domcontentloaded",
            timeout=60000
        )

        await page.locator("table.searchResultTable").first.wait_for(
            state="visible", timeout=60000
        )

        print("\nCollecting investigation listings...")
        listings = await collect_listing(page)

        print(f"\nTotal unique listings collected: {len(listings)}")

        # Save listing data before detail extraction.
        (OUTPUT_DIR / "investigation_listings.json").write_text(
            json.dumps(listings, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )

        details = []

        for index, record in enumerate(listings, start=1):
            print(
                f"[{index}/{len(listings)}] "
                f"Loading {record['investigation_id']}"
            )

            detail = await extract_detail(page, record)
            detail["is_combustion_related"] = is_relevant(detail)
            details.append(detail)

            # Be polite to NASA's server.
            await page.wait_for_timeout(800)

        await browser.close()

    # Save complete extracted dataset.
    (OUTPUT_DIR / "investigations.json").write_text(
        json.dumps(details, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )

    # Save spreadsheet-friendly CSV.
    csv_rows = []

    for item in details:
        row = dict(item)
        for key in [
            "publications", "files_and_documents", "all_links"
        ]:
            row[key] = json.dumps(
                row.get(key, []), ensure_ascii=False
            )
        csv_rows.append(row)

    if csv_rows:
        with open(
            OUTPUT_DIR / "investigations.csv",
            "w",
            newline="",
            encoding="utf-8-sig"
        ) as file:
            writer = csv.DictWriter(
                file, fieldnames=csv_rows[0].keys()
            )
            writer.writeheader()
            writer.writerows(csv_rows)

    successful = sum(
        x["extraction_status"] == "success" for x in details
    )
    incomplete = sum(
        x["extraction_status"] == "incomplete" for x in details
    )
    failed = sum(
        x["extraction_status"] == "failed" for x in details
    )
    relevant = sum(
        x["is_combustion_related"] for x in details
    )

    print("\n========== EXTRACTION REPORT ==========")
    print(f"Listings collected: {len(listings)}")
    print(f"Details successful: {successful}")
    print(f"Details incomplete: {incomplete}")
    print(f"Details failed: {failed}")
    print(f"Potentially relevant: {relevant}")
    print(f"Output folder: {OUTPUT_DIR.resolve()}")
    print("=======================================")


if __name__ == "__main__":
    asyncio.run(main())
