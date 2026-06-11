import os

search_dir = r"c:\Users\RIDHAM GOHEL\Downloads\MemoryPalace God\MemoryPalace\frontend\src"
search_terms = ["MemoryPalace", "Memory Palace", "મેમરી પેલેસ"]

for root, dirs, files in os.walk(search_dir):
    for file in files:
        if file.endswith((".jsx", ".js", ".html")):
            file_path = os.path.join(root, file)
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    lines = f.readlines()
                    for idx, line in enumerate(lines):
                        for term in search_terms:
                            if term in line:
                                print(f"{file} L{idx+1}: {line.strip()}")
            except Exception as e:
                pass
