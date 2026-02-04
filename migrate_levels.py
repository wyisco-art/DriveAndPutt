import json
import re
import os

# Mock constants and helper
CANVAS_WIDTH = 1024
CANVAS_HEIGHT = 768

class TileType:
    WALL = 0
    SAND = 1
    WATER = 2
    GRASS = 3
    HOLE = 4
    START = 5

def b(x, y, w, h, type=TileType.WALL):
    return {"x": x, "y": y, "w": w, "h": h, "type": type}

# Read the TS file
with open("utils/levels-data.ts", "r") as f:
    content = f.read()

# Extract the LEVELS array content
# We will look for everything between "export const LEVELS: Level[] = [" and "];"
start_marker = "export const LEVELS: Level[] = ["
end_marker = "];"
start_idx = content.find(start_marker)
end_idx = content.rfind(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find LEVELS array")
    exit(1)

array_content = content[start_idx + len(start_marker):end_idx]

# Now we need to make this valid Python code
# 1. Replace comments // with #
array_content = re.sub(r'//.*', '', array_content)
# 2. Replace true/false (if any, though none seen) with True/False
# 3. Wrap keys in quotes? No, we can probably just eval it if we fix the syntax.
# The syntax used is { id: 1, name: "...", ... } which is valid JS object but not valid Python dict (keys need quotes).
# Also spread operator ...BORDERS is used.

# Let's extract BORDERS first
borders_match = re.search(r'const BORDERS = \[\s*(.*?)\s*\];', content, re.DOTALL)
if borders_match:
    borders_str = borders_match.group(1)
    # Remove comments
    borders_str = re.sub(r'//.*', '', borders_str)
    # Eval borders
    # We need to manually construct BORDERS because of spread operator usage later
    # BORDERS are just a list of rects.
    # In the file: b(0, 0, CANVAS_WIDTH, 20), ...
    # We can eval this string in python if we have b defined.
    # But it's comma separated calls to b().
    borders_list = eval(f"[{borders_str}]")
else:
    print("Could not find BORDERS")
    exit(1)

BORDERS = borders_list

# Now back to array_content.
# It contains objects like { id: 1, ... walls: [...BORDERS, b(...)] }
# We need to convert this to python objects.
# RegEx to quote keys: id: -> "id":
# This is tricky because of "startPos": { ... }
# A simple approach is to use a JS parser or a smarter regex.
# Or we can just manual parse since we know the structure.

# Let's try to normalize it to JSON-like string and then eval it.
# However, the spread operator `...BORDERS` is the main issue for JSON.
# Python doesn't support `...BORDERS`.
# We need to replace `...BORDERS` with the actual content of borders, or handle it during evaluation.

# Let's clean up array_content for `eval`
# 1. Quote keys: (\w+): -> "\1":
# Be careful not to quote inside strings (though our keys are simple words)
# 2. Replace `...BORDERS` with `*BORDERS` (splat operator in list context? No, python uses * in calls, but inside list literal `[...BORDERS]` -> `[*BORDERS]` works in newer python, or `BORDERS + [...]`.
# The ts code uses `walls: [...BORDERS, b(...)]`.
# In Python: `"walls": BORDERS + [b(...)]`

formatted_content = array_content
# Quote keys
formatted_content = re.sub(r'(\w+):', r'"\1":', formatted_content)
# Replace ...BORDERS with *BORDERS (python 3.5+ list unpacking)
formatted_content = formatted_content.replace('...BORDERS', '*BORDERS')

# Now we have proper dict structure?
# { "id": 1, ... "walls": [*BORDERS, b(...)], ... }
# This is valid python syntax if wrapped in [].
formatted_content = f"[{formatted_content}]"

try:
    levels = eval(formatted_content)
except Exception as e:
    print(f"Error evaluating content: {e}")
    # Fallback debug
    with open("debug_eval.py", "w") as f:
        f.write("from typing import List, Dict, Any\n")
        f.write(f"CANVAS_WIDTH={CANVAS_WIDTH}\nCANVAS_HEIGHT={CANVAS_HEIGHT}\n")
        f.write("class TileType:\n    WALL=0\n    SAND=1\n    WATER=2\n    GRASS=3\n    HOLE=4\n    START=5\n")
        f.write("def b(x, y, w, h, type=TileType.WALL):\n    return {'x': x, 'y': y, 'w': w, 'h': h, 'type': type}\n")
        f.write("BORDERS=" + str(BORDERS) + "\n")
        f.write("levels = " + formatted_content + "\n")
        f.write("print(len(levels))\n")
    print("Dumped debug_eval.py")
    exit(1)

# Write to JSON files
os.makedirs("levels", exist_ok=True)
for level in levels:
    lvl_id = level["id"]
    filename = f"levels/{lvl_id}.json"
    with open(filename, "w") as f:
        json.dump(level, f, indent=4)
    print(f"Wrote {filename}")

print("Migration complete.")
