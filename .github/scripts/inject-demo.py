import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

demo_tag = (
    '\n  <!-- DEMO MODE: overrides storage with fetch() + memory-only writes.\n'
    '       This is the ONLY line that differs from main\'s index.html. -->\n'
    '  <script src="js/demo-mode.js"></script>\n'
)

if 'demo-mode.js' not in content:
    content = re.sub(
        r'(<script src="js/storage-adapter\.js[^"]*"></script>)',
        r'\1' + demo_tag,
        content
    )
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Injected demo-mode.js script tag into index.html')
else:
    print('demo-mode.js tag already present, skipping injection')
