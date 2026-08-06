#!/usr/bin/env python3
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIX = (ROOT / "gas" / "getLatestReservation.fix.gs").read_text(encoding="utf-8")
FIX = re.sub(r"^/\*\*[\s\S]*?\*/\n\n", "", FIX)

source = sys.stdin.read()
start = source.find("function getLatestReservation_(paramsOrUserId)")
end = source.find("function updateReservation_(params)")
if start < 0 or end < 0 or end <= start:
    raise SystemExit("Could not locate getLatestReservation_ block")

patched = source[:start] + FIX.rstrip() + "\n\n" + source[end:]

out = ROOT / "gas" / "ProductionCode.full.gs"
out.write_text(patched, encoding="utf-8")
print(f"Wrote {out} ({len(patched)} bytes)")
