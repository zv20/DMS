"""Check the structure of DMS's generated PDF and exported PNG without dependencies."""
import json
import re
import struct
import sys
import zlib
from pathlib import Path

pdf_path, png_path, expected_pages, result_path = sys.argv[1:]
expected_pages = int(expected_pages)
pdf = Path(pdf_path).read_bytes()
assert pdf.startswith(b"%PDF-") and pdf.rstrip().endswith(b"%%EOF"), "Invalid PDF envelope"
start = re.search(rb"startxref\s+(\d+)\s+%%EOF\s*$", pdf)
assert start, "Missing PDF cross reference"
xref = int(start.group(1))
assert pdf[xref:].startswith(b"xref\n"), "Invalid cross-reference offset"
lines = pdf[xref:].splitlines()
first, count = map(int, lines[1].split())
assert first == 0 and count == 3 + expected_pages * 3, "Unexpected PDF object count"
for obj in range(1, count):
    assert re.fullmatch(rb"\d{10} \d{5} n ", lines[obj + 2]), f"Invalid xref entry {obj}"
    offset = int(lines[obj + 2][:10])
    assert pdf[offset:].startswith(f"{obj} 0 obj\n".encode()), f"Invalid object offset {obj}"
assert re.search(rb"/Type /Pages\s+/Kids\s+\[[^]]*\]\s+/Count\s+" + str(expected_pages).encode() + rb"\b", pdf), "Incorrect page count"

png = Path(png_path).read_bytes()
assert png.startswith(b"\x89PNG\r\n\x1a\n"), "Invalid PNG signature"
position, width, height, ended = 8, None, None, False
compressed = bytearray()
while position < len(png):
    assert position + 12 <= len(png), "Truncated PNG chunk"
    length = struct.unpack_from(">I", png, position)[0]
    assert position + length + 12 <= len(png), "Truncated PNG data"
    kind = png[position + 4:position + 8]
    content = png[position + 8:position + 8 + length]
    checksum = struct.unpack_from(">I", png, position + 8 + length)[0]
    assert zlib.crc32(kind + content) == checksum, "Invalid PNG checksum"
    if kind == b"IHDR":
        width, height = struct.unpack_from(">II", content)
    elif kind == b"IDAT":
        compressed.extend(content)
    elif kind == b"IEND":
        ended = True
        position += length + 12
        break
    position += length + 12
assert ended and position == len(png) and (width, height) == (1588, 2246), "Invalid PNG size or end"
assert zlib.decompress(compressed), "PNG pixels are empty"
Path(result_path).write_text(json.dumps({"pdf_pages": expected_pages, "pdf_bytes": len(pdf), "png_width": width, "png_height": height, "png_bytes": len(png)}, indent=2), encoding="utf-8")
