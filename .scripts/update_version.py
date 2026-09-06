import os
import re

files = [
    'app/(main)/layout.tsx',
    'app/api/studio/update/[target]/latest.json/route.ts',
    'app/api/studio/download/latest/route.ts',
    'app/(main)/admin/settings/page.tsx',
    'app/actions/settings.ts',
    'app/(ucp)/layout.tsx',
    'app/api/admin/game-summary/route.ts',
    'src/web/components/shared/navbar.tsx'
]

v = '2.1.748'

for fpath in files:
    if os.path.exists(fpath):
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        content = re.sub(r'(\"|\')2\.1\.\d+([-0-9a-zA-Z]*)(\"|\')', f'"{v}"', content)
        content = re.sub(r'(\"|\')v2\.1\.\d+([-0-9a-zA-Z]*)(\"|\')', f'"v{v}"', content)
        
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
