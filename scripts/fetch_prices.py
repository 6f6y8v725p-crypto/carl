#!/usr/bin/env python3
"""Haalt publieke slotkoersen op bij Yahoo Finance (geen sleutel) en schrijft prices.json.
Bevat ENKEL tickers en koersen: geen aantallen, geen bedragen. Mislukt een ticker, dan blijft
de vorige waarde (met haar oude tijdstempel) staan, zodat het dashboard 'verouderd' toont."""
import json, os, sys, urllib.request, datetime

TICKERS = {  # dashboard-ticker: Yahoo-symbool
    "VUSA": "VUSA.AS", "DIET": "DIE.BR",
    "TSLA": "TSLA", "NVDA": "NVDA", "GOOGL": "GOOGL", "PLTR": "PLTR", "AMZN": "AMZN",
    "WULF": "WULF", "HIMS": "HIMS", "PATH": "PATH", "SPCX": "SPCX",
    "EURUSD": "EURUSD=X",
}
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "prices.json")

def fetch(sym):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(sym)}?range=5d&interval=1d"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        m = json.load(r)["chart"]["result"][0]["meta"]
    p, t = m.get("regularMarketPrice"), m.get("regularMarketTime")
    if not p or p <= 0 or not t:
        raise ValueError("geen koers")
    return {"price": round(float(p), 4), "currency": m.get("currency"), "source": "Yahoo",
            "symbol": sym, "timestamp": datetime.datetime.fromtimestamp(t, datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}

import urllib.parse
try:
    old = json.load(open(OUT)).get("prices", {})
except Exception:
    old = {}
prices, ok = {}, 0
for tk, sym in TICKERS.items():
    try:
        prices[tk] = fetch(sym); ok += 1
    except Exception as e:
        print(f"FOUT {tk} ({sym}): {e}", file=sys.stderr)
        if tk in old: prices[tk] = old[tk]
if ok == 0:
    sys.exit("Geen enkele koers opgehaald")
# 'updated' enkel wijzigen als er een koers veranderde: zo commit de Action alleen bij echte wijzigingen
if prices == old:
    print("Geen wijzigingen"); sys.exit(0)
data = {"updated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "prices": prices}
with open(OUT, "w") as f:
    json.dump(data, f, indent=1, sort_keys=True); f.write("\n")
print(f"{ok}/{len(TICKERS)} koersen bijgewerkt")
