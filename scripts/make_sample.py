#!/usr/bin/env python3
"""Generate Layer Tower, an original MIT-licensed demo mesh. Units: millimetres."""
import math
from pathlib import Path
import struct

OUTPUT = Path(__file__).resolve().parent.parent / 'examples/Layer Tower.stl'

def sample_bytes():
    # Rotational profile from a broad, flat base to a small flat top.
    profile = [(16, 0), (16, 3), (12, 3), (12, 9), (9, 9), (9, 15), (6, 15), (6, 21)]
    segments = 32
    rings = [[(radius * math.cos(i * math.tau / segments), radius * math.sin(i * math.tau / segments), z)
              for i in range(segments)] for radius, z in profile]
    triangles = []
    for lower, upper in zip(rings, rings[1:]):
        for i in range(segments):
            j = (i + 1) % segments
            triangles.extend([(lower[i], lower[j], upper[j]), (lower[i], upper[j], upper[i])])
    for i in range(segments):
        j = (i + 1) % segments
        triangles.append(((0, 0, 0), rings[0][j], rings[0][i]))
        triangles.append(((0, 0, 21), rings[-1][i], rings[-1][j]))
    data = bytearray(b'LayerLibrary original Layer Tower | MIT | millimetres'.ljust(80, b'\0'))
    data.extend(struct.pack('<I', len(triangles)))
    for a, b, c in triangles:
        u, v = [b[k]-a[k] for k in range(3)], [c[k]-a[k] for k in range(3)]
        normal = (u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0])
        length = math.sqrt(sum(n*n for n in normal))
        data.extend(struct.pack('<12fH', *(n/length for n in normal), *a, *b, *c, 0))
    return bytes(data)

if __name__ == '__main__':
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_bytes(sample_bytes())
    print(f'Generated {OUTPUT.name}: {OUTPUT.stat().st_size:,} bytes')
