#!/usr/bin/env -S deno run --allow-net --allow-env --allow-run

/**
 * Enhanced Stock Analysis Script (Deno)
 * @description A CLI tool to fetch stock quotes, historical data, CANSLIM zones, volume analysis, and news using Alpha Vantage API.
 * Features: Current price, change, volume with % color-coded, buy/sell zones, ASCII chart (not implemented), ticker & general news.
 * Usage: ./fetch_quote.ts [options] [TICKERS...]
 * Dependencies: Deno standard library (flags, io, colors).
 * API: Requires ALPHA_VANTAGE_API_KEY environment variable.
 * Limitations: Free API has rate limits (5/min, 500/day); news may not always return results.

 * ### Code Assessment (as of July 15, 2025)
 * This assessment evaluates the script's functionality, strengths, weaknesses, and improvement suggestions for use with other LLMs or development.

 * #### Strengths
 * - **Functionality**: Core features work well: fetches quotes/historical data, calculates zones/volume with color output, handles multiple tickers, supports --news/--top-news flags, retry logic for rate limits.
 * - **Error Handling**: Try-catch blocks handle API errors, continuing with other tickers.
 * - **User Experience**: Interactive prompt, help message, ticker validation.
 * - **Dependencies**: Lightweight, uses Deno std lib only.
 * - **Performance**: Sequential calls suitable for small inputs; retry prevents failures.

 * #### Weaknesses and Issues
 * - **News Retrieval**: For some tickers (e.g., CRM, GOOGL), no news returned due to API limitations (sentiment-based, may lack recent data). --top-news often empty; topics too specific.
 * - **API Limitations**: Free tier rate limits can cause delays; no handling for key invalidity or API notes.
 * - **Data Accuracy**: 52-week high assumes full data; volume avg over 30 days but could exclude holidays more precisely.
 * - **Unimplemented Features**: --chart, --chart-ascii, --ai-analysis, --pager parsed but unused (noted in help).
 * - **Code Structure**: Main logic in IIFE; could be modularized. No unit tests.
 * - **Edge Cases**: Handled well (invalid tickers filtered, non-trading days use latest), but news empty for some.
 * - **Security/Practices**: Good (env var for key, input validation), but no sanitization beyond tickers.

 * #### Recommendations
 * - Extend news time_from to 30-90 days or remove for --top-news.
 * - Add parallel fetches with throttling for multiple tickers.
 * - Implement tests with Deno.test for functions like pct, validateTicker.
 * - Remove/stub unused flags if not planning implementation.
 * - Overall Score: 8/10 - Solid CLI tool, but API-dependent news is main issue.

 */

import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";
import { readLines } from "https://deno.land/std@0.181.0/io/read_lines.ts";
import { bold, green, red, yellow } from "https://deno.land/std@0.181.0/fmt/colors.ts";

async function ask(q: string): Promise<string> {
  await Deno.stdout.write(new TextEncoder().encode(q));
  for await (const l of readLines(Deno.stdin)) return l.trim();
  return "";
}

function pct(x: number): string { return `${(x*100).toFixed(2)}%`; }
function validateTicker(t: string): boolean { return /^[A-Z.]+$/i.test(t); }

async function fetchWithRetry(url: string, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const resp = await fetch(url);
    if (resp.ok) return resp;
    if (resp.status === 429) {
      console.warn(yellow(`Rate limit; retrying in ${delay/1000}s...`));
      await new Promise(r=>setTimeout(r, delay)); delay*=2;
    } else throw new Error(`HTTP ${resp.status}`);
  }
  throw new Error("Max retries exceeded");
}

function formatDateForApi(d: Date): string {
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), dd = String(d.getDate()).padStart(2,'0');
  return `${y}${m}${dd}T0000`;
}

const openCmd = Deno.build.os==='windows' ? ['cmd.exe','/c','start'] : ['open'];
const pagerCmd = Deno.build.os==='windows' ? ['more'] : ['less','-R'];

const {
  ticker,
  'top-news': showTopNews,
  news: showAllTickerNews,
  pager: usePager,
  chart: openChart,
  'chart-ascii': showAscii,
  'ai-analysis': aiAnalysis,
  'buy-pct': buyPct = 0.07,
  'sell-pct': sellPct = 0.08,
  help,
  _: positional,
} = parse(Deno.args, {
  alias:{t:'ticker',tn:'top-news',n:'news',h:'help'},
  boolean:['top-news','news','pager','chart','chart-ascii','ai-analysis','help'],
  default:{'buy-pct':0.07,'sell-pct':0.08,'top-news':false,news:false,pager:false,chart:false,'chart-ascii':false,'ai-analysis':false,help:false}
});

if(help){
  console.log(`Usage: fetch_quote.ts [options] [TICKERS...]
Options:
  -t, --ticker       Comma-separated symbols
      --buy-pct      Buy zone % (default 7)
      --sell-pct     Sell thresh % (default 8)
  -tn, --top-news    Show all relevant general market headlines
  -n, --news         Show all recent news for the ticker (instead of top 3)
      --chart        Open chart in browser (not implemented)
      --chart-ascii  ASCII chart (not implemented)
      --ai-analysis  AI analysis (not implemented)
      --pager        Page output (not implemented)
  -h, --help         Help message
`);
  Deno.exit(0);
}

