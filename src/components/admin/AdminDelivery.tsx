'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatPrice } from '@/lib/images/media';

type Option = { id: string; kind: 'pickup' | 'delivery'; label: string; district: string | null; fee: number; active: boolean };

export function AdminDelivery({ options }: { options: Option[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<'pickup' | 'delivery'>('pickup');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async (payload: object) => {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/delivery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'No se pudo guardar');
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Error'); }
    finally { setBusy(false); }
  };
  return <main className="flex-1 overflow-y-auto bg-off-white p-6 md:p-10 font-inria"><h1 className="font-prata text-3xl mb-6">Entregas</h1>
    <p className="text-sm text-black/65 mb-7">Activa solo zonas y puntos reales. El checkout muestra esta tarifa antes de pagar.</p>
    <form className="border border-black/20 bg-white p-5 max-w-2xl space-y-4 mb-8" onSubmit={event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      void send({ action: 'create', kind, label: form.get('label'), district: form.get('district') ?? '', fee: Number(form.get('fee')), active: form.get('active') === 'on' });
    }}><h2 className="font-prata text-xl">Nueva opción</h2>
      <label className="block text-sm">Tipo<select value={kind} onChange={event => setKind(event.target.value as 'pickup' | 'delivery')} className="block border p-2 mt-1 w-full"><option value="pickup">Punto de encuentro</option><option value="delivery">Entrega a domicilio</option></select></label>
      <label className="block text-sm">Nombre visible<input name="label" required minLength={2} className="block border p-2 mt-1 w-full" /></label>
      {kind === 'delivery' && <label className="block text-sm">Distrito cubierto<input name="district" required className="block border p-2 mt-1 w-full" /></label>}
      <label className="block text-sm">Tarifa en soles<input name="fee" type="number" min="0" step="0.01" required defaultValue="0" className="block border p-2 mt-1 w-full" /></label>
      <label className="flex gap-2 text-sm"><input name="active" type="checkbox" /> Activar al guardar</label>
      <button disabled={busy} className="bg-black text-white px-5 py-2 disabled:opacity-50">Guardar</button>
    </form>
    {error && <p role="alert" className="text-red-700 mb-5">{error}</p>}
    <ul className="max-w-2xl space-y-3">{options.map(option => <li key={option.id} className="bg-white border border-black/15 p-4 flex justify-between gap-4">
      <div><strong>{option.label}</strong><p className="text-sm text-black/60">{option.kind === 'delivery' ? option.district : 'Punto de encuentro'} · {formatPrice(Number(option.fee))}</p></div>
      <button disabled={busy} onClick={() => void send({ action: 'set_active', id: option.id, active: !option.active })} className="underline text-sm">{option.active ? 'Desactivar' : 'Activar'}</button>
    </li>)}</ul>
  </main>;
}
