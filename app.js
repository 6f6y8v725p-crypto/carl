var EUR_USD = 1.1611;
var PK = {w:'cp_w',m:'cp_m',y:'cp_y',wh:'cp_wh',mh:'cp_mh',yh:'cp_yh',dh:'cp_dh',cl:'cp_close',tx:'cp_tx'};

// Versie van de posities in de code hieronder. Verhoog dit nummer telkens als je de
// H[]-array zelf aanpast bij een aankoop/verkoop. Bij het openen wint de code van een
// opgeslagen 'carl-holdings'-override zodra deze versie hoger is dan de opgeslagen versie
// — zo overschrijft een oude override nooit meer een verse aankoop in de code.
var HOLDINGS_VERSION = 3;

var H = [
  {ticker:'TSLA',name:'Tesla',         cat:'core',ccy:'USD',shares:625.60,  avg:378.88,price:397.0,qt:null,pc:0,pl:4.8,  pe:'~180x',  fcf:'$5,3B',  target:420.0,upside:6, rating:'Buy',
   brokers:[{n:'BUX',sh:403,avg:362.73},{n:'Bolero',sh:157,avg:438.87},{n:'Revolut',sh:65.60,avg:334.49}]},
  {ticker:'NVDA',name:'NVIDIA',        cat:'core',ccy:'USD',shares:78.131,  avg:113.71,price:204.0,qt:null,pc:0,pl:79.4, pe:'~35x',   fcf:'$46,3B', target:250.0,upside:23,rating:'Strong Buy',
   brokers:[{n:'BUX',sh:75,avg:113.769},{n:'Revolut',sh:3.131,avg:112.40}]},
  {ticker:'GOOGL',name:'Alphabet A',   cat:'core',ccy:'USD',shares:26,      avg:193.52,price:358.0,qt:null,pc:0,pl:85.0, pe:'~22x',   fcf:'$10B Q1', target:450.0,upside:26,rating:'Strong Buy',brokers:[]},
  {ticker:'PLTR',name:'Palantir',      cat:'core',ccy:'USD',shares:59.54,   avg:98.83, price:115.0,qt:null,pc:0,pl:16.4, pe:'131x',  fcf:'$2,7B',  target:175.0,upside:52,rating:'Buy',        brokers:[]},
  {ticker:'AMZN',name:'Amazon',        cat:'core',ccy:'USD',shares:10,      avg:233.08,price:242.0,qt:null,pc:0,pl:3.8,  pe:'~28x',   fcf:'Neg.', target:310.0,upside:28,rating:'Strong Buy', brokers:[]},
  {ticker:'WULF',name:'TeraWulf',      cat:'spec',ccy:'USD',shares:300.871, avg:5.94,  price:24.01, qt:null,pc:0,pl:304.4,pe:'n.v.t.',fcf:'Neg.', target:55.0, upside:129,rating:'Strong Buy',
   brokers:[{n:'BUX',sh:275,avg:5.19},{n:'Revolut',sh:25.871,avg:13.95}]},
  {ticker:'HIMS',name:'Hims & Hers',   cat:'spec',ccy:'USD',shares:3.571,   avg:45.88, price:32.0, qt:null,pc:0,pl:-30.3,pe:'~30x',   fcf:'$53M',  target:36.0, upside:13, rating:'Hold',        brokers:[]},
  {ticker:'PATH',name:'UiPath',        cat:'spec',ccy:'USD',shares:164.966, avg:11.76, price:11.42, qt:null,pc:0,pl:-2.9,pe:'19x', fcf:'22% mgn',  target:13.27, upside:16,rating:'Hold',        brokers:[]},
  {ticker:'VUSA',name:'Vanguard S&P500',cat:'eur', ccy:'EUR',shares:9.5276, avg:91.88, price:121.87,qt:null,pc:0,pl:32.64,pe:'n.v.t.',fcf:'ETF',    target:151.00,upside:24,rating:'ETF',         brokers:[]},
  {ticker:'DIET',name:"D'Ieteren",     cat:'eur', ccy:'EUR',shares:2.2444,  avg:200.00,price:169.50,qt:null,pc:0,pl:-15.25,pe:'n.v.t.',fcf:'n.v.t.',target:232.42,upside:37,rating:'Kopen',       brokers:[]},
  {ticker:'SPCX',name:'SpaceX',        cat:'spec',ccy:'USD',shares:149.542,avg:145.93,price:150.0,qt:null,pc:0,pl:2.8,pe:'n.v.t.',fcf:'n.b.',target:250.0,upside:67,rating:'Buy',brokers:[]}
];

var USD_SYMS = [];
function rebuildUsdSyms(){
  // Bouwt de lijst van tickers waarvoor live USD-koersen worden opgehaald.
  // EUR-posities (VUSA, DIET) vallen automatisch af via ccy!=='USD'.
  USD_SYMS=[];
  H.forEach(function(h){ if(h.ccy==='USD') USD_SYMS.push(h.ticker); });
}
rebuildUsdSyms();