const API_KEY = Deno.env.get('ALPHA_VANTAGE_API_KEY');
if(!API_KEY){ console.error(red('Set ALPHA_VANTAGE_API_KEY')); Deno.exit(1); }

// Ticker-specific news
async function fetchNews(sym:string){
  const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${sym}&time_from=${formatDateForApi(new Date(Date.now()-30*86400000))}&limit=50&sort=LATEST&apikey=${API_KEY}`;
  const data = await fetchWithRetry(url).then(r=>r.json());
  return data.feed as any[]||[];
}
// General market headlines
async function fetchTopNews(){
  const topics='financial_markets,economy_fiscal,economy_monetary,economy_macro,finance';
  const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=${topics}&time_from=${formatDateForApi(new Date(Date.now()-30*86400000))}&limit=50&sort=LATEST&apikey=${API_KEY}`;
  const data = await fetchWithRetry(url).then(r=>r.json());
  const feed = (data.feed as any[]||[]);
  const seen=new Set<string>();
  return feed.filter(i=> seen.has(i.title)?false:seen.add(i.title));
}

function printTopNews(items:any[]){
  console.log(bold(`\nTop Market Headlines:`));
  items.forEach(i=>console.log(` - ${i.title}`));
}

(async()=>{
  let symbols:string[] = [];
  if(ticker) symbols = String(ticker).split(',').map(s=>s.trim().toUpperCase());
  else if(positional.length) symbols = positional.map(s=>String(s).toUpperCase());
  else {
    if (!showTopNews) {
      const inpt = await ask('Enter ticker(s), comma-separated: ');
      symbols = inpt.split(',').map(s=>s.trim().toUpperCase());
    }
  }

  symbols = symbols.filter(validateTicker);
  if(!symbols.length && !showTopNews){ console.error(red('No valid tickers')); Deno.exit(1); }

  if (showTopNews) {
    const general = await fetchTopNews();
    if (general.length) printTopNews(general);
    else console.log('No general market headlines found.');
  }
  for(const sym of symbols){
    try{
      // Quote
      const q = await fetchWithRetry(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${sym}&apikey=${API_KEY}`)
        .then(r=>r.json()).then(d=>d['Global Quote']);
      const price = parseFloat(q['05. price']);
      const change = parseFloat(q['09. change']);
      const changePct=q['10. change percent'];
      console.log(bold(`\n${sym} @ ${q['07. latest trading day']}:`));
      console.log(` Price: ${change>=0?green(`$${price}`):red(`$${price}`)} (${change>=0?'+':''}${change} ${changePct})`);

      // History data
      const { highs, volumes, dates } = await fetchWithRetry(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${sym}&outputsize=full&entitlement=delayed&apikey=${API_KEY}`)
        .then(r=>r.json()).then(json=>{
          const series = json['Time Series (Daily)'];
          const ld=q['07. latest trading day']; const cutoff=new Date(ld); cutoff.setDate(cutoff.getDate()-52*7);
          return Object.entries(series).map(([d,v])=>({d, time:new Date(d).getTime(), h:parseFloat(v['2. high'])*(parseFloat(v['5. adjusted close'])/parseFloat(v['4. close'])), vol:parseFloat(v['6. volume'])}))
            .filter(e=>e.time>=cutoff.getTime()).sort((a,b)=>a.time-b.time);
        }).then(arr=>({highs:arr.map(x=>x.h), volumes:arr.map(x=>x.vol), dates:arr.map(x=>x.d)}));

      // Volume analysis
      const recent = dates[dates.length-1]===q['07. latest trading day']?volumes.slice(-31,-1):volumes.slice(-30);
      const avgVol = recent.reduce((a,b)=>a+b,0)/recent.length;
      const todayVol = volumes[volumes.length-1];
      const volPct=(todayVol-avgVol)/avgVol;
      const volColor = todayVol>avgVol?green:red;
      console.log(` Volume: ${volColor(todayVol.toLocaleString())}  Avg30: ${Math.round(avgVol).toLocaleString()}  ${volColor((volPct>=0?'+':'')+pct(volPct))}`);

      // CANSLIM zones
      const todayHigh=parseFloat(q['03. high']);
      const high52=Math.max(...highs,todayHigh);
      const buyLow=high52*(1-buyPct), sellThr=high52*(1-sellPct);
      console.log(` 52wk High: $${high52.toFixed(2)}`);
      console.log(` BuyZone : $${buyLow.toFixed(2)} - $${high52.toFixed(2)} (${pct(buyPct)} below)`);
      console.log(` Sell<   : $${sellThr.toFixed(2)} (${pct(sellPct)} below)`);
      console.log(price>=buyLow&&price<=high52?green(' → Buy zone'):price<sellThr?red(' → Sell'):yellow(' → Hold'));

      // NEWS
      if (!showTopNews) {
        const tickerNews = await fetchNews(sym);
        const displayedNews = showAllTickerNews ? tickerNews : tickerNews.slice(0, 3);
        if (displayedNews.length) {
          console.log(bold(`\n${showAllTickerNews ? 'All recent news' : 'Top 3 news'} for ${sym}:`));
          displayedNews.forEach(n => console.log(` - ${n.title}`));
        } else {
          console.log(`No recent news found for ${sym}.`);
        }
      }

      console.log('-'.repeat(60));
    }catch(e){ console.error(red(`Error ${sym}: ${e.message}`)); }
  }
})();