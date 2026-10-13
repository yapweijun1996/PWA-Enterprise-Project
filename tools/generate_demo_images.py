"""Generate bundled fictional evidence PNGs. Requires Pillow only when regenerating."""
import base64
from io import BytesIO
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
WIDTH, HEIGHT = 480, 320
FONT = ImageFont.load_default()
PROJECTS = [
    ("harbor", "Harbor Exchange", "#276f91", [
        "Podium foundation layout", "Level 4 concrete frame", "Slab reinforcement inspection", "Formwork delivery to loading bay",
        "Stormwater trench alignment", "Core wall survey checks", "Facade panel delivery", "East elevation progress",
    ]),
    ("cedar", "Cedar Station", "#986b39", [
        "Station foundation preparation", "Concourse concrete framing", "Platform reinforcement inspection", "Station formwork delivery",
        "Service corridor drainage", "Platform level survey checks", "Precast component delivery", "Station frontage progress",
    ]),
    ("willow", "Willow Medical Campus", "#457f72", [
        "Clinical block foundation", "Ward block concrete frame", "Treatment room inspection", "Medical wing steel delivery",
        "Campus drainage installation", "Plant room survey checks", "Service equipment delivery", "Outpatient elevation progress",
    ]),
    ("riverside", "Riverside Logistics Park", "#756594", [
        "Warehouse footing layout", "Loading bay structural frame", "Dock slab inspection", "Warehouse steel delivery",
        "Yard drainage alignment", "Warehouse grid survey", "Dock equipment delivery", "Warehouse frontage progress",
    ]),
    ("elm", "Elm Residences", "#846348", [
        "Residential foundation layout", "Apartment concrete frame", "Balcony reinforcement check", "Residential formwork delivery",
        "Courtyard drainage alignment", "Apartment floor survey", "Window package delivery", "Residential elevation progress",
    ]),
    ("meridian", "Meridian Roadworks", "#536b8f", [
        "Road base preparation", "Bridge abutment frame", "Pavement inspection points", "Aggregate delivery to site",
        "Roadside drainage trench", "Road alignment survey", "Barrier unit delivery", "Completed road section progress",
    ]),
]
KINDS = ["progress", "progress", "inspection", "delivery", "progress", "inspection", "delivery", "progress"]
LOCATIONS = ["Zone A foundation grid", "Zone B structural bay", "Zone C inspection area", "Zone D delivery bay", "Zone E service trench", "Zone F survey grid", "Zone G material store", "Zone H frontage"]