// Holdings persistence: override shares/avg from localStorage
function loadHoldingsOverride(){
  var ov=lsGet('carl-holdings');
  if(!ov) return;
  // Nieuw formaat: {version, data:[...]}. Oud formaat: gewoon een array.
  var ver=(ov&&!Array.isArray(ov)&&typeof ov.version==='number')?ov.version:0;
  var data=Array.isArray(ov)?ov:(ov&&Array.isArray(ov.data)?ov.data:null);
  if(!data) return;
  // Als de code een nieuwere positie-versie heeft (bv. na een aankoop die ik in de
  // H[]-array verwerkte), dan wint de code: negeer de oude override en wis hem, zodat
  // de verse aankoop niet wordt overschreven en niet terugkeert via de cloud.
  if(ver<HOLDINGS_VERSION){
    localStorage.removeItem('carl-holdings');
    return;
  }
  data.forEach(function(o){
    var existing=H.filter(function(h){return h.ticker===o.ticker;})[0];
    if(existing){
      if(typeof o.shares==='number'&&o.shares>=0) existing.shares=o.shares;
      if(typeof o.avg==='number'&&o.avg>0) existing.avg=o.avg;
      existing.pl=(existing.price-existing.avg)/existing.avg*100;
    } else if(o.name&&o.ccy){
      // Positie bestaat niet in de code-array: een via de app toegevoegd nieuw aandeel.
      // Reconstrueer het volledig zodat het een herlaad overleeft.
      H.push({ticker:o.ticker,name:o.name,cat:o.cat||'spec',ccy:o.ccy,
        shares:o.shares||0,avg:o.avg||0,price:o.price||o.avg||0,qt:null,pc:0,
        pl:(o.price&&o.avg)?(o.price-o.avg)/o.avg*100:0,
        pe:o.pe||'n.v.t.',fcf:o.fcf||'n.b.',target:o.target||0,upside:o.upside||0,
        rating:o.rating||'\u2014',brokers:[]});
    }
  });
  // FIX: een volledig verkochte positie staat niet meer in de override, maar wel nog in de
  // H[]-code. Zonder deze stap kwam ze na herladen terug met het oude aantal aandelen.
  var present={};data.forEach(function(o){if(o&&o.ticker)present[o.ticker]=true;});
  for(var i=H.length-1;i>=0;i--){ if(!present[H[i].ticker]) H.splice(i,1); }
  rebuildUsdSyms(); // nieuw gereconstrueerde USD-aandelen meenemen in koers-ophaling
}
function saveHoldingsOverride(){
  // Sla per positie genoeg op om ze volledig te reconstrueren (ook nieuw toegevoegde
  // aandelen die niet in de H[]-code staan). shares+avg volstaan voor bestaande posities;
  // de overige velden zorgen dat een volledig nieuw aandeel een herlaad overleeft.
  var data=H.map(function(h){
    return{ticker:h.ticker,shares:h.shares,avg:h.avg,name:h.name,cat:h.cat,ccy:h.ccy,
      price:h.price,target:h.target,upside:h.upside,pe:h.pe,fcf:h.fcf,rating:h.rating};
  });
  lsSet('carl-holdings',{version:HOLDINGS_VERSION,data:data});
  cloudSyncDebounced();
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function lsGet(k){try{var v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch(e){return null;}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function pad2(n){return(n<10?'0':'')+n;}
function ymd(d){d=d||new Date();return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());}
// FIX: lokale datum i.p.v. UTC (toISOString gaf tussen 00:00 en 02:00 Belgische tijd de datum van gisteren)
function isoDate(d){return ymd(d);}
function parseYmd(s){var p=String(s).split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
// FIX: correcte ISO-weeknummering. De oude versie rekende vanaf 4 januari i.p.v. 1 januari
// en gaf in 2025 en 2026 elke week een nummer te laag (bv. 8 okt 2026 = W40 i.p.v. W41).
function isoWeek(d){
  d=d||new Date();
  var t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  t.setUTCDate(t.getUTCDate()+4-(t.getUTCDay()||7));
  var y0=new Date(Date.UTC(t.getUTCFullYear(),0,1));
  var wn=Math.ceil((((t-y0)/86400000)+1)/7);
  return t.getUTCFullYear()+'-W'+pad2(wn);
}
// Begin (00:00 lokaal) van de lopende week (maandag), maand of jaar
function periodStart(kind,now){
  now=now||new Date();
  if(kind==='week'){var d=new Date(now.getFullYear(),now.getMonth(),now.getDate());d.setDate(d.getDate()-((d.getDay()||7)-1));return d;}
  if(kind==='month') return new Date(now.getFullYear(),now.getMonth(),1);
  return new Date(now.getFullYear(),0,1);
}
// Begin van de periode die NA de periode van snapshot s komt (= einde van die periode)
function periodEndOf(s,kind){
  if(kind==='week'){
    var m=/^(\d{4})-W(\d{2})$/.exec(s.week||'');if(!m) return null;
    var y=+m[1],w=+m[2],jan4=new Date(y,0,4);
    var mon=new Date(y,0,4-((jan4.getDay()||7)-1));
    mon.setDate(mon.getDate()+7*(w-1)+7);return mon;
  }
  if(kind==='month'){var p=String(s.month||'').split('-');if(p.length<2)return null;return new Date(+p[0],+p[1],1);}
  if(s.year) return new Date(+s.year+1,0,1);
  return null;
}
// Handelsdatum (New York) van een Finnhub-tijdstempel
function nyYmd(unixSec){
  var d=new Date(unixSec*1000);
  try{
    var parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
    var o={};parts.forEach(function(p){o[p.type]=p.value;});
    if(o.year&&o.month&&o.day) return o.year+'-'+o.month+'-'+o.day;
  }catch(e){}
  return ymd(d);
}
function isUSTradingDay(d){
  if(d.getDay()===0||d.getDay()===6) return false;
  return !usHolidays(d.getFullYear()).some(function(h){return sameYMD(h,d);});
}
function prevTradingDay(ymdStr){
  var d=parseYmd(ymdStr);
  for(var i=0;i<10;i++){d.setDate(d.getDate()-1);if(isUSTradingDay(d)) return ymd(d);}
  return ymd(d);
}
// Oude weeklabels (2025/2026, gemaakt met de foute isoWeek) één week opschuiven
function shiftOldWeekLabel(lbl){
  var m=/^(\d{4})-W(\d{2})$/.exec(lbl||'');if(!m) return lbl;
  var y=+m[1],w=+m[2];if(y!==2025&&y!==2026) return lbl;
  return y+'-W'+pad2(w+1);
}
function isoMonth(d){d=d||new Date();return d.getFullYear()+'-'+(d.getMonth()<9?'0':'')+(d.getMonth()+1);}
function isoYear(d){d=d||new Date();return String(d.getFullYear());}
function n2(n){return Math.round(n).toLocaleString('nl-NL');}
function fmtEur(n){return(n>=0?'+\u20ac':'\u2212\u20ac')+n2(Math.abs(n));}
function fmtPct(n){return(n>=0?'+':'\u2212')+Math.abs(n).toFixed(2)+'%';}
// ─── MARKTKALENDER (VS + Europa, incl. feestdagen) ───────────────────────────
function easterSunday(y){
  // Anonieme Gregoriaanse algoritme
  var a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,
      f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,
      i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),
      month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
  return new Date(y,month-1,day);
}
function sameYMD(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
function nthWeekday(y,m,weekday,n){ // n-de gegeven weekdag (0=zo) van maand m (0-index)
  var d=new Date(y,m,1),cnt=0;
  while(true){if(d.getDay()===weekday){cnt++;if(cnt===n)return new Date(d);}d.setDate(d.getDate()+1);}
}
function lastWeekday(y,m,weekday){
  var d=new Date(y,m+1,0); // laatste dag van de maand
  while(d.getDay()!==weekday) d.setDate(d.getDate()-1);
  return d;
}
function observedUS(d){ // VS: feestdag op za \u2192 vrijdag ervoor, op zo \u2192 maandag erna
  if(d.getDay()===6) return new Date(d.getFullYear(),d.getMonth(),d.getDate()-1);
  if(d.getDay()===0) return new Date(d.getFullYear(),d.getMonth(),d.getDate()+1);
  return d;
}
function usHolidays(y){
  var easter=easterSunday(y);
  var goodFriday=new Date(easter);goodFriday.setDate(easter.getDate()-2);
  return [
    observedUS(new Date(y,0,1)),               // Nieuwjaar
    nthWeekday(y,0,1,3),                       // MLK Day - 3e maandag januari
    nthWeekday(y,1,1,3),                       // Presidents Day - 3e maandag februari
    goodFriday,                                // Goede Vrijdag (markt dicht, geen observance-regel nodig)
    lastWeekday(y,4,1),                        // Memorial Day - laatste maandag mei
    observedUS(new Date(y,5,19)),               // Juneteenth
    observedUS(new Date(y,6,4)),                 // Independence Day
    nthWeekday(y,8,1,1),                       // Labor Day - 1e maandag september
    nthWeekday(y,10,4,4),                      // Thanksgiving - 4e donderdag november
    observedUS(new Date(y,11,25))                // Kerstmis
  ];
}
function euHolidays(y){
  var easter=easterSunday(y);
  var easterMonday=new Date(easter);easterMonday.setDate(easter.getDate()+1);
  var goodFriday=new Date(easter);goodFriday.setDate(easter.getDate()-2);
  return [
    new Date(y,0,1),     // Nieuwjaar
    goodFriday,          // Goede Vrijdag (Euronext dicht)
    easterMonday,        // Paasmaandag
    new Date(y,4,1),     // Dag van de Arbeid
    new Date(y,11,25),   // Kerstmis
    new Date(y,11,26)    // 2e Kerstdag
  ];
}
function isHolidayToday(holidayList){
  var now=new Date();
  return holidayList.some(function(h){return sameYMD(h,now);});
}
function isUSOpen(){
  var n=new Date(),t=n.getHours()*60+n.getMinutes(),d=n.getDay();
  if(d===0||d===6) return false; // weekend
  if(isHolidayToday(usHolidays(n.getFullYear()))) return false;
  return t>=15*60+30&&t<22*60;
}
function isEUOpen(){
  var n=new Date(),t=n.getHours()*60+n.getMinutes(),d=n.getDay();
  if(d===0||d===6) return false; // weekend
  if(isHolidayToday(euHolidays(n.getFullYear()))) return false;
  return t>=9*60&&t<17*60+30; // Euronext Amsterdam/Brussel: 09:00-17:30 (zelfde tijdzone als Carl)
}
function isOpen(){return isUSOpen();} // backwards compatible alias
function fmtQt(unixSec){
  if(!unixSec) return '';
  var d=new Date(unixSec*1000);
  var now=new Date();
  var sameDay=d.toDateString()===now.toDateString();
  var timeStr=d.toLocaleTimeString('nl-BE',{hour:'2-digit',minute:'2-digit'});
  return sameDay?timeStr:(d.toLocaleDateString('nl-BE',{day:'2-digit',month:'2-digit'})+' '+timeStr);
}

// ─── SLOTKOERS-BOEK ───────────────────────────────────────────────────────────
// Per ticker de laatst gekende koers per handelsdag: {TSLA:{'2026-10-02':412.3,...}, EURUSD:{...}}.
// Daarmee kan de referentie van een nieuwe week/maand/jaar de SLOTKOERS van de vorige
// handelsdag zijn, i.p.v. de koers op het moment dat je de app toevallig opent.
function bookGet(){return lsGet(PK.cl)||{};}
function bookPut(book,tk,date,px){if(!(px>0)||!date)return;(book[tk]||(book[tk]={}))[date]=px;}
function bookPrune(book){
  Object.keys(book).forEach(function(tk){
    var ks=Object.keys(book[tk]).sort();
    if(ks.length>30) ks.slice(0,ks.length-30).forEach(function(k){delete book[tk][k];});
  });
}
// Laatste koers met datum < beforeY (en >= minY indien opgegeven). {px,date} of null.
function bookBefore(book,tk,beforeY,minY){
  var b=book&&book[tk];if(!b) return null;
  var ks=Object.keys(b).sort();
  for(var i=ks.length-1;i>=0;i--){
    if(ks[i]<beforeY){ if(minY&&ks[i]<minY) return null; return{px:b[ks[i]],date:ks[i]}; }
  }
  return null;
}
function recordCloses(fresh){
  var book=bookGet();
  H.forEach(function(h){
    if(h.ccy==='USD'){
      if(!fresh||fresh[h.ticker]!=='\u2713'||!h.qt||!(h.price>0)) return;
      var qd=nyYmd(h.qt);
      bookPut(book,h.ticker,qd,h.price);
      if(h.pc>0) bookPut(book,h.ticker,prevTradingDay(qd),h.pc);
    } else if(h.price>0){
      var s=lsGet('carl-eur-manual');
      bookPut(book,h.ticker,(s&&s.date)||isoDate(),h.price);
    }
  });
  bookPrune(book);lsSet(PK.cl,book);
}
// ─── TRANSACTIELOG (voor correcte P&L bij bijkoop/verkoop binnen een periode) ──
function logTx(tk,ccy,sh,px){
  var tx=lsGet(PK.tx)||[],ts=Date.now();
  tx.push({id:ts+'-'+tk,ts:ts,date:isoDate(),tk:tk,ccy:ccy,sh:sh,px:px,fx:EUR_USD});
  var cutoff=ts-400*86400000;
  tx=tx.filter(function(t){return t&&t.ts>cutoff;});
  lsSet(PK.tx,tx);
}
function netTxShares(tx,tk,sinceTs){
  var s=0;(tx||[]).forEach(function(t){if(t.tk===tk&&t.ts>sinceTs)s+=t.sh;});return s;
}
function hasTx(tk){return (lsGet(PK.tx)||[]).some(function(t){return t.tk===tk;});}

// Nieuwe periode-snapshot. kind = 'week'|'month'|'year'. fresh = voortgangsmap van doFetch.
// Referentiekoers per positie: slotkoers van de laatste handelsdag VÓÓR de periode (als die
// gekend is en hooguit 7 dagen oud), anders de verse koers van nu. Posities zonder verse
// koers en zonder slotkoers worden NIET met een oude/hardgecodeerde koers vastgelegd; ze
// worden later aangevuld door fillSnapshotGaps().
function snapNow(live,kind,fresh){
  var vals={},eP={},px={},sh={},tts={},tot=0,now=new Date(),nowTs=now.getTime();
  var ps=kind?periodStart(kind,now):null,psY=ps?ymd(ps):null;
  var minY=ps?ymd(new Date(ps.getFullYear(),ps.getMonth(),ps.getDate()-7)):null;
  var book=ps?bookGet():{},tx=lsGet(PK.tx)||[],exactN=0,n=0,baseDate='';
  H.forEach(function(h){
    var bp=ps?bookBefore(book,h.ticker,psY,minY):null,p,s,t0;
    if(bp){p=bp.px;t0=ps.getTime();s=Math.max(0,h.shares-netTxShares(tx,h.ticker,t0));if(h.ccy==='USD'){exactN++;if(bp.date>baseDate)baseDate=bp.date;}}
    else{
      if(h.ccy==='USD'&&fresh&&fresh[h.ticker]!=='\u2713') return; // geen verse koers: later aanvullen
      p=h.price;s=h.shares;t0=nowTs;
    }
    if(h.ccy==='USD')n++; // EUR-posities hebben enkel handmatige koersen: tellen niet mee voor het label
    px[h.ticker]=p;sh[h.ticker]=s;tts[h.ticker]=t0;
    if(h.ccy==='USD'){vals[h.ticker]=s*p;tot+=s*p;}else{eP[h.ticker]=s*p;}
  });
  var fxB=ps?bookBefore(book,'EURUSD',psY,minY):null;
  return{date:isoDate(now),time:now.toLocaleTimeString('nl-BE',{hour:'2-digit',minute:'2-digit'}),ts:nowTs,
    week:isoWeek(now),month:isoMonth(now),year:isoYear(now),vals:vals,eP:eP,px:px,sh:sh,tts:tts,tot:tot,
    live:!!live,eurUsd:fxB?fxB.px:EUR_USD,fxPending:(!fxB&&!fxLiveThisSession)||undefined,baseDate:baseDate,exactN:exactN,n:n,wkv:2};
}
// Vult posities aan die bij het aanmaken van de snapshot geen verse koers hadden.
function fillSnapshotGaps(s,kind,fresh){
  if(!s||!s.px) return false;
  var now=new Date(),ps=periodStart(kind,now),psY=ymd(ps);
  var minY=ymd(new Date(ps.getFullYear(),ps.getMonth(),ps.getDate()-7));
  var book=bookGet(),tx=lsGet(PK.tx)||[],ch=false,sTs=s.ts||now.getTime();
  s.sh=s.sh||{};s.tts=s.tts||{};s.vals=s.vals||{};s.eP=s.eP||{};
  H.forEach(function(h){
    if(s.px[h.ticker]!==undefined) return;
    if(h.ccy==='USD'&&(!fresh||fresh[h.ticker]!=='\u2713')) return;
    var bp=bookBefore(book,h.ticker,psY,minY),p,t0;
    if(bp){p=bp.px;t0=ps.getTime();}else{p=h.price;t0=sTs;}
    var shr=Math.max(0,h.shares-netTxShares(tx,h.ticker,t0));
    s.px[h.ticker]=p;s.sh[h.ticker]=shr;s.tts[h.ticker]=t0;
    if(h.ccy==='USD')s.vals[h.ticker]=shr*p;else s.eP[h.ticker]=shr*p;
    ch=true;
  });
  return ch;
}

// P&L sinds snapshot. opt (optioneel, voor het afsluiten van een periode):
//   opt.px = {ticker: slotkoers}, opt.fx = EUR/USD op het einde, opt.untilTs = einde periode.
// Resultaat: total = echte verandering in euro INCLUSIEF wisselkoerseffect (zelfde basis als
// het dagresultaat), stock = puur koerseffect, fx = wisselkoerseffect (total - stock).
// Bijkopen/verkopen uit de transactielog tellen als geldstroom, niet als winst/verlies.
function calcPnL(snap,opt){
  if(!snap)return null;
  opt=opt||{};
  var fxNow=opt.fx||EUR_USD;
  var fxBase=(snap.eurUsd>0)?snap.eurUsd:fxNow;
  var snapTs=snap.ts||Date.parse((snap.date||'1970-01-01')+'T'+(snap.time||'00:00')+':00')||0;
  var tx=lsGet(PK.tx)||[];
  var cur={};H.forEach(function(h){cur[h.ticker]=h;});
  var all={};
  Object.keys(cur).forEach(function(k){all[k]=1;});
  if(snap.px)Object.keys(snap.px).forEach(function(k){all[k]=1;});
  if(snap.vals)Object.keys(snap.vals).forEach(function(k){all[k]=1;});
  if(snap.eP)Object.keys(snap.eP).forEach(function(k){all[k]=1;});
  tx.forEach(function(t){if(t.ts>snapTs)all[t.tk]=1;});
  var by={},ud=0,ed=0,usdEur=0;
  Object.keys(all).forEach(function(tk){
    var h=cur[tk];
    var ccy=h?h.ccy:((snap.eP&&snap.eP[tk]!==undefined)?'EUR':((tx.filter(function(t){return t.tk===tk;})[0]||{}).ccy||'USD'));
    var curSh=h?h.shares:0;
    var curPx=h?((opt.px&&opt.px[tk]>0)?opt.px[tk]:h.price):0;
    var t0=(snap.tts&&snap.tts[tk])||snapTs;
    if(opt.untilTs&&h) curSh=Math.max(0,curSh-netTxShares(tx,tk,opt.untilTs-1));
    var refPx=snap.px?snap.px[tk]:undefined,refSh=snap.sh?snap.sh[tk]:undefined;
    var rawVal=(ccy==='USD')?(snap.vals?snap.vals[tk]:undefined):(snap.eP?snap.eP[tk]:undefined);
    if(refPx===undefined&&rawVal!==undefined){
      if(refSh>0) refPx=rawVal/refSh;
      else if(curSh>0){refPx=rawVal/curSh;refSh=curSh;}
    }
    if(refPx===undefined){refPx=0;refSh=0;}
    if(refSh===undefined) refSh=curSh;
    if(refSh>0&&curPx>0){var ratio=refPx/curPx;if(ratio<0.33||ratio>3.0) return;} // split of foute referentie
    var flowsN=0,flowsE=0,txSh=0,fxT=(ccy==='USD');
    tx.forEach(function(t){
      if(t.tk!==tk||!(t.ts>t0)) return;
      if(opt.untilTs&&t.ts>=opt.untilTs) return;
      txSh+=t.sh;flowsN+=t.sh*t.px;flowsE+=fxT?t.sh*t.px/(t.fx||fxNow):t.sh*t.px;
    });
    // Aandelenwijzigingen zonder transactie (handmatige correctie): P&L-neutraal behandelen
    var unexplained=curSh-(refSh+txSh),effRefSh=refSh;
    if(unexplained>1e-6){flowsN+=unexplained*curPx;flowsE+=fxT?unexplained*curPx/fxNow:unexplained*curPx;}
    else if(unexplained<-1e-6){effRefSh=Math.max(0,refSh+unexplained);}
    if(effRefSh===0&&txSh===0&&curSh===0) return;
    var diffN=curSh*curPx-effRefSh*refPx-flowsN;
    var basis=effRefSh*refPx+Math.max(0,flowsN);
    var pct=basis>0?diffN/basis*100:0;
    if(ccy==='USD'){
      var eurDiff=curSh*curPx/fxNow-effRefSh*refPx/fxBase-flowsE;
      by[tk]={diff:diffN,pct:pct,ccy:'USD',eur:eurDiff,stockEur:diffN/fxNow};
      ud+=diffN;usdEur+=eurDiff;
    } else {
      by[tk]={diff:diffN,pct:pct,ccy:'EUR',eur:diffN,stockEur:diffN};
      ed+=diffN;
    }
  });
  var stock=ud/fxNow+ed,total=usdEur+ed;
  return{by:by,ud:ud,ed:ed,stock:stock,fx:total-stock,total:total,from:snap.date};
}

// Sluit afgelopen week/maand/jaar af en archiveert het resultaat. Draait bij opstart, na
// elke cloud-pull en vóór elke nieuwe snapshot (ook als de app dagenlang open bleef staan).
// Slotwaarde = laatste gekende slotkoers vóór het einde van die periode (uit het koersboek),
// zodat het einde van periode N exact het begin van periode N+1 is: geen gaten, geen dubbels.
function rolloverPeriods(){
  var now=new Date(),changed=false,book=bookGet();
  [{k:PK.w,hk:PK.wh,f:'week',fn:isoWeek,max:16},
   {k:PK.m,hk:PK.mh,f:'month',fn:isoMonth,max:12},
   {k:PK.y,hk:PK.yh,f:'year',fn:isoYear,max:10}].forEach(function(d){
    var s=lsGet(d.k);
    if(!s||!s.live||!s[d.f]||s[d.f]===d.fn(now)) return;
    var end=periodEndOf(s,d.f);
    if(!end||end>now) end=periodStart(d.f,now);
    var endY=ymd(end),opt={px:{},untilTs:end.getTime()},used=0;
    H.forEach(function(h){var b=bookBefore(book,h.ticker,endY,null);if(b){opt.px[h.ticker]=b.px;used++;}});
    var fx=bookBefore(book,'EURUSD',endY,null);if(fx)opt.fx=fx.px;
    var p=calcPnL(s,opt);
    var hist=(lsGet(d.hk)||[]).filter(function(e){return e&&e[d.f]!==s[d.f];});
    var entry={date:s.date,total:p?Math.round(p.total):0,stock:p?Math.round(p.stock):0,fx:p?Math.round(p.fx):0,v:2};
    entry[d.f]=s[d.f];
    if(!used) entry.approx=true; // geen slotkoersen gekend: laatst opgehaalde koersen gebruikt
    hist.unshift(entry);
    hist.sort(function(a,b){return String(b[d.f]||'').localeCompare(String(a[d.f]||''));});
    lsSet(d.hk,hist.slice(0,d.max));lsSet(d.k,null);changed=true;
  });
  return changed;
}

// Eenmalig/idempotent: weeklabels die met de oude, foute isoWeek gemaakt zijn corrigeren.
function migrateWeekLabels(){
  var w=lsGet(PK.w);
  if(w&&!w.wkv){if(w.week)w.week=shiftOldWeekLabel(w.week);w.wkv=2;lsSet(PK.w,w);}
  [PK.m,PK.y].forEach(function(k){var s=lsGet(k);if(s&&!s.wkv){if(s.week)s.week=shiftOldWeekLabel(s.week);s.wkv=2;lsSet(k,s);}});
  var wh=lsGet(PK.wh);
  if(Array.isArray(wh)){
    var cw=isoWeek(new Date()),ch=false;
    wh=wh.filter(function(e){
      if(!e) return false;
      if(!e.v){
        // exacte entries (snapshot) hadden het foute label; geschatte (uit dagdata) waren al juist
        if(!e.est&&e.week)e.week=shiftOldWeekLabel(e.week);
        e.v=2;ch=true;
      }
      if(e.est&&e.week===cw){ch=true;return false;} // lopende week hoort niet in de historiek
      return true;
    });
    if(ch){wh.sort(function(a,b){return String(b.week||'').localeCompare(String(a.week||''));});lsSet(PK.wh,wh);}
  }
}

// ─── FX-IMPACT (wisselkoers-effect op de portefeuille, los van koersbewegingen) ──
function fxImpact(oldRate,currentUsdTotal){
  if(!oldRate||!currentUsdTotal) return null;
  var eurAtOld=currentUsdTotal/oldRate;
  var eurAtNew=currentUsdTotal/EUR_USD;
  var impact=eurAtNew-eurAtOld; // positief = EUR-waarde gestegen door wisselkoers
  var ratePct=(EUR_USD-oldRate)/oldRate*100;
  return{ratePct:ratePct,impact:impact,oldRate:oldRate,newRate:EUR_USD};
}
function currentUsdTotal(){
  var t=0;H.forEach(function(h){if(h.ccy==='USD')t+=h.shares*h.price;});return t;
}

// ─── NAVIGATIE ───────────────────────────────────────────────────────────────
function go(id,btn){
  var panes=document.querySelectorAll('.tab-pane');
  for(var i=0;i<panes.length;i++) panes[i].classList.remove('active');
  var btns=document.querySelectorAll('.nb');
  for(var i=0;i<btns.length;i++) btns[i].classList.remove('on');
  document.getElementById('pane-'+id).classList.add('active');
  btn.classList.add('on');
}

// ─── MODALS ──────────────────────────────────────────────────────────────────
function openEurModal(){
  var s=lsGet('carl-eur-manual')||{};
  var euEl=document.getElementById('iEurUsd');
  if(euEl) euEl.value=s.EURUSD||EUR_USD;
  if(s.VUSA) document.getElementById('iVusa').value=s.VUSA;
  if(s.DIET) document.getElementById('iDiet').value=s.DIET;
  document.getElementById('eurModal').classList.add('open');
}
function closeEurModal(){document.getElementById('eurModal').classList.remove('open');}
function saveEur(){
  var euEl=document.getElementById('iEurUsd');
  var eu=euEl?parseFloat(euEl.value):NaN;
  var v=parseFloat(document.getElementById('iVusa').value);
  var d=parseFloat(document.getElementById('iDiet').value);
  var s=lsGet('carl-eur-manual')||{};
  if(!isNaN(eu)&&eu>0){
    s.EURUSD=eu;
    EUR_USD=eu;
    eurUsdPrevClose=EUR_USD;
    var kEl=document.getElementById('kEur');
    var kSub=document.getElementById('kEurSub');
    if(kEl) kEl.textContent=eu.toFixed(4);
    if(kSub) kSub.innerHTML='<span class="mu">handmatig ingevoerd</span>';
  }
  if(!isNaN(v)) s.VUSA=v;
  if(!isNaN(d)) s.DIET=d;
  s.date=isoDate();
  lsSet('carl-eur-manual',s);
  H.forEach(function(h){
    if(h.ticker==='VUSA'&&!isNaN(v)) h.price=v;
    if(h.ticker==='DIET'&&!isNaN(d)) h.price=d;
  });
  updateEurSt();
  closeEurModal();
  updateAll();
}
function loadEurManual(){
  var s=lsGet('carl-eur-manual');
  if(!s) return;
  if(s.EURUSD&&s.EURUSD>0){
    EUR_USD=s.EURUSD;
    var kEl=document.getElementById('kEur');
    if(kEl) kEl.textContent=EUR_USD.toFixed(4);
    var kSub=document.getElementById('kEurSub');
    if(kSub) kSub.innerHTML='<span class="mu">handmatig ('+s.date+')</span>';
  }
  H.forEach(function(h){
    if(h.ticker==='VUSA'&&s.VUSA) h.price=s.VUSA;
    if(h.ticker==='DIET'&&s.DIET) h.price=s.DIET;
  });
  updateEurSt();
}
function updateEurSt(){
  var s=lsGet('carl-eur-manual');
  var el=document.getElementById('eurSt');
  if(s&&(s.VUSA||s.DIET||s.EURUSD)){
    el.textContent=(s.EURUSD?'EUR/USD: '+s.EURUSD+' \u00b7 ':'')+('VUSA: \u20ac'+(s.VUSA||'?'))+' \u00b7 D\'Ieteren: \u20ac'+(s.DIET||'?')+' \u00b7 '+s.date;
  } else {
    el.textContent='VUSA & D\'Ieteren \u00b7 tik om in te voeren';
  }
}
function openKeyModal(){
  document.getElementById('iKey').value=lsGet('carl-fh')||'';
  document.getElementById('keyModal').classList.add('open');
}
function updateKeySt(){
  var k=lsGet('carl-fh');
  var el=document.getElementById('keySt');
  if(!el) return;
  el.textContent=k?('actief \u00b7 ...'+k.slice(-4)):'tik om in te voeren';
}
function openFmpModal(){
  document.getElementById('iFmp').value=lsGet('carl-fmp')||'';
  document.getElementById('fmpModal').classList.add('open');
}
function closeFmpModal(){document.getElementById('fmpModal').classList.remove('open');}
function saveFmp(){
  var k=document.getElementById('iFmp').value.replace(/\s/g,'');
  if(!k) return;
  lsSet('carl-fmp',k);cloudSyncDebounced();
  closeFmpModal();
  updateFmpKeySt();
  var fhKey=lsGet('carl-fh');
  if(fhKey) fetchTargets(fhKey);
}
function updateFmpKeySt(){
  var k=lsGet('carl-fmp');
  var el=document.getElementById('fmpKeySt');
  if(!el) return;
  el.textContent=k?('actief \u00b7 ...'+k.slice(-4)):'tik om in te voeren \u00b7 gratis op financialmodelingprep.com';
}

// ─── DIVIDEND (BusinessQuant automatisch + handmatige terugval) ──────────────
function openBqModal(){
  document.getElementById('iBq').value=lsGet('carl-bq')||'';
  document.getElementById('bqModal').classList.add('open');
}
function closeBqModal(){document.getElementById('bqModal').classList.remove('open');}
function saveBq(){
  var k=document.getElementById('iBq').value.replace(/\s/g,'');
  if(!k) return;
  lsSet('carl-bq',k);cloudSyncDebounced();
  closeBqModal();
  updateBqKeySt();
  fetchDividends();
}
function updateBqKeySt(){
  var k=lsGet('carl-bq');
  var el=document.getElementById('bqKeySt');
  if(!el) return;
  el.textContent=k?('actief \u00b7 ...'+k.slice(-4)):'tik om in te voeren \u00b7 gratis op businessquant.com';
}

function openDivModal(){
  var man=lsGet('carl-div-manual')||{};
  var list=document.getElementById('divEditList');
  if(list){
    list.innerHTML=H.map(function(h,i){
      var sym=h.ccy==='EUR'?'\u20ac':'$';
      var v=(man[h.ticker]!==undefined)?man[h.ticker]:'';
      return '<div style="margin-bottom:10px"><div style="font-size:12px;color:var(--t2);margin-bottom:4px">'+h.ticker+' \u2014 '+h.name+' ('+sym+'/jaar)</div>'+
        '<input class="minp" id="dv-'+i+'" type="number" step="any" placeholder="0 = geen dividend" value="'+v+'" style="margin-bottom:0"></div>';
    }).join('');
  }
  document.getElementById('divModal').classList.add('open');
}
function closeDivModal(){document.getElementById('divModal').classList.remove('open');}
function saveDivManual(){
  var man=lsGet('carl-div-manual')||{};
  H.forEach(function(h,i){
    var el=document.getElementById('dv-'+i);
    if(!el) return;
    var raw=(el.value||'').trim();
    if(raw===''){
      delete man[h.ticker]; // leeg veld -> geen handmatige override, auto mag beslissen
    } else {
      var v=parseFloat(raw);
      // Ook een expliciete 0 bewaren: dat is een bewuste correctie ('keert niets uit')
      // die de foute auto-waarde overschrijft.
      man[h.ticker]=isNaN(v)?0:v;
    }
  });
  lsSet('carl-div-manual',man);
  closeDivModal();
  renderDividends();
  cloudSyncDebounced();
}

// Haalt automatisch dividend op via BusinessQuant (gratis, sleutel vereist). Voor tickers
// waar dat niet lukt (geen dekking, geen sleutel, netwerkfout) valt de weergave terug op
// een handmatig ingevuld bedrag (carl-div-manual), zodat het overzicht sowieso werkt.
var divAuto={}; // {ticker: {ttm, yield}} — enkel automatisch opgehaalde waarden
function fetchDividends(){
  var bqKey=lsGet('carl-bq');
  if(!bqKey){ renderDividends(); return Promise.resolve(); }
  var proms=H.map(function(h){
    return fetch('https://data.businessquant.com/dividends?ticker='+h.ticker+'&mode=dps&api_key='+bqKey)
      .then(function(r){return r.ok?r.json():null;})
      .then(function(d){
        var ttm=d&&d.metadata&&typeof d.metadata.ttmdividend==='number'?d.metadata.ttmdividend:null;
        if(ttm&&ttm>0) divAuto[h.ticker]={ttm:ttm,yield:d.metadata.divyield};
      })
      .catch(function(){});
  });
  return Promise.all(proms).then(renderDividends);
}

function renderDividends(){
  var man=lsGet('carl-div-manual')||{};
  var section=document.getElementById('divSection');
  var list=document.getElementById('divList');
  if(!section||!list) return;
  var rows=[];
  var totEur=0, portValEur=0;
  H.forEach(function(h){
    var posValEur=h.ccy==='USD'?h.shares*h.price/EUR_USD:h.shares*h.price;
    portValEur+=posValEur;
    var perShare=null, src=null;
    // Handmatige invoer wint ALTIJD van de automatische bron. Zo kun je foute auto-data
    // corrigeren. Een expliciete 0 ('keert niets uit') telt ook als geldige correctie en
    // verbergt de positie uit het dividendoverzicht.
    if(man[h.ticker]!==undefined&&man[h.ticker]!==null&&man[h.ticker]!==''){
      perShare=parseFloat(man[h.ticker]); src='handmatig';
      if(isNaN(perShare)||perShare<=0) return; // handmatig 0 of leeg -> geen dividend tonen
    } else if(divAuto[h.ticker]){
      perShare=divAuto[h.ticker].ttm; src='auto';
      if(!perShare||perShare<=0) return;
    } else {
      return; // geen data
    }
    var annualEur=h.ccy==='USD'?(perShare*h.shares)/EUR_USD:(perShare*h.shares);
    totEur+=annualEur;
    var yld=posValEur>0?(annualEur/posValEur*100):0;
    rows.push({tk:h.ticker,name:h.name,amt:annualEur,yld:yld,src:src});
  });
  if(!rows.length){ section.style.display='none'; return; }
  section.style.display='block';
  rows.sort(function(a,b){return b.amt-a.amt;});
  setText('divTotal','\u20ac'+n2(totEur)+' / jaar');
  var portYld=portValEur>0?(totEur/portValEur*100):0;
  setText('divYield',portYld.toFixed(2)+'%');
  list.innerHTML=rows.map(function(r){
    return '<div class="dv-row"><div><span class="dv-tk">'+r.tk+'</span><span class="dv-src">'+(r.src==='auto'?'auto':'handmatig')+'</span></div>'+
      '<div class="dv-r"><div class="dv-amt">\u20ac'+n2(r.amt)+'</div><div class="dv-yld">'+r.yld.toFixed(2)+'% yield</div></div></div>';
  }).join('');
}
function closeKeyModal(){document.getElementById('keyModal').classList.remove('open');}
function saveKey(){
  var k=document.getElementById('iKey').value.replace(/\s/g,'');
  if(!k) return;
  lsSet('carl-fh',k);cloudSyncDebounced();
  closeKeyModal();
  updateKeySt();
  document.getElementById('kbanner').style.display='none';
  doFetch(k);
}

// ─── LIVE FETCH ──────────────────────────────────────────────────────────────
function onLiveClick(){
  var k=lsGet('carl-fh');
  if(!k){openKeyModal();return;}
  doFetch(k);
}

function doFetch(fhKey){
  var btn=document.getElementById('liveBtn');
  var st=document.getElementById('liveSt');
  if(btn){btn.disabled=true;btn.textContent='\u29bf Ophalen...';}

  var prog={};
  USD_SYMS.forEach(function(s){prog[s]='\u25cc';});
  function render(){
    if(!st) return;
    st.textContent=USD_SYMS.map(function(s){
      return(prog[s]==='\u2713'?'\u2713':'\u25cc')+' '+s;
    }).join('  ');
  }
  render();

  // Timeout-fallback: na 12s altijd afronden
  var fired=false;
  var tmr=setTimeout(function(){
    if(!fired){fired=true;onFetchDone(btn,st);}
  },12000);

  fetchVIX(fhKey);
  fetchTargets(fhKey);
  fetchEurUsd(fhKey);

  var usdDiag={};
  var promises=USD_SYMS.map(function(sym){
    return fetch('https://finnhub.io/api/v1/quote?symbol='+sym+'&token='+fhKey)
      .then(function(r){
        usdDiag[sym+'_http']=r.status;
        if(r.status===429) throw new Error('rate-limit');
        return r.json();
      })
      .then(function(d){
        if(d&&d.c>0){
          H.forEach(function(h){
            if(h.ticker===sym&&h.ccy==='USD'){
              h.price=Math.round(d.c*100)/100;
              h.pc=Math.round((d.pc>0?d.pc:d.c)*100)/100;
              h.pl=(h.price-h.avg)/h.avg*100;
              h.dayPct=d.dp||0;
              h.qt=d.t||null;h.src='Finnhub';
            }
          });
          prog[sym]='\u2713';
        } else {
          usdDiag[sym]=d&&d.error?d.error:'leeg';
        }
        render();
      })
      .catch(function(e){usdDiag[sym]='fetch-fout: '+(e.message||e);render();});
  });

  Promise.allSettled(promises).then(function(){
    if(!fired){fired=true;clearTimeout(tmr);onFetchDone(btn,st);}
  });

  window.__lastUsdDiag=usdDiag;
  window.__lastProg=prog;
}

function onFetchDone(btn,st){
  var diag=window.__lastUsdDiag||{};
  var prog2=window.__lastProg||{};
  var okCount=USD_SYMS.filter(function(s){return prog2[s]==='\u2713';}).length;
  var anySuccess=okCount>0;
  var httpCodes=Object.keys(diag).filter(function(k){return k.indexOf('_http')>-1;}).map(function(k){return diag[k];});
  var uniqueHttp=httpCodes.filter(function(v,i){return httpCodes.indexOf(v)===i;});

  if(!anySuccess&&uniqueHttp.length){
    var reason='onbekende fout';
    if(uniqueHttp.indexOf(401)>-1||uniqueHttp.indexOf(403)>-1) reason='ongeldige sleutel (HTTP '+uniqueHttp.join(',')+')';
    else if(uniqueHttp.indexOf(429)>-1) reason='rate-limit bereikt (HTTP 429) \u2014 even wachten';
    else if(uniqueHttp.length&&uniqueHttp[0]>=500) reason='Finnhub-serverfout (HTTP '+uniqueHttp.join(',')+')';
    if(st) st.textContent='\u2717 '+reason+' (sleutel niet gewijzigd)';
  }

  var now=new Date();
  var histChanged=false; // alleen naar cloud pushen bij een ECHTE historiek-wijziging
  // FIX: eerst slotkoersen bewaren, dan afgelopen periodes correct afsluiten (ook als de app
  // over het weekend open bleef), en pas daarna nieuwe referenties maken — en ENKEL met
  // verse koersen (vroeger werd bij een mislukte ophaling een oude/hardgecodeerde koers
  // als referentie voor de hele week/maand/jaar vastgelegd).
  if(anySuccess){ recordCloses(prog2); if(rolloverPeriods()) histChanged=true; }
  if(anySuccess){
    [[PK.w,'week',isoWeek],[PK.m,'month',isoMonth],[PK.y,'year',isoYear]].forEach(function(d){
      var s=lsGet(d[0]);
      if(!s||!s.live||s[d[1]]!==d[2](now)){lsSet(d[0],snapNow(true,d[1],prog2));histChanged=true;}
      else if(fillSnapshotGaps(s,d[1],prog2)){lsSet(d[0],s);histChanged=true;}
    });
    if(archiveDayIfNeeded()) histChanged=true; // dag-historiek enkel met verse data
  }
  // Sla de laatst opgehaalde live prijzen op zodat ze bij heropening herladen worden
  if(anySuccess){
    var snap={};
    H.forEach(function(h){
      if(h.ccy==='USD') snap[h.ticker]={price:h.price,pc:h.pc,pl:h.pl,dayPct:h.dayPct,qt:h.qt};
    });
    lsSet('carl-live-prices',{p:snap,t:new Date().toLocaleTimeString('nl-BE',{hour:'2-digit',minute:'2-digit'})+' '+isoDate(),eurUsd:EUR_USD});

    // USD-waarde in euro nu berekenen
    var curTot=0,usdTot=0;
    H.forEach(function(h){
      if(h.ccy==='USD'){curTot+=h.shares*h.price/EUR_USD;usdTot+=h.shares*h.price;}
      else curTot+=h.shares*h.price;
    });
    // Dagelijks referentiepunt: bewaar de USD-slotwaarde per beursdag.
    // Bij een NIEUWE beursdag wordt de vorige dag de referentie voor de trend-indicator.
    var today=isoDate();
    var dayRef=lsGet('carl-usd-dayref')||{};
    if(dayRef.date&&dayRef.date!==today){
      lsSet('carl-usd-prevday',{usd:dayRef.usd,tot:dayRef.tot,rate:dayRef.rate||EUR_USD,date:dayRef.date});
      histChanged=true; // nieuwe beursdag = referentiepunt verschoven
    }
    lsSet('carl-usd-dayref',{usd:usdTot,tot:curTot,rate:EUR_USD,date:today});

    // 'carl-lastval' blijft de laatst-opgehaalde totale waarde (voor heropening-weergave)
    lsSet('carl-lastval',{v:curTot,usd:usdTot,t:new Date().toLocaleTimeString('nl-BE',{hour:'2-digit',minute:'2-digit'})+' '+isoDate()});
  }
  // Alleen naar cloud pushen bij een echte historiek-wijziging (snapshot/dag/beursdag).
  // Zo snoepen automatische verversingen niet onnodig van de JSONBin-requestlimiet.
  if(histChanged) cloudSyncDebounced();
  updateAll();
  if(btn){
    btn.disabled=false;
    if(isUSOpen()){
      btn.className='refresh open-m';btn.textContent='\u25cf Markt open \u00b7 Vernieuwen';
    } else {
      btn.className='refresh closed-m';btn.textContent='Vernieuwen';
    }
  }
  if(anySuccess||!uniqueHttp.length){
    setTimeout(function(){if(st) st.textContent='';},3000);
  }
}

// ─── UPDATE ALL ──────────────────────────────────────────────────────────────
function updateAll(){
  updateKPI();
  renderHoldings();
  renderPerf();
  renderDag();
  renderMkt();
  renderVIX();
  renderChartsLazy();
  renderDividends();
  renderTotalWealth();
}

function updateKPI(){
  var tU=0,cU=0,tE=0,cE=0;
  H.forEach(function(h){
    if(h.ccy==='USD'){tU+=h.shares*h.price;cU+=h.shares*h.avg;}
    else{tE+=h.shares*h.price;cE+=h.shares*h.avg;}
  });
  var tot=tU/EUR_USD+tE,cost=cU/EUR_USD+cE,pnl=tot-cost,pct=pnl/cost*100;
  var hv=document.getElementById('heroVal');
  if(hv){hv.textContent='\u20ac'+n2(tot);}
  setText('heroSub','Kostenbasis \u20ac'+n2(cost)+' \u00b7 '+isoDate());
  setText('kCost','\u20ac'+n2(cost));
  var kp=document.getElementById('kPnl');
  if(kp){kp.textContent=(pnl>=0?'+':'\u2212')+'\u20ac'+n2(Math.abs(pnl));kp.className='kval '+(pnl>=0?'up':'dn');}
  setText('kPnlP',fmtPct(pct)+' rendement');

  // Hero-indicator: dagresultaat op basis van Finnhub previous-close, IDENTIEK aan de Dag-tab.
  // (Vroeger vergeleek de hero met een opgeslagen snapshot op een willekeurig tijdstip, wat
  //  een ander bedrag gaf dan de Dag-tab. Nu delen beide dezelfde bron: dayResultEur.)
  var trendEl=document.getElementById('heroTrend');
  var trendPctEl=document.getElementById('heroTrendPct');
  var stockEl=document.getElementById('heroStock');
  var dr=dayResultEur(); // {eur, stockEur, pct, hasData}
  if(trendEl&&dr.hasData){
    var arrow=dr.eur>=0?'\u25b2':'\u25bc';
    var cls=dr.eur>=0?'up':'dn';
    trendEl.className='hero-chip '+cls;
    trendEl.innerHTML=arrow+' '+(dr.eur>=0?'+':'\u2212')+'\u20ac'+n2(Math.abs(dr.eur));
    if(trendPctEl) trendPctEl.textContent='('+fmtPct(dr.pct)+') vandaag';
    if(stockEl){
      stockEl.innerHTML='<span class="'+(dr.stockEur>=0?'up':'dn')+'">'+(dr.stockEur>=0?'+':'\u2212')+'\u20ac'+n2(Math.abs(dr.stockEur))+'</span> zonder wisselkoerseffect';
    }
  } else if(trendEl){
    trendEl.textContent='';if(trendPctEl)trendPctEl.textContent='';if(stockEl)stockEl.textContent='';
  }

  renderMovers();
  renderAllocDonut(tot);
  renderSparkline();

  // Wisselkoers-impact (nu in instellingen/verborgen, alleen invullen als aanwezig)
  var sens=tU*0.01/(EUR_USD*EUR_USD);
  setText('fxSens','Gevoeligheid: elke +0,01 EUR/USD \u2248 \u2212\u20ac'+n2(sens)+' portefeuillewaarde.');
  setText('fxUSD','$'+n2(tU));
  setText('fxConv','\u20ac'+n2(tU/EUR_USD));
  setText('fxTotal','\u20ac'+n2(tot));
  var vusaH=H.find(function(h){return h.ticker==='VUSA';});
  var dietH=H.find(function(h){return h.ticker==='DIET';});
  if(vusaH) setText('fxVUSA','\u20ac'+n2(vusaH.shares*vusaH.price));
  if(dietH) setText('fxDIET','\u20ac'+n2(dietH.shares*dietH.price));
}

// ── Gedeeld dagresultaat (Finnhub previous-close) ────────────────────────────
// Eén bron van waarheid voor het dagresultaat, gebruikt door zowel de hero als de
// Dag-tab, zodat ze nooit meer een verschillend bedrag tonen.
//  eur      = totale dagbeweging incl. wisselkoerseffect (zoals de Dag-tab som + FX)
//  stockEur = puur koersbeweging aandelen, zonder wisselkoerseffect
//  pct      = dagpercentage t.o.v. de waarde bij vorig slot
function dayResultEur(){
  var stockUsd=0, prevValUsd=0, curValUsd=0, any=false;
  H.forEach(function(h){
    if(h.ccy==='USD'&&h.price>0&&h.pc>0){
      stockUsd+=(h.price-h.pc)*h.shares; // koersbeweging in USD
      prevValUsd+=h.pc*h.shares;         // waarde bij vorig slot (USD)
      curValUsd+=h.price*h.shares;       // huidige waarde (USD)
      any=true;
    }
  });
  if(!any) return {eur:0,stockEur:0,pct:0,hasData:false};
  // Puur aandeel-effect: koersbeweging omgerekend tegen de HUIDIGE koers
  var stockEur=stockUsd/EUR_USD;
  // Totaal incl. wisselkoerseffect: vergelijk eurowaarde nu vs. bij vorig slot.
  // Voor 'vorig slot' gebruiken we de echte vorige EUR/USD-koers als die bekend is.
  var euDay=lsGet('carl-eurusd-day');
  var prevRate=(euDay&&euDay.prev&&euDay.prev>0)?euDay.prev:EUR_USD;
  var totalEur=(curValUsd/EUR_USD)-(prevValUsd/prevRate);
  var pct=prevValUsd>0?(stockUsd/prevValUsd*100):0;
  return {eur:totalEur,stockEur:stockEur,pct:pct,hasData:true};
}

// ── Beste & slechtste vandaag ────────────────────────────────────────────────
function renderMovers(){
  var withDay=H.filter(function(h){return typeof h.dayPct==='number'&&h.ccy==='USD';});
  if(!withDay.length) return;
  var sorted=withDay.slice().sort(function(a,b){return b.dayPct-a.dayPct;});
  var up=sorted[0], dn=sorted[sorted.length-1];
  if(up){
    setText('mvUpTk',up.ticker);setText('mvUpNm',up.name);
    setText('mvUpPct',(up.dayPct>=0?'+':'')+up.dayPct.toFixed(2)+'%');
    var upEl=document.getElementById('mvUpPct');if(upEl)upEl.className='mv-pct '+(up.dayPct>=0?'up':'dn');
    setText('mvUpPx','$'+n2(up.price));
  }
  if(dn){
    setText('mvDnTk',dn.ticker);setText('mvDnNm',dn.name);
    setText('mvDnPct',(dn.dayPct>=0?'+':'')+dn.dayPct.toFixed(2)+'%');
    var dnEl=document.getElementById('mvDnPct');if(dnEl)dnEl.className='mv-pct '+(dn.dayPct>=0?'up':'dn');
    setText('mvDnPx','$'+n2(dn.price));
  }
}

// ── Allocatie-donut ──────────────────────────────────────────────────────────
var ALLOC_COLORS=['#388bfd','#2ea76b','#d29922','#a371f7','#f85149','#39c5cf','#db61a2','#e3b341'];
function renderAllocDonut(tot){
  var host=document.getElementById('allocDonut');
  var leg=document.getElementById('allocLegend');
  if(!host||!leg||!tot) return;
  var parts=H.map(function(h){
    var v=h.ccy==='USD'?h.shares*h.price/EUR_USD:h.shares*h.price;
    return{tk:h.ticker,v:v};
  }).filter(function(p){return p.v>0;}).sort(function(a,b){return b.v-a.v;});
  // Top 5 + rest samenvoegen
  var top=parts.slice(0,5), rest=parts.slice(5);
  if(rest.length){var rv=rest.reduce(function(s,p){return s+p.v;},0);top.push({tk:'Overig',v:rv});}
  var total=parts.reduce(function(s,p){return s+p.v;},0);
  var R=52,C=64,SW=20,circ=2*Math.PI*R,off=0;
  var segs='';
  top.forEach(function(p,i){
    var frac=p.v/total, len=frac*circ;
    var col=ALLOC_COLORS[i%ALLOC_COLORS.length];
    segs+='<circle cx="'+C+'" cy="'+C+'" r="'+R+'" fill="none" stroke="'+col+'" stroke-width="'+SW+'" '+
      'stroke-dasharray="'+len+' '+(circ-len)+'" stroke-dashoffset="'+(-off)+'" transform="rotate(-90 '+C+' '+C+')"/>';
    off+=len;
  });
  host.innerHTML='<svg width="128" height="128" viewBox="0 0 128 128">'+segs+
    '<text x="64" y="60" text-anchor="middle" fill="var(--t1)" font-size="15" font-weight="800">\u20ac'+Math.round(total/1000)+'k</text>'+
    '<text x="64" y="76" text-anchor="middle" fill="var(--t3)" font-size="10">'+parts.length+' posities</text></svg>';
  leg.innerHTML=top.map(function(p,i){
    var col=ALLOC_COLORS[i%ALLOC_COLORS.length];
    var pctv=(p.v/total*100);
    return '<div class="al-li"><span class="al-dot" style="background:'+col+'"></span>'+
      '<span class="al-nm">'+p.tk+'</span><span class="al-vl">'+pctv.toFixed(1)+'%</span></div>';
  }).join('');
  renderCurrencySplit(total);
}

// ── Valutaspreiding ───────────────────────────────────────────────────────────
function renderCurrencySplit(totEur){
  var host=document.getElementById('ccyBar');
  if(!host||!totEur) return;
  var usdEur=0,eurEur=0;
  H.forEach(function(h){
    if(h.ccy==='USD') usdEur+=h.shares*h.price/EUR_USD;
    else eurEur+=h.shares*h.price;
  });
  var usdPct=usdEur/totEur*100, eurPct=eurEur/totEur*100;
  var html='<div class="ccy-head"><span>Valutablootstelling</span><span>\u20ac'+n2(totEur)+'</span></div>';
  html+='<div class="ccy-track">';
  if(usdPct>0) html+='<div class="ccy-seg" style="width:'+usdPct.toFixed(2)+'%;background:#388bfd"></div>';
  if(eurPct>0) html+='<div class="ccy-seg" style="width:'+eurPct.toFixed(2)+'%;background:#e3b341"></div>';
  html+='</div>';
  html+='<div class="ccy-legend">';
  html+='<div class="ccy-li"><span class="ccy-dot" style="background:#388bfd"></span>USD '+usdPct.toFixed(1)+'% <span style="color:var(--t3)">(\u20ac'+n2(usdEur)+')</span></div>';
  html+='<div class="ccy-li"><span class="ccy-dot" style="background:#e3b341"></span>EUR '+eurPct.toFixed(1)+'% <span style="color:var(--t3)">(\u20ac'+n2(eurEur)+')</span></div>';
  html+='</div>';
  host.innerHTML=html;
}

// ── Sparkline: evolutie dagresultaat ─────────────────────────────────────────
function renderSparkline(){
  var wrap=document.getElementById('sparkWrap');
  var host=document.getElementById('sparkSvg');
  if(!wrap||!host) return;
  var dh=(lsGet(PK.dh)||[]).slice(0,30).reverse(); // oud -> nieuw, max 30
  // Enkel entries met een bewaarde totale waarde gebruiken (val). Oudere records vóór
  // deze functie hadden dat veld niet — die laten we simpelweg buiten de lijn.
  var withVal=dh.filter(function(d){return typeof d.val==='number'&&d.val>0;});
  if(withVal.length<2){wrap.style.display='none';return;}
  wrap.style.display='block';
  var vals=withVal.map(function(d){return d.val;});
  var min=Math.min.apply(null,vals), max=Math.max.apply(null,vals);
  var W=340,Hh=64,pad=4;
  var span=(max-min)||1;
  var pts=vals.map(function(v,i){
    var x=pad+(W-2*pad)*i/(vals.length-1);
    var y=pad+(Hh-2*pad)*(1-(v-min)/span);
    return [x,y];
  });
  var d='M'+pts.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' L');
  var first=vals[0], last=vals[vals.length-1];
  var lineCol=last>=first?'#2ea76b':'#f85149';
  var area=d+' L'+pts[pts.length-1][0].toFixed(1)+','+(Hh-pad)+' L'+pts[0][0].toFixed(1)+','+(Hh-pad)+' Z';
  var svg='<svg width="100%" height="'+Hh+'" viewBox="0 0 '+W+' '+Hh+'" preserveAspectRatio="none">';
  svg+='<defs><linearGradient id="spg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+lineCol+'" stop-opacity=".22"/><stop offset="1" stop-color="'+lineCol+'" stop-opacity="0"/></linearGradient></defs>';
  svg+='<path d="'+area+'" fill="url(#spg)"/>';
  svg+='<path d="'+d+'" fill="none" stroke="'+lineCol+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
  var lp=pts[pts.length-1];
  svg+='<circle cx="'+lp[0].toFixed(1)+'" cy="'+lp[1].toFixed(1)+'" r="3" fill="'+lineCol+'"/></svg>';
  host.innerHTML=svg;
  var chg=first>0?((last-first)/first*100):0;
  setText('sparkRng',withVal[0].date+' \u2192 '+withVal[withVal.length-1].date+' \u00b7 '+(chg>=0?'+':'')+chg.toFixed(1)+'%');
}

function setText(id,txt){var el=document.getElementById(id);if(el) el.textContent=txt;}

function renderMkt(){
  var now=new Date();
  var usHolidayToday=isHolidayToday(usHolidays(now.getFullYear()));
  var euHolidayToday=isHolidayToday(euHolidays(now.getFullYear()));
  var usOpen=isUSOpen(),euOpen=isEUOpen();

  var elUS=document.getElementById('mktUS');
  if(elUS){
    var usTxt=usOpen?'\u25cf OPEN \u00b7 sluit 22:00':(usHolidayToday?'\u25cf GESLOTEN \u00b7 feestdag':'\u25cf GESLOTEN \u00b7 opent 15:30');
    elUS.textContent=usTxt;elUS.className=usOpen?'up':'dn';
  }
  var elEU=document.getElementById('mktEU');
  if(elEU){
    var euTxt=euOpen?'\u25cf OPEN \u00b7 sluit 17:30':(euHolidayToday?'\u25cf GESLOTEN \u00b7 feestdag':'\u25cf GESLOTEN \u00b7 opent 09:00');
    elEU.textContent=euTxt;elEU.className=euOpen?'up':'dn';
  }

  var btn=document.getElementById('liveBtn');
  if(btn){
    var busy=btn.textContent.indexOf('...')>-1||btn.disabled;
    if(!busy){
      btn.className=usOpen?'refresh open-m':'refresh closed-m';
      btn.textContent=usOpen?'\u25cf Markt open \u00b7 Vernieuwen':'Vernieuwen';
    }
  }
}

// ─── HOLDINGS ────────────────────────────────────────────────────────────────
function renderHoldings(){
  // Eén platte lijst, alle posities gesorteerd op eurowaarde van groot naar klein.
  var sorted=H.map(function(h){
    var val=h.ccy==='USD'?h.shares*h.price/EUR_USD:h.shares*h.price;
    return {h:h,val:val};
  }).sort(function(a,b){return b.val-a.val;});
  var html='';
  sorted.forEach(function(pair,i){
    var h=pair.h, val=pair.val;
    var id='hd-'+i;
    var plEur=val-(h.ccy==='USD'?h.shares*h.avg/EUR_USD:h.shares*h.avg);
    var sym=h.ccy==='EUR'?'\u20ac':'$';
    var pc=fmtPct(h.pl);
    var cls=h.pl>=0?'up':'dn';
    html+='<div class="hcard" onclick="toggleH(\''+id+'\')">';
    html+='<div class="htop">';
    html+='<div class="hleft">';
    html+='<div class="tbadge">'+h.ticker+'</div>';
    html+='<div><div class="hname">'+h.name+'</div><div class="hcat">'+h.shares+' aandelen \u00b7 \u20ac'+n2(val)+'</div></div>';
    html+='</div>';
    var qtLine=quoteLabel(h);
    html+='<div class="hright">';
    html+='<div class="hprice">'+sym+h.price.toFixed(2)+'</div>';
    html+='<div class="hpl '+cls+'">'+pc+'</div>';
    html+=qtLine;
    html+='</div></div>';
    html+='<div class="hdet" id="'+id+'">';
    html+='<div class="dgrid">';
    html+='<div class="ditem"><div class="dl">Waarde</div><div class="dv">\u20ac'+n2(val)+'</div></div>';
    html+='<div class="ditem"><div class="dl">P&amp;L</div><div class="dv '+cls+'">'+fmtEur(plEur)+'</div></div>';
    html+='<div class="ditem"><div class="dl">Gem. aankoop</div><div class="dv">'+sym+h.avg.toFixed(2)+'</div></div>';
    if(h.target&&h.target>0){
      html+='<div class="ditem"><div class="dl">Koersdoel</div><div class="dv">'+sym+h.target.toFixed(2)+'</div></div>';
      var upCls=h.upside>=0?'up':'dn';
      html+='<div class="ditem"><div class="dl">Upside</div><div class="dv '+upCls+'">'+(h.upside>=0?'+':'')+h.upside+'%</div></div>';
    } else {
      html+='<div class="ditem"><div class="dl">Koersdoel</div><div class="dv mu" style="font-size:12px">geen gratis dekking</div></div>';
    }
    html+='<div class="ditem"><div class="dl">P/E</div><div class="dv">'+h.pe+'</div></div>';
    html+='<div class="ditem"><div class="dl">Free Cash Flow</div><div class="dv">'+h.fcf+'</div></div>';
    var ratingExtra=h.analysts?' <span style="font-size:10px;color:var(--t3)">('+h.analysts+' analisten)</span>':'';
    html+='<div class="ditem"><div class="dl">Rating</div><div class="dv">'+h.rating+ratingExtra+'</div></div>';
    if(h.ccy==='USD'&&h.qt) html+='<div class="ditem"><div class="dl">Laatste koers-update</div><div class="dv" style="font-size:11px">'+fmtQt(h.qt)+'</div></div>';
    html+='</div>';
    if(h.brokers&&h.brokers.length>0){
      html+='<div style="margin-top:8px">';
      h.brokers.forEach(function(b){
        var bv=b.sh*h.price/EUR_USD;
        html+='<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t2);padding:3px 0">';
        html+='<span>'+b.n+' ('+b.sh+' x $'+b.avg.toFixed(2)+')</span>';
        html+='<span>\u20ac'+n2(bv)+'</span></div>';
      });
      html+='</div>';
    }
    html+='</div></div>';
  });
  var cont=document.getElementById('hList');
  if(cont) cont.innerHTML=html;

  var tU=0,cU=0,tE=0,cE=0;
  H.forEach(function(h){
    if(h.ccy==='USD'){tU+=h.shares*h.price;cU+=h.shares*h.avg;}
    else{tE+=h.shares*h.price;cE+=h.shares*h.avg;}
  });
  var tot=tU/EUR_USD+tE,cost=cU/EUR_USD+cE,pnl=tot-cost;
  var el=document.getElementById('hTot');
  if(el){
    el.innerHTML='<div class="stitle">Totaal portefeuille</div>'+
      '<div style="display:flex;justify-content:space-between;align-items:center">'+
      '<div><div style="font-size:22px;font-weight:700">\u20ac'+n2(tot)+'</div>'+
      '<div style="font-size:12px;color:var(--t2)">Kostenbasis \u20ac'+n2(cost)+'</div></div>'+
      '<div style="text-align:right">'+
      '<div style="font-size:18px;font-weight:700" class="'+(pnl>=0?'up':'dn')+'">'+fmtEur(pnl)+'</div>'+
      '<div style="font-size:12px;color:var(--t2)">'+fmtPct(pnl/cost*100)+'</div>'+
      '</div></div>';
  }
}

function toggleH(id){var el=document.getElementById(id);if(el) el.classList.toggle('open');}

// ─── PRESTATIES ───────────────────────────────────────────────────────────────
var periodExpanded={};
function togglePeriodExpand(key){periodExpanded[key]=!periodExpanded[key];renderPerf();}

function entriesInWeek(arr,weekStr){
  return arr.filter(function(e){
    if(!e.date) return false;
    var p=e.date.split('-');
    var d=new Date(parseInt(p[0]),parseInt(p[1])-1,parseInt(p[2]));
    return isoWeek(d)===weekStr;
  });
}
function entriesInMonth(arr,monthStr){
  return arr.filter(function(e){return e.date&&e.date.slice(0,7)===monthStr;});
}
function entriesInYear(arr,yearStr){
  return arr.filter(function(e){return e.date&&e.date.slice(0,4)===yearStr;});
}

function renderPerf(){
  renderPeriod('pWeek','Week P&L',lsGet(PK.w),{
    toggleKey:'week',label:'Per dag',
    getItems:function(snap){
      return entriesInWeek(lsGet(PK.dh)||[],snap.week).map(function(e){return{label:e.date,total:e.total};});
    }
  });
  renderPeriod('pMonth','Maand P&L',lsGet(PK.m),{
    toggleKey:'month',label:'Per week (som dagresultaten binnen deze maand)',
    getItems:function(snap){
      // FIX: vroeger werden week-entries op hun startdatum aan een maand gekoppeld (een week
      // over de maandgrens telde volledig mee bij de vorige maand), geschatte weken en de
      // lopende week ontbraken. Nu: dagresultaten van deze maand gegroepeerd per week.
      var by={};
      entriesInMonth(lsGet(PK.dh)||[],snap.month).forEach(function(e){
        var wk=isoWeek(parseYmd(e.date));by[wk]=(by[wk]||0)+(e.total||0);
      });
      return Object.keys(by).sort().reverse().map(function(k){return{label:k,total:by[k]};});
    }
  });
  renderPeriod('pYear','Jaar P&L',lsGet(PK.y),{
    toggleKey:'year',label:'Per maand',
    getItems:function(snap){
      return entriesInYear(lsGet(PK.mh)||[],snap.year).map(function(e){return{label:e.month,total:e.total};});
    }
  });
  renderHistBlock('pHistWeek','Historiek week',lsGet(PK.wh)||[],'week',8);
  renderHistBlock('pHistMonth','Historiek maand',lsGet(PK.mh)||[],'month',12);
  renderHistBlock('pHistYear','Historiek jaar',lsGet(PK.yh)||[],'year',10);
}

function renderHistBlock(elId,title,arr,key,max){
  var el=document.getElementById(elId);
  if(!el) return;
  if(!arr.length){el.innerHTML='<div class="stitle">'+title+'</div><div class="mu" style="font-size:13px">Geen data</div>';return;}
  var h='<div class="stitle">'+title+'</div>';
  arr.slice(0,max).forEach(function(w){
    var estTag=(w.est||w.approx)?' <span style="font-size:9px;color:var(--t3)">geschat</span>':'';
    h+='<div class="prow"><span style="font-size:12px;color:var(--t2);flex:1">'+w[key]+estTag+'</span>';
    h+='<span class="'+(w.total>=0?'up':'dn')+'" style="font-weight:600">'+fmtEur(w.total)+'</span></div>';
  });
  el.innerHTML=h;
}

function renderPeriod(elId,title,snap,breakdown){
  var el=document.getElementById(elId);
  if(!el) return;
  var pnl=snap?calcPnL(snap):null;
  if(!pnl||!snap||!snap.live){
    var msg=snap&&!snap.live?'Klik Live koersen voor de eerste meting van deze periode':'Klik Live koersen voor data';
    el.innerHTML='<div class="stitle">'+title+'</div><div class="mu" style="font-size:13px">'+msg+'</div>';
    return;
  }
  var cls=pnl.total>=0?'up':'dn';
  var kind=breakdown&&breakdown.toggleKey,curP={week:isoWeek(),month:isoMonth(),year:isoYear()}[kind];
  var stale=kind&&snap[kind]&&curP&&snap[kind]!==curP;
  var h='<div class="stitle">'+title+(stale?' <span style="font-size:10px;color:var(--am)">('+snap[kind]+' \u2014 tik Vernieuwen om af te sluiten)</span>':'')+'</div>';
  h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
  h+='<div class="'+cls+'" style="font-size:22px;font-weight:700">'+fmtEur(pnl.total)+'</div>';
  var refLbl=(snap.exactN&&snap.exactN===snap.n&&snap.baseDate)?('slot '+snap.baseDate):(snap.date+(snap.time?' '+snap.time:'')+(snap.exactN?' (deels slot '+snap.baseDate+')':''));
  h+='<div style="font-size:11px;color:var(--t2)">vs. '+refLbl+'</div></div>';

  // Opsplitsing: koerseffect + wisselkoerseffect = totaal (totaal is incl. wisselkoers,
  // net als het dagresultaat, zodat 'Per dag' optelt tot dit totaal)
  var fxOld=(snap.eurUsd>0)?snap.eurUsd:null;
  var fcP=pnl.fx>=0?'up':'dn';
  h+='<div style="display:flex;justify-content:space-between;align-items:center;background:var(--p2);border-radius:8px;padding:8px 10px;margin-bottom:10px;font-size:11px">'+
    '<span style="color:var(--t2)">Koers '+fmtEur(pnl.stock)+(fxOld?' \u00b7 EUR/USD '+fxOld.toFixed(4)+' \u2192 '+EUR_USD.toFixed(4):'')+'</span>'+
    '<span class="'+fcP+'" style="font-weight:700">FX: '+fmtEur(pnl.fx)+'</span></div>';

  var items=[];
  var keys=Object.keys(pnl.by);
  keys.forEach(function(tk){items.push({ticker:tk,diff:pnl.by[tk].stockEur,pct:pnl.by[tk].pct});});
  items.sort(function(a,b){return b.diff-a.diff;});
  var mx=0;
  items.forEach(function(it){if(Math.abs(it.diff)>mx) mx=Math.abs(it.diff);});
  items.forEach(function(it){
    var c2=it.diff>=0?'up':'dn';
    var bw=mx>0?Math.abs(it.diff)/mx*100:0;
    var bc=it.diff>=0?'var(--up)':'var(--dn)';
    h+='<div class="prow">';
    h+='<span class="ptk">'+it.ticker+'</span>';
    h+='<div class="pbar"><div class="pbf" style="width:'+bw+'%;background:'+bc+'"></div></div>';
    h+='<span class="pval '+c2+'">'+fmtPct(it.pct)+'</span>';
    h+='<span class="peur '+c2+'">'+fmtEur(it.diff)+'</span>';
    h+='</div>';
  });

  if(breakdown){
    var isOpen2=!!periodExpanded[breakdown.toggleKey];
    h+='<div onclick="togglePeriodExpand(\''+breakdown.toggleKey+'\')" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bd);display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-size:11.5px;color:var(--bl)">';
    h+='<span>'+breakdown.label+'</span><span>'+(isOpen2?'\u25b2 verberg':'\u25bc toon')+'</span></div>';
    if(isOpen2){
      var subItems=breakdown.getItems(snap);
      if(!subItems.length){
        h+='<div class="mu" style="font-size:12px;padding:8px 0">Nog geen detaildata beschikbaar voor deze periode</div>';
      } else {
        subItems.forEach(function(si){
          var c3=si.total>=0?'up':'dn';
          h+='<div class="prow" style="padding:6px 0">';
          h+='<span style="font-size:12px;color:var(--t2);flex:1">'+si.label+'</span>';
          h+='<span class="'+c3+'" style="font-weight:600;font-size:12px">'+fmtEur(si.total)+'</span>';
          h+='</div>';
        });
      }
    }
  }

  el.innerHTML=h;
}

// ─── DAG RAPPORT ─────────────────────────────────────────────────────────────
// ─── DAG-ARCHIVERING (enkel na een echte live fetch, nooit bij gewone page-load) ──
function archiveDayIfNeeded(){
  var items=[];
  var latestQt=0;
  H.forEach(function(h){
    if(h.ccy==='USD'&&h.price>0&&h.pc>0){
      items.push({dagEur:(h.price-h.pc)*h.shares/EUR_USD});
      if(h.qt&&h.qt>latestQt) latestQt=h.qt;
    }
  });
  if(!items.length) return false; // geen verse pc-data: niets archiveren
  // Dagresultaat incl. wisselkoerseffect via de gedeelde bron, zodat de historiek
  // dezelfde bedragen toont als de hero en de Dag-tab-headline.
  var dr=dayResultEur();
  var tot=dr.hasData?dr.eur:0;

  // Totale portefeuillewaarde nu (voor de evolutie-grafiek, los van het dagresultaat)
  var totVal=0;
  H.forEach(function(h){totVal+=(h.ccy==='USD')?h.shares*h.price/EUR_USD:h.shares*h.price;});

  // Datum van de koers afleiden uit de Finnhub-tijdstempel zelf, niet uit 'nu'
  // (zo blijft archivering correct, ook als je pas de volgende ochtend vóór beursopening checkt)
  var dateStr=latestQt?nyYmd(latestQt):isoDate();
  var dayOfWeek=parseYmd(dateStr).getDay();
  if(dayOfWeek===0||dayOfWeek===6) return false; // veiligheidsnet: weekend-tijdstempel negeren

  // FIX: entry voor deze datum overal zoeken (niet enkel bovenaan), dubbels verwijderen en
  // sorteren. Vroeger kon dezelfde dag twee keer in de lijst komen (bv. na een cloud-sync)
  // en werd hij dan dubbel opgeteld in 'Per dag' en in de geschatte week/maand.
  var dh=(lsGet(PK.dh)||[]).filter(function(e){return e&&e.date;});
  var entry={date:dateStr,time:new Date().toLocaleTimeString('nl-BE',{hour:'2-digit',minute:'2-digit'}),total:Math.round(tot),val:Math.round(totVal)};
  var isNew=!dh.some(function(e){return e.date===dateStr;});
  dh=dh.filter(function(e){return e.date!==dateStr;});
  dh.push(entry);
  dh.sort(function(a,b){return b.date.localeCompare(a.date);});
  lsSet(PK.dh,dh.slice(0,260)); // ~1 jaar beursdagen (was 60 = amper 3 maanden)
  return isNew; // nieuwe dag toegevoegd = echte historiek-wijziging
}

function renderDag(){
  var items=[];
  H.forEach(function(h){
    if(h.ccy==='USD'&&h.price>0){
      var pcVal=h.pc>0?h.pc:null;
      var dagEur=pcVal?(h.price-pcVal)*h.shares/EUR_USD:0;
      var dpct=pcVal?h.dayPct||((h.price-pcVal)/pcVal*100):null;
      items.push({ticker:h.ticker,name:h.name,price:h.price,pc:pcVal,pct:dpct,dagEur:dagEur,hasDay:pcVal!==null});
    }
  });
  items.sort(function(a,b){return b.dagEur-a.dagEur;});

  var dayItems=items.filter(function(it){return it.hasDay;});
  if(!items.length){
    setText('dagTot','\u2014');setText('dagBest','\u2014');setText('dagBestP','\u2014');
    var t0=document.getElementById('dagTbl');
    if(t0) t0.innerHTML='<div class="mu" style="font-size:13px">Klik Live koersen voor dagdata</div>';
    return;
  }

  var tot=0;
  dayItems.forEach(function(it){tot+=it.dagEur;});
  var best=dayItems.length?dayItems[0]:items[0];

  // Dagresultaat-headline: gebruik de gedeelde bron (incl. wisselkoerseffect), zodat de
  // Dag-tab exact hetzelfde toont als de hero op het Dashboard. De per-aandeel lijst
  // hieronder blijft de zuivere koersbeweging tonen; de FX-regel verklaart het verschil.
  var drDag=dayResultEur();
  var totHeadline=drDag.hasData?drDag.eur:tot;
  var dt=document.getElementById('dagTot');
  if(dt){dt.textContent=fmtEur(totHeadline);dt.className='kval '+(totHeadline>=0?'up':'dn');}
  var db=document.getElementById('dagBest');
  if(db){db.textContent=best.ticker;db.className='kval up';}
  setText('dagBestP',fmtPct(best.pct));

  var h='<div class="stitle">Dagwijzigingen</div>';
  items.forEach(function(it){
    var c=it.dagEur>=0?'up':'dn';
    h+='<div class="prow">';
    h+='<span class="ptk">'+it.ticker+'</span>';
    var pcTxt=it.pc?'$'+it.pc.toFixed(2)+' \u2192 ':'';
    h+='<span style="font-size:11px;color:var(--t2);flex:1">'+pcTxt+'$'+it.price.toFixed(2)+'</span>';
    h+='<span class="pval '+c+'">'+(it.pct!==null?fmtPct(it.pct):'n/a')+'</span>';
    h+='<span class="peur '+c+'">'+(it.hasDay?fmtEur(it.dagEur):'&#8212;')+'</span>';
    h+='</div>';
  });
  var tbl=document.getElementById('dagTbl');
  if(tbl) tbl.innerHTML=h;

  // FX-impact vandaag
  var fxEl=document.getElementById('dagFx');
  if(fxEl){
    var fx=eurUsdPrevClose?fxImpact(eurUsdPrevClose,currentUsdTotal()):null;
    if(fx){
      var fc=fx.impact>=0?'up':'dn';
      var arrow=fx.ratePct>=0?'\u25b2':'\u25bc';
      fxEl.innerHTML='<div class="stitle">Wisselkoers-impact vandaag</div>'+
        '<div style="display:flex;justify-content:space-between;align-items:center">'+
        '<span style="font-size:12px;color:var(--t2)">EUR/USD '+fx.oldRate.toFixed(4)+' \u2192 '+fx.newRate.toFixed(4)+' <span class="'+fc+'">'+arrow+' '+(fx.ratePct>=0?'+':'')+fx.ratePct.toFixed(2)+'%</span></span>'+
        '<span class="'+fc+'" style="font-weight:700;font-size:14px">'+fmtEur(fx.impact)+'</span></div>';
    } else {
      fxEl.innerHTML='<div class="stitle">Wisselkoers-impact vandaag</div><div class="mu" style="font-size:12px">Nog geen vorig-slot beschikbaar</div>';
    }
  }

  var dh=lsGet(PK.dh)||[];
  var dhi=document.getElementById('dagHist');
  if(dh.length&&dhi){
    dhi.style.display='block';
    var hh='<div class="stitle">Historiek</div>';
    dh.slice(0,7).forEach(function(d){
      var c2=d.total>=0?'up':'dn';
      hh+='<div class="prow"><span style="font-size:12px;color:var(--t2);flex:1">'+d.date+'</span>';
      hh+='<span class="'+c2+'" style="font-weight:600">'+fmtEur(d.total)+'</span></div>';
    });
    dhi.innerHTML=hh;
  }
}

// ─── VOLATILITEIT (VIXY ETF-proxy via Finnhub — echte VIX-index niet gratis beschikbaar) ──
var vixVal=null,vixErr=null,vixDP=null,vixStale=null;
// ─── EUR/USD WISSELKOERS (live via Finnhub forex) ────────────────────────────
var eurUsdPrevClose=null;
var fxLiveThisSession=false; // true zodra de live EUR/USD van deze sessie binnen is
function fetchEurUsd(fhKey){
  var el=document.getElementById("kEur");
  var sub=document.getElementById("kEurSub");
  var convLbl=document.getElementById("fxConvLbl");
  var CDN="https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@";

  function show(rate,prevRate,prevDate,src){
    EUR_USD=Math.round(rate*10000)/10000;
    eurUsdPrevClose=prevRate||EUR_USD;
    lsSet("carl-eurusd-day",{rate:EUR_USD,prev:prevRate||null,prevdate:prevDate||null,date:isoDate()});
    if(src!=="cache"){
      fxLiveThisSession=true;
      // Snapshots die gemaakt werden vóór de live koers binnen was: referentie-FX rechtzetten
      [PK.w,PK.m,PK.y].forEach(function(k){var s=lsGet(k);if(s&&s.fxPending){s.eurUsd=EUR_USD;delete s.fxPending;lsSet(k,s);}});
      var bk=bookGet();bookPut(bk,'EURUSD',isoDate(),EUR_USD);if(prevRate&&prevDate)bookPut(bk,'EURUSD',prevDate,prevRate);bookPrune(bk);lsSet(PK.cl,bk);
    }
    if(el) el.textContent=EUR_USD.toFixed(4);
    if(convLbl) convLbl.innerHTML="&rarr; EUR @"+EUR_USD.toFixed(4).replace(".",",");
    if(sub){
      if(prevRate&&prevRate>0){
        var chg=(EUR_USD-prevRate)/prevRate*100, up=chg>=0;
        sub.innerHTML='<span style="color:'+(up?"#2ea76b":"#e5534b")+'">'+(up?"\u25b2":"\u25bc")+" "+(up?"+":"\u2212")+Math.abs(chg).toFixed(2)+'%</span> vs. '+(prevDate||"vorig slot")+' <span style="font-size:9px;opacity:.6">('+src+')</span>';
      } else {
        sub.innerHTML='<span style="font-size:10px;opacity:.6">live koers ('+src+')</span>';
      }
    }
    renderHoldings();updateKPI();renderPerf();
  }

  function fetchPrev(n,cb,curRate){
    if(n>10){cb(null,null);return;}
    var d=new Date();d.setDate(d.getDate()-n);
    var ds=d.toISOString().slice(0,10);
    fetch(CDN+ds+"/v1/currencies/eur.min.json")
      .then(function(r){if(!r.ok)throw 0;return r.json();})
      .then(function(j){
        var v=j&&j.eur&&j.eur.usd;
        if(!v) throw 0;
        // Zoek eerste EERDERE dag met een MERKBAAR andere koers (>0.01%),
        // want jsDelivr 'latest' = laatste ECB-slot = vaak identiek aan gisteren
        if(curRate&&Math.abs(v-curRate)/curRate<0.0001){fetchPrev(n+1,cb,curRate);return;}
        cb(v,ds);
      })
      .catch(function(){fetchPrev(n+1,cb,curRate);});
  }

  fetch(CDN+"latest/v1/currencies/eur.min.json")
    .then(function(r){if(!r.ok)throw 0;return r.json();})
    .then(function(j){
      var rate=j&&j.eur&&j.eur.usd;
      if(!rate) throw 0;
      fetchPrev(1,function(pv,pd){show(rate,pv,pd,"jsDelivr/ECB");},rate);
    })
    .catch(function(){
      fetch("https://api.frankfurter.app/latest?from=EUR&to=USD")
        .then(function(r){if(!r.ok)throw 0;return r.json();})
        .then(function(j){
          var rate=j&&j.rates&&j.rates.USD;
          if(!rate) throw 0;
          fetchPrev(1,function(pv,pd){show(rate,pv,pd,"frankfurter");},rate);
        })
        .catch(function(){
          var cache=lsGet("carl-eurusd-day");
          if(cache&&cache.rate){show(cache.rate,cache.prev,cache.prevdate,"cache");}
          else if(sub){sub.innerHTML='<span style="color:#e5534b">geen live forex</span>';}
        });
    });
}

function fetchVIX(fhKey){
  if(!fhKey){vixErr=null;renderVIX();return;}
  vixErr=null;
  fetch('https://finnhub.io/api/v1/quote?symbol=VIXY&token='+fhKey)
    .then(function(r){return r.json();})
    .then(function(d){
      if(d&&d.c>0){
        vixVal=d.c;
        vixDP=d.dp!==undefined?d.dp:null;
        lsSet('carl-vix',{v:vixVal,dp:vixDP,d:isoDate()});
        renderVIX();
      } else {
        var cached=lsGet('carl-vix');
        if(cached){vixErr=null;vixStale='Kon niet verversen \u2014 toont laatste gekende waarde';}
        else{vixErr='Geen data ontvangen voor VIXY';}
        renderVIX();
      }
    })
    .catch(function(){
      var cached2=lsGet('carl-vix');
      if(cached2){vixErr=null;vixStale='Kon niet verversen (netwerkfout) \u2014 toont laatste gekende waarde';}
      else{vixErr='netwerkfout';}
      renderVIX();
    });
}
function renderVIX(){
  var el=document.getElementById('vixDiv');
  if(!el) return;

  if(vixErr){
    el.innerHTML='<div style="text-align:center;padding:20px 0">'+
      '<div style="font-size:13px;color:var(--dn);margin-bottom:10px">'+vixErr+'</div>'+
      '<button class="mbtn" style="width:auto;padding:8px 16px" onclick="fetchVIX(lsGet(\'carl-fh\'))">Opnieuw proberen</button>'+
      '</div>';
    return;
  }

  var saved=vixVal;
  if(!saved){var sv=lsGet('carl-vix');if(sv){saved=sv.v;vixDP=sv.dp;}}
  vixVal=saved; // BUGFIX: globale vixVal moet gesynchroniseerd zijn vóór .toFixed() verderop
  var staleBanner=vixStale?('<div style="background:rgba(210,153,34,.12);border:1px solid rgba(210,153,34,.3);border-radius:8px;padding:8px 12px;margin-bottom:10px;font-size:11px;color:var(--am)">'+vixStale+'</div>'):'';
  if(!saved){
    el.innerHTML='<div class="mu" style="font-size:13px;text-align:center;padding:20px 0">Klik Live koersen om de volatiliteitsproxy op te halen</div>';
    return;
  }

  var dp=vixDP;
  var zone;
  if(dp===null||dp===undefined) zone={lbl:'Onbekend',col:'#8b949e',desc:'Geen dagwijziging beschikbaar'};
  else if(dp<=-3) zone={lbl:'Volatiliteit duidelijk gedaald',col:'#22c55e',desc:'Markt rustiger geworden'};
  else if(dp<=-1) zone={lbl:'Volatiliteit licht gedaald',col:'#84cc16',desc:'Lichte ontspanning'};
  else if(dp<1) zone={lbl:'Stabiel',col:'#eab308',desc:'Weinig verandering'};
  else if(dp<3) zone={lbl:'Volatiliteit licht gestegen',col:'#f97316',desc:'Lichte onzekerheid'};
  else if(dp<6) zone={lbl:'Volatiliteit duidelijk gestegen',col:'#ef4444',desc:'Toegenomen angst'};
  else zone={lbl:'Sterke angstpiek',col:'#7f1d1d',desc:'Forse marktonrust'};

  var sv2=lsGet('carl-vix');
  var dateStr=sv2?sv2.d:'';
  var dpStr=(dp!==null&&dp!==undefined)?(dp>=0?'+':'\u2212')+Math.abs(dp).toFixed(2)+'%':'\u2014';

  var h=staleBanner+'<div style="text-align:center;margin-bottom:16px">';
  h+='<div style="font-size:13px;color:var(--t2);margin-bottom:6px">VIXY (volatiliteitsproxy)</div>';
  h+='<div style="font-size:40px;font-weight:700;color:'+zone.col+'">$'+vixVal.toFixed(2)+'</div>';
  h+='<div style="font-size:15px;font-weight:600;color:'+(dp>=0?'var(--dn)':'var(--up)')+';margin-top:2px">'+dpStr+' vandaag</div>';
  h+='<div style="font-size:13px;font-weight:600;color:'+zone.col+';margin-top:8px">'+zone.lbl+'</div>';
  h+='<div style="font-size:12px;color:var(--t2);margin-top:4px">'+zone.desc+'</div>';
  h+='<div style="font-size:10px;color:var(--t3);margin-top:6px">'+dateStr+' \u00b7 Finnhub</div>';
  h+='</div>';

  h+='<div class="card2" style="margin-bottom:12px">';
  h+='<div style="font-size:11px;color:var(--t2);line-height:1.6">';
  h+='VIXY volgt VIX-futures, niet de CBOE-index zelf &mdash; de <strong>dagwijziging %</strong> is het bruikbare signaal voor marktsentiment, niet de absolute prijs (die daalt over tijd door contango).';
  h+='</div></div>';

  h+='<div class="stitle" style="margin-bottom:8px">Interpretatie dagwijziging</div>';
  var refs=[
    {r:'\u2264 \u22123%',l:'Duidelijke daling',c:'#22c55e'},
    {r:'\u22123% tot \u22121%',l:'Lichte daling',c:'#84cc16'},
    {r:'\u22121% tot +1%',l:'Stabiel',c:'#eab308'},
    {r:'+1% tot +3%',l:'Lichte stijging',c:'#f97316'},
    {r:'+3% tot +6%',l:'Duidelijke stijging',c:'#ef4444'},
    {r:'> +6%',l:'Sterke angstpiek',c:'#7f1d1d'}
  ];
  refs.forEach(function(z){
    h+='<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--bd)">';
    h+='<span style="width:10px;height:10px;border-radius:50%;background:'+z.c+';flex-shrink:0;display:inline-block"></span>';
    h+='<span style="flex:1;font-size:12px">'+z.l+'</span>';
    h+='<span style="font-size:11px;color:var(--t2)">'+z.r+'</span>';
    h+='</div>';
  });

  el.innerHTML=h;
}


// ─── GRAFIEKEN ────────────────────────────────────────────────────────────────
var TICKER_COLOR={TSLA:'#388bfd',NVDA:'#2ea76b',GOOGL:'#3fb950',PLTR:'#8957e5',AMZN:'#d29922',WULF:'#f0a500',HIMS:'#f85149',PATH:'#79c0ff',VUSA:'#a78bfa',DIET:'#c084fc',SPCX:'#ff6b35'};
var BROKER_COLOR={BUX:'#388bfd',Bolero:'#8957e5',Revolut:'#2ea76b'};
var SINGLE_BROKER={GOOGL:'BUX',PLTR:'BUX',AMZN:'Bolero',HIMS:'Revolut',PATH:'Revolut',VUSA:'Revolut',DIET:'Revolut',SPCX:'Revolut'};

function svgDonut(segs,centerLbl,centerSub){
  var R=38,C=2*Math.PI*R,cum=0,circles='';
  var total=0;segs.forEach(function(s){total+=s.val;});
  segs.forEach(function(s){
    var pct=total>0?s.val/total:0,dash=(pct*C).toFixed(2),gap=(C-pct*C).toFixed(2),rot=(cum*360-90).toFixed(1);
    circles+='<circle cx="55" cy="55" r="'+R+'" fill="none" stroke="'+s.col+'" stroke-width="16" stroke-dasharray="'+dash+' '+gap+'" transform="rotate('+rot+' 55 55)"/>';
    cum+=pct;
  });
  var svg='<svg viewBox="0 0 110 110" width="120" height="120">'+circles+
    '<text x="55" y="52" text-anchor="middle" fill="var(--t1)" font-size="13" font-weight="700">'+centerLbl+'</text>'+
    '<text x="55" y="66" text-anchor="middle" fill="var(--t3)" font-size="9">'+centerSub+'</text></svg>';
  return svg;
}

function barList(items,valKey,fmtFn,colorPos,colorNeg){
  var mx=0;items.forEach(function(it){if(Math.abs(it[valKey])>mx) mx=Math.abs(it[valKey]);});
  var h='';
  items.forEach(function(it){
    var v=it[valKey],cls=v>=0?'up':'dn',bw=mx>0?Math.abs(v)/mx*100:0,bc=v>=0?colorPos:colorNeg;
    h+='<div class="prow">';
    h+='<span class="ptk">'+it.ticker+'</span>';
    h+='<div class="pbar"><div class="pbf" style="width:'+bw+'%;background:'+bc+'"></div></div>';
    h+='<span class="pval '+cls+'" style="min-width:64px">'+fmtFn(v)+'</span>';
    h+='</div>';
  });
  return h;
}

function renderCharts(){
  // 1. Allocatie donut (USD-posities)
  var elA=document.getElementById('chAlloc');
  if(elA){
    var usdItems=H.filter(function(h){return h.ccy==='USD';});
    var usdTot=0;usdItems.forEach(function(h){usdTot+=h.shares*h.price;});
    var segs=usdItems.map(function(h){return{val:h.shares*h.price,col:TICKER_COLOR[h.ticker]||'#6e7681'};})
      .sort(function(a,b){return b.val-a.val;});
    var donutSvg=svgDonut(segs,'$'+(usdTot/1000).toFixed(0)+'k',usdItems.length+' posities');
    var legend='<div style="display:flex;flex-direction:column;gap:5px;font-size:11.5px;margin-left:14px">';
    usdItems.slice().sort(function(a,b){return(b.shares*b.price)-(a.shares*a.price);}).forEach(function(h){
      var pct=usdTot>0?(h.shares*h.price/usdTot*100):0;
      legend+='<div style="display:flex;align-items:center;gap:7px">'+
        '<span style="width:9px;height:9px;border-radius:2px;background:'+(TICKER_COLOR[h.ticker]||'#6e7681')+';flex-shrink:0"></span>'+
        '<span style="flex:1">'+h.ticker+'</span><span style="color:var(--t2)">'+pct.toFixed(1)+'%</span></div>';
    });
    legend+='</div>';
    elA.innerHTML='<div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px">'+donutSvg+legend+'</div>';
  }

  // 2. Rendement per positie
  var elR=document.getElementById('chRend');
  if(elR){
    var rItems=H.map(function(h){return{ticker:h.ticker,pl:h.pl};}).sort(function(a,b){return b.pl-a.pl;});
    elR.innerHTML=barList(rItems,'pl',function(v){return fmtPct(v);},'var(--up)','var(--dn)');
  }

  // 3. Upside naar koersdoel
  var elU=document.getElementById('chUpside');
  if(elU){
    var uItems=H.map(function(h){return{ticker:h.ticker,upside:h.upside};}).sort(function(a,b){return b.upside-a.upside;});
    elU.innerHTML=barList(uItems,'upside',function(v){return(v>=0?'+':'\u2212')+Math.abs(v)+'%';},'var(--bl)','var(--dn)');
  }

  // 4. Ongerealiseerde P&L (EUR)
  var elP=document.getElementById('chPnl');
  if(elP){
    var pItems=H.map(function(h){
      var val=h.ccy==='USD'?h.shares*h.price/EUR_USD:h.shares*h.price;
      var cost=h.ccy==='USD'?h.shares*h.avg/EUR_USD:h.shares*h.avg;
      return{ticker:h.ticker,pnl:val-cost};
    }).sort(function(a,b){return b.pnl-a.pnl;});
    elP.innerHTML=barList(pItems,'pnl',function(v){return fmtEur(v);},'var(--bl)','var(--dn)');
    var totPnl=0;pItems.forEach(function(it){totPnl+=it.pnl;});
    elP.innerHTML+='<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--bd);display:flex;justify-content:space-between;font-size:12px">'+
      '<span class="mu">Totaal ongerealiseerd</span><span class="'+(totPnl>=0?'up':'dn')+'" style="font-weight:600">'+fmtEur(totPnl)+'</span></div>';
  }

  // 5. Kostenbasis vs huidige waarde
  var elB=document.getElementById('chBasis');
  if(elB){
    var bItems=H.map(function(h){
      var val=h.ccy==='USD'?h.shares*h.price/EUR_USD:h.shares*h.price;
      var cost=h.ccy==='USD'?h.shares*h.avg/EUR_USD:h.shares*h.avg;
      return{ticker:h.ticker,val:val,cost:cost};
    });
    var mxB=0;bItems.forEach(function(it){var m=Math.max(it.val,it.cost);if(m>mxB)mxB=m;});
    var hh='';
    bItems.forEach(function(it){
      var wCost=mxB>0?it.cost/mxB*100:0,wVal=mxB>0?it.val/mxB*100:0;
      var neg=it.val<it.cost;
      hh+='<div style="margin-bottom:9px">';
      hh+='<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span style="font-weight:650">'+it.ticker+'</span><span class="'+(neg?'dn':'up')+'">\u20ac'+n2(it.cost)+' \u2192 \u20ac'+n2(it.val)+'</span></div>';
      hh+='<div style="height:6px;background:var(--p2);border-radius:2px;margin-bottom:2px;overflow:hidden"><div style="height:100%;width:'+wCost+'%;background:#2a3a5c"></div></div>';
      hh+='<div style="height:6px;background:var(--p2);border-radius:2px;overflow:hidden"><div style="height:100%;width:'+wVal+'%;background:'+(neg?'var(--dn)':'var(--up)')+'"></div></div>';
      hh+='</div>';
    });
    elB.innerHTML=hh;
  }

  // 6. Broker-verdeling donut
  var elK=document.getElementById('chBroker');
  if(elK){
    var brokerTot={BUX:0,Bolero:0,Revolut:0};
    H.forEach(function(h){
      if(h.brokers&&h.brokers.length>0){
        h.brokers.forEach(function(b){
          var v=h.ccy==='USD'?(b.sh*h.price/EUR_USD):(b.sh*h.price);
          brokerTot[b.n]=(brokerTot[b.n]||0)+v;
        });
      } else {
        var primary=SINGLE_BROKER[h.ticker]||'Revolut';
        var v2=h.ccy==='USD'?(h.shares*h.price/EUR_USD):(h.shares*h.price);
        brokerTot[primary]=(brokerTot[primary]||0)+v2;
      }
    });
    var grandTot=0;Object.keys(brokerTot).forEach(function(k){grandTot+=brokerTot[k];});
    var bSegs=Object.keys(brokerTot).map(function(k){return{val:brokerTot[k],col:BROKER_COLOR[k]||'#6e7681',name:k};})
      .sort(function(a,b){return b.val-a.val;});
    var bDonut=svgDonut(bSegs,'3 brokers','\u20ac'+(grandTot/1000).toFixed(0)+'k');
    var bLegend='<div style="display:flex;flex-direction:column;gap:5px;font-size:11.5px;margin-left:14px">';
    bSegs.forEach(function(s){
      var pct2=grandTot>0?(s.val/grandTot*100):0;
      bLegend+='<div style="display:flex;align-items:center;gap:7px">'+
        '<span style="width:9px;height:9px;border-radius:2px;background:'+s.col+';flex-shrink:0"></span>'+
        '<span style="flex:1">'+s.name+'</span><span style="color:var(--t2)">'+pct2.toFixed(1)+'%</span></div>';
    });
    bLegend+='</div>';
    elK.innerHTML='<div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px">'+bDonut+bLegend+'</div>';
  }
}

// ─── BACKUP & HERSTEL ─────────────────────────────────────────────────────────
function exportBackup(){
  try{
    var data={};
    for(var i=0;i<localStorage.length;i++){
      var k=localStorage.key(i);
      data[k]=localStorage.getItem(k);
    }
    var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url;
    a.download='portfolio-backup-'+isoDate()+'.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    var st=document.getElementById('backupSt');
    if(st) st.textContent='\u2713 Backup gedownload \u00b7 '+new Date().toLocaleTimeString('nl-BE',{hour:'2-digit',minute:'2-digit'});
  }catch(e){
    var st2=document.getElementById('backupSt');
    if(st2) st2.textContent='\u2717 Export mislukt: '+e.message;
  }
}
function importBackup(file){
  if(!file) return;
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var data=JSON.parse(e.target.result);
      var n=0;
      Object.keys(data).forEach(function(k){localStorage.setItem(k,data[k]);n++;});
      var st=document.getElementById('backupSt');
      if(st) st.textContent='\u2713 '+n+' items hersteld \u2014 pagina herlaadt...';
      setTimeout(function(){location.reload();},1200);
    }catch(err){
      var st2=document.getElementById('backupSt');
      if(st2) st2.textContent='\u2717 Ongeldig backup-bestand';
    }
  };
  reader.readAsText(file);
}

