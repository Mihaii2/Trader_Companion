import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowUp, ArrowDown, Trash2, Plus, RefreshCw, Check } from 'lucide-react';
import { globalCharacteristicsApi } from '../services/globalCharacteristics';
import { characteristicMetaApi, OrderedCharacteristicMeta, PriorityCharacteristicMeta, ColorCodedCharacteristicMeta } from '../services/characteristicMeta';
import type { GlobalCharacteristic } from '../types';

// Minimal inline manager for Ordered / Priority / Color-Coded meta
// Intentionally simple: list + add select + delete + reorder (ordered only)

const SectionHeading: React.FC<{title:string; subtitle?:string}> = ({title, subtitle}) => (
  <div className="flex items-center justify-between mb-1">
    <div>
      <h3 className="text-sm font-semibold leading-tight">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground -mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

interface SelectableOption { id:number; name:string; }

export const CharacteristicMetaManager: React.FC = () => {
  const [allChars, setAllChars] = useState<GlobalCharacteristic[]>([]);
  const [ordered, setOrdered] = useState<OrderedCharacteristicMeta[]>([]);
  const [priority, setPriority] = useState<PriorityCharacteristicMeta[]>([]);
  const [colorCoded, setColorCoded] = useState<ColorCodedCharacteristicMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [addingOrderedId, setAddingOrderedId] = useState<number|''>('');
  const [addingPriorityId, setAddingPriorityId] = useState<number|''>('');
  const [addingColorId, setAddingColorId] = useState<number|''>('');
  const [reorderDirty, setReorderDirty] = useState(false);

  const loadAll = async () => {
    setLoading(true); setError(null);
    try {
      const [allRes, oRes, pRes, cRes] = await Promise.all([
        globalCharacteristicsApi.getAllGlobalCharacteristics(),
        characteristicMetaApi.getOrdered(),
        characteristicMetaApi.getPriority(),
        characteristicMetaApi.getColorCoded()
      ]);
      setAllChars(allRes.data);
      setOrdered(oRes.data as OrderedCharacteristicMeta[]);
      setPriority(pRes.data as PriorityCharacteristicMeta[]);
      setColorCoded(cRes.data as ColorCodedCharacteristicMeta[]);
      setReorderDirty(false);
    } catch(e){
      console.error(e);
      setError('Failed to load meta lists');
    } finally { setLoading(false); }
  };

  useEffect(()=>{loadAll();}, []);

  const remainingOptions = (usedNames:Set<string>):SelectableOption[] =>
    allChars.filter(c=>!usedNames.has(c.name)).map(c=>({id:c.id,name:c.name}));

  const addOrdered = async () => {
    if(addingOrderedId==='') return; setLoading(true);
    try {
      await characteristicMetaApi.createOrdered({ characteristic_id: addingOrderedId });
      setAddingOrderedId('');
      await loadAll();
  } catch{ setError('Failed to add ordered'); } finally { setLoading(false); }
  };
  const addPriority = async () => {
    if(addingPriorityId==='') return; setLoading(true);
  try { await characteristicMetaApi.createPriority({ characteristic_id: addingPriorityId }); setAddingPriorityId(''); await loadAll(); }
  catch{ setError('Failed to add priority'); } finally { setLoading(false); }
  };
  const addColor = async () => {
    if(addingColorId==='') return; setLoading(true);
  try { await characteristicMetaApi.createColorCoded({ characteristic_id: addingColorId }); setAddingColorId(''); await loadAll(); }
  catch{ setError('Failed to add color-coded'); } finally { setLoading(false); }
  };

  const removeOrdered = async (id:number) => { setLoading(true); try { await characteristicMetaApi.deleteOrdered(id); await loadAll(); } catch { setError('Delete failed'); } finally { setLoading(false);} };
  const removePriority = async (id:number) => { setLoading(true); try { await characteristicMetaApi.deletePriority(id); await loadAll(); } catch { setError('Delete failed'); } finally { setLoading(false);} };
  const removeColor = async (id:number) => { setLoading(true); try { await characteristicMetaApi.deleteColorCoded(id); await loadAll(); } catch { setError('Delete failed'); } finally { setLoading(false);} };

  const moveOrdered = (id:number, dir:-1|1) => {
    setOrdered(prev => {
      const idx = prev.findIndex(o=>o.id===id);
      if(idx<0) return prev;
      const target = idx+dir; if(target<0||target>=prev.length) return prev;
      const copy = [...prev];
      const [a,b] = [copy[idx], copy[target]];
      [copy[idx], copy[target]] = [b,a];
      // Reassign positions locally (1-based)
      return copy.map((o,i)=>({...o, position:i+1}));
    });
    setReorderDirty(true);
  };

  const saveReorder = async () => {
    setLoading(true); setError(null);
    try {
      await characteristicMetaApi.reorderOrdered(ordered.map(o=>({id:o.id, position:o.position})));
      setReorderDirty(false);
      await loadAll();
  } catch{ setError('Failed to save order'); } finally { setLoading(false); }
  };

  const usedPriorityNames = new Set(priority.map(p=>p.name));
  const usedColorNames = new Set(colorCoded.map(c=>c.name));
  const usedOrderedNames = new Set(ordered.map(o=>o.name));

  return (
    <Card className="mt-4">
      <CardHeader className="py-2 px-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">Characteristic Meta Manager
          <Button size="sm" variant="outline" className="h-7 px-2" disabled={loading} onClick={loadAll}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 space-y-4">
        {error && (
          <Alert variant="destructive" className="py-1 px-2 text-xs"><AlertDescription>{error}</AlertDescription></Alert>
        )}
        <div className="grid md:grid-cols-3 gap-3">
          {/* Ordered */}
          <div className="border rounded p-2 overflow-hidden">
            <SectionHeading title="Ordered" subtitle="Controls sorting priority" />
            <ul className="space-y-1 mb-2 max-h-56 overflow-auto text-sm">
              {ordered.sort((a,b)=>a.position-b.position).map(item => (
                <li key={item.id} className="flex items-center gap-1">
                  <span className="w-5 text-xs text-muted-foreground">{item.position}</span>
                  <span className="flex-1 truncate">{item.name}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" disabled={loading} onClick={()=>moveOrdered(item.id,-1)}><ArrowUp className="h-3 w-3"/></Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" disabled={loading} onClick={()=>moveOrdered(item.id,1)}><ArrowDown className="h-3 w-3"/></Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" disabled={loading} onClick={()=>removeOrdered(item.id)}><Trash2 className="h-3 w-3"/></Button>
                </li>
              ))}
              {ordered.length===0 && <li className="text-xs text-muted-foreground">None yet.</li>}
            </ul>
            <div className="flex items-center gap-1 min-w-0">
              <div className="flex-1 min-w-0">
                <select
                  className="w-full min-w-0 h-7 border rounded px-1 text-xs bg-background truncate"
                  value={addingOrderedId}
                  onChange={e=>setAddingOrderedId(e.target.value?Number(e.target.value):'')}
                  disabled={loading}
                  title={addingOrderedId!=='' ? (remainingOptions(usedOrderedNames).find(o=>o.id===addingOrderedId)?.name || '') : 'Add characteristic'}
                >
                  <option value="">Add...</option>
                  {remainingOptions(usedOrderedNames).map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                </select>
              </div>
              <Button size="sm" className="h-7 px-2 flex-shrink-0" disabled={loading||addingOrderedId===''} onClick={addOrdered}><Plus className="h-3 w-3"/></Button>
              {reorderDirty && <Button size="sm" variant="outline" className="h-7 px-2 flex-shrink-0" disabled={loading} onClick={saveReorder}><Check className="h-3 w-3 mr-1"/>Save</Button>}
            </div>
          </div>

          {/* Priority */}
          <div className="border rounded p-2 overflow-hidden">
            <SectionHeading title="Priority" subtitle="Shown as yellow tags" />
            <ul className="space-y-1 mb-2 max-h-56 overflow-auto text-sm">
              {priority.map(item => (
                <li key={item.id} className="flex items-center gap-1">
                  <span className="flex-1 truncate">{item.name}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" disabled={loading} onClick={()=>removePriority(item.id)}><Trash2 className="h-3 w-3"/></Button>
                </li>
              ))}
              {priority.length===0 && <li className="text-xs text-muted-foreground">None yet.</li>}
            </ul>
            <div className="flex items-center gap-1 min-w-0">
              <div className="flex-1 min-w-0">
                <select
                  className="w-full min-w-0 h-7 border rounded px-1 text-xs bg-background truncate"
                  value={addingPriorityId}
                  onChange={e=>setAddingPriorityId(e.target.value?Number(e.target.value):'')}
                  disabled={loading}
                  title={addingPriorityId!=='' ? (remainingOptions(usedPriorityNames).find(o=>o.id===addingPriorityId)?.name || '') : 'Add priority characteristic'}
                >
                  <option value="">Add...</option>
                  {remainingOptions(usedPriorityNames).map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                </select>
              </div>
              <Button size="sm" className="h-7 px-2 flex-shrink-0" disabled={loading||addingPriorityId===''} onClick={addPriority}><Plus className="h-3 w-3"/></Button>
            </div>
          </div>

            {/* Color Coded */}
          <div className="border rounded p-2 overflow-hidden">
            <SectionHeading title="Color-Coded" subtitle="Green/Red background logic" />
            <ul className="space-y-1 mb-2 max-h-56 overflow-auto text-sm">
              {colorCoded.map(item => (
                <li key={item.id} className="flex items-center gap-1">
                  <span className="flex-1 truncate">{item.name}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" disabled={loading} onClick={()=>removeColor(item.id)}><Trash2 className="h-3 w-3"/></Button>
                </li>
              ))}
              {colorCoded.length===0 && <li className="text-xs text-muted-foreground">None yet.</li>}
            </ul>
            <div className="flex items-center gap-1 min-w-0">
              <div className="flex-1 min-w-0">
                <select
                  className="w-full min-w-0 h-7 border rounded px-1 text-xs bg-background truncate"
                  value={addingColorId}
                  onChange={e=>setAddingColorId(e.target.value?Number(e.target.value):'')}
                  disabled={loading}
                  title={addingColorId!=='' ? (remainingOptions(usedColorNames).find(o=>o.id===addingColorId)?.name || '') : 'Add color-coded characteristic'}
                >
                  <option value="">Add...</option>
                  {remainingOptions(usedColorNames).map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                </select>
              </div>
              <Button size="sm" className="h-7 px-2 flex-shrink-0" disabled={loading||addingColorId===''} onClick={addColor}><Plus className="h-3 w-3"/></Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CharacteristicMetaManager;
