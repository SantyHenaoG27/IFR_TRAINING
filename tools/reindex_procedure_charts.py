import json
import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
METADATA = ROOT / "storage" / "metadata"
CHART_TYPES = {"sid", "star"}
CODE_RE = re.compile(r"\[([A-Z]{3,6}\d[A-Z])\]")
NAMED_CODE_RE = re.compile(r"(?:^|[\n,;])\s*([A-ZÁÉÍÓÚÑÜ0-9][A-ZÁÉÍÓÚÑÜ0-9\s/.-]*?)\s*\[([A-Z]{3,6}\d[A-Z])\]")
FILENAME_CODE_RE = re.compile(r"\b([A-Z]{3,6}\d[A-Z])\b")
RUNWAY_RE = re.compile(r"\bRWY\s+([0-9]{2}[LRC]?(?:[/\s]+[0-9]{2}[LRC]?)*)", re.IGNORECASE)


def normalize_text(value):
    return re.sub(r"\s+", " ", value or "").strip()


def is_non_graphic(item):
    text = f"{item.get('fileName', '')} {item.get('title', '')} {item.get('chartName', '')}".upper()
    stem = Path(item.get("fileName", "")).stem.upper()

    if item.get("isTabular") is True:
        return True

    if any(marker in text for marker in ("TABULAR", "OPERATING INSTRUCTIONS", "TOWING INSTRUCTIONS")):
        return True

    return bool(re.search(r"(?:^|\s)(?:T\d+|HC)$", stem))


def extract_pdf_text(file_path):
    try:
        result = subprocess.run(
            ["pdftotext", str(file_path), "-"],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore",
        )
    except (OSError, subprocess.CalledProcessError):
        return ""

    return result.stdout


def procedures_from_text(text):
    procedures = []
    seen = set()
    for name, code in NAMED_CODE_RE.findall(text):
        cleaned_name = normalize_procedure_name(name, code)
        if code not in seen:
            procedures.append({"name": cleaned_name or code, "code": code})
            seen.add(code)

    for code in CODE_RE.findall(text):
        if code not in seen:
            procedures.append({"name": code, "code": code})
            seen.add(code)

    return procedures


def normalize_procedure_name(name, code):
    cleaned = normalize_text(name).strip(" .,-;/")
    cleaned = re.sub(r"^(?:RWY\s+[0-9LRC/\s]+:?\s*)+", "", cleaned, flags=re.IGNORECASE).strip(" .,-;/")
    cleaned = re.sub(r"^(?:SID|STAR)\s+", "", cleaned, flags=re.IGNORECASE).strip(" .,-;/")

    ignored_fragments = (
        "ICAO STANDARD",
        "STANDARD INSTRUMENT",
        "INSTRUMENT ARRIVAL",
        "INSTRUMENT DEPARTURE",
        "CARTA DE",
        "VUELO POR INSTRUMENTOS",
        "AIRAC",
        "AIP",
        "COLOMBIA",
        "BOGOT",
        "ELDORADO",
        "APP:",
        "TWR:",
        "VAR/ARP",
        "ALTITUD",
    )
    if any(fragment in cleaned.upper() for fragment in ignored_fragments):
        return code

    words = cleaned.split()
    if len(words) > 6:
        return code

    return cleaned


def procedures_from_item(item):
    text = f"{item.get('title', '')} {item.get('chartName', '')} {item.get('procedureName', '')} {item.get('fileName', '')}"
    ignored = {"ICAO", "RNAV", "RNP", "STAR", "SID", "RWY", "GNSS"}
    return [code for code in dict.fromkeys(FILENAME_CODE_RE.findall(text.upper())) if code not in ignored]


def runway_from_text(text, fallback):
    match = RUNWAY_RE.search(text)
    if not match:
        return fallback
    return "RWY " + normalize_text(match.group(1).replace("/", " "))


def infer_runway_from_graphic_chart(item):
    airport = item.get("airport") or ""
    chart_type = item.get("chartType") or ""
    title = item.get("title") or ""

    if airport == "SKBO" and chart_type == "STAR" and title in {"ATAN4E", "DOPL4E"}:
        return "RWY 14L 14R 32L 32R"

    return item.get("runway")


def update_index(path):
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    chart_type = data.get("chartType", "").lower()
    if chart_type not in CHART_TYPES:
        return 0

    changed = 0
    for item in data.get("items", []):
        non_graphic = is_non_graphic(item)
        if item.get("isTabular") != non_graphic:
            item["isTabular"] = non_graphic
            changed += 1

        if non_graphic:
            continue

        pdf_path = ROOT / item.get("filePath", "")
        text = extract_pdf_text(pdf_path) if pdf_path.exists() else ""
        procedures = procedures_from_text(text)
        if not procedures:
            procedures = [{"name": code, "code": code} for code in procedures_from_item(item)]
        if procedures and item.get("procedures") != procedures:
            item["procedures"] = procedures
            changed += 1

        runway = runway_from_text(text, infer_runway_from_graphic_chart(item))
        if runway != item.get("runway"):
            item["runway"] = runway
            changed += 1

    if changed:
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return changed


def main():
    updated = []
    for path in sorted(METADATA.glob("*-*-pdf-index.json")):
        if path.name.split("-")[-3] not in CHART_TYPES:
            continue
        changes = update_index(path)
        if changes:
            updated.append((path.name, changes))

    for name, changes in updated:
        print(f"{name}: {changes}")
    print(f"updated files: {len(updated)}")


if __name__ == "__main__":
    main()