// ─── CLOUD-SYNC (JSONBin) ─────────────────────────────────────────────────────
// Welke localStorage-sleutels vormen je historiek (API-sleutels blijven lokaal).
var CLOUD_KEYS=['cp_w','cp_m','cp_y','cp_wh','cp_mh','cp_yh','cp_dh',
  'carl-eur-manual','carl-vix','carl-lastval','carl-live-prices',
  'carl-usd-dayref','carl-usd-prevday','carl-eurusd-day','carl-eurusd-prev','carl-eurusd-prevdate',
  'carl-holdings','carl-div-manual','carl-pension','cp_close','cp_tx'];

// FIX: slim samenvoegen bij cloud-pull i.p.v. lokale historiek blind te overschrijven.
function mergeCloudValue(k,locRaw,cldRaw){
  if(locRaw===null||locRaw===undefined) return cldRaw;
  var L,C;try{L=JSON.parse(locRaw);C=JSON.parse(cldRaw);}catch(e){return cldRaw;}
  if(L===null) return cldRaw; if(C===null) return locRaw;
  function unionBy(field,pref,sortDesc,max){
    var m={},rest=[];
    L.concat(C).forEach(function(e){
      if(!e||e[field]===undefined){return;}
      var id=e[field];
      if(m[id]===undefined||pref(e,m[id])) m[id]=e;
    });
    var arr=Object.keys(m).map(function(x){return m[x];}).concat(rest);
    arr.sort(function(a,b){return sortDesc?String(b[field]).localeCompare(String(a[field])):(a[field]>b[field]?1:-1);});
    return JSON.stringify(max?arr.slice(0,max):arr);
  }
  if(k==='cp_dh'&&Array.isArray(L)&&Array.isArray(C))
    return unionBy('date',function(n,o){return String(n.time||'')>String(o.time||'');},true,260);
  if((k==='cp_wh'||k==='cp_mh'||k==='cp_yh')&&Array.isArray(L)&&Array.isArray(C)){
    var f=k==='cp_wh'?'week':k==='cp_mh'?'month':'year';
    return unionBy(f,function(n,o){return (o.est&&!n.est)||(!o.v&&n.v);},true,k==='cp_wh'?16:k==='cp_mh'?12:10);
  }
  if(k==='cp_tx'&&Array.isArray(L)&&Array.isArray(C)) return unionBy('id',function(){return false;},false,0);
  if(k==='cp_close'&&typeof L==='object'&&typeof C==='object'){
    Object.keys(C).forEach(function(tk){L[tk]=L[tk]||{};Object.keys(C[tk]).forEach(function(d){L[tk][d]=C[tk][d];});});
    bookPrune(L);return JSON.stringify(L);
  }
  if(k==='cp_w'||k==='cp_m'||k==='cp_y'){
    var f2=k==='cp_w'?'week':k==='cp_m'?'month':'year';
    if(!L[f2]) return cldRaw; if(!C[f2]) return locRaw;
    if(L[f2]!==C[f2]) return String(L[f2])>String(C[f2])?locRaw:cldRaw; // nieuwste periode wint
    if((L.exactN||0)!==(C.exactN||0)) return (L.exactN||0)>(C.exactN||0)?locRaw:cldRaw;
    return ((L.ts||0)&&(L.ts<(C.ts||Infinity)))?locRaw:cldRaw; // vroegste referentie wint
  }
  return cldRaw;
}
var cloudPushTimer=null;

