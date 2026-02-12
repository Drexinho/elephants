#!/usr/bin/env python3
"""Převede všechny HEIC v pictures/ na JPG (stejné jméno, přípona .jpg)."""
import os
import sys

# Registrace HEIC podpory
import pillow_heif
pillow_heif.register_heif_opener()

from PIL import Image

pictures_dir = os.path.join(os.path.dirname(__file__), "pictures")
os.makedirs(pictures_dir, exist_ok=True)

heic_ext = (".heic", ".HEIC")
converted = 0
skipped = 0
errors = []

for name in sorted(os.listdir(pictures_dir)):
    base, ext = os.path.splitext(name)
    if ext not in heic_ext:
        if ext.lower() in (".jpg", ".jpeg", ".png"):
            skipped += 1
            print(f"Přeskočeno (už obrázek): {name}")
        continue
    src = os.path.join(pictures_dir, name)
    dst = os.path.join(pictures_dir, base + ".jpg")
    try:
        img = Image.open(src)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.save(dst, "JPEG", quality=90)
        print(f"OK: {name} -> {base}.jpg")
        converted += 1
    except Exception as e:
        errors.append((name, str(e)))
        print(f"CHYBA {name}: {e}", file=sys.stderr)

if errors:
    sys.exit(1)
print(f"\nPřevedeno: {converted}, přeskočeno: {skipped}")
