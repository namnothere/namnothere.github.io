from __future__ import annotations

import csv
import sys
from html import escape
from pathlib import Path
from typing import List


def is_likely_image_header(header: str) -> bool:
    h = header.lower()
    return any(k in h for k in ("hình", "hinh", "image", "img"))


def is_likely_image_url(value: str) -> bool:
    v = value.lower()
    return v.startswith("http") and any(v.endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".webp"))


def build_table_html(headers: List[str], rows: List[List[str]]) -> str:
    # Determine which columns are image columns based on header heuristic
    image_cols = [is_likely_image_header(h or "") for h in headers]

    parts: List[str] = []
    parts.append("<table aria-label=\"CSV table\">")
    parts.append("  <thead>")
    parts.append("    <tr>")
    for h in headers:
        parts.append(f"      <th>{escape(h)}</th>")
    parts.append("    </tr>")
    parts.append("  </thead>")
    parts.append("  <tbody>")

    for r in rows:
        parts.append("    <tr>")
        for idx, cell in enumerate(r):
            value = cell or ""
            if image_cols[idx] and is_likely_image_url(value):
                parts.append(
                    "      <td class=\"img-cell\">"
                    f"<img src=\"{escape(value)}\" alt=\"{escape(headers[idx] or 'image')}\" loading=\"lazy\" decoding=\"async\" />"
                    "</td>"
                )
            elif value.startswith("http"):
                parts.append(
                    "      <td>"
                    f"<a class=\"link\" href=\"{escape(value)}\" target=\"_blank\" rel=\"noopener noreferrer\">{escape(value)}</a>"
                    "</td>"
                )
            else:
                parts.append(f"      <td>{escape(value)}</td>")
        parts.append("    </tr>")

    parts.append("  </tbody>")
    parts.append("</table>")

    return "\n".join(parts)


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    csv_path = base_dir / "table.csv"
    out_path = base_dir / "table.html"

    if len(sys.argv) > 1:
        csv_path = Path(sys.argv[1]).resolve()
    if len(sys.argv) > 2:
        out_path = Path(sys.argv[2]).resolve()

    if not csv_path.exists():
        raise FileNotFoundError(f"CSV not found: {csv_path}")

    with csv_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        data = list(reader)

    if not data:
        raise ValueError("CSV is empty")

    headers = data[0]
    rows = data[1:]

    # Normalize row lengths to header length
    cols = len(headers)
    norm_rows = [row[:cols] + [""] * max(0, cols - len(row)) for row in rows]

    html = build_table_html(headers, norm_rows)
    out_path.write_text(html, encoding="utf-8")
    print(f"Wrote: {out_path}")


if __name__ == "__main__":
    main()


