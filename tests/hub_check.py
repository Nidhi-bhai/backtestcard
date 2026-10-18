"""Cross-check hub US inflation against an independent source: World Bank FP.CPI.TOTL USA (IMF IFS)."""
import json,urllib.request,re,os
H=os.path.join(os.path.dirname(__file__),'..','hub')
d=json.load(open(f'{H}/data/inflation.json'))
wb={int(r['date']):r['value'] for r in json.load(urllib.request.urlopen('https://api.worldbank.org/v2/country/USA/indicator/FP.CPI.TOTL?format=json&per_page=100'))[1] if r['value']}
bad=0;worst=0
for a in range(1960,2025):
  for b in range(a+1,2026):
    if b not in wb: continue
    ours=d['us'][str(b)]/d['us'][str(a)]; ind=wb[b]/wb[a]; e=abs(ours/ind-1); worst=max(worst,e); bad+=e>0.01
print(f'US pairs vs World Bank: worst rel diff {worst*100:.3f}%, pairs >1%: {bad}')
# page text equals data
t=open(f'{H}/us-inflation/1970-to-2025/index.html').read()
v=float(re.search(r'is worth \$([\d,\.]+)',t).group(1).replace(',',''))
assert abs(v-100*d['us']['2025']/d['us']['1970'])<0.01; print('page/data match OK:',v)
assert bad==0