function cloudCfg(){
  var c=lsGet('carl-cloud');
  return (c&&c.bin&&c.key)?c:null;
}
function setCloudBadge(state){
  var b=document.getElementById('cloudBadge');
  if(!b) return;
  if(state==='on'){b.textContent='verbonden';b.style.background='#0d2a1a';b.style.color='#3fb950';}
  else if(state==='sync'){b.textContent='synchroniseren...';b.style.background='#1f1a0a';b.style.color='#d29922';}
  else if(state==='err'){b.textContent='fout';b.style.background='#2a0e0e';b.style.color='#f85149';}
  else {b.textContent='';b.style.background='';}
}
function renderCloudUI(){
  var cfg=cloudCfg();
  var setup=document.getElementById('cloudSetup');
  var actions=document.getElementById('cloudActions');
  if(cfg){
    if(setup)setup.style.display='none';
    if(actions)actions.style.display='block';
    setCloudBadge('on');
  } else {
    if(setup)setup.style.display='block';
    if(actions)actions.style.display='none';
    setCloudBadge('');
  }
}
function saveCloudCfg(){
  var bin=(document.getElementById('iCloudBin').value||'').trim();
  var key=(document.getElementById('iCloudKey').value||'').trim();
  var st=document.getElementById('cloudSt');
  if(!bin||!key){if(st)st.textContent='\u2717 Vul zowel Bin ID als sleutel in';return;}
  lsSet('carl-cloud',{bin:bin,key:key});
  renderCloudUI();
  if(st)st.textContent='\u2713 Verbonden \u2014 eerste synchronisatie...';
  // Eerst ophalen (bestaande cloud-data), dan onze data pushen als de cloud leeg is
  cloudPull(false,function(pulled){
    if(!pulled) cloudPush(true); // cloud was leeg: onze lokale data wordt de basis
  });
}
function clearCloudCfg(){
  if(!confirm('Cloud-sync verbinding verbreken? Je lokale historiek blijft behouden.'))return;
  localStorage.removeItem('carl-cloud');
  renderCloudUI();
  var st=document.getElementById('cloudSt');if(st)st.textContent='Verbinding verbroken';
}
function cloudPush(showMsg){
  var cfg=cloudCfg();if(!cfg)return;
  var st=document.getElementById('cloudSt');
  setCloudBadge('sync');
  if(showMsg&&st)st.textContent='\u2191 Opslaan naar cloud...';
  var payload={};
  CLOUD_KEYS.forEach(function(k){
    var v=localStorage.getItem(k);
    if(v!==null) payload[k]=v;
  });
  payload.__synced=new Date().toISOString();
  payload.__keys=collectApiKeys(); // API-sleutels mee in je PRIVÉ bin, zodat je ze op elk toestel maar één keer hoeft in te geven
  fetch('https://api.jsonbin.io/v3/b/'+cfg.bin,{
    method:'PUT',
    headers:{'Content-Type':'application/json','X-Master-Key':cfg.key},
    body:JSON.stringify(payload)
  }).then(function(r){
    if(!r.ok)throw new Error('HTTP '+r.status);
    return r.json();
  }).then(function(){
    setCloudBadge('on');
    if(st)st.textContent='\u2713 Opgeslagen naar cloud \u00b7 '+new Date().toLocaleTimeString('nl-BE',{hour:'2-digit',minute:'2-digit'});
  }).catch(function(e){
    setCloudBadge('err');
    if(st)st.textContent='\u2717 Opslaan mislukt: '+e.message+(String(e).indexOf('401')>-1||String(e).indexOf('403')>-1?' (sleutel controleren)':'');
  });
}
function cloudPull(showMsg,cb){
  var cfg=cloudCfg();if(!cfg){if(cb)cb(false);return;}
  var st=document.getElementById('cloudSt');
  setCloudBadge('sync');
  if(showMsg&&st)st.textContent='\u2193 Ophalen uit cloud...';
  fetch('https://api.jsonbin.io/v3/b/'+cfg.bin+'/latest',{
    headers:{'X-Master-Key':cfg.key}
  }).then(function(r){
    if(!r.ok)throw new Error('HTTP '+r.status);
    return r.json();
  }).then(function(j){
    var rec=j&&j.record?j.record:j;
    if(!rec||typeof rec!=='object'){throw new Error('lege respons');}
    var n=0;
    if(restoreApiKeys(rec.__keys)){updateKeySt();updateFmpKeySt();updateBqKeySt();var kb=document.getElementById('kbanner');if(kb&&lsGet('carl-fh'))kb.style.display='none';}
    CLOUD_KEYS.forEach(function(k){
      if(rec[k]!==undefined&&rec[k]!==null){localStorage.setItem(k,mergeCloudValue(k,localStorage.getItem(k),rec[k]));n++;}
    });
    setCloudBadge('on');
    if(st)st.textContent='\u2713 '+n+' items opgehaald uit cloud';
    if(n>0&&showMsg){setTimeout(function(){location.reload();},900);}
    if(cb)cb(n>0);
  }).catch(function(e){
    setCloudBadge('err');
    if(st)st.textContent='\u2717 Ophalen mislukt: '+e.message;
    if(cb)cb(false);
  });
}
// Debounced push: bij een historiek-wijziging niet meteen, maar na 3s samengevoegd
function cloudSyncDebounced(){
  if(!cloudCfg())return;
  if(cloudPushTimer)clearTimeout(cloudPushTimer);
  cloudPushTimer=setTimeout(function(){cloudPush(false);},3000);
}

