from pathlib import Path
import zipfile,hashlib,json
root=Path(__file__).resolve().parents[1]
out=root/'output'
out.mkdir(exist_ok=True)
source=out/'tabi-kansai-source.zip'
with zipfile.ZipFile(source,'w',zipfile.ZIP_DEFLATED) as z:
    for folder in ['src','scripts','e2e','docs','public','.github']:
        for file in sorted((root/folder).rglob('*')):
            if file.is_file() and '__pycache__' not in file.parts:
                z.write(file,'japan-travel/'+str(file.relative_to(root)).replace('\\','/'))
    for name in ['package.json','package-lock.json','index.html','tsconfig.json','vite.config.ts','vitest.config.ts','playwright.config.ts','eslint.config.js','firebase.json','.gitignore','.prettierignore','.prettierrc.json','README.md']:
        z.write(root/name,'japan-travel/'+name)
production=out/'tabi-kansai-production.zip'
with zipfile.ZipFile(production,'w',zipfile.ZIP_DEFLATED) as z:
    for file in sorted((root/'dist').rglob('*')):
        if file.is_file():z.write(file,str(file.relative_to(root/'dist')).replace('\\','/'))
result={f.name:{'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in [source,production]}
(out/'checksums.json').write_text(json.dumps(result,indent=2),encoding='utf8')
print(json.dumps(result,indent=2))
