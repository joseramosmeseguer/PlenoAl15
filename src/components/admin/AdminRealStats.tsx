import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useRealStats, type RealStatEntry } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { REAL_STAT_DEFS, REAL_STAT_CATEGORIES, type RealStatCategory } from "@/lib/realStats";

export function AdminRealStats() {
  const qc = useQueryClient();
  const { data: stats } = useRealStats();
  const [cat, setCat] = useState<RealStatCategory>(REAL_STAT_CATEGORIES[0]);

  const byKey = useMemo(() => {
    const map: Record<string, RealStatEntry[]> = {};
    (stats ?? []).forEach((s) => (map[s.stat_key] ||= []).push(s));
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.rank - b.rank));
    return map;
  }, [stats]);

  const onChange = () => qc.invalidateQueries({ queryKey: ["real_stats"] });

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Estos datos no se calculan solos — los introducís a mano porque la web no está conectada a ninguna API deportiva.
      </p>
      <div className="flex gap-2 flex-wrap">
        {REAL_STAT_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              cat === c ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {REAL_STAT_DEFS.filter((d) => d.category === cat).map((def) => (
          <AdminStatEditor key={def.key} statKey={def.key} label={def.label} unit={def.unit} rows={byKey[def.key] ?? []} onChange={onChange} />
        ))}
      </div>
    </div>
  );
}

function AdminStatEditor({
  statKey,
  label,
  unit,
  rows,
  onChange,
}: {
  statKey: string;
  label: string;
  unit: string;
  rows: RealStatEntry[];
  onChange: () => void;
}) {
  const [entries, setEntries] = useState<{ name: string; value: string }[]>(
    rows.length ? rows.map((r) => ({ name: r.name, value: String(r.value) })) : [{ name: "", value: "" }]
  );
  const [saving, setSaving] = useState(false);

  function update(i: number, field: "name" | "value", val: string) {
    const next = [...entries];
    next[i] = { ...next[i], [field]: val };
    setEntries(next);
  }
  function addRow() {
    setEntries([...entries, { name: "", value: "" }]);
  }
  function removeRow(i: number) {
    setEntries(entries.filter((_, idx) => idx !== i));
  }

  async function save() {
    setSaving(true);
    const valid = entries.filter((e) => e.name.trim());
    const { error: delError } = await (supabase as any).from("real_stat_entries").delete().eq("stat_key", statKey);
    if (delError) { toast.error(delError.message); setSaving(false); return; }
    if (valid.length) {
      const { error } = await (supabase as any).from("real_stat_entries").insert(
        valid.map((e, i) => ({ stat_key: statKey, rank: i + 1, name: e.name.trim(), value: Number(e.value) || 0 }))
      );
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    setSaving(false);
    toast.success("Guardado");
    onChange();
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <h3 className="font-bold text-sm">{label} <span className="text-xs text-muted-foreground font-normal">({unit})</span></h3>
      <div className="space-y-1.5">
        {entries.map((e, i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <span className="w-4 text-[10px] text-muted-foreground text-center shrink-0">{i + 1}</span>
            <Input value={e.name} onChange={(ev) => update(i, "name", ev.target.value)} placeholder="Nombre" className="h-8 text-sm flex-1" />
            <Input value={e.value} onChange={(ev) => update(i, "value", ev.target.value)} placeholder="0" type="number" className="h-8 text-sm w-16" />
            <button type="button" onClick={() => removeRow(i)} className="p-1 text-destructive hover:bg-destructive/10 rounded shrink-0">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={addRow}><Plus className="h-3.5 w-3.5 mr-1" /> Fila</Button>
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
      </div>
    </div>
  );
}