// ─── BOOTSTRAP HISTORIEK (eenmalig, enkel als sleutel nog niet lokaal bestaat) ──
function bootstrapHistory(){
  var seed={"cp_w": {"date": "2026-06-22", "time": "06:12", "week": "2026-W25", "month": "2026-06", "year": "2026", "vals": {"TSLA": 231935.7737, "NVDA": 16461.42039, "GOOGL": 9568.78, "PLTR": 7649.1038, "AMZN": 2443.9, "WULF": 8719.24158, "HIMS": 126.66337, "PATH": 1694.20082, "SPCX": 229.85}, "eP": {"VUSA": 1179.707432, "DIET": 363.14392}, "tot": 278828.93, "live": true}, "cp_m": {"date": "2026-06-20", "time": "16:43", "week": "2026-W24", "month": "2026-06", "year": "2026", "vals": {"TSLA": 231958.93889999998, "NVDA": 16464.54563, "GOOGL": 9569.82, "PLTR": 7650.89, "AMZN": 2444.3, "WULF": 8725.259, "HIMS": 126.69908, "PATH": 1695.85048, "SPCX": 229.85}, "eP": {"VUSA": 1161.128612, "DIET": 380.4258}, "tot": 278866.15, "live": true}, "cp_y": {"date": "2026-06-20", "time": "16:43", "week": "2026-W24", "month": "2026-06", "year": "2026", "vals": {"TSLA": 231958.93889999998, "NVDA": 16464.54563, "GOOGL": 9569.82, "PLTR": 7650.89, "AMZN": 2444.3, "WULF": 8725.259, "HIMS": 126.69908, "PATH": 1695.85048, "SPCX": 229.85}, "eP": {"VUSA": 1161.128612, "DIET": 380.4258}, "tot": 278866.15, "live": true}, "cp_dh": [{"date": "2026-06-23", "time": "23:30", "total": 0}, {"date": "2026-06-22", "time": "22:01", "total": 1072}, {"date": "2026-06-19", "time": "22:12", "total": 2807}], "cp_wh": [{"week": "2026-W24", "date": "2026-06-20", "total": 5244}], "carl-eur-manual": {"VUSA": 123.76, "DIET": 165.1, "date": "2026-06-22"}, "carl-vix": {"v": 22.89, "dp": -0.3916, "d": "2026-06-24"}};
  Object.keys(seed).forEach(function(k){
    try{
      if(localStorage.getItem(k)===null){
        lsSet(k,seed[k]);
        console.log('[Bootstrap] '+k+' ingeladen uit eerdere backup');
      }
    }catch(e){}
  });
}

