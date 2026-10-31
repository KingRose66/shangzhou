#!/usr/bin/env python3
"""Build two georeferenced, self-hosted campaign-map textures.

Source global imagery ships with the open-source basemap-data package:
- NASA Earth Observatory Blue Marble Next Generation (bmng.jpg)
- Tom Patterson public-domain World Relief / shaded relief (shadedrelief.jpg)

The outputs are Web Mercator reprojected and share a declared bounding box.
This is present-day physical geography, not a reconstructed Shang-era map.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageEnhance
import mpl_toolkits.basemap_data as basemap_data

SOURCE = Path(list(basemap_data.__path__)[0])
OUT = Path(__file__).resolve().parent.parent / "assets"
OUT.mkdir(parents=True, exist_ok=True)
WEST, EAST, SOUTH, NORTH = 100.0, 121.0, 26.0, 41.5
WIDTH, HEIGHT = 1800, 1600

def merc(lat):
    rad = np.radians(lat)
    return np.log(np.tan(np.pi / 4 + rad / 2))

mercator_rows = merc(NORTH) + (merc(SOUTH) - merc(NORTH)) * (np.arange(HEIGHT) + .5) / HEIGHT
latitude = np.degrees(2 * np.arctan(np.exp(mercator_rows)) - np.pi / 2)
longitude = WEST + (EAST - WEST) * (np.arange(WIDTH) + .5) / WIDTH

def render(name, source, contrast, saturation):
    image = Image.open(SOURCE / source).convert("RGB")
    full_w, full_h = image.size
    x1 = int((WEST + 180) / 360 * full_w) - 3
    x2 = int((EAST + 180) / 360 * full_w) + 4
    y1 = int((90 - NORTH) / 180 * full_h) - 3
    y2 = int((90 - SOUTH) / 180 * full_h) + 4
    cropped = np.asarray(image.crop((x1, y1, x2, y2)))
    xs = (longitude + 180) / 360 * full_w - x1
    ys = (90 - latitude) / 180 * full_h - y1
    left = np.clip(np.floor(xs).astype(int), 0, cropped.shape[1] - 2)
    upper = np.clip(np.floor(ys).astype(int), 0, cropped.shape[0] - 2)
    fx = (xs - left).astype(np.float32)
    fy = (ys - upper).astype(np.float32)
    result = np.empty((HEIGHT, WIDTH, 3), dtype=np.uint8)
    for row in range(HEIGHT):
        y = upper[row]
        a = cropped[y, left].astype("float32") * (1 - fx[:, None])
        b = cropped[y, left + 1].astype("float32") * fx[:, None]
        c = cropped[y + 1, left].astype("float32") * (1 - fx[:, None])
        d = cropped[y + 1, left + 1].astype("float32") * fx[:, None]
        result[row] = np.clip((a + b) * (1 - fy[row]) + (c + d) * fy[row], 0, 255).astype("uint8")
    output = Image.fromarray(result, "RGB")
    output = ImageEnhance.Contrast(output).enhance(contrast)
    output = ImageEnhance.Color(output).enhance(saturation)
    target = OUT / (name + ".webp")
    output.save(target, "WEBP", quality=91, method=6)
    print(f"{target}: {target.stat().st_size:,} bytes, {WIDTH}×{HEIGHT}")

render("china-satellite", "bmng.jpg", 1.07, .92)
render("china-relief", "shadedrelief.jpg", 1.16, .86)
