import json,os,html,shutil
R=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'hub'); BASE='https://Nidhi-bhai.github.io/backtestcard/hub'
shutil.rmtree(R,ignore_errors=True)
S=json.load(open(os.path.join(os.path.dirname(R),'data','series.json')))['series']
cpi=S['US_CPI']; fx=S['INRUSD']; END='2026-09'
# US annual avg CPI (BLS), 2026 = Sep 2026 point
US={y:sum(cpi[f'{y}-{m:02d}'] for m in range(1,13))/12 for y in range(1947,2026)}; US[2026]=cpi[END]
wb=[r for r in json.load(open(os.path.join(os.path.dirname(R),'data','wb_cpi.json')))[1] if r['value'] is not None]
IN={int(r['date']):r['value'] for r in wb if r['countryiso3code']=='IND'}
FXA={y:sum(fx[f'{y}-{m:02d}'] for m in range(1,13))/12 for y in range(1973,2026)}

CSS="body{font:17px/1.6 system-ui;max-width:760px;margin:2rem auto;padding:0 1rem;background:#0d1117;color:#e6edf3}a{color:#58a6ff}.big{font-size:2.2rem;font-weight:700}table{border-collapse:collapse;margin:.5rem 0}td,th{border:1px solid #30363d;padding:3px 8px;text-align:right}small{color:#8b949e}nav{font-size:.9rem}"
FOOT='<hr><small>Historical statistics for education only. Not investment advice. US CPI: U.S. Bureau of Labor Statistics CPI-U (public domain), annual averages; 2026 = Sep 2026 index. India CPI: World Bank WDI FP.CPI.TOTL (source IMF IFS), licensed <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. INR/USD: Federal Reserve Board H.10. <a href="{root}sources.html">Sources & method</a> · <a href="{root}embed/">Embed this calculator</a> · <a href="{root}../">BacktestCard</a></small>'
def page(rel,title,desc,body,faq=None,extra=None):
    depth=rel.count('/'); root='../'*depth
    ld=[]
    if faq: ld.append({"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in faq]})
    if extra: ld.append(extra)
    lds=''.join(f'<script type="application/ld+json">{json.dumps(x)}</script>' for x in ld)
    fq=''.join(f'<h3>{html.escape(q)}</h3><p>{html.escape(a)}</p>' for q,a in (faq or []))
    p=f'{R}/{rel}index.html' if rel.endswith('/') or rel=='' else f'{R}/{rel}'
    os.makedirs(os.path.dirname(p),exist_ok=True)
    open(p,'w').write(f'<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>{html.escape(title)}</title><meta name=description content="{html.escape(desc)}"><link rel=canonical href="{BASE}/{rel}">{lds}<style>{CSS}</style></head><body><nav><a href="{root}">Inflation hub</a></nav>{body}{fq}{FOOT.format(root=root)}</body></html>')
urls=[]
def span(D,a,b,sym,lab):
    f=D[b]/D[a]; n=b-a; r=f**(1/n)-1
    yrs=list(range(a,b+1))
    yoy=[(y,D[y]/D[y-1]-1) for y in yrs[1:]]
    hi=max(yoy,key=lambda t:t[1]); lo=min(yoy,key=lambda t:t[1])
    half=next((y for y in yrs if D[y]/D[a]>=2),None)
    amt=''.join(f'<tr><td>{sym}{x:,}</td><td>{sym}{x*f:,.2f}</td><td>{sym}{x/f:,.2f}</td></tr>' for x in (1,10,100,1000,10000,100000))
    path=''.join(f'<tr><td>{y if y!=2026 else lab}</td><td>{sym}{100*D[y]/D[a]:,.2f}</td><td>{"" if y==a else f"{(D[y]/D[y-1]-1)*100:.1f}%"}</td></tr>' for y in yrs)
    return f,r,hi,lo,half,amt,path,n
def pairs(D,key,cur,sym,country,lab2026):
    ys=sorted(D)
    for a in ys[:-1]:
        for b in [y for y in ys if y>a]:
            f,r,hi,lo,half,amt,path,n=span(D,a,b,sym,lab2026)
            bl=lab2026 if b==2026 else str(b)
            rel=f'{key}/{a}-to-{b}/'
            extra=''
            if key=='india-inflation' and a>=1973 and b<=2025:
                ua=FXA[a];ub=FXA[b]
                extra=f'<h2>Same span in US dollars</h2><p>The rupee averaged ₹{ua:.2f}/USD in {a} and ₹{ub:.2f}/USD in {b}. ₹{100*f:,.0f} in {b} is about ${100*f/ub:,.2f}; ₹100 in {a} was about ${100/ua:,.2f}. Measured in dollars, the rupee amount went from ${100/ua:,.2f} to ${100*f/ub:,.2f}.</p>'
            faq=[(f'How much is {sym}100 from {a} worth in {bl}?',f'{sym}100 in {a} had about the same buying power as {sym}{100*f:,.2f} in {bl}, based on {country} consumer price index data.'),
                 (f'What was the average inflation rate in {country} from {a} to {bl}?',f'About {r*100:.2f}% per year, compounding to a {(f-1)*100:,.1f}% total rise in prices over {n} years.'),
                 (f'Which year between {a} and {bl} had the highest inflation?',f'{hi[0]} saw the largest annual rise in the index ({hi[1]*100:.1f}%); the lowest was {lo[0]} ({lo[1]*100:.1f}%).')]
            page(rel,f'{sym}100 in {a} → {sym}{100*f:,.2f} in {bl} | {country} inflation {a}–{bl}',
                 f'{sym}100 in {a} equals {sym}{100*f:,.2f} in {bl} ({r*100:.2f}%/yr average {country} inflation). Year-by-year table, peak year {hi[0]}.',
                 f'<h1>{sym}100 in {a} is worth {sym}{100*f:,.2f} in {bl}</h1><p class=big>{f:,.2f}× price rise</p><p>Average {country} inflation: <b>{r*100:.2f}% a year</b> over {n} years. Prices {"first doubled by "+str(half) if half else "did not double in this span"}. Highest year: {hi[0]} ({hi[1]*100:.1f}%). Lowest: {lo[0]} ({lo[1]*100:.1f}%).</p><h2>Converter</h2><table><tr><th>{a}</th><th>in {bl}</th><th>{bl} amount in {a} money</th></tr>{amt}</table>{extra}<h2>Year by year (value of {sym}100 from {a})</h2><table><tr><th>Year</th><th>Value</th><th>Inflation</th></tr>{path}</table><p>{f"<a href=../{a}-to-{b-1}/>{a}–{b-1}</a> · " if b-1>a else ""}{f"<a href=../{a}-to-{b+1}/>{a}–{b+1}</a> · " if b+1 in D else ""}<a href="../">All years</a></p>',faq)
            urls.append(rel)
    # index
    grid=''.join(f'<p><b>{a}</b>: '+' '.join(f'<a href="{a}-to-{b}/">{b if b!=2026 else lab2026}</a>' for b in [y for y in ys if y>a] if (b-a)%5==0 or b==ys[-1])+'</p>' for a in ys[:-1])
    page(f'{key}/',f'{country} inflation calculator: every year {ys[0]}–{ys[-1]}',f'Value of {cur} between any two years {ys[0]}–{ys[-1]}.',f'<h1>{country} inflation between any two years</h1><p>{len(ys)*(len(ys)-1)//2} year pairs. Each page has its own converter, year-by-year path and peak-inflation year.</p>{grid}',
         extra={"@context":"https://schema.org","@type":"Dataset","name":f"{country} consumer price index, annual, {ys[0]}–{ys[-1]}","description":f"Annual CPI used to compute {country} inflation between years.","license":"https://creativecommons.org/licenses/by/4.0/" if key=='india-inflation' else "https://www.usa.gov/government-works","creator":{"@type":"Organization","name":"World Bank / IMF IFS" if key=='india-inflation' else "U.S. Bureau of Labor Statistics"},"temporalCoverage":f"{ys[0]}/{ys[-1]}","distribution":{"@type":"DataDownload","encodingFormat":"application/json","contentUrl":f"{BASE}/data/inflation.json"}})
    urls.append(f'{key}/')
pairs(US,'us-inflation','US dollars','$','US','Sep 2026')
pairs(IN,'india-inflation','Indian rupees','₹','India','2025')
os.makedirs(f'{R}/data',exist_ok=True)
json.dump({'us':{str(k):round(v,4) for k,v in US.items()},'in':{str(k):round(v,4) for k,v in IN.items()},'notes':'US=BLS CPI-U annual avg (2026=Sep 2026). IN=World Bank FP.CPI.TOTL, CC BY 4.0.'},open(f'{R}/data/inflation.json','w'))
page('',"Inflation hub: what money from any year is worth",'US and India inflation between any two years, from public-domain and CC BY data.',
 '<h1>What is money from any year worth?</h1><ul><li><a href="us-inflation/">US dollar, 1947–2026</a></li><li><a href="india-inflation/">Indian rupee, 1960–2025</a></li><li><a href="embed/">Free embeddable calculator for your blog</a></li></ul>')
page('sources.html','Sources and method','Data sources and licences',"<h1>Sources & method</h1><ul><li>US CPI-U, BLS, via Federal Reserve/BLS public files. US government work, public domain. Annual = mean of 12 monthly values. 2026 = Sep 2026 monthly index.</li><li>India CPI (2010=100), World Bank WDI FP.CPI.TOTL, originally IMF International Financial Statistics. Licence CC BY 4.0 per World Bank series metadata (License_Type: CC BY-4.0).</li><li>INR per USD, Federal Reserve H.10, annual mean of monthly averages.</li></ul><p>Value in year B = amount × CPI(B)/CPI(A). Average rate = (CPI(B)/CPI(A))^(1/(B−A)) − 1. Numbers are cross-checked against an independent source in tests/hub_check.py.</p>")
urls+=['','sources.html']
# embed
os.makedirs(f'{R}/embed',exist_ok=True)
open(f'{R}/embed/widget.html','w').write('''<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><style>body{font:15px system-ui;margin:0;padding:12px;background:#fff;color:#111}select,input{font:inherit;padding:4px}#o{font-size:1.6rem;font-weight:700;margin:.5rem 0}a{color:#0969da}</style>
<div><select id=c><option value=us>$ US</option><option value=in>₹ India</option></select> <input id=a type=number value=100 style="width:7em"> in <select id=f></select> → <select id=t></select></div><div id=o>…</div><small>Source: BLS / World Bank (CC BY 4.0) · <a id=l target=_blank href="https://Nidhi-bhai.github.io/backtestcard/hub/">Inflation calculator by BacktestCard</a></small>
<script>let D;const $=i=>document.getElementById(i);const q=new URLSearchParams(location.search);
fetch('../data/inflation.json').then(r=>r.json()).then(j=>{D=j;$('c').value=q.get('c')||'us';fill();});
function fill(){const k=$('c').value,y=Object.keys(D[k]);for(const s of['f','t']){$(s).innerHTML=y.map(v=>`<option>${v}</option>`).join('')}$('f').value=q.get('from')||y[0];$('t').value=y[y.length-1];calc()}
function calc(){const k=$('c').value,s=k=='us'?'$':'₹',a=+$('a').value,f=$('f').value,t=$('t').value,v=a*D[k][t]/D[k][f];$('o').textContent=`${s}${a.toLocaleString()} (${f}) = ${s}${v.toLocaleString(undefined,{maximumFractionDigits:2})} (${t})`;$('l').href=`https://Nidhi-bhai.github.io/backtestcard/hub/${k=='us'?'us':'india'}-inflation/${Math.min(f,t)}-to-${Math.max(f,t)}/`}
$('c').onchange=fill;for(const i of['a','f','t'])$(i).oninput=calc;</script>''')
snip='<iframe src="https://Nidhi-bhai.github.io/backtestcard/hub/embed/widget.html" width="100%" height="150" style="border:1px solid #ddd;border-radius:8px" title="Inflation calculator" loading="lazy"></iframe>'
page('embed/','Free inflation calculator widget for your website','Copy-paste embed, no signup, no tracking.',f'<h1>Embed a free inflation calculator</h1><p>No signup, no cookies, no tracking. US (1947–2026) and India (1960–2025). Paste this into any blog or site:</p><textarea rows=4 style="width:100%" readonly>{html.escape(snip)}</textarea><p>Options: add <code>?c=in</code> for rupees, <code>&from=1990</code> for a start year.</p><h2>Preview</h2>{snip.replace("https://Nidhi-bhai.github.io/backtestcard/hub/embed/","")}')
urls.append('embed/')
open(f'{R}/sitemap.xml','w').write('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(f'<url><loc>{BASE}/{u}</loc></url>' for u in urls)+'</urlset>')
print(len(urls))
