"""Inspect the synthetic Playwright print artifact; requires bundled PDF runtime."""

import json
import subprocess
import sys
from pathlib import Path

import pdfplumber
from PIL import Image, ImageDraw, ImageOps
from pypdf import PdfReader


pdf = Path(sys.argv[1]).resolve()
poppler = Path(sys.argv[2]).resolve()
target = pdf.parent / "pdf-pages"
target.mkdir(parents=True, exist_ok=True)
reader = PdfReader(pdf)
texts = [page.extract_text() or "" for page in reader.pages]
text = "\n".join(texts)
required = ["Synthetic buyer example", "16 GB", "8.00 GB", "Inspection findings", "What this report means", "Device profile", "Keyboard", "Display"]
for expected in required:
    assert expected in text, f"Missing printed content: {expected}"
assert "Export JSON" not in text
assert "Inspect another device" not in text
assert len(reader.pages) >= 2, "Expected a genuinely paginated full inspection"

page_records = []
with pdfplumber.open(pdf) as document:
    for index, page in enumerate(document.pages):
        words = page.extract_words()
        assert words, f"Unexpected blank page {index + 1}"
        outside = [word["text"] for word in words if word["x0"] < -0.5 or word["x1"] > page.width + 0.5 or word["top"] < -0.5 or word["bottom"] > page.height + 0.5]
        assert not outside, f"Text outside page {index + 1}: {outside}"
        page_records.append({"page": index + 1, "widthPoints": page.width, "heightPoints": page.height, "words": len(words), "topPoints": round(min(word["top"] for word in words), 2), "bottomPoints": round(max(word["bottom"] for word in words), 2), "firstWords": " ".join(word["text"] for word in words[:18]), "lastWords": " ".join(word["text"] for word in words[-18:])})

subprocess.run([str(poppler), "-r", "110", "-png", str(pdf), str(target / "page")], check=True)
images = []
for file in sorted(target.glob("page-*.png")):
    with Image.open(file) as image:
        thumbnail = image.convert("RGB")
        thumbnail.thumbnail((612, 792))
        tile = Image.new("RGB", (636, 824), "#dce1df")
        tile.paste(thumbnail, ((636 - thumbnail.width) // 2, 23))
        ImageDraw.Draw(tile).text((12, 5), file.name, fill="#132b29")
        images.append(tile)
columns = min(3, len(images))
rows = (len(images) + columns - 1) // columns
sheet = Image.new("RGB", (columns * 636, rows * 824), "white")
for index, image in enumerate(images):
    sheet.paste(ImageOps.expand(image, border=1, fill="white"), ((index % columns) * 636, (index // columns) * 824))
sheet.save(target / "contact-sheet.png")
result = {"artifact": pdf.name, "scope": "Synthetic Chromium page.pdf software output, not an operating-system print-dialog or physical print test.", "pages": len(reader.pages), "requiredContentPresent": required, "printControlsAbsent": True, "noBlankPages": True, "textWithinPageBounds": True, "pageRecords": page_records, "visualReview": "Render generated; visual inspection must be recorded separately."}
(pdf.parent / "pdf-inspection.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
print(json.dumps(result, indent=2))
