"""Generate the standalone demo icon assets. Requires Pillow only when regenerating."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent
svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" rx="104" fill="#102d60"/>
<path fill="#ffffff" d="M102 379h308v30H102zM118 253h80v126h-80zM216 174h80v205h-80z"/>
<path fill="#ff8616" d="M314 103h80v276h-80z"/>
</svg>'''
(root / 'icon.svg').write_text(svg + '\n', encoding='utf-8')
for size in (192, 512):
    scale = size / 512
    image = Image.new('RGB', (size, size), '#102d60')
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=int(104 * scale), fill='#102d60')
    for box, color in [((102, 379, 410, 409), '#ffffff'), ((118, 253, 198, 379), '#ffffff'),
                       ((216, 174, 296, 379), '#ffffff'), ((314, 103, 394, 379), '#ff8616')]:
        draw.rectangle(tuple(int(v * scale) for v in box), fill=color)
    image.save(root / f'icon-{size}.png')