def draw_scene(draw, scene, project_index, accent):
    """Draw eight recognizable, project-varied construction illustrations."""
    offset = project_index * 3
    draw.rectangle((0, 66, WIDTH, 258), fill="#dcebf0")
    draw.rectangle((0, 218, WIDTH, 258), fill="#e0d5bd")
    draw.ellipse((391 - offset, 81, 420 - offset, 110), fill="#f1ce67")
    if scene == 0:
        for row in range(3):
            for column in range(4):
                x, y = 64 + column * 83 + offset, 117 + row * 35
                draw.rectangle((x, y, x + 48, y + 23), fill="#a1aeb6", outline=accent, width=2)
                draw.line((x + 24, y - 5, x + 24, y + 28), fill="#ffffff", width=2)
        draw.text((30, 233), "FOUNDATION GRID / FICTIONAL DIMENSIONS", fill="#25394b", font=FONT)
    elif scene == 1:
        floors = 3 + project_index % 2
        for floor in range(floors):
            y = 212 - floor * 30
            draw.rectangle((83, y, 344 + offset, y + 8), fill=accent)
        for x in (88, 165, 243, 333 + offset):
            draw.rectangle((x, 114 - (floors - 3) * 28, x + 8, 219), fill="#8498a6")
        draw.line((373, 99, 373, 219), fill="#c78332", width=5)
        draw.line((287, 100, 425, 100), fill="#c78332", width=5)
        draw.line((315 + offset, 103, 315 + offset, 149), fill="#25394b", width=2)
    elif scene == 2:
        draw.rectangle((52, 108, 307, 226), fill="#c6cdd1", outline=accent, width=3)
        for x in range(66, 305, 22):
            draw.line((x, 116, x, 215), fill=accent, width=2)
        for y in range(124, 218, 19):
            draw.line((61, y, 299, y), fill=accent, width=2)
        draw.rectangle((335, 115, 430, 219), fill="#ffffff", outline="#25394b", width=2)
        draw.text((345, 124), "DEMO CHECK", fill="#25394b", font=FONT)
        for row in range(4):
            y = 149 + row * 15
            draw.rectangle((346, y, 354, y + 8), outline=accent)
            draw.line((365, y + 4, 414 - row * 5, y + 4), fill=accent, width=2)
    elif scene == 3:
        draw.rectangle((72, 132, 298, 203), fill=accent, outline="#25394b", width=2)
        draw.rectangle((299, 158, 372, 203), fill="#d48f44", outline="#25394b", width=2)
        draw.rectangle((313, 165, 356, 184), fill="#dcebf0")
        for x in (119, 264, 340):
            draw.ellipse((x - 16, 193, x + 16, 225), fill="#25394b")
            draw.ellipse((x - 7, 202, x + 7, 216), fill="#ffffff")
        draw.text((91, 158), "DEMO MATERIAL DELIVERY", fill="#ffffff", font=FONT)
        draw.text((92, 177), "LOT " + str(project_index + 1) + " / NO REAL RECEIPT", fill="#ffffff", font=FONT)
    elif scene == 4:
        draw.polygon([(53, 142), (393, 119), (419, 201), (80, 225)], fill="#9a8265", outline=accent)
        draw.line((83, 173, 388, 152), fill="#536471", width=19)
        for x in range(102, 386, 51):
            y = 173 - (x - 83) // 15
            draw.ellipse((x - 9, y - 10, x + 9, y + 10), outline="#c4cdd2", width=3)
        draw.text((37, 237), "SERVICE TRENCH / ILLUSTRATIVE ALIGNMENT", fill="#25394b", font=FONT)
    elif scene == 5:
        for x in range(49, 442, 39):
            draw.line((x, 110, x, 226), fill="#afc7c9")
        for y in range(110, 227, 29):
            draw.line((49, y, 441, y), fill="#afc7c9")
        points = [(75 + offset, 194), (161, 135), (254, 178 - offset), (394, 129)]
        draw.line(points, fill=accent, width=4)
        for index, (x, y) in enumerate(points):
            draw.ellipse((x - 7, y - 7, x + 7, y + 7), fill=accent, outline="#ffffff", width=2)
            draw.text((x + 10, y + 4), "P" + str(index + 1), fill="#25394b", font=FONT)
        draw.text((132, 239), "DEMO SURVEY / NOT TO SCALE", fill="#25394b", font=FONT)
    elif scene == 6:
        for stack in range(3):
            x = 62 + stack * 124
            height = 2 + (project_index + stack) % 3
            for layer in range(height):
                y = 201 - layer * 23
                draw.rectangle((x, y, x + 97, y + 21), fill=accent, outline="#ffffff", width=2)
                draw.line((x + 31, y, x + 31, y + 21), fill="#ffffff", width=2)
            draw.rectangle((x - 3, 225, x + 100, 233), fill="#997147")
            draw.text((x + 4, 205), "DEMO LOT " + str(stack + 1), fill="#ffffff", font=FONT)
    elif project_index == 5:
        draw.polygon([(172, 109), (307, 109), (424, 252), (50, 252)], fill="#697783")
        for y in (123, 158, 206):
            draw.line((239, y, 239, y + 15), fill="#ffffff", width=5)
        for x in (87, 355):
            draw.rectangle((x, 159, x + 31, 220), fill=accent)
            draw.rectangle((x + 5, 166, x + 26, 194), fill="#ffffff")
    else:
        floors = 3 + project_index % 3
        draw.rectangle((85, 223 - floors * 24, 372, 223), fill=accent, outline="#25394b", width=3)
        for floor in range(floors):
            for column in range(7):
                x, y = 98 + column * 38, 232 - floors * 24 + floor * 24
                draw.rectangle((x, y, x + 21, y + 13), fill="#c9e7eb")
        draw.rectangle((207, 198, 250, 223), fill="#25394b")
        draw.line((72, 225, 385, 225), fill="#ffffff", width=3)


def make_file(project, title, accent, captions, project_index, ordinal):
    caption = captions[ordinal - 1]
    image = Image.new("RGB", (WIDTH, HEIGHT), "#ffffff")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, 65), fill="#183448")
    draw.text((16, 12), "SYNTHETIC / DEMO - NOT SITE PHOTOGRAPHY", fill="#ffffff", font=FONT)
    draw.text((16, 32), title.upper() + " / " + str(ordinal).zfill(2), fill="#d9ebf0", font=FONT)
    draw_scene(draw, ordinal - 1, project_index, accent)
    draw.rectangle((0, 259, WIDTH, HEIGHT), fill="#f3f5f6")
    draw.text((16, 271), caption, fill="#183448", font=FONT)
    draw.text((16, 290), "Fictional illustration. No inspection or delivery certified.", fill="#435b68", font=FONT)
    buffer = BytesIO()
    image.save(buffer, format="PNG", optimize=False, compress_level=9)
    data = buffer.getvalue()
    return {
        "project": project, "ordinal": ordinal,
        "name": project + "-demo-" + str(ordinal).zfill(2) + ".png",
        "type": "image/png", "size": len(data), "width": WIDTH, "height": HEIGHT,
        "caption": caption, "kind": KINDS[ordinal - 1],
        "location": "Fictional " + title + " / " + LOCATIONS[ordinal - 1],
        "content": "data:image/png;base64," + base64.b64encode(data).decode("ascii"),
    }


def main():
    files = [make_file(project, title, accent, captions, project_index, ordinal)
             for project_index, (project, title, accent, captions) in enumerate(PROJECTS)
             for ordinal in range(1, 9)]
    content = "// Generated by tools/generate_demo_images.py. Fictional illustrations only.\n"
    content += "export const demoImages = " + json.dumps(files, ensure_ascii=True, indent=2) + ";\n"
    (ROOT / "demo-images.js").write_text(content, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
