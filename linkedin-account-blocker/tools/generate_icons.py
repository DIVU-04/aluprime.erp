#!/usr/bin/env python3
"""Generate simple PNG icons for the LinkedIn Account Blocker extension.

Draws a LinkedIn-blue rounded square with a white "no entry" (ban) symbol.
Uses only the Python standard library (no Pillow required).
"""
import math
import os
import struct
import zlib

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "icons")

BRAND = (10, 102, 194)      # LinkedIn blue
WHITE = (255, 255, 255)
SIZES = [16, 48, 128]


def make_icon(size):
    px = [[(0, 0, 0, 0) for _ in range(size)] for _ in range(size)]
    cx = cy = (size - 1) / 2.0
    radius = size / 2.0
    ring_outer = size * 0.42
    ring_inner = size * 0.30
    corner = size * 0.22  # rounded-square corner radius

    # slash geometry (top-left to bottom-right within the ring)
    slash_half = size * 0.055  # half-thickness of the diagonal bar

    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            dist = math.hypot(dx, dy)

            # rounded square background mask
            inside_bg = _rounded_square(x, y, size, corner)
            if not inside_bg:
                continue

            color = BRAND

            # ring
            in_ring = ring_inner <= dist <= ring_outer
            # diagonal slash: distance from line y = x (i.e. dx - dy = 0)
            slash_dist = abs(dx - dy) / math.sqrt(2)
            on_slash = slash_dist <= slash_half and dist <= ring_outer

            if in_ring or on_slash:
                color = WHITE

            px[y][x] = (color[0], color[1], color[2], 255)

    return px


def _rounded_square(x, y, size, corner):
    # treat as inside if within the square shrunk by corner, or within corner
    # circles at the four corners.
    minx, miny = 0, 0
    maxx, maxy = size - 1, size - 1
    ix = min(max(x, minx + corner), maxx - corner)
    iy = min(max(y, miny + corner), maxy - corner)
    return math.hypot(x - ix, y - iy) <= corner + 0.5


def write_png(path, pixels):
    size = len(pixels)
    raw = bytearray()
    for row in pixels:
        raw.append(0)  # filter type 0
        for (r, g, b, a) in row:
            raw += bytes((r, g, b, a))

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return c + struct.pack(">I", crc)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    with open(path, "wb") as f:
        f.write(sig)
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", idat))
        f.write(chunk(b"IEND", b""))


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for s in SIZES:
        path = os.path.join(OUT_DIR, f"icon{s}.png")
        write_png(path, make_icon(s))
        print("wrote", os.path.abspath(path))


if __name__ == "__main__":
    main()
