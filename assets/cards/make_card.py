"""
Génère card-dette-interets.png (1200x675) pour X/Twitter
"""
from PIL import Image, ImageDraw, ImageFont
import os

# ── Paths ──
FONTS = 'C:/Windows/Fonts/'
OUT   = os.path.join(os.path.dirname(__file__), 'card-dette-interets.png')

def font(name, size):
    return ImageFont.truetype(FONTS + name, size)

# ── Canvas ──
W, H = 1200, 675
img  = Image.new('RGB', (W, H), '#0a0a0a')
d    = ImageDraw.Draw(img)

# ── Colors ──
C_BG     = '#0a0a0a'
C_BG2    = '#111111'
C_BORDER = '#1e1e1e'
C_WHITE  = '#f0f0f0'
C_GREY   = '#888888'
C_DIM    = '#444444'
C_BLUE   = '#3b82f6'
C_RED    = '#ef4444'
C_AMBER  = '#f59e0b'

# ── Subtle grid ──
for x in range(0, W, 40):
    d.line([(x, 0), (x, H)], fill='#0f0f0f', width=1)
for y in range(0, H, 40):
    d.line([(0, y), (W, y)], fill='#0f0f0f', width=1)

# ── Tricolor bar (top) ──
BAR_H = 5
d.rectangle([0, 0, W//3, BAR_H],     fill='#002395')
d.rectangle([W//3, 0, 2*W//3, BAR_H], fill='#e8e8e8')
d.rectangle([2*W//3, 0, W, BAR_H],   fill='#ED2939')

# ── Blue glow (top-left) ──
from PIL import ImageFilter
glow = Image.new('RGB', (W, H), '#0a0a0a')
gd   = ImageDraw.Draw(glow)
gd.ellipse([-120, -160, 480, 440], fill='#001a50')
glow = glow.filter(ImageFilter.GaussianBlur(radius=80))
img  = Image.blend(img, glow, alpha=0.5)
d    = ImageDraw.Draw(img)

# ── Red glow (bottom-right) ──
glow2 = Image.new('RGB', (W, H), '#0a0a0a')
gd2   = ImageDraw.Draw(glow2)
gd2.ellipse([800, 350, 1350, 850], fill='#3a0505')
glow2 = glow2.filter(ImageFilter.GaussianBlur(radius=90))
img   = Image.blend(img, glow2, alpha=0.45)
d     = ImageDraw.Draw(img)

# ── Fonts ──
f_black  = font('seguibl.ttf',  108)   # Segoe UI Black — big number
f_bold   = font('segoeuib.ttf',  22)   # Bold — labels
f_bold_s = font('segoeuib.ttf',  15)   # Bold small — tag/brand
f_bold_m = font('segoeuib.ttf',  30)   # Bold medium — right stats
f_reg    = font('segoeui.ttf',   13)   # Regular — small text
f_reg_m  = font('segoeui.ttf',   16)   # Regular medium

# ── Header: Brand + Tag ──
PAD = 68
d.text((PAD, 28), 'Le ', font=f_bold_s, fill=C_GREY)
bw = d.textlength('Le ', font=f_bold_s)
d.text((PAD + bw, 28), 'FRANÇAIS', font=f_bold_s, fill=C_BLUE)
fw = d.textlength('FRANÇAIS', font=f_bold_s)
d.text((PAD + bw + fw, 28), ' MOYEN', font=f_bold_s, fill=C_GREY)

tag   = 'DETTE PUBLIQUE · 2026'
tw    = d.textlength(tag, font=f_bold_s)
tag_x = W - PAD - tw - 24
tag_y = 24
d.rounded_rectangle([tag_x - 12, tag_y - 4, tag_x + tw + 12, tag_y + 22],
                    radius=12, outline=C_BORDER, fill='#111111')
d.text((tag_x, tag_y), tag, font=f_bold_s, fill=C_DIM)

# ── LEFT COLUMN ──
LX = PAD
TY = 110   # top y

# Label
d.text((LX, TY + 10), 'COÛT DES INTÉRÊTS PAR FOYER FISCAL',
       font=font('segoeui.ttf', 12), fill='#555555')

# Big stat
BIG_Y = TY + 38
big_txt = '1 526'
bbox = d.textbbox((LX, BIG_Y), big_txt, font=f_black)
d.text((LX, BIG_Y), big_txt, font=f_black, fill=C_WHITE)

# Unit — 16px gap below the actual rendered bottom of the number
unit_y = bbox[3] + 16
d.text((LX, unit_y), '€ / an / foyer', font=f_bold, fill='#666666')
dot_x = LX + d.textlength('€ / an / foyer', font=f_bold) + 8
d.text((dot_x, unit_y), '·', font=f_bold, fill=C_BLUE)
d.text((dot_x + 14, unit_y), 'rien que les intérêts', font=f_bold, fill='#555555')

# Red pill
PILL_Y = unit_y + 42
pill_txt = '  Sans rembourser un centime de capital'
pill_w   = d.textlength(pill_txt, font=font('segoeui.ttf', 13)) + 24
d.rounded_rectangle([LX, PILL_Y, LX + pill_w, PILL_Y + 28],
                    radius=8,
                    outline='#5a1515',
                    fill='#1a0505')
# dot indicator
d.ellipse([LX + 12, PILL_Y + 11, LX + 18, PILL_Y + 17], fill=C_RED)
d.text((LX + 24, PILL_Y + 6), 'Sans rembourser un centime de capital',
       font=font('segoeui.ttf', 13), fill='#cc3333')

# ── DIVIDER ──
DIV_X   = 520
DIV_TOP = TY + 10
DIV_BOT = DIV_TOP + 370

for i, y in enumerate(range(DIV_TOP, DIV_BOT, 2)):
    alpha = int(80 * abs((y - (DIV_TOP + DIV_BOT)//2)) / ((DIV_BOT - DIV_TOP)//2 + 1))
    grey  = 30 + alpha
    d.line([(DIV_X, y), (DIV_X, y)], fill=(grey, grey, grey))

# ── RIGHT COLUMN ──
RX = 570

stats = [
    ('INTÉRÊTS DE LA DETTE / AN',    '58 milliards €', C_RED,   '= budget entier de l\'Éducation nationale'),
    ('CROISSANCE DE LA DETTE',        '5 500 € / seconde', C_AMBER, 'en ce moment même'),
    ('DETTE PUBLIQUE TOTALE',         '3 460 Mds €',   C_BLUE,  '138% du PIB · Trésor public 2026'),
]

row_h = 130
for i, (lbl, val, col, note) in enumerate(stats):
    ry = TY + i * row_h

    # separator line (except before first)
    if i > 0:
        d.line([(RX, ry - 8), (W - PAD, ry - 8)], fill='#1a1a1a', width=1)

    d.text((RX, ry),      lbl,  font=font('segoeui.ttf', 11), fill='#555555')
    d.text((RX, ry + 16), val,  font=font('segoeuib.ttf', 28), fill=col)
    d.text((RX, ry + 50), note, font=font('segoeui.ttf', 12), fill='#3a3a3a')

# ── FOOTER ──
FY = H - 44

url = 'le-francais-moyen.com'
d.text((PAD, FY), url, font=font('segoeuib.ttf', 16), fill=C_BLUE)

src = 'Sources : Cour des comptes · Trésor public · INSEE · Données officielles'
sw  = d.textlength(src, font=font('segoeui.ttf', 11))
d.text((W - PAD - sw, FY + 4), src, font=font('segoeui.ttf', 11), fill='#333333')

# ── Footer separator line ──
d.line([(PAD, FY - 14), (W - PAD, FY - 14)], fill='#1a1a1a', width=1)

# ── Save ──
img.save(OUT, 'PNG', optimize=True)
print(f'OK  Carte sauvegardee : {OUT}')
print(f'    Dimensions : {W}x{H}px')