// ─── KOERSDOELEN (analisten) — FMP primair, Finnhub als terugval ─────────────
var targetStatus={ok:0,fail:0,premiumBlocked:false,source:''};
function fetchTargets(fhKey){
  var fmpKey=lsGet('carl-fmp');
  var p=fmpKey?fetchTargetsFMP(fmpKey):fetchTargetsFinnhub(fhKey);
  // Na de koersdoelen: voor tickers zonder doel de gratis Finnhub-recommendation ophalen
  // (analistenrating als telling), zodat WULF/HIMS/PATH/SPCX toch analistendata tonen.
  return p.then(function(){ if(fhKey) return fetchRecommendations(fhKey); });
}

// Gratis Finnhub recommendation-endpoint: geeft analistentellingen (strongBuy/buy/hold/sell/
// strongSell). We leiden er een rating uit af voor posities die geen koersdoel kregen.
function fetchRecommendations(fhKey){
  var need=H.filter(function(h){return h.ccy==='USD'&&(!h.target||h.target<=0);});
  if(!need.length) return Promise.resolve();
  var got=[];
  var proms=need.map(function(h){
    return fetch('https://finnhub.io/api/v1/stock/recommendation?symbol='+h.ticker+'&token='+fhKey)
      .then(function(r){return r.ok?r.json():null;})
      .then(function(d){
        if(!Array.isArray(d)||!d.length) return;
        var r0=d[0]; // meest recente periode
        var sb=r0.strongBuy||0,b=r0.buy||0,ho=r0.hold||0,se=r0.sell||0,ss=r0.strongSell||0;
        var n=sb+b+ho+se+ss;
        if(n<=0) return;
        // Gewogen score: strongBuy=2, buy=1, hold=0, sell=-1, strongSell=-2
        var score=(2*sb+b-se-2*ss)/n;
        var rating=score>=1.3?'Strong Buy':score>=0.4?'Buy':score>=-0.4?'Hold':score>=-1.3?'Sell':'Strong Sell';
        H.forEach(function(x){
          if(x.ticker===h.ticker){
            x.rating=rating;
            x.analysts=n; // aantal analisten (voor detailweergave)
          }
        });
        got.push(h.ticker);
      })
      .catch(function(){});
  });
  return Promise.all(proms).then(function(){
    if(got.length){
      var st=document.getElementById('targetSt');
      if(st){
        st.innerHTML+='<br><span style="font-size:10px;color:var(--t2)">Analistenrating (Finnhub, gratis) voor: '+got.join(', ')+'</span>';
      }
      renderHoldings();
    }
  });
}

function fetchTargetsFMP(fmpKey){
  targetStatus={ok:0,fail:0,premiumBlocked:false,source:'FMP'};
  var failedTickers=[];
  var promises=USD_SYMS.map(function(sym){
    return fetch('https://financialmodelingprep.com/stable/price-target-consensus?symbol='+sym+'&apikey='+fmpKey)
      .then(function(r){
        if(r.status===403||r.status===401){targetStatus.premiumBlocked=true;targetStatus.fail++;failedTickers.push(sym+' (geblokkeerd)');return null;}
        if(r.status===429){targetStatus.fail++;failedTickers.push(sym+' (limiet)');return null;}
        if(r.status===402){targetStatus.fail++;failedTickers.push(sym+' (FMP gratis: geen dekking)');return null;}
        if(!r.ok){targetStatus.fail++;failedTickers.push(sym+' (HTTP '+r.status+')');return null;}
        return r.json().catch(function(){return null;}); // HTML-foutpagina → null i.p.v. exception
      })
      .then(function(d){
        if(d===null){
          // al afgehandeld of json-parse mislukt
          if(!failedTickers.some(function(f){return f.indexOf(sym)===0;})){
            targetStatus.fail++;failedTickers.push(sym+' (geen data)');
          }
          return;
        }
        var rec=Array.isArray(d)?d[0]:d;
        var tgt=rec&&(rec.targetConsensus||rec.targetMedian);
        if(rec&&tgt>0){
          H.forEach(function(h){
            if(h.ticker===sym){
              h.target=Math.round(tgt*100)/100;
              h.upside=Math.round((h.target-h.price)/h.price*100);
            }
          });
          targetStatus.ok++;
        } else {
          targetStatus.fail++;
          failedTickers.push(sym+' (geen analist-dekking)');
        }
      })
      .catch(function(){targetStatus.fail++;failedTickers.push(sym+' (netwerkfout)');});
  });
  return Promise.all(promises).then(function(){
    var st=document.getElementById('targetSt');
    if(!st) return;
    if(targetStatus.ok>0&&targetStatus.fail===0){
      st.textContent='\u2713 Koersdoelen (FMP) bijgewerkt voor alle '+USD_SYMS.length+' posities';
      st.className='up';
    } else if(targetStatus.ok>0){
      st.innerHTML='\u2713 Koersdoelen (FMP) bijgewerkt voor '+targetStatus.ok+' van '+USD_SYMS.length+' posities<br><span style="font-size:10px;color:var(--t3)">Mislukt: '+failedTickers.join(', ')+'</span>';
      st.className='up';
    } else if(targetStatus.premiumBlocked){
      st.textContent='\u2717 FMP-sleutel ongeldig of limiet bereikt \u2014 bestaande waarden behouden';
      st.className='dn';
    } else {
      st.textContent='\u2717 Geen koersdoel-data van FMP ontvangen \u2014 bestaande waarden behouden';
      st.className='dn';
    }
    if(targetStatus.ok>0){renderHoldings();renderChartsLazy();}
  });
}

