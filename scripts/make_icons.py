from pathlib import Path
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[1]/'public'/'icons'
root.mkdir(parents=True,exist_ok=True)
for name,size in [('icon-192',192),('icon-512',512),('maskable-512',512),('apple-touch-icon',180)]:
    im=Image.new('RGB',(1024,1024),'#526454')
    d=ImageDraw.Draw(im)
    d.rounded_rectangle((260,270,765,780),radius=30,fill='#f7f5ef')
    d.line((510,290,510,750),fill='#b4bdab',width=8)
    d.arc((296,320,490,510),190,350,fill='#526454',width=9)
    d.line((300,540,460,540),fill='#b4bdab',width=9)
    d.line((300,585,440,585),fill='#b4bdab',width=9)
    d.line((556,580,718,580),fill='#b4bdab',width=9)
    d.line((556,625,700,625),fill='#b4bdab',width=9)
    d.ellipse((570,330,710,470),fill='#b5644e')
    im.resize((size,size),Image.Resampling.LANCZOS).save(root/(name+'.png'))
