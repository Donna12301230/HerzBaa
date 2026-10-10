"""Generate responsive WebP variants used by index.html.

Usage: python3 tools/optimize-images.py
Source images stay untouched; output goes to assets/img/opt/.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "img"
OUT = SRC / "opt"

# name -> (source path, widths, crop-to-alpha-bbox)
JOBS = {
    "hero": ("001.png", [960, 1600, 2400], False),
    "logo": ("logo.png", [320, 640], True),
    "portrait": ("yating.png", [480, 825], False),
    "herz": ("赫滋與羊Herz.png", [480, 960], False),
}
for p in sorted((SRC / "portfolio").iterdir()):
    if p.suffix.lower() in {".png", ".jpg", ".jpeg"}:
        JOBS[p.stem] = (f"portfolio/{p.name}", [640, 1280, 1920], False)


def main():
    OUT.mkdir(exist_ok=True)
    for name, (rel, widths, crop) in JOBS.items():
        im = Image.open(SRC / rel)
        im.load()
        if crop and im.mode == "RGBA":
            im = im.crop(im.getbbox())
        keep_alpha = im.mode == "RGBA" and im.getchannel("A").getextrema()[0] < 255
        im = im.convert("RGBA" if keep_alpha else "RGB")
        for w in widths:
            if w > im.width and w != widths[0]:
                continue
            tw = min(w, im.width)
            th = round(im.height * tw / im.width)
            out = im.resize((tw, th), Image.LANCZOS)
            dest = OUT / f"{name}-{w}.webp"
            out.save(dest, "WEBP", quality=80, method=6)
            print(f"{dest.relative_to(ROOT)}  {tw}x{th}  {dest.stat().st_size // 1024}KB")

    # 社群分享圖 1200x630
    hero = Image.open(SRC / "001.png").convert("RGB")
    th = round(hero.width * 630 / 1200)
    top = (hero.height - th) // 2
    hero.crop((0, top, hero.width, top + th)).resize((1200, 630), Image.LANCZOS).save(
        OUT / "og.jpg", quality=82, optimize=True)


if __name__ == "__main__":
    main()