function fetchTargetsFinnhub(fhKey){
  targetStatus={ok:0,fail:0,premiumBlocked:false,source:'Finnhub'};
  var promises=USD_SYMS.map(function(sym){
    return fetch('https://finnhub.io/api/v1/stock/price-target?symbol='+sym+'&token='+fhKey)
      .then(function(r){
        if(r.status===403||r.status===401){targetStatus.premiumBlocked=true;targetStatus.fail++;return null;}
        return r.json();
      })
      .then(function(d){
        if(d&&d.targetMean>0){
          H.forEach(function(h){
            if(h.ticker===sym){
              h.target=Math.round(d.targetMean*100)/100;
              h.upside=Math.round((h.target-h.price)/h.price*100);
            }
          });
          targetStatus.ok++;
        } else { targetStatus.fail++; }
      })
      .catch(function(){targetStatus.fail++;});
  });
  return Promise.all(promises).then(function(){
    var st=document.getElementById('targetSt');
    if(!st) return;
    if(targetStatus.ok>0){
      st.textContent='\u2713 Koersdoelen bijgewerkt voor '+targetStatus.ok+' van '+USD_SYMS.length+' posities';
      st.className='up';
    } else if(targetStatus.premiumBlocked){
      st.textContent='\u2717 Koersdoelen vereisen Finnhub Premium op dit plan \u2014 bestaande waarden behouden';
      st.className='dn';
    } else {
      st.textContent='\u2717 Geen koersdoel-data ontvangen \u2014 bestaande waarden behouden';
      st.className='dn';
    }
    if(targetStatus.ok>0){renderHoldings();renderChartsLazy();}
  });
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
function loadLivePrices(){
  // Herlaad de laatst opgehaalde live prijzen in H[] zodat de totale waarde
  // bij heropening de laatst opgehaalde waarde toont i.p.v. de statische array-prijzen
  var lp=lsGet('carl-live-prices');
  if(!lp||!lp.p) return;
  H.forEach(function(h){
    if(h.ccy==='USD'&&lp.p[h.ticker]){
      var s=lp.p[h.ticker];
      h.price=s.price;h.pc=s.pc;h.pl=s.pl;h.dayPct=s.dayPct;h.qt=s.qt;
    }
  });
  if(lp.eurUsd) EUR_USD=lp.eurUsd;
}
function migrateSnapshots(){
  // Corrigeert snapshots met onbetrouwbare referenties door bijkoop/verkoop.
  // Belangrijk: dit draait OOK als er al een px-veld is, want een eerdere ophaling kan
  // foute px-waarden hebben opgeslagen (bv. SPCX px=$4,64 na verwatering door bijkoop).
  // Detectie: als de referentiekoers sterk afwijkt van de huidige koers (ratio buiten
  // 0,4–2,5), is het aandeelaantal vrijwel zeker gewijzigd → die positie verwijderen.
  var curPx={},curSh={};
  H.forEach(function(h){curPx[h.ticker]=h.price;curSh[h.ticker]=h.shares;});
  ['cp_w','cp_m','cp_y'].forEach(function(k){
    var snap=lsGet(k);
    if(!snap)return;
    var px={},sh={},cleanVals={},cleanEP={},changed=false;
    function handle(tk,val,isEur){
      if(curPx[tk]===undefined||curSh[tk]<=0){
        // positie bestaat niet meer: behouden als er een verkooptransactie is (gerealiseerd
        // resultaat telt mee in de periode), anders verwijderen
        if(hasTx(tk)&&snap.px&&snap.px[tk]!==undefined){px[tk]=snap.px[tk];sh[tk]=(snap.sh&&snap.sh[tk]!==undefined)?snap.sh[tk]:0;if(isEur)cleanEP[tk]=val;else cleanVals[tk]=val;return;}
        changed=true;return;
      }
      // Bepaal referentiekoers: uit bestaand px-veld indien aanwezig, anders uit waarde/aandelen
      var refPx=(snap.px&&snap.px[tk]!==undefined)?snap.px[tk]:(val/curSh[tk]);
      var ratio=curPx[tk]>0?refPx/curPx[tk]:1;
      if(ratio<0.4||ratio>2.5){changed=true;return;} // onbetrouwbaar → overslaan
      px[tk]=refPx;
      sh[tk]=(snap.sh&&snap.sh[tk]!==undefined)?snap.sh[tk]:curSh[tk];
      if(isEur)cleanEP[tk]=val;else cleanVals[tk]=val;
    }
    if(snap.vals)Object.keys(snap.vals).forEach(function(tk){handle(tk,snap.vals[tk],false);});
    if(snap.eP)Object.keys(snap.eP).forEach(function(tk){handle(tk,snap.eP[tk],true);});
    // Alleen herschrijven als er iets veranderde of nog geen px bestond
    if(changed||!snap.px){
      snap.px=px;snap.sh=sh;snap.vals=cleanVals;snap.eP=cleanEP;
      lsSet(k,snap);
    }
  });
}
function resetBrokenSnapshots(){
  // Directe, gegarandeerde herstelknop: verwijdert uit ALLE snapshots elke positie
  // waarvan het referentiepunt een onmogelijk rendement oplevert (koersverhouding buiten
  // 0,33–3,0). Ongeacht of er al px/sh-velden zijn. Wist ook de cloud-versie.
  var curPx={};H.forEach(function(h){curPx[h.ticker]=h.price;});
  var st=document.getElementById('resetSt');
  var removed=[];
  ['cp_w','cp_m','cp_y','cp_wh','cp_mh','cp_yh'].forEach(function(k){
    var snap=lsGet(k);
    if(!snap)return;
    // Historiek-arrays (cp_wh etc.) hebben geen px/vals — die laten we ongemoeid
    if(Array.isArray(snap))return;
    var fields=['px','sh','vals','eP'];
    H.forEach(function(h){
      var tk=h.ticker;
      // Bepaal referentiekoers
      var refPx;
      if(snap.px&&snap.px[tk]!==undefined) refPx=snap.px[tk];
      else if(snap.vals&&snap.vals[tk]!==undefined&&snap.sh&&snap.sh[tk]) refPx=snap.vals[tk]/snap.sh[tk];
      else if(snap.vals&&snap.vals[tk]!==undefined&&h.shares>0) refPx=snap.vals[tk]/h.shares;
      else return;
      var ratio=curPx[tk]>0?refPx/curPx[tk]:1;
      if(ratio<0.33||ratio>3.0){
        // Verwijder deze positie uit alle sub-objecten van de snapshot
        fields.forEach(function(f){if(snap[f]&&snap[f][tk]!==undefined)delete snap[f][tk];});
        if(removed.indexOf(tk)<0)removed.push(tk);
      }
    });
    lsSet(k,snap);
  });
  updateAll();
  if(cloudCfg())cloudPush(false);
  if(st){
    if(removed.length)st.innerHTML='<span class="up">\u2713 Hersteld: '+removed.join(', ')+' verwijderd uit snapshots. Tellen weer mee vanaf volgende verse snapshot.</span>';
    else st.textContent='Geen foute referenties gevonden \u2014 alle snapshots zijn in orde.';
  }
}
// ─── AUTO-REFRESH ────────────────────────────────────────────────────────────
var autoRefreshTimer=null;
var autoRefreshOn=false;
function toggleAutoRefresh(){
  autoRefreshOn=!autoRefreshOn;
  var btn=document.getElementById('autoBtn');
  if(autoRefreshOn){
    if(btn){btn.textContent='Auto-refresh AAN';btn.classList.add('auto-on');}
    autoRefreshTimer=setInterval(function(){
      if(isUSOpen()){
        var k=lsGet('carl-fh');
        if(k) doFetch(k);
      }
    },90000);
  } else {
    if(btn){btn.textContent='Auto-refresh UIT';btn.classList.remove('auto-on');}
    if(autoRefreshTimer){clearInterval(autoRefreshTimer);autoRefreshTimer=null;}
  }
}

// ─── CSV EXPORT ──────────────────────────────────────────────────────────────
function exportCSV(){
  var rows=['ticker,name,cat,ccy,shares,avg,price,value_eur,pl_pct,pl_eur,target,upside'];
  H.forEach(function(h){
    var val=h.ccy==='USD'?h.shares*h.price/EUR_USD:h.shares*h.price;
    var cost=h.ccy==='USD'?h.shares*h.avg/EUR_USD:h.shares*h.avg;
    var plEur=val-cost;
    rows.push([h.ticker,h.name,h.cat,h.ccy,h.shares,h.avg,h.price,val.toFixed(2),h.pl.toFixed(2),plEur.toFixed(2),h.target,h.upside].join(','));
  });
  var dh=lsGet(PK.dh)||[];
  rows.push('');
  rows.push('daghistoriek');
  rows.push('date,total_eur');
  dh.forEach(function(d){rows.push(d.date+','+d.total);});
  var blob=new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;a.download='portfolio-'+isoDate()+'.csv';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── HOLDINGS BEWERKEN ───────────────────────────────────────────────────────
function openHoldingsEdit(){
  var list=document.getElementById('holdEditList');
  if(!list) return;
  var html='';
  H.forEach(function(h,i){
    html+='<div style="margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--bd)">';
    html+='<div style="font-weight:700;margin-bottom:6px">'+h.ticker+' <span style="font-weight:400;color:var(--t2)">'+h.name+'</span></div>';
    html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
    html+='<div><div style="font-size:11px;color:var(--t3);margin-bottom:3px">Aandelen</div>';
    html+='<input class="minp" id="he-sh-'+i+'" type="number" step="any" value="'+h.shares+'" style="margin-bottom:0"></div>';
    html+='<div><div style="font-size:11px;color:var(--t3);margin-bottom:3px">Gem. aankoop</div>';
    html+='<input class="minp" id="he-avg-'+i+'" type="number" step="any" value="'+h.avg+'" style="margin-bottom:0"></div>';
    html+='</div></div>';
  });
  list.innerHTML=html;
  document.getElementById('holdEditModal').classList.add('open');
}
function closeHoldingsEdit(){document.getElementById('holdEditModal').classList.remove('open');}

// ─── PENSIOENSPAARFONDS (handmatig, apart van beursportefeuille) ──────────────
function openPensionModal(){
  var p=lsGet('carl-pension')||{};
  // Bij de eerste keer (nog niets opgeslagen) vullen we de velden voor met je bekende
  // KBC-cijfers als ECHTE waarden, zodat je meteen kunt opslaan zonder alles te typen.
  // Bestaan er al gegevens, dan tonen we die zodat je alleen hoeft aan te passen.
  var seed={name:'KBC Pension Savings Fund',val:32344.37,result:14126.93,units:51.6576,
    price:626.13,priceDate:'10 september 2026',deposited:0,max:1050,fiscalYear:'2026'};
  var v=(p&&p.val)?p:seed;
  document.getElementById('ipenName').value=v.name||'';
  document.getElementById('ipenVal').value=(v.val!==undefined?v.val:'');
  document.getElementById('ipenResult').value=(v.result!==undefined&&v.result!==null?v.result:'');
  document.getElementById('ipenUnits').value=(v.units!==undefined?v.units:'');
  document.getElementById('ipenPrice').value=(v.price!==undefined?v.price:'');
  document.getElementById('ipenPriceDate').value=v.priceDate||'';
  document.getElementById('ipenDeposited').value=(v.deposited!==undefined?v.deposited:'');
  document.getElementById('ipenMax').value=(v.max!==undefined?v.max:'');
  document.getElementById('ipenFiscalYear').value=v.fiscalYear||new Date().getFullYear();
  document.getElementById('pensionModal').classList.add('open');
}
function closePensionModal(){document.getElementById('pensionModal').classList.remove('open');}
function savePension(){
  var p={
    name:(document.getElementById('ipenName').value||'').trim(),
    val:parseFloat(document.getElementById('ipenVal').value)||0,
    result:parseFloat(document.getElementById('ipenResult').value),
    units:parseFloat(document.getElementById('ipenUnits').value)||0,
    price:parseFloat(document.getElementById('ipenPrice').value)||0,
    priceDate:(document.getElementById('ipenPriceDate').value||'').trim(),
    deposited:parseFloat(document.getElementById('ipenDeposited').value)||0,
    max:parseFloat(document.getElementById('ipenMax').value)||0,
    fiscalYear:(document.getElementById('ipenFiscalYear').value||'').trim()
  };
  if(isNaN(p.result)) p.result=null;
  lsSet('carl-pension',p);
  closePensionModal();
  renderPension();
  cloudSyncDebounced();
}
function renderPension(){
  var p=lsGet('carl-pension');
  if(!p||!p.val){
    setText('penVal','\u2014');
    setText('penName','Nog geen gegevens \u2014 tik op bijwerken');
    renderTotalWealth(); // beurstotaal toch tonen, pensioen als 0
    return;
  }
  setText('penVal','\u20ac'+n2(p.val));
  setText('penName',p.name||'Pensioenspaarfonds');
  // Niet-gerealiseerd resultaat + percentage
  var re=document.getElementById('penResult'), rp=document.getElementById('penResultPct');
  if(p.result!==null&&p.result!==undefined&&!isNaN(p.result)){
    var cost=p.val-p.result;
    var pct=cost>0?(p.result/cost*100):0;
    var cls=p.result>=0?'up':'dn';
    if(re){re.className='hero-chip '+cls;re.innerHTML=(p.result>=0?'\u25b2 +':'\u25bc \u2212')+'\u20ac'+n2(Math.abs(p.result));}
    if(rp) rp.textContent='('+(pct>=0?'+':'')+pct.toFixed(2)+'%) niet-gerealiseerd';
  } else { if(re)re.textContent='';if(rp)rp.textContent=''; }
  setText('penUnits',p.units?p.units.toLocaleString('nl-NL',{minimumFractionDigits:2,maximumFractionDigits:4}):'\u2014');
  setText('penPrice',p.price?'\u20ac'+p.price.toLocaleString('nl-NL',{minimumFractionDigits:2,maximumFractionDigits:2}):'\u2014');
  setText('penPriceDate',p.priceDate?p.priceDate:'');
  setText('penFiscalYear',p.fiscalYear?('('+p.fiscalYear+')'):'');
  setText('penDeposited','\u20ac'+n2(p.deposited||0));
  setText('penMax','\u20ac'+n2(p.max||0));
  var bar=document.getElementById('penBar');
  var pctDep=(p.max>0)?Math.min(100,(p.deposited/p.max*100)):0;
  if(bar) bar.style.width=pctDep.toFixed(0)+'%';
  var rem=(p.max||0)-(p.deposited||0);
  setText('penRemaining',rem>0?('Nog \u20ac'+n2(rem)+' te storten voor het fiscale maximum'):'Fiscaal maximum bereikt \u2713');
  renderTotalWealth();
}

// Totaal vermogen = beursportefeuille (EUR) + pensioenfonds. Alleen op dit tabblad;
// het hoofd-Dashboard blijft de beursportefeuille apart tonen.
function renderTotalWealth(){
  var stocks=0;
  H.forEach(function(h){ stocks+=(h.ccy==='USD'?h.shares*h.price/EUR_USD:h.shares*h.price); });
  var p=lsGet('carl-pension');
  var pension=(p&&p.val)?p.val:0;
  var total=stocks+pension;
  setText('totWealth','\u20ac'+n2(total));
  setText('twStocks','\u20ac'+n2(stocks));
  setText('twPension','\u20ac'+n2(pension));
  if(total>0){
    var sp=stocks/total*100, pp=pension/total*100;
    setText('twStocksPct',sp.toFixed(1)+'%');
    setText('twPensionPct',pp.toFixed(1)+'%');
    var bs=document.getElementById('twBarStocks'), bp=document.getElementById('twBarPension');
    if(bs) bs.style.width=sp.toFixed(1)+'%';
    if(bp) bp.style.width=pp.toFixed(1)+'%';
  }
}

// ─── TRANSACTIES (bijkopen / nieuw / verkopen) ────────────────────────────────
var txType='buy';
function openTxModal(){
  txType='buy';
  // Vul de dropdown met bestaande posities
  var sel=document.getElementById('txTicker');
  if(sel){
    sel.innerHTML=H.map(function(h){return '<option value="'+h.ticker+'">'+h.ticker+' \u2014 '+h.name+'</option>';}).join('');
  }
  document.getElementById('txNewTicker').value='';
  document.getElementById('txNewName').value='';
  document.getElementById('txShares').value='';
  document.getElementById('txPrice').value='';
  txSetType('buy');
  document.getElementById('txModal').classList.add('open');
}
function closeTxModal(){document.getElementById('txModal').classList.remove('open');}
function txSetType(t){
  txType=t;
  ['Buy','New','Sell'].forEach(function(s){
    var b=document.getElementById('tx'+s);
    if(b)b.classList.toggle('txt-active',s.toLowerCase()===t);
  });
  // Toon de juiste velden
  document.getElementById('txExistingWrap').style.display=(t==='new')?'none':'block';
  document.getElementById('txNewWrap').style.display=(t==='new')?'block':'none';
  var priceLbl=document.getElementById('txPriceLbl');
  if(priceLbl)priceLbl.textContent=(t==='sell')?'Verkoopprijs':'Aankoopprijs';
  txUpdatePreview();
}
function txCurrentHolding(){
  if(txType==='new')return null;
  var tk=document.getElementById('txTicker').value;
  return H.filter(function(h){return h.ticker===tk;})[0]||null;
}
function txUpdatePreview(){
  var prev=document.getElementById('txPreview');
  if(!prev)return;
  var sh=parseFloat(document.getElementById('txShares').value);
  var px=parseFloat(document.getElementById('txPrice').value);
  var sym,ccy;
  if(txType==='new'){
    var tk=document.getElementById('txNewTicker').value.trim();
    ccy=document.getElementById('txNewCcy').value;
    sym=ccy==='EUR'?'\u20ac':'$';
    if(!tk||isNaN(sh)||isNaN(px)||sh<=0||px<=0){prev.innerHTML='Vul ticker, aantal en prijs in\u2026';return;}
    if(H.filter(function(h){return h.ticker===tk;})[0]){prev.innerHTML='<span style="color:var(--dn)">'+tk+' bestaat al \u2014 kies "Bijkopen"</span>';return;}
    prev.innerHTML='<b>Nieuwe positie '+tk+'</b><br>'+fmtNum(sh)+' aandelen @ '+sym+fmtNum(px)+'<br>Kostprijsbasis: '+sym+fmtNum(sh*px);
    return;
  }
  var h=txCurrentHolding();
  if(!h){prev.innerHTML='Kies een aandeel\u2026';return;}
  ccy=h.ccy;sym=ccy==='EUR'?'\u20ac':'$';
  if(isNaN(sh)||isNaN(px)||sh<=0||px<=0){prev.innerHTML='Huidig: '+fmtNum(h.shares)+' @ '+sym+fmtNum(h.avg)+'<br>Vul aantal en prijs in\u2026';return;}
  if(txType==='buy'){
    var newSh=h.shares+sh;
    var newAvg=(h.shares*h.avg+sh*px)/newSh;
    prev.innerHTML='<b>Na bijkoop '+h.ticker+':</b><br>'+
      fmtNum(h.shares)+' \u2192 <b>'+fmtNum(newSh)+'</b> aandelen<br>'+
      'Gem. '+sym+fmtNum(h.avg)+' \u2192 <b>'+sym+fmtNum(newAvg)+'</b>';
  } else { // sell
    if(sh>h.shares+1e-9){prev.innerHTML='<span style="color:var(--dn)">Je hebt maar '+fmtNum(h.shares)+' aandelen</span>';return;}
    var remSh=h.shares-sh;
    var realized=(px-h.avg)*sh;
    var realCol=realized>=0?'var(--up)':'var(--dn)';
    prev.innerHTML='<b>Na verkoop '+h.ticker+':</b><br>'+
      fmtNum(h.shares)+' \u2192 <b>'+fmtNum(remSh)+'</b> aandelen<br>'+
      'Gerealiseerd: <span style="color:'+realCol+'">'+(realized>=0?'+':'\u2212')+sym+fmtNum(Math.abs(realized))+'</span>'+
      (remSh<1e-9?'<br><span style="color:var(--t3)">Positie volledig verkocht \u2014 wordt verwijderd</span>':'');
  }
}
function fmtNum(n){return (Math.round(n*100)/100).toLocaleString('nl-BE',{minimumFractionDigits:2,maximumFractionDigits:8});}
function applyTx(){
  var sh=parseFloat(document.getElementById('txShares').value);
  var px=parseFloat(document.getElementById('txPrice').value);
  if(isNaN(sh)||isNaN(px)||sh<=0||px<=0){alert('Vul een geldig aantal en prijs in.');return;}

  if(txType==='new'){
    var tk=document.getElementById('txNewTicker').value.trim().toUpperCase();
    var nm=document.getElementById('txNewName').value.trim()||tk;
    var ccy=document.getElementById('txNewCcy').value;
    var cat=document.getElementById('txNewCat').value;
    if(!tk){alert('Vul een ticker in.');return;}
    if(H.filter(function(h){return h.ticker===tk;})[0]){alert(tk+' bestaat al. Gebruik "Bijkopen".');return;}
    H.push({ticker:tk,name:nm,cat:cat,ccy:ccy,shares:sh,avg:px,price:px,qt:null,pc:0,
      pl:0,pe:'n.v.t.',fcf:'n.b.',target:0,upside:0,rating:'\u2014',brokers:[]});
    logTx(tk,ccy,sh,px);
    rebuildUsdSyms();
  } else {
    var h=txCurrentHolding();
    if(!h){alert('Kies een aandeel.');return;}
    if(txType==='buy'){
      var newSh=h.shares+sh;
      h.avg=(h.shares*h.avg+sh*px)/newSh;
      h.shares=newSh;
      logTx(h.ticker,h.ccy,sh,px);
    } else { // sell
      if(sh>h.shares+1e-9){alert('Je hebt maar '+fmtNum(h.shares)+' aandelen.');return;}
      h.shares=h.shares-sh;
      logTx(h.ticker,h.ccy,-sh,px);
      // avg blijft gelijk bij verkoop (gerealiseerde winst valt buiten de positie)
      if(h.shares<1e-9){
        // Volledige positie verkocht: verwijderen
        var idx=H.indexOf(h);
        if(idx>-1)H.splice(idx,1);
        rebuildUsdSyms();
      }
    }
  }
  // Herbereken rendement en sla op (zelfde mechanisme als holdings-edit)
  H.forEach(function(h){ if(h.price>0&&h.avg>0) h.pl=(h.price-h.avg)/h.avg*100; });
  saveHoldingsOverride();
  closeTxModal();
  updateAll();
}
function saveHoldingsEdit(){
  H.forEach(function(h,i){
    var shEl=document.getElementById('he-sh-'+i);
    var avgEl=document.getElementById('he-avg-'+i);
    var sh=parseFloat(shEl?shEl.value:NaN);
    var avg=parseFloat(avgEl?avgEl.value:NaN);
    if(!isNaN(sh)&&sh>=0) h.shares=sh;
    if(!isNaN(avg)&&avg>0) h.avg=avg;
    h.pl=(h.price-h.avg)/h.avg*100;
  });
  rebuildUsdSyms(); // voor het geval posities zijn gewijzigd die de op te halen tickers beïnvloeden
  saveHoldingsOverride();
  closeHoldingsEdit();
  updateAll();
}

// ─── SLEUTELS BEWAREN (eenmalig ingeven) ─────────────────────────────────────
// API-sleutels staan in localStorage van DIT toestel/deze browser. Oorzaken van 'steeds opnieuw
// ingeven': ander toestel/browser, privévenster, of Safari die opslag wist na 7 dagen niet openen.
// Oplossing: (1) sleutels mee in de privé JSONBin, (2) instel-link, (3) persistente opslag vragen.
var API_KEY_NAMES=['carl-fh','carl-fmp','carl-bq'];
function collectApiKeys(){var o={};API_KEY_NAMES.forEach(function(k){var v=lsGet(k);if(v)o[k]=v;});return o;}
function restoreApiKeys(obj){
  if(!obj||typeof obj!=='object')return false;var ch=false;
  API_KEY_NAMES.forEach(function(k){var v=obj[k];if(typeof v==='string'&&v&&!lsGet(k)){lsSet(k,v.replace(/\s/g,''));ch=true;}});
  return ch;
}
function b64e(str){return btoa(unescape(encodeURIComponent(str)));}
function b64d(str){return decodeURIComponent(escape(atob(str)));}
function applySetupFromHash(){
  var m=/[#&]setup=([^&]+)/.exec(location.hash||'');if(!m)return;
  try{
    var o=JSON.parse(b64d(decodeURIComponent(m[1])));
    if(o.cloud&&o.cloud.bin&&o.cloud.key&&!cloudCfg())lsSet('carl-cloud',{bin:String(o.cloud.bin).trim(),key:String(o.cloud.key).trim()});
    restoreApiKeys(o.keys);
  }catch(e){console.warn('Ongeldige instel-link');}
  // sleutels meteen uit de adresbalk/geschiedenis halen
  try{history.replaceState(null,'',location.pathname+location.search);}catch(e){location.hash='';}
}
function copySetupLink(){
  var cfg=cloudCfg();var st=document.getElementById('cloudSt');
  var url=location.origin+location.pathname+'#setup='+encodeURIComponent(b64e(JSON.stringify({cloud:cfg,keys:collectApiKeys()})));
  function ok(){if(st)st.textContent='\u2713 Instel-link gekopieerd \u2014 open hem op je andere toestel';}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(ok,function(){prompt('Kopieer deze link:',url);});}
  else prompt('Kopieer deze link:',url);
}
function requestPersistentStorage(){
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();}catch(e){}
}

function init(){
  applySetupFromHash();
  requestPersistentStorage();
  bootstrapHistory();
  loadHoldingsOverride();
  // FIX: eerst de laatst gekende koersen laden, DAN snapshots controleren. Vroeger vergeleek
  // migrateSnapshots de referenties met de (verouderde) hardgecodeerde koersen uit de code,
  // waardoor posities onterecht uit de week/maand/jaar-referentie konden verdwijnen.
  loadEurManual();
  loadLivePrices();
  migrateWeekLabels();
  migrateSnapshots();
  dedupeHist();
  // Periodes worden pas afgesloten na een verse koersophaling (onFetchDone), zodat de
  // slotkoers van de laatste handelsdag (bv. vrijdag) gekend is.
  reconstructMonthsFromDaily();
  renderCloudUI();
  // FIX: na een cloud-pull opnieuw afsluiten/migreren, anders draaide de (oudere) cloudversie
  // de afsluiting van vorige week/maand terug en ging dat resultaat verloren.
  if(cloudCfg()) cloudPull(false,function(pulled){ if(pulled){loadHoldingsOverride();loadEurManual();loadLivePrices();migrateWeekLabels();migrateSnapshots();dedupeHist();reconstructMonthsFromDaily();renderPension();updateAll();cloudPush(false);} });
  var key=lsGet('carl-fh');
  fetchEurUsd(key);
  document.getElementById('kbanner').style.display=key?'none':'block';
  updateKeySt();
  updateFmpKeySt();
  updateBqKeySt();
  fetchDividends(); // gebruikt automatisch BusinessQuant indien sleutel aanwezig, anders enkel handmatig
  var vixCache=lsGet('carl-vix');if(vixCache){vixVal=vixCache.v;vixDP=vixCache.dp;}
  renderMkt();
  renderPension();
  updateAll();
}

// Reconstrueert ontbrekende maand- en week-entries uit de dag-historiek (cp_dh).
// Elke maand/week krijgt de SOM van de dagresultaten in die periode. Deze entries
// worden gemarkeerd als geschat (est:true), want ze zijn afgeleid uit dagdata i.p.v.
// een exacte periode-snapshot. Bestaande entries blijven onaangeroerd.
function reconstructMonthsFromDaily(){
  var dh=lsGet(PK.dh)||[];
  if(!dh.length) return;
  // FIX: dezelfde weekfunctie als de rest van de app (de oude eigen versie gaf vanaf 2027
  // een ander weeknummer dan isoWeek, met dubbele/verschoven weken als gevolg)
  function isoWk(dateStr){return isoWeek(parseYmd(dateStr));}
  var byMonth={},byWeek={};
  dh.forEach(function(e){
    if(!e||!e.date||typeof e.total!=='number') return;
    var mo=e.date.slice(0,7);
    byMonth[mo]=(byMonth[mo]||0)+e.total;
    var wk=isoWk(e.date);
    byWeek[wk]=(byWeek[wk]||0)+e.total;
  });
  var mh=lsGet(PK.mh)||[];
  var haveMonth={};mh.forEach(function(e){if(e&&e.month)haveMonth[e.month]=true;});
  // Periodes die nog een open snapshot hebben (nog niet afgesloten) niet als 'geschat' toevoegen
  var openM=lsGet(PK.m),openW=lsGet(PK.w);
  if(openM&&openM.month)haveMonth[openM.month]=true;
  var curMonth=isoMonth(new Date());
  var addedM=false;
  Object.keys(byMonth).forEach(function(mo){
    if(haveMonth[mo]||mo===curMonth) return;
    mh.push({month:mo,date:mo+'-01',total:Math.round(byMonth[mo]),est:true,v:2});
    addedM=true;
  });
  if(addedM){
    mh.sort(function(a,b){return (b.month||'').localeCompare(a.month||'');});
    lsSet(PK.mh,mh.slice(0,12));
  }
  var wh=lsGet(PK.wh)||[];
  var haveWeek={};wh.forEach(function(e){if(e&&e.week)haveWeek[e.week]=true;});
  if(openW&&openW.week)haveWeek[openW.week]=true;
  var curWeek=isoWeek(new Date());
  var addedW=false;
  Object.keys(byWeek).forEach(function(wk){
    if(haveWeek[wk]||wk===curWeek) return;
    wh.push({week:wk,date:'',total:Math.round(byWeek[wk]),est:true,v:2});
    addedW=true;
  });
  if(addedW){
    wh.sort(function(a,b){return (b.week||'').localeCompare(a.week||'');});
    lsSet(PK.wh,wh.slice(0,16));
  }
}

function dedupeHist(){
  // Ruimt bestaande dubbele entries in de historiek op (één per week/maand/jaar).
  // Houdt de EERSTE (meest recente, want unshift) per periode-sleutel.
  [['cp_wh','week'],['cp_mh','month'],['cp_yh','year']].forEach(function(pair){
    var k=pair[0],field=pair[1];
    var arr=lsGet(k);
    if(!Array.isArray(arr)||!arr.length) return;
    var seen={},out=[];
    arr.forEach(function(e){
      var id=e&&e[field];
      if(id===undefined||id===null){out.push(e);return;}
      if(seen[id]===undefined){seen[id]=out.length;out.push(e);}
      else if(out[seen[id]].est&&!e.est){out[seen[id]]=e;} // exacte entry wint van geschatte
    });
    if(out.length!==arr.length) lsSet(k,out);
  });
}

// ═══ v2.2 UITBREIDINGEN (gsm-app, koersbetrouwbaarheid, brokers, export, meldingen, snelheid) ═══

// ── #4 Bron + tijd per koers, 'verouderd' als ouder dan de laatste handelsdag ──
function lastTradingDayYmd(){
  // Laatste afgesloten of lopende NY-handelsdag (weekends overgeslagen; feestdagen niet gekend)
  var ny=new Date(new Date().toLocaleString('en-US',{timeZone:'America/New_York'}));
  if(ny.getHours()<9||(ny.getHours()===9&&ny.getMinutes()<30)) ny.setDate(ny.getDate()-1);
  while(ny.getDay()===0||ny.getDay()===6) ny.setDate(ny.getDate()-1);
  return ymd(ny);
}
function prevTradingDayYmd(s){
  var d=parseYmd(s);d.setDate(d.getDate()-1);
  while(d.getDay()===0||d.getDay()===6) d.setDate(d.getDate()-1);
  return ymd(d);
}
// Verouderd = koers van vóór de vorige handelsdag (één dag marge voor feestdagen/tijdzones)
function isStaleYmd(s){ return !s || s<prevTradingDayYmd(lastTradingDayYmd()); }
function quoteInfo(h){
  if(h.ccy==='USD'){
    if(!h.qt) return {txt:'geen live koers',stale:true};
    var d=new Date(h.qt*1000);
    var nyD=ymd(new Date(d.toLocaleString('en-US',{timeZone:'America/New_York'})));
    return {txt:(h.src||'Finnhub')+' \u00b7 '+fmtQt(h.qt),stale:isStaleYmd(nyD)};
  }
  var s=lsGet('carl-eur-manual')||{};
  if(!s[h.ticker]) return {txt:'geen koers',stale:true};
  var when=s.ts?fmtQt(s.ts):(s.date||'?');
  return {txt:(s.src||'handmatig')+' \u00b7 '+when,stale:isStaleYmd(s.date)};
}
function quoteLabel(h){
  var q=quoteInfo(h);
  return '<div style="font-size:9px;margin-top:2px;color:'+(q.stale?'var(--am)':'var(--t3)')+'">'+q.txt+(q.stale?' \u00b7 <b>verouderd</b>':'')+'</div>';
}
function renderStaleBanner(){
  var el=document.getElementById('staleBanner');if(!el)return;
  var st=H.filter(function(h){return h.shares>0&&quoteInfo(h).stale;}).map(function(h){return h.ticker;});
  if(!st.length){el.style.display='none';return;}
  el.style.display='block';
  el.innerHTML='\u26a0 Verouderde of ontbrekende koersen: <b>'+st.join(', ')+'</b>. Totalen kunnen afwijken \u2014 tik op Vernieuwen of vul EUR-koersen in.';
}

// ── #3 VUSA & D'Ieteren automatisch (gratis bronnen met je eigen sleutels) ──
// Volgorde: FMP (carl-fmp) → Finnhub (carl-fh). Lukt geen enkele: de laatst gekende koers
// blijft staan en wordt als 'verouderd' gemarkeerd. Nooit een geschatte koers.
var EUR_SYMS={VUSA:['VUSA.AS'],DIET:['DIE.BR']};
var _repoPricesP=null;
function getRepoPrices(){
  if(!_repoPricesP) _repoPricesP=fetch('prices.json?t='+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();})
    .catch(function(e){_repoPricesP=null;throw e;});
  var p=_repoPricesP;setTimeout(function(){_repoPricesP=null;},60000); // max 1 min hergebruiken
  return p;
}
function fetchEurQuotes(){
  var fmp=lsGet('carl-fmp'),fh=lsGet('carl-fh');
  var tickers=Object.keys(EUR_SYMS).filter(function(t){return H.some(function(h){return h.ticker===t&&h.ccy==='EUR';});});
  return Promise.all(tickers.map(function(t){
    var sym=EUR_SYMS[t][0];
    var tries=[];
    // 1) prices.json uit de eigen repo (GitHub Action, Yahoo, geen sleutel nodig)
    tries.push(function(){return getRepoPrices().then(function(pj){var q=pj&&pj.prices&&pj.prices[t];
      if(!q||!(q.price>0)||!q.timestamp)throw new Error('leeg');
      return {p:q.price,ts:Math.floor(Date.parse(q.timestamp)/1000),src:'Yahoo (repo)'};});});
    if(fmp) tries.push(function(){return fetch('https://financialmodelingprep.com/stable/quote?symbol='+encodeURIComponent(sym)+'&apikey='+encodeURIComponent(fmp))
      .then(function(r){if(!r.ok)throw new Error(r.status);return r.json();})
      .then(function(j){var q=Array.isArray(j)?j[0]:null;if(!q||!(q.price>0))throw new Error('leeg');return {p:q.price,ts:q.timestamp||null,src:'FMP'};});});
    if(fh) tries.push(function(){return fetch('https://finnhub.io/api/v1/quote?symbol='+encodeURIComponent(sym)+'&token='+encodeURIComponent(fh))
      .then(function(r){if(!r.ok)throw new Error(r.status);return r.json();})
      .then(function(d){if(!d||!(d.c>0))throw new Error('leeg');return {p:d.c,ts:d.t||null,src:'Finnhub'};});});
    var p=Promise.reject(new Error('geen sleutel'));
    tries.forEach(function(fn){p=p.catch(fn);});
    return p.then(function(r){return {t:t,r:r};},function(){return {t:t,r:null};});
  })).then(function(res){
    var s=lsGet('carl-eur-manual')||{},ok=0;
    res.forEach(function(x){
      if(!x.r) return;
      var p=Math.round(x.r.p*100)/100;
      s[x.t]=p;ok++;
      H.forEach(function(h){if(h.ticker===x.t){h.price=p;h.pl=(h.price-h.avg)/h.avg*100;}});
      if(x.r.ts){s.ts=x.r.ts;s.date=ymd(new Date(x.r.ts*1000));}else{s.date=isoDate();s.ts=Math.floor(Date.now()/1000);}
      s.src=x.r.src;
    });
    if(ok){lsSet('carl-eur-manual',s);updateEurSt();updateAll();cloudSyncDebounced();}
    return ok;
  });
}
// Handmatig ingeven blijft mogelijk; markeer de bron dan als 'handmatig'
var _saveEurOrig=saveEur;
saveEur=function(){
  var s=lsGet('carl-eur-manual')||{};
  _saveEurOrig();
  var n=lsGet('carl-eur-manual')||{};
  if(n.VUSA!==s.VUSA||n.DIET!==s.DIET){n.src='handmatig';n.ts=Math.floor(Date.now()/1000);lsSet('carl-eur-manual',n);updateAll();}
};

// ── #5 Overzicht per broker ──
function brokerBreakdown(){
  var by={};
  function add(n,valE,costE){var b=by[n]||(by[n]={val:0,cost:0});b.val+=valE;b.cost+=costE;}
  H.forEach(function(h){
    if(!(h.shares>0)) return;
    var fx=h.ccy==='USD'?1/EUR_USD:1, used=0;
    if(h.brokers&&h.brokers.length){
      h.brokers.forEach(function(b){add(b.n,b.sh*h.price*fx,b.sh*b.avg*fx);used+=b.sh;});
      var rest=h.shares-used;
      if(Math.abs(rest)>0.001) add('Niet toegewezen',rest*h.price*fx,rest*h.avg*fx);
    } else add(SINGLE_BROKER[h.ticker]||'Niet toegewezen',h.shares*h.price*fx,h.shares*h.avg*fx);
  });
  return by;
}
function renderBrokers(){
  var el=document.getElementById('hBroker');if(!el)return;
  var by=brokerBreakdown(),tot=0;Object.keys(by).forEach(function(k){tot+=by[k].val;});
  var h='<div class="stitle">Per broker</div>';
  Object.keys(by).sort(function(a,b){return by[b].val-by[a].val;}).forEach(function(k){
    var b=by[k],pl=b.val-b.cost,c=pl>=0?'up':'dn';
    h+='<div class="prow"><span class="ptk" style="color:'+(BROKER_COLOR[k]||'var(--t2)')+'">'+k+'</span>'+
      '<span style="font-size:11px;color:var(--t2);flex:1">\u20ac'+n2(b.val)+' \u00b7 '+(tot>0?(b.val/tot*100).toFixed(1):'0')+'%</span>'+
      '<span class="pval '+c+'">'+fmtPct(b.cost>0?pl/b.cost*100:0)+'</span><span class="peur '+c+'">'+fmtEur(pl)+'</span></div>';
  });
  h+='<div style="font-size:10px;color:var(--t3);margin-top:6px">Kostprijs per broker volgens je ingevoerde gemiddelde aankoopprijs.</div>';
  el.innerHTML=h;
}

// ── #6 Excel-vriendelijke export (puntkomma, decimale komma, UTF-8 BOM) ──
function exportExcel(){
  function num(v,d){return (typeof v==='number'&&isFinite(v))?v.toFixed(d).replace('.',','):'';}
  function cell(v){v=String(v==null?'':v);return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}
  var rows=[['Portefeuille Carl','export '+isoDate()+' '+new Date().toLocaleTimeString('nl-BE',{hour:'2-digit',minute:'2-digit'}),'EUR/USD '+num(EUR_USD,4)].join(';'),''];
  rows.push(['Broker','Ticker','Naam','Valuta','Aantal','Gem. aankoop','Koers','Koersbron','Verouderd','Waarde EUR','Kostprijs EUR','Winst/verlies EUR'].join(';'));
  H.forEach(function(h){
    if(!(h.shares>0)) return;
    var fx=h.ccy==='USD'?1/EUR_USD:1,q=quoteInfo(h);
    var parts=(h.brokers&&h.brokers.length)?h.brokers.map(function(b){return {n:b.n,sh:b.sh,avg:b.avg};}):[{n:SINGLE_BROKER[h.ticker]||'',sh:h.shares,avg:h.avg}];
    parts.forEach(function(b){
      var v=b.sh*h.price*fx,c=b.sh*b.avg*fx;
      rows.push([b.n,h.ticker,h.name,h.ccy,num(b.sh,4),num(b.avg,2),num(h.price,2),q.txt,q.stale?'ja':'nee',num(v,2),num(c,2),num(v-c,2)].map(cell).join(';'));
    });
  });
  rows.push('');rows.push('Per broker');rows.push('Broker;Waarde EUR;Kostprijs EUR;Winst/verlies EUR');
  var by=brokerBreakdown();Object.keys(by).forEach(function(k){rows.push([k,num(by[k].val,2),num(by[k].cost,2),num(by[k].val-by[k].cost,2)].map(cell).join(';'));});
  rows.push('');rows.push('Daghistoriek');rows.push('Datum;Dagresultaat EUR;Totale waarde EUR');
  (lsGet(PK.dh)||[]).forEach(function(d){rows.push([d.date,num(d.total,0),d.val!=null?num(d.val,0):''].join(';'));});
  var blob=new Blob(['\ufeff'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='portefeuille-'+isoDate()+'.csv';
  document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(a.href);},1000);
}

// ── #7 Gratis meldingen (enkel als de app open is / ververst; geen betalende push-server) ──
function alertCfg(){var c=lsGet('carl-alerts')||{};return {on:!!c.on,port:typeof c.port==='number'?c.port:-3,stock:typeof c.stock==='number'?c.stock:-8,target:c.target!==false,sent:c.sent||{}};}
function renderAlertUI(){
  var c=alertCfg(),p=document.getElementById('iAlPort'),s=document.getElementById('iAlStock'),t=document.getElementById('iAlTarget'),st=document.getElementById('alertSt');
  if(p)p.value=c.port;if(s)s.value=c.stock;if(t)t.checked=c.target;
  if(st){var perm=('Notification' in window)?Notification.permission:'niet ondersteund';
    st.textContent=(c.on?'\u2713 Meldingen aan':'Meldingen uit')+' \u00b7 toestemming: '+(perm==='granted'?'ja':perm==='denied'?'geweigerd (zet aan in browser-instellingen)':perm==='default'?'nog niet gevraagd':perm);}
}
function saveAlerts(on){
  var c=alertCfg();
  var p=parseFloat(document.getElementById('iAlPort').value),s=parseFloat(document.getElementById('iAlStock').value);
  if(isFinite(p))c.port=-Math.abs(p);if(isFinite(s))c.stock=-Math.abs(s);
  c.target=!!document.getElementById('iAlTarget').checked;c.on=on;
  lsSet('carl-alerts',c);
  if(on&&('Notification' in window)&&Notification.permission==='default') Notification.requestPermission().then(renderAlertUI);
  renderAlertUI();
}
function notify(title,body){
  var shown=false;
  if(('Notification' in window)&&Notification.permission==='granted'){
    try{
      if(navigator.serviceWorker&&navigator.serviceWorker.getRegistration){
        navigator.serviceWorker.getRegistration().then(function(reg){
          if(reg&&reg.showNotification) reg.showNotification(title,{body:body,icon:'icon-192.png',tag:title});
          else new Notification(title,{body:body,icon:'icon-192.png'});
        });
      } else new Notification(title,{body:body,icon:'icon-192.png'});
      shown=true;
    }catch(e){}
  }
  var el=document.getElementById('alertBanner');
  if(el){el.style.display='block';el.innerHTML='\ud83d\udd14 <b>'+title+'</b> \u2014 '+body;}
  return shown;
}
function checkAlerts(){
  var c=alertCfg();if(!c.on) return;
  var today=isoDate(),sent=c.sent[today]||{},msgs=[];
  var dr=dayResultEur(),tot=0;
  H.forEach(function(h){tot+=(h.ccy==='USD')?h.shares*h.price/EUR_USD:h.shares*h.price;});
  if(dr.hasData&&tot>0){
    var pct=dr.eur/(tot-dr.eur)*100;
    if(pct<=c.port&&!sent.port){msgs.push(['Portefeuille '+pct.toFixed(1)+'% vandaag',fmtEur(dr.eur)+' \u00b7 totaal \u20ac'+n2(tot)]);sent.port=1;}
  }
  H.forEach(function(h){
    if(h.ccy!=='USD'||!(h.pc>0)||!h.qt||quoteInfo(h).stale) return; // enkel verse koersen
    var dp=(h.price-h.pc)/h.pc*100;
    if(dp<=c.stock&&!sent['d_'+h.ticker]){msgs.push([h.ticker+' '+dp.toFixed(1)+'% vandaag','$'+h.price.toFixed(2)+' (gisteren $'+h.pc.toFixed(2)+')']);sent['d_'+h.ticker]=1;}
    if(c.target&&h.target>0&&h.price>=h.target&&!sent['t_'+h.ticker]){msgs.push([h.ticker+' bereikte koersdoel','$'+h.price.toFixed(2)+' \u2265 doel $'+h.target.toFixed(2)]);sent['t_'+h.ticker]=1;}
  });
  if(!msgs.length) return;
  msgs.forEach(function(m){notify(m[0],m[1]);});
  var keep={};keep[today]=sent;c.sent=keep;lsSet('carl-alerts',c);
}

// ── #8 Grafieken pas tekenen wanneer het tabblad open is ──
var chartsDirty=true;
function renderChartsLazy(){
  var p=document.getElementById('pane-charts');
  if(p&&p.classList.contains('active')){renderCharts();chartsDirty=false;}else chartsDirty=true;
}
var _goOrig=go;
go=function(id,btn){_goOrig(id,btn);if(id==='charts'&&chartsDirty){renderCharts();chartsDirty=false;}if(id==='settings')renderAlertUI();};

// ── Haken: na elke render / koersophaling ──
var _updateAllOrig=updateAll;
updateAll=function(){_updateAllOrig();renderBrokers();renderStaleBanner();};
var _onFetchDoneOrig=onFetchDone;
onFetchDone=function(btn,st){_onFetchDoneOrig(btn,st);fetchEurQuotes().then(checkAlerts,checkAlerts);};

// ── #2 App op beginscherm: service worker (enkel via https/localhost, niet file://) ──
function registerSW(){
  if(!('serviceWorker' in navigator)) return;
  if(location.protocol!=='https:'&&location.hostname!=='localhost'&&location.hostname!=='127.0.0.1') return;
  navigator.serviceWorker.register('sw.js').catch(function(e){console.warn('SW niet geregistreerd',e);});
}
registerSW();

init();
renderAlertUI();
fetchEurQuotes(); // gratis prices.json: VUSA/D'Ieteren meteen actueel bij openen
