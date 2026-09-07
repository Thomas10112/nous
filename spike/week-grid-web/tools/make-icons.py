"""Génère les icônes du spike sans dépendance : fond crème bleuté, cœur accent.

Encodeur PNG minimal (RGB, filtre 0) — évite d'installer Pillow.
"""
import struct, zlib, math

BG = (0xF5, 0xF9, 0xFC)        # --bg de la palette bleue
CARD = (0xE0, 0xED, 0xF8)      # --accent-soft
HEART = (0x5F, 0x97, 0xC6)     # --accent


def png(path, size, pad_ratio, bg=BG):
    """pad_ratio : marge autour du cœur (0.18 normal, 0.30 pour l'icône masquable)."""
    rows = bytearray()
    c = size / 2
    r_card = size * (0.5 - pad_ratio * 0.5)
    radius = size * 0.22
    scale = size * (0.5 - pad_ratio) * 0.78
    for y in range(size):
        rows.append(0)  # filtre « None »
        for x in range(size):
            px, py = x + 0.5, y + 0.5
            # carte arrondie centrée
            dx, dy = abs(px - c) - (r_card - radius), abs(py - c) - (r_card - radius)
            inside_card = (max(dx, 0.0) ** 2 + max(dy, 0.0) ** 2) <= radius ** 2 or (dx <= 0 and dy <= 0)
            # cœur : (x²+y²-1)³ - x²y³ <= 0
            hx = (px - c) / scale
            hy = -(py - c - size * 0.03) / scale
            inside_heart = ((hx * hx + hy * hy - 1) ** 3 - hx * hx * (hy ** 3)) <= 0
            colour = HEART if inside_heart else (CARD if inside_card else bg)
            rows.extend(colour)

    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data
                + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF))

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    out = (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr)
           + chunk(b'IDAT', zlib.compress(bytes(rows), 9)) + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(out)
    print(path, size, len(out), 'octets')


png('icons/icon-192.png', 192, 0.18)
png('icons/icon-512.png', 512, 0.18)
png('icons/icon-maskable-512.png', 512, 0.34)
png('icons/apple-touch-icon.png', 180, 0.18)
