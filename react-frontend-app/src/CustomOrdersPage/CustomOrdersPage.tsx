// COMPLETE CLEAN REWRITE (previous file was corrupted with legacy fragments)
import React, { useState, useEffect, useCallback } from 'react';
import { Play, Plus, Eye, AlertCircle, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { balanceAPI } from '../TradeStatisticsPage/services/balanceAPI';
import { tradeAPI } from '../TradeStatisticsPage/services/tradeAPI';
import { OrderConfig, NewTrade, NewTradeStop, ServerStatus, ErrorLog, IbConnectionStatus } from './types';
import { OrderConfigTab } from './components/OrderConfigTab';
import { TradesTab } from './components/TradesTab';
import { StatusTab } from './components/StatusTab';
import { ErrorsTab } from './components/ErrorsTab';

export function CustomOrdersPage() {
  const ORDER_CONFIG_KEY = 'customOrdersPage.orderConfig.v1';
  const NEW_TRADE_KEY = 'customOrdersPage.newTrade.v2';
  const PIVOT_KEY = 'customOrdersPage.pivotPositions.v1';
  const SHOW_ADV_KEY = 'customOrdersPage.showAdvanced.v1';

  const defaultOrderConfig: OrderConfig = {
    ticker: '', lower_price: 0, higher_price: 0, volume_requirements: [], pivot_adjustment: '0.0',
    day_high_max_percent_off: 3, time_in_pivot: 30, time_in_pivot_positions: '', data_server: 'http://localhost:5001',
    trade_server: 'http://localhost:5002', volume_multipliers: [1,1,1], max_day_low: null, min_day_low: null,
    wait_after_open_minutes: 1.01, breakout_lookback_minutes: 60, breakout_exclude_minutes: 0.5,
    start_minutes_before_close: null, stop_minutes_before_close: 0, request_lower_price: null, request_higher_price: null,
  };
  const defaultPivotPositions = { any: false, lower: false, middle: false, upper: false };
  const defaultNewTrade: NewTrade = {
    ticker: '', shares: 0, risk_amount: 0, risk_percent_of_equity: 0, lower_price_range: 0, higher_price_range: 0,
    sell_stops: [{ price: 0, position_pct: 1, percent_below_fill: undefined, __ui_mode: 'price' }]
  };

  const safeLoad = <T,>(k: string, fb: T): T => { if (typeof window === 'undefined') return fb; try { const raw = localStorage.getItem(k); if (!raw) return fb; const p = JSON.parse(raw); return typeof p === 'object' && p !== null ? { ...fb, ...p } : fb; } catch { return fb; } };

  const [activeTab, setActiveTab] = useState<'order' | 'trades' | 'status' | 'errors'>('order');
  const [orderConfig, setOrderConfig] = useState<OrderConfig>(() => safeLoad(ORDER_CONFIG_KEY, defaultOrderConfig));
  const [pivotPositions, setPivotPositions] = useState(() => safeLoad(PIVOT_KEY, defaultPivotPositions));
  const [newTrade, setNewTrade] = useState<NewTrade>(() => safeLoad(NEW_TRADE_KEY, defaultNewTrade));
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [riskAmount, setRiskAmount] = useState(0);
  const [showVolumeWarningModal, setShowVolumeWarningModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(() => { if (typeof window === 'undefined') return false; try { return JSON.parse(localStorage.getItem(SHOW_ADV_KEY) || 'false'); } catch { return false; } });
  const [flash, setFlash] = useState({ order: false, trade: false, advanced: false, refresh: false });
  const subtleFlashClass = 'ring-2 ring-primary/50 bg-muted/60 shadow-sm';
  const triggerFlash = (k: keyof typeof flash, d=180) => { setFlash(p=>({...p,[k]:true})); window.setTimeout(()=>setFlash(p=>({...p,[k]:false})), d); };
  const [currentEquity, setCurrentEquity] = useState<number | null>(null);
  const [ibStatus, setIbStatus] = useState<IbConnectionStatus | null>(null);
  const [ibStatusLoading, setIbStatusLoading] = useState(false);

  // Equity polling
  useEffect(() => { let m=true; const load=async()=>{ try{ const balance=await balanceAPI.getBalance(); const resp=await tradeAPI.getTrades(); const trades:Array<{Return:number|null}> = resp.data; const ret=trades.reduce((s,t)=>s+(t.Return??0),0); if(m) setCurrentEquity(Math.round((balance+ret)*100)/100);}catch(e){console.error(e);} }; load(); const iv=setInterval(load,20000); return ()=>{m=false;clearInterval(iv);};},[]);

  // Status & errors polling
  const fetchStatus = async () => { try { const r = await fetch('http://localhost:5002/status'); setServerStatus(await r.json()); } catch(e){ console.error(e);} };
  const fetchErrors = async () => { try { const r = await fetch('http://localhost:5002/errors'); const j=await r.json(); if(j.success) setErrors(j.errors); } catch(e){ console.error(e);} };
  useEffect(()=>{ fetchStatus(); fetchErrors(); const iv=setInterval(()=>{fetchStatus();fetchErrors();},5000); return ()=>clearInterval(iv);},[]);
  const fetchIbStatus = useCallback(async () => {
    setIbStatusLoading(true);
    try {
      const response = await fetch('http://localhost:5002/ib_status');
      const data = await response.json();
      setIbStatus({
        success: !!data.success,
        stage: data.stage,
        message: data.message || (data.success ? 'IBKR Web API responded successfully.' : 'Unable to reach IBKR Web API.'),
        sample_symbol: data.sample_symbol,
        sample_conid: data.sample_conid,
        checked_at: data.checked_at || new Date().toISOString(),
      });
    } catch {
      setIbStatus({
        success: false,
        stage: 'network',
        message: 'Unable to reach IBKR status endpoint. Ensure the Stock Buyer server is running.',
        checked_at: new Date().toISOString(),
      });
    } finally {
      setIbStatusLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchIbStatus();
    const iv = setInterval(() => { fetchIbStatus(); }, 30000);
    return () => clearInterval(iv);
  }, [fetchIbStatus]);

  // Pivot position update
  const updatePivotPositions = (position: string, checked: boolean) => {
    setPivotPositions(p=>({...p,[position]:checked}));
    const updated = { ...pivotPositions, [position]: checked };
    const selected = Object.entries(updated).filter(([,v])=>v).map(([k])=>k).join(',');
    setOrderConfig(o=>({...o,time_in_pivot_positions:selected}));
  };

  // Risk update
  const updateRisk = async () => { setLoading(true); try { const r=await fetch('http://localhost:5002/update_risk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:riskAmount})}); const j=await r.json(); alert(j.success?'Risk amount updated successfully!':`Error: ${j.error}`); if(j.success) fetchStatus(); } catch(e){ alert(`Network error: ${e}`);} finally { setLoading(false);} };

  // Trade actions
  const deleteTrade = async (tradeId:string) => { if(!confirm('Delete trade?')) return; setLoading(true); try { const r=await fetch('http://localhost:5002/remove_trade',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({trade_id:tradeId})}); const j=await r.json(); alert(j.success?'Trade deleted successfully!':`Error: ${j.error}`); if(j.success) fetchStatus(); } catch(e){ alert(`Network error: ${e}`);} finally { setLoading(false);} };
  const executeTradeNow = async ({ticker,lower_price_range,higher_price_range}:{ticker:string;lower_price_range:number;higher_price_range:number;}) => { if(!confirm(`Execute now?\n${ticker} $${lower_price_range.toFixed(2)}-$${higher_price_range.toFixed(2)}`)) return; setLoading(true); try { const r=await fetch('http://localhost:5002/execute_trade',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticker,lower_price:lower_price_range,higher_price:higher_price_range})}); const j=await r.json(); alert(j.success?'Trade execution started.':`Execution error: ${j.error||'Unknown'}`); if(j.success) fetchStatus(); } catch(e){ alert(`Network error: ${e}`);} finally { setLoading(false);} };

  // Share / stop math
  const mid = (l:number,u:number)=> (!isFinite(l)||!isFinite(u)||l<=0||u<=0||l===u)?null:(l+u)/2;
  const autoShares = (t:NewTrade)=>{ const entry=mid(t.lower_price_range,t.higher_price_range); if(entry==null||!isFinite(t.risk_amount)||t.risk_amount<=0||t.sell_stops.length===0) return null; let wd=0; for(const s of t.sell_stops){ const pct=Number(s.position_pct)||0; if(pct<=0) continue; let stopPrice:number|null=null; if((s.__ui_mode??'price')==='percent'){ stopPrice=entry*(1-(Number(s.percent_below_fill)||0)/100);} else { stopPrice=Number(s.price);} if(!stopPrice||!isFinite(stopPrice)) continue; const drop=entry-stopPrice; if(drop<=0) continue; wd+=pct*drop; } if(wd<=0) return null; const sh=t.risk_amount/wd; return (!isFinite(sh)||sh<=0)?null:Math.round(sh*100)/100; };
  const allocate = (total:number, stops:NewTradeStop[])=>{ const cents=Math.max(0,Math.round((total||0)*100)); if(!stops.length) return [] as number[]; const p=stops.map(s=>Math.max(0,Number(s.position_pct)||0)); const sum=p.reduce((a,b)=>a+b,0); if(sum<=0){ const r=new Array(stops.length).fill(0); r[0]=cents/100; return r;} const raw=p.map(x=>cents*(x/sum)); const base=raw.map(x=>Math.floor(x)); let rem=cents-base.reduce((a,b)=>a+b,0); const order=raw.map((v,i)=>({i,f:v-Math.floor(v)})).sort((a,b)=>b.f-a.f).map(o=>o.i); let c=0; while(rem>0){ base[order[c%order.length]]+=1; rem--; c++; } return base.map(v=>v/100); };
  const buildPayload = (t:NewTrade, auto:boolean)=>{ const totalRaw=auto?((autoShares(t)??t.shares)||0):(t.shares||0); const total=Math.max(0,Math.round(totalRaw*100)/100); const alloc=allocate(total,t.sell_stops); const entry=mid(t.lower_price_range,t.higher_price_range)??0; return { ticker:t.ticker, shares:total, risk_amount:t.risk_amount, lower_price_range:t.lower_price_range, higher_price_range:t.higher_price_range, sell_stops:t.sell_stops.map((s,i)=>(s.__ui_mode??'price')==='percent'?{shares:alloc[i]??0,percent_below_fill:s.percent_below_fill??0}:{shares:alloc[i]??0,price:s.price??entry}) }; };
  const [autoCalcEnabled, setAutoCalcEnabled] = useState(true);
  const [autoCalcReady, setAutoCalcReady] = useState(false);
  useEffect(()=>{ if(!autoCalcEnabled){ setAutoCalcReady(autoShares(newTrade)!=null); return;} const s=autoShares(newTrade); const ready=s!=null; setAutoCalcReady(!!ready); if(ready && Number(newTrade.shares)!==s) setNewTrade(t=>({...t,shares:s!})); // eslint-disable-next-line react-hooks/exhaustive-deps
  },[autoCalcEnabled,newTrade.lower_price_range,newTrade.higher_price_range,newTrade.risk_amount,JSON.stringify(newTrade.sell_stops)]);
  const addSellStop=()=>setNewTrade(t=>({...t,sell_stops:[...t.sell_stops,{price:0,position_pct:0,percent_below_fill:undefined,__ui_mode:'price'}]}));
  const removeSellStop=(i:number)=>setNewTrade(t=>({...t,sell_stops:t.sell_stops.filter((_,idx)=>idx!==i)}));
  const updateSellStop=(i:number,field:'price'|'position_pct'|'percent_below_fill'|'__ui_mode',value:number|string)=>setNewTrade(t=>({...t,sell_stops:t.sell_stops.map((s,idx)=>{ if(idx!==i) return s; if(field==='__ui_mode'){ const mode=value as 'price'|'percent'; return mode==='price'?{...s,__ui_mode:'price',percent_below_fill:undefined,price:s.price??0}:{...s,__ui_mode:'percent',price:undefined,percent_below_fill:s.percent_below_fill??1}; } const num=typeof value==='string'?(parseFloat(value)||0):value; return { ...s, [field]: num } as NewTradeStop; })}));
  const addTrade = async () => { const totalPct=newTrade.sell_stops.reduce((s,st)=>s+(Number(st.position_pct)||0),0); if(Math.abs(totalPct-1)>0.001){ alert(`Sell stop percentages must sum to 1.0. Current: ${totalPct.toFixed(4)}`); return;} setLoading(true); try { const payload=buildPayload(newTrade,autoCalcEnabled); const r=await fetch('http://localhost:5002/add_trade',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const j=await r.json(); if(j.success){ try{ await fetch('http://localhost:5001/tickers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({symbol:newTrade.ticker.toUpperCase()})}); }catch(e){ console.error('ticker add',e);} alert('Trade added successfully!'); setNewTrade(defaultNewTrade); fetchStatus(); } else { alert(`Error: ${j.error}`);} } catch(e){ alert(`Network error: ${e}`);} finally { setLoading(false);} };

  // Persistence
  useEffect(()=>{ try{ localStorage.setItem(ORDER_CONFIG_KEY,JSON.stringify(orderConfig)); }catch{ /* ignore persistence error */ } },[orderConfig]);
  useEffect(()=>{ try{ localStorage.setItem(NEW_TRADE_KEY,JSON.stringify(newTrade)); }catch{ /* ignore persistence error */ } },[newTrade]);
  useEffect(()=>{ try{ localStorage.setItem(PIVOT_KEY,JSON.stringify(pivotPositions)); }catch{ /* ignore persistence error */ } },[pivotPositions]);
  useEffect(()=>{ try{ localStorage.setItem(SHOW_ADV_KEY,JSON.stringify(showAdvanced)); }catch{ /* ignore persistence error */ } },[showAdvanced]);
  const clearSavedOrderConfig=()=>{ setOrderConfig(defaultOrderConfig); try{localStorage.removeItem(ORDER_CONFIG_KEY);}catch{ /* ignore */ } triggerFlash('order'); };
  const clearSavedTrade=()=>{ setNewTrade(defaultNewTrade); try{localStorage.removeItem(NEW_TRADE_KEY);}catch{ /* ignore */ } triggerFlash('trade'); };

  // Start order (volume warning)
  const performStartOrder=async()=>{ setLoading(true); try{ const resp=await fetch('http://localhost:5003/start_bot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(orderConfig)}); const j=await resp.json(); alert(j.success?'Order started successfully!':`Error: ${j.error}`);}catch(e){ alert(`Network error: ${e}`);} finally{ setLoading(false);} };
  const startOrderHandler=()=>{ if(orderConfig.volume_requirements.length===0){ setShowVolumeWarningModal(true); return;} performStartOrder(); };

  const TabButton=({tab,label,icon:Icon}:{tab:string;label:string;icon:React.ComponentType<{className?:string}>})=>(
    <button onClick={()=>setActiveTab(tab as typeof activeTab)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab===tab?'bg-primary text-primary-foreground':'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}>
      <Icon className="w-4 h-4" />{label}
    </button>
  );
  const isUnavailable = ibStatus != null && !ibStatus.success;
  const ibStatusVariantClass = ibStatus == null
    ? 'bg-muted/40 border-border'
    : ibStatus.success
      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 border-2';

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-card text-card-foreground rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold mb-6">Custom Breakout Order Management</h1>
        <div className={`mb-4 border rounded flex items-center justify-between gap-3 ${ibStatusVariantClass} ${isUnavailable ? 'px-4 py-3 shadow-md' : 'px-3 py-2'}`}>
          <div className="flex items-center gap-2">
            {ibStatus?.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className={`text-rose-600 dark:text-rose-400 flex-shrink-0 ${isUnavailable ? 'w-5 h-5' : 'w-4 h-4'}`} />
            )}
            <span className={isUnavailable ? 'text-base font-semibold' : 'text-sm font-medium'}>
              {ibStatus == null ? 'Checking IBKR...' : ibStatus.success ? 'IBKR API Ready' : 'IBKR API Unavailable'}
            </span>
            {ibStatus?.success && (
              <span className="text-xs text-emerald-700 dark:text-emerald-300">• Application can submit orders</span>
            )}
            {!ibStatus?.success && (
              <span className={isUnavailable ? 'text-sm text-rose-700 dark:text-rose-300 font-medium' : 'text-xs text-muted-foreground'}>
                {isUnavailable ? "Can't place orders • Start Docker Desktop and ibeam container" : '• Start Docker ibeam container'}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fetchIbStatus()}
            disabled={ibStatusLoading}
            className={`inline-flex items-center gap-1 rounded border border-input hover:bg-muted/60 disabled:opacity-60 ${isUnavailable ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs'}`}
          >
            <RefreshCw className={`${isUnavailable ? 'w-4 h-4' : 'w-3 h-3'} ${ibStatusLoading ? 'animate-spin' : ''}`} />
            {ibStatusLoading ? 'Checking' : 'Refresh'}
          </button>
        </div>
        <div className="flex gap-2 mb-6">
          <TabButton tab="order" label="Order Config" icon={Play} />
          <TabButton tab="trades" label="Trades" icon={Plus} />
          <TabButton tab="status" label="Status" icon={Eye} />
          <TabButton tab="errors" label="Errors" icon={AlertCircle} />
        </div>
        {activeTab==='order' && (
          <OrderConfigTab
            orderConfig={orderConfig}
            setOrderConfig={setOrderConfig}
            pivotPositions={pivotPositions}
            updatePivotPositions={updatePivotPositions}
            clearSavedOrderConfig={clearSavedOrderConfig}
            showAdvanced={showAdvanced}
            setShowAdvanced={setShowAdvanced}
            startOrder={startOrderHandler}
            loading={loading}
            flashAdvanced={flash.advanced}
            flashOrder={flash.order}
            triggerFlash={(k: string)=>triggerFlash(k as keyof typeof flash)}
            subtleFlashClass={subtleFlashClass}
          />
        )}
        {activeTab==='trades' && (
          <TradesTab
            newTrade={newTrade}
            setNewTrade={setNewTrade}
            clearSavedTrade={clearSavedTrade}
            addTrade={addTrade}
            loading={loading}
            flashTrade={flash.trade}
            triggerFlash={(k: string)=>triggerFlash(k as keyof typeof flash)}
            subtleFlashClass={subtleFlashClass}
            computeMidPrice={mid}
            addSellStop={addSellStop}
            removeSellStop={removeSellStop}
            updateSellStop={updateSellStop}
            autoCalcEnabled={autoCalcEnabled}
            setAutoCalcEnabled={setAutoCalcEnabled}
            autoCalcReady={autoCalcReady}
            currentEquity={currentEquity}
          />
        )}
        {activeTab==='status' && (
          <StatusTab
            serverStatus={serverStatus}
            executeTradeNow={executeTradeNow}
            deleteTrade={deleteTrade}
            loading={loading}
            riskAmount={riskAmount}
            setRiskAmount={setRiskAmount}
            updateRisk={updateRisk}
          />
        )}
        {activeTab==='errors' && (
          <ErrorsTab
            errors={errors}
            fetchErrors={fetchErrors}
            triggerFlash={(k: string)=>triggerFlash(k as keyof typeof flash)}
            flashRefresh={flash.refresh}
            subtleFlashClass={subtleFlashClass}
          />
        )}
      </div>
      {showVolumeWarningModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              <h3 className="text-lg font-semibold text-foreground">No Volume Requirements Set</h3>
            </div>
            <p className="text-muted-foreground mb-6">You haven't set any volume requirements. Continue anyway?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={()=>setShowVolumeWarningModal(false)} className="px-4 py-2 text-muted-foreground border border-input rounded-lg hover:bg-muted/50">Cancel</button>
              <button onClick={performStartOrder} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800">Start Anyway</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomOrdersPage;