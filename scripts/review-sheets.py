from PIL import Image, ImageDraw
from pathlib import Path
root=Path('.impeccable/review')
output=Path('C:/Users/party/.codex/visualizations/2026/10/26/01a17892-1b74-7121-bc24-0da1ac04091b')
for kind in ['desktop','mobile']:
    files=sorted(root.glob(kind+'*.png'))
    for batch in range(0,len(files),6):
        group=files[batch:batch+6]
        width=480 if kind=='desktop' else 390
        height=334 if kind=='desktop' else 844
        sheet=Image.new('RGB',(width*3,(height+28)*2),'#e9dbc3')
        draw=ImageDraw.Draw(sheet)
        for i,file in enumerate(group):
            im=Image.open(file).convert('RGB'); im.thumbnail((width,height))
            x=(i%3)*width;y=(i//3)*(height+28)
            draw.text((x+8,y+5),file.name,fill='#2a1a0e')
            sheet.paste(im,(x,y+28))
        sheet.save(output/f'sheet-{kind}-{batch//6+1}.png')
print('Contact sheets created from every review capture.')
