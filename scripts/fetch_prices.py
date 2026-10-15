#!/usr/bin/env python3
"""Haalt publieke koersen op bij Yahoo Finance (geen sleutel) en schrijft prices.json.
ENKEL tickers, koersen, dividenden per aandeel en een S&P 500-reeks (SPY): geen aantallen of bedragen.
Mislukt een ticker, dan blijft de vorige waarde (met oude tijdstempel) staan -> dashboard toont 'verouderd'."""
import json, os, sys, urllib.request, urllib.parse, datetime

TICKERS = {  # dashboard-ticker: Yahoo-symbool
    "VUSA": "VUSA.AS", "DIET": "DIE.BR",
    "TSLA": "TSLA", "NVDA": "NVDA", "GOOGL": "GOOGL", "PLTR": "PLTR", "AMZN": "AMZN",
    "WULF": "WULF", "HIMS": "HIMS", "PATH": "PATH", "SPCX": "SPCX",
    "EURUSD": "EURUSD=X",
}
HISTORY = {"SPY": "SPY", "EURUSD": "EURUSD=X"}  # dagelijkse slotkoersen voor de S&P 500-vergelijking
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "prices.json")
UTC = datetime.timezone.utc

def iso(t): return datetime.datetime.fromtimestamp(t, UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
def day(t): return datetime.datetime.fromtimestamp(t, UTC).strftime("%Y-%m-%d")

def chart(sym, rng="2y"):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(sym)}?range={rng}&interval=1d&events=div"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)["chart"]["result"][0]

def quote(sym):
    r = chart(sym); m = r["meta"]
    p, t = m.get("regularMarketPrice"), m.get("regularMarketTime")
    if not p or p <= 0 or not t: raise ValueError("geen koers")
    q = {"price": round(float(p), 4), "currency": m.get("currency"), "source": "Yahoo", "symbol": sym, "timestamp": iso(t)}
    divs = sorted((r.get("events") or {}).get("dividends", {}).values(), key=lambda d: d["date"])
    if divs:
        now = datetime.datetime.now(UTC).timestamp()
        ttm = sum(d["amount"] for d in divs if d["date"] >= now - 365 * 86400)
        q["div"] = {"ttm": round(ttm, 6), "last_ex": day(divs[-1]["date"]), "last_amount": round(divs[-1]["amount"], 6),
                    "count_12m": sum(1 for d in divs if d["date"] >= now - 365 * 86400)}
    return q

def history(sym):
    r = chart(sym)
    ts, cl = r.get("timestamp") or [], r["indicators"]["quote"][0].get("close") or []
    out = {}
    for t, c in zip(ts, cl):
        if c: out[day(t)] = round(float(c), 4)
    if len(out) < 20: raise ValueError("te weinig historiek")
    return [[d, out[d]] for d in sorted(out)]

try:
    old = json.load(open(OUT))
except Exception:
    old = {}
oldp, oldh = old.get("prices", {}), old.get("history", {})
prices, hist, ok = {}, {}, 0
for tk, sym in TICKERS.items():
    try:
        prices[tk] = quote(sym); ok += 1
    except Exception as e:
        print(f"FOUT {tk} ({sym}): {e}", file=sys.stderr)
        if tk in oldp: prices[tk] = oldp[tk]
for tk, sym in HISTORY.items():
    try:
        hist[tk] = history(sym)
    except Exception as e:
        print(f"FOUT historiek {tk}: {e}", file=sys.stderr)
        if tk in oldh: hist[tk] = oldh[tk]
if ok == 0:
    sys.exit("Geen enkele koers opgehaald")
if prices == oldp and hist == oldh:
    print("Geen wijzigingen"); sys.exit(0)
data = {"updated": iso(datetime.datetime.now(UTC).timestamp()), "prices": prices, "history": hist}
with open(OUT, "w") as f:
    json.dump(data, f, separators=(",", ":"), sort_keys=True); f.write("\n")
print(f"{ok}/{len(TICKERS)} koersen bijgewerkt, historiek: {', '.join(f'{k} {len(v)}d' for k, v in hist.items())}")
