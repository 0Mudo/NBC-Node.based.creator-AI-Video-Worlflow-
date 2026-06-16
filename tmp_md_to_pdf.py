from __future__ import annotations

import sys
import subprocess
from pathlib import Path
from urllib.parse import quote

import markdown

EDGE_PATH = Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")

CSS = """
@page {
  size: A4;
  margin: 18mm 16mm 18mm 16mm;
}
html, body {
  font-family: "Microsoft YaHei", "PingFang SC", "SimSun", sans-serif;
  color: #111;
  line-height: 1.65;
  font-size: 12px;
}
body {
  margin: 0;
  padding: 0;
}
h1, h2, h3, h4, h5, h6 {
  page-break-after: avoid;
  break-after: avoid-page;
  line-height: 1.35;
  margin-top: 1.2em;
  margin-bottom: 0.6em;
}
h1 { font-size: 24px; }
h2 { font-size: 19px; }
h3 { font-size: 16px; }
h4 { font-size: 14px; }
p, li, blockquote, table, pre {
  break-inside: avoid-page;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 11px;
}
th, td {
  border: 1px solid #666;
  padding: 6px 8px;
  vertical-align: top;
}
th {
  background: #f2f2f2;
  font-weight: 700;
}
code {
  font-family: "Cascadia Code", "Consolas", monospace;
  font-size: 10.5px;
  background: #f5f5f5;
  padding: 1px 4px;
  border-radius: 3px;
}
pre {
  background: #f7f7f7;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 10px 12px;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  word-break: break-word;
}
pre code {
  background: transparent;
  padding: 0;
}
blockquote {
  margin: 12px 0;
  padding: 8px 12px;
  border-left: 4px solid #999;
  background: #fafafa;
}
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 14px auto;
  page-break-inside: avoid;
}
hr {
  border: none;
  border-top: 1px solid #bbb;
  margin: 20px 0;
}
ul, ol {
  padding-left: 1.6em;
}
"""


def build_html(md_path: Path) -> str:
  source = md_path.read_text(encoding="utf-8")
  body = markdown.markdown(
      source,
      extensions=[
          "extra",
          "tables",
          "fenced_code",
          "toc",
          "sane_lists",
          "nl2br",
      ],
      output_format="html5",
  )
  title = md_path.stem
  return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <style>{CSS}</style>
</head>
<body>
{body}
</body>
</html>
"""


def to_file_uri(path: Path) -> str:
  return "file:///" + quote(str(path.resolve()).replace("\\", "/"), safe="/:()!~*'._-")


def export_pdf(md_path: Path) -> Path:
  md_path = md_path.resolve()
  html_path = md_path.with_suffix(".print.html")
  pdf_path = md_path.with_suffix(".pdf")
  html_path.write_text(build_html(md_path), encoding="utf-8")
  try:
    print(f"START {md_path}", flush=True)
    cmd = [
        str(EDGE_PATH),
        "--headless",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--allow-file-access-from-files",
        "--print-to-pdf-no-header",
        f"--print-to-pdf={pdf_path}",
        to_file_uri(html_path),
    ]
    subprocess.run(cmd, check=True)
    if not pdf_path.exists():
      raise RuntimeError(f"PDF 未生成成功: {pdf_path}")
    print(f"DONE {pdf_path}", flush=True)
    return pdf_path
  finally:
    if html_path.exists():
      html_path.unlink()


def main(argv: list[str]) -> int:
  if not EDGE_PATH.exists():
    raise SystemExit(f"Edge not found: {EDGE_PATH}")
  if len(argv) < 2:
    raise SystemExit("Usage: python tmp_md_to_pdf.py <file1.md> <file2.md> ...")
  for raw in argv[1:]:
    md_path = Path(raw)
    pdf_path = export_pdf(md_path)
    print(pdf_path)
  return 0


if __name__ == "__main__":
  raise SystemExit(main(sys.argv))
