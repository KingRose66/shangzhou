#!/usr/bin/env python3
"""Build a self-hosted, georeferenced high-detail campaign relief texture.

Mapzen Terrarium terrain is served as the AWS open elevation dataset:
https://registry.opendata.aws/terrain-tiles/
https://github.com/tilezen/joerd/blob/master/docs/formats.md

The source describes today's terrain, NOT a reconstruction of Shang-era river
courses, coastlines, vegetation or settlements. Zoom 8 is selected because its
raster density is appropriate for a regional strategic map. No map requests
are made from the player's browser.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO
from pathlib import Path
import argparse
import json
import math
import os
import time
import urllib.request
import zipfile

import numpy as np
from PIL import Image, ImageDraw

WEST, EAST, SOUTH, NORTH = 100.0, 121.0, 26.0, 41.5
WIDTH, HEIGHT = 3600, 3200
ZOOM = 8
TILE = 256
BASE = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium"
RIVERS = "https://naturalearth.s3.amazonaws.com/10m_physical/ne_10m_rivers_lake_centerlines.zip"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "china-elevation.webp"
METADATA = ROOT / "assets" / "china-elevation-source.json"

def mercator_y(lat):
    lat = max(-85.0, min(85.0, lat))
    return (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2

def tile_xy(lon, lat, zoom):
    n = 2 ** zoom
    return (lon + 180) / 360 * n, mercator_y(lat) * n

def decode_terrarium(im):
    rgb = np.asarray(im.convert("RGB"), dtype=np.float32)
    if rgb.shape[:2] != (TILE, TILE):
        raise ValueError("Terrarium tile size mismatch: " + str(rgb.shape))
    return rgb[:, :, 0] * 256 + rgb[:, :, 1] + rgb[:, :, 2] / 256 - 32768

def download(url, retries=3):
    for attempt in range(retries):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "shangzhou-map-builder/1.0"})
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.read()
        except Exception:
            if attempt + 1 == retries:
                raise
            time.sleep(1.5 * (attempt + 1))

def fetch_tile(tile):
    x, y = tile
    data = download(f"{BASE}/{ZOOM}/{x}/{y}.png")
    return x, y, decode_terrarium(Image.open(BytesIO(data)))

def elevation_mosaic():
    left, top = tile_xy(WEST, NORTH, ZOOM)
    right, bottom = tile_xy(EAST, SOUTH, ZOOM)
    x0, y0 = math.floor(left), math.floor(top)
    x1, y1 = math.ceil(right), math.ceil(bottom)
    tiles = [(x, y) for y in range(y0, y1) for x in range(x0, x1)]
    print(f"Downloading {len(tiles)} Mapzen DEM tiles at zoom {ZOOM}", flush=True)
    grid = np.zeros(((y1 - y0) * TILE, (x1 - x0) * TILE), dtype=np.float32)
    with ThreadPoolExecutor(max_workers=8) as pool:
        jobs = [pool.submit(fetch_tile, tile) for tile in tiles]
        for count, job in enumerate(as_completed(jobs), start=1):
            x, y, arr = job.result()
            grid[(y-y0)*TILE:(y-y0+1)*TILE, (x-x0)*TILE:(x-x0+1)*TILE] = arr
            if count % 40 == 0 or count == len(tiles):
                print(f"  {count}/{len(tiles)} terrain tiles", flush=True)
    frame = (left*TILE-x0*TILE, top*TILE-y0*TILE,
             right*TILE-x0*TILE, bottom*TILE-y0*TILE)
    image = Image.fromarray(grid, mode="F")
    return np.asarray(image.resize((WIDTH, HEIGHT), Image.Resampling.BILINEAR, box=frame), dtype=np.float32)

def shaded_relief(height):
    levels = [-500, 0, 80, 200, 430, 800, 1300, 1900, 2600, 3500, 6000]
    palette = [
        (30, 81, 104), (51, 111, 133), (112, 145, 112),
        (151, 159, 109), (166, 157, 105), (140, 135, 93),
        (136, 125, 91), (133, 116, 96), (145, 137, 123),
        (193, 190, 179), (230, 228, 218)
    ]
    color = np.stack([
        np.interp(height, levels, [row[channel] for row in palette])
        for channel in range(3)
    ], axis=2).astype(np.float32)
    # Shaded relief from true elevation gradients, compensated for local
    # ground resolution of Web Mercator rather than arbitrary raster darkness.
    world_m = 40075016.686
    nx = world_m * (EAST-WEST) / 360 / WIDTH
    ny = world_m * (mercator_y(SOUTH)-mercator_y(NORTH)) / HEIGHT
    y_fractions = (np.arange(HEIGHT, dtype=np.float32) + .5) / HEIGHT
    merc_y = mercator_y(NORTH) + (mercator_y(SOUTH)-mercator_y(NORTH)) * y_fractions
    latitude = np.arctan(np.sinh(math.pi*(1-2*merc_y)))
    scale = np.cos(latitude).astype(np.float32)[:, None]
    gx = np.gradient(height, axis=1) / (nx * scale)
    gy = np.gradient(height, axis=0) / (ny * scale)
    exaggeration = 3.8
    dx, dy = exaggeration * gx, exaggeration * gy
    light = (0.62 + 0.52*dx + 0.60*dy) / np.sqrt(1 + dx*dx + dy*dy)
    shade = np.clip(0.55 + 0.70 * light, .52, 1.21)
    color *= shade[:, :, None]
    return Image.fromarray(np.clip(color, 0, 255).astype(np.uint8), "RGB")

def draw_rivers(image):
    """Add real modern river vectors; rivers are not claimed as Shang-era alignments."""
    try:
        import shapefile
        raw = download(RIVERS, retries=2)
        with zipfile.ZipFile(BytesIO(raw)) as z:
            shp = next(s for s in z.namelist() if s.endswith(".shp"))
            stem = shp[:-4]
            reader = shapefile.Reader(
                shp=BytesIO(z.read(shp)),
                shx=BytesIO(z.read(stem+".shx")),
                dbf=BytesIO(z.read(stem+".dbf")))
            ink = Image.new("RGBA", image.size)
            painter = ImageDraw.Draw(ink)
            drawn = 0
            for record in reader.iterShapeRecords():
                shape = record.shape
                bx = shape.bbox
                if bx[2] < WEST or bx[0] > EAST or bx[3] < SOUTH or bx[1] > NORTH:
                    continue
                meta = record.record.as_dict()
                rank = int(meta.get("scalerank", 9) or 9)
                if rank > 7:
                    continue
                width = 5 if rank <= 2 else 4 if rank <= 4 else 2
                starts = list(shape.parts) + [len(shape.points)]
                for a, b in zip(starts, starts[1:]):
                    pts = []
                    for lon, lat in shape.points[a:b]:
                        if abs(lon) > 180 or abs(lat) > 90:
                            continue
                        x = (lon-WEST) / (EAST-WEST) * WIDTH
                        y = (mercator_y(lat)-mercator_y(NORTH)) / (
                            mercator_y(SOUTH)-mercator_y(NORTH)) * HEIGHT
                        pts.append((x, y))
                    if len(pts) > 1:
                        painter.line(pts, fill=(30, 95, 117, 215), width=width+2, joint="curve")
                        painter.line(pts, fill=(95, 170, 189, 225), width=width, joint="curve")
                        drawn += 1
            print(f"Rendered {drawn} real modern river segments", flush=True)
            return Image.alpha_composite(image.convert("RGBA"), ink).convert("RGB")
    except Exception as err:
        print(f"River overlay unavailable; retaining reliable elevation texture: {err}", flush=True)
        return image

def self_test():
    x, y = tile_xy(110, 35, ZOOM)
    assert x > 0 and y > 0
    assert mercator_y(NORTH) < mercator_y(SOUTH)
    sample = np.zeros((TILE, TILE, 3), np.uint8)
    sample[:, :, 0] = 128
    assert np.max(np.abs(decode_terrarium(Image.fromarray(sample)) - 0)) < .01
    sample[:, :, 1] = 100
    assert np.max(np.abs(decode_terrarium(Image.fromarray(sample)) - 100)) < .01
    print("Terrarium decoder and map projections: OK")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    if OUT.exists() and OUT.stat().st_size > 250_000 and not args.force:
        print(f"Reusing existing georeferenced DEM texture: {OUT}")
        return
    height = elevation_mosaic()
    if not np.isfinite(height).all():
        raise ValueError("DEM includes invalid elevation values")
    print(f"Elevation range: {height.min():.0f}–{height.max():.0f} m", flush=True)
    result = draw_rivers(shaded_relief(height))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    result.save(OUT, "WEBP", quality=89, method=5)
    METADATA.write_text(json.dumps({
        "source": "Mapzen Terrain Tiles / AWS elevation-tiles-prod Terrarium",
        "rivers": "Natural Earth 1:10m (when available)",
        "projection": "EPSG:3857", "zoom": ZOOM,
        "bounds": [WEST, SOUTH, EAST, NORTH], "width": WIDTH, "height": HEIGHT,
        "note": "Present-day physical geography, not Shang-era hydrography"
    }, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(f"{OUT}: {OUT.stat().st_size:,} bytes ({WIDTH}x{HEIGHT})", flush=True)

if __name__ == "__main__":
    main()
