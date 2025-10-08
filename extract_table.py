import sys
from pathlib import Path
from typing import List

import pandas as pd
from bs4 import BeautifulSoup


def find_first_table(html_text: str) -> List[List[str]]:
    """
    Parse HTML and return the first table as a 2D list (rows of cells as strings).
    Header cells (th) are used as the first row when present.
    """
    soup = BeautifulSoup(html_text, "html.parser")

    table = soup.find("table")
    if table is None:
        raise ValueError("No <table> found in HTML")

    rows: List[List[str]] = []

    # Detect header row(s)
    thead = table.find("thead")
    if thead:
        for tr in thead.find_all("tr"):
            cells = [cell.get_text(strip=True) for cell in tr.find_all(["th", "td"])]
            if cells:
                rows.append(cells)

    # Body rows
    tbody = table.find("tbody")
    tr_iterable = tbody.find_all("tr") if tbody else table.find_all("tr")
    for tr in tr_iterable:
        cells = [cell.get_text(strip=True) for cell in tr.find_all(["td", "th"])]
        if cells:
            rows.append(cells)

    if not rows:
        raise ValueError("Table has no rows")

    return rows


def rows_to_dataframe(rows: List[List[str]]) -> pd.DataFrame:
    """
    Convert 2D list into a DataFrame, using the first row as header if it
    looks like a header (contains any non-empty string and all rows have
    compatible lengths). If lengths differ, we will pad with empty strings.
    """
    max_len = max(len(r) for r in rows)
    normalized = [r + [""] * (max_len - len(r)) for r in rows]

    header = normalized[0]
    data = normalized[1:] if len(normalized) > 1 else []

    # If header row is entirely empty, synthesize column names
    if not any(h.strip() for h in header):
        header = [f"col_{i+1}" for i in range(max_len)]
        data = normalized

    return pd.DataFrame(data, columns=header)


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    html_path = base_dir / "index.html"
    output_csv = base_dir / "table.csv"

    if len(sys.argv) > 1:
        html_path = Path(sys.argv[1]).resolve()
    if len(sys.argv) > 2:
        output_csv = Path(sys.argv[2]).resolve()

    if not html_path.exists():
        raise FileNotFoundError(f"HTML file not found: {html_path}")

    html_text = html_path.read_text(encoding="utf-8", errors="ignore")

    rows = find_first_table(html_text)
    df = rows_to_dataframe(rows)
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_csv, index=False)
    print(f"Saved CSV: {output_csv}")


if __name__ == "__main__":
    main()


