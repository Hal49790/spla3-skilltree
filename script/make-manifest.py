from pathlib import Path
import json
import sys

folder = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("web/assets/skills")
out = Path("web/skills.json")

files = sorted(
    [p for p in folder.iterdir() if p.is_file() and p.suffix.lower() == ".png"],
    key=lambda p: p.name.casefold()
)[:181]

manifest = [{"filename": p.name, "name": p.stem} for p in files]
out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"{len(files)}個のPNGを登録しました: {out}")
