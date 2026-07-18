"""
Pure Python PNG Icon Generator for MeetMaxxing Chrome Extension.
Uses standard library (struct, zlib) to create valid 16x16, 48x48, 128x128 PNG images.
"""
import os
import struct
import zlib

def make_png(width, height, color_rgb):
    # PNG Header
    png_header = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr_crc = zlib.crc32(ihdr_data) & 0xffffffff
    ihdr_chunk = struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
    
    # IDAT chunk (Raw pixel data with filter byte 0 per line)
    raw_data = bytearray()
    r, g, b = color_rgb
    for y in range(height):
        raw_data.append(0) # Filter type 0 (None)
        for x in range(width):
            # Create a simple rounded rectangle or border effect
            dx = x - width / 2.0
            dy = y - height / 2.0
            if (dx * dx + dy * dy) < (width * width / 4.0):
                raw_data.extend([r, g, b])
            else:
                raw_data.extend([15, 15, 23]) # Dark background #0f0f17
                
    compressed_data = zlib.compress(bytes(raw_data), 9)
    idat_crc = zlib.crc32(b'IDAT' + compressed_data) & 0xffffffff
    idat_chunk = struct.pack('>I', len(compressed_data)) + b'IDAT' + compressed_data + struct.pack('>I', idat_crc)
    
    # IEND chunk
    iend_crc = zlib.crc32(b'IEND') & 0xffffffff
    iend_chunk = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
    
    return png_header + ihdr_chunk + idat_chunk + iend_chunk

def generate_icons():
    icon_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "icons")
    os.makedirs(icon_dir, exist_ok=True)
    
    # Violet AI color (#8b5cf6 -> 139, 92, 246)
    color = (139, 92, 246)
    
    for size in [16, 48, 128]:
        png_data = make_png(size, size, color)
        filepath = os.path.join(icon_dir, f"icon{size}.png")
        with open(filepath, "wb") as f:
            f.write(png_data)
        print(f"Created {filepath} ({len(png_data)} bytes)")

if __name__ == "__main__":
    generate_icons()
