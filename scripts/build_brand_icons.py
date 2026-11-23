#!/usr/bin/env python3
"""Build accurate launcher icons from Blazing Flames Studio's existing channel artwork.

This script does not fabricate a new logo. It crops the exact
assets/channel-moonlit.webp artwork and writes PNG assets suitable
for installed web apps, with a maskable safe-area variant.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "channel-moonlit.webp"
OUT = ROOT / "icons"

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with Image.open(SOURCE) as original:
        art = original.convert("RGB")
    width, height = art.size
    side = min(width, height)
    crop = art.crop(((width - side)//2, (height - side)//2,
                     (width + side)//2, (height + side)//2))

    for size in (180, 192, 512):
        final = crop.resize((size,size), Image.Resampling.LANCZOS)
        final.save(OUT / f"brand-{size}.png", "PNG", optimize=True)

    size=512
    pad=(size-round(size*0.76))//2
    inside=size-2*pad
    navy=Image.new("RGB",(size,size),"#0b1432")
    backdrop=crop.resize((size,size), Image.Resampling.LANCZOS)
    backdrop=backdrop.filter(ImageFilter.GaussianBlur(20))
    navy=Image.blend(backdrop,navy,0.72)
    foreground=crop.resize((inside,inside), Image.Resampling.LANCZOS)
    mask=Image.new("L",(inside,inside))
    draw=ImageDraw.Draw(mask)
    draw.rounded_rectangle((0,0,inside-1,inside-1),
                           radius=int(inside*0.13), fill=255)
    navy.paste(foreground,(pad,pad),mask)
    navy.save(OUT/"brand-512-maskable.png","PNG",optimize=True)

    for name in ["brand-180.png","brand-192.png","brand-512.png","brand-512-maskable.png"]:
        path=OUT/name
        print(f"{path.relative_to(ROOT)}: {path.stat().st_size:,} bytes")

if __name__=="__main__":
    main()
