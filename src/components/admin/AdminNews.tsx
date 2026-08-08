import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Eye, EyeOff, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNews } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ANNOUNCEMENT_IMAGES,
  BADGE_COLORS,
  isAnnouncementLive,
} from "@/lib/announcements";
import { AnnouncementCard } from "@/components/AnnouncementCard";

function toLocalDT(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const EMPTY = {
  badge_text: "",
  badge_color: "blue",
  title: "",
  message: "",
  image_ref: "anuncio1",
  visibility: "all" as "all" | "admins",
  starts_at: "",
  ends_at: "",
};

// Estructura gemela a AdminAnnouncements: por ahora es solo el panel de
// autoría. Dónde y cómo se muestran las noticias a los usuarios se
// diseñará más adelante (Inicio ya tiene un hueco "Noticias" reservado).
export function AdminNews() {
  const qc = useQueryClient();
  const { data: news } = useNews();
  const [creating, setCreating] = useState(false);

  const onChange = () => qc.invalidateQueries({ queryKey: ["news"] });

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Noticias del panel de admin — de momento solo se crean y editan aquí; cómo se muestran a los
        participantes se define más adelante.
      </p>

      {!creating && (
        <Button variant="outline" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nueva noticia
        </Button>
      )}
      {creating && (
        <NewsForm
          initial={EMPTY}
          onDone={() => { setCreating(false); onChange(); }}
          onCancel={() => setCreating(false)}
        />
      )}

      <div className="space-y-3">
        {(news ?? []).length === 0 && !creating && (
          <p className="text-sm text-muted-foreground">Aún no hay noticias.</p>
        )}
        {(news ?? []).map((n: any) => (
          <NewsRow key={n.id} item={n} onChange={onChange} />
        ))}
      </div>
    </div>
  );
}

function NewsRow({ item, onChange }: { item: any; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const live = isAnnouncementLive(item);

  async function remove() {
    if (!confirm(`¿Eliminar la noticia "${item.title}"?`)) return;
    const { error } = await (supabase as any).from("news").delete().eq("id", item.id);
    if (error) toast.error(error.message);
    else { toast.success("Eliminada"); onChange(); }
  }

  if (editing) {
    return (
      <NewsForm
        initial={{
          badge_text: item.badge_text ?? "",
          badge_color: item.badge_color ?? "blue",
          title: item.title ?? "",
          message: item.message ?? "",
          image_ref: item.image_ref ?? "anuncio1",
          visibility: item.visibility ?? "all",
          starts_at: toLocalDT(item.starts_at),
          ends_at: toLocalDT(item.ends_at),
        }}
        id={item.id}
        onDone={() => { setEditing(false); onChange(); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <AnnouncementCard announcement={item} />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          {item.visibility === "admins" ? (
            <span className="flex items-center gap-1 text-flame"><EyeOff className="h-3 w-3" /> Solo admins</span>
          ) : (
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Todos</span>
          )}
          <span>·</span>
          <span className={live ? "text-emerald-600 font-semibold" : ""}>{live ? "Activa ahora" : "No visible ahora"}</span>
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Editar</Button>
          <Button size="sm" variant="destructive" onClick={remove}><Trash2 className="h-3 w-3" /></Button>
        </div>
      </div>
    </div>
  );
}

function NewsForm({
  initial,
  id,
  onDone,
  onCancel,
}: {
  initial: typeof EMPTY;
  id?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [badgeText, setBadgeText] = useState(initial.badge_text);
  const [badgeColor, setBadgeColor] = useState(initial.badge_color);
  const [title, setTitle] = useState(initial.title);
  const [message, setMessage] = useState(initial.message);
  const [imageRef, setImageRef] = useState(initial.image_ref);
  const [visibility, setVisibility] = useState<"all" | "admins">(initial.visibility);
  const [startsAt, setStartsAt] = useState(initial.starts_at);
  const [endsAt, setEndsAt] = useState(initial.ends_at);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isUploaded = imageRef.startsWith("http") || imageRef.startsWith("data:");

  async function handleUpload(file: File) {
    setUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("news").upload(path, file, { upsert: false });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("news").getPublicUrl(path);
    setImageRef(data.publicUrl);
    setUploading(false);
    toast.success("Imagen subida");
  }

  async function save() {
    if (!title.trim()) { toast.error("Pon un título"); return; }
    setSaving(true);
    const payload: any = {
      badge_text: badgeText.trim() || null,
      badge_color: badgeColor,
      title: title.trim(),
      message: message.trim() || null,
      image_ref: imageRef || null,
      visibility,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const { error } = id
      ? await (supabase as any).from("news").update(payload).eq("id", id)
      : await (supabase as any).from("news").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success(id ? "Noticia actualizada" : "Noticia creada"); onDone(); }
  }

  const preview = {
    badge_text: badgeText || null,
    badge_color: badgeColor,
    title: title || "Título de la noticia",
    message: message || null,
    image_ref: imageRef,
    visibility,
    starts_at: null,
    ends_at: null,
  };

  return (
    <div className="rounded-xl border border-primary/40 bg-card p-4 space-y-4">
      <div>
        <p className="text-xs text-muted-foreground mb-1">Vista previa</p>
        <AnnouncementCard announcement={preview as any} />
      </div>

      <div className="grid gap-3">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Título</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Nuevo fichaje del Betis" />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Mensaje</span>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Texto de la noticia…" className="text-sm" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Texto de la badge (arriba dcha.)</span>
            <Input value={badgeText} onChange={(e) => setBadgeText(e.target.value)} placeholder="Ej: Última hora" />
          </label>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Color de la badge</span>
            <div className="flex gap-1.5 flex-wrap">
              {BADGE_COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  title={c.label}
                  onClick={() => setBadgeColor(c.key)}
                  className={`h-7 w-7 rounded-full border-2 ${c.bg} ${badgeColor === c.key ? "border-foreground" : "border-transparent"}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Imagen de fondo</span>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {ANNOUNCEMENT_IMAGES.map((img) => (
              <button
                key={img.key}
                type="button"
                onClick={() => setImageRef(img.key)}
                className={`relative h-12 rounded-lg overflow-hidden border-2 ${imageRef === img.key ? "border-primary" : "border-transparent"}`}
              >
                <img src={img.src} alt={img.label} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer rounded-lg border border-border px-3 py-1.5 hover:bg-muted">
              <Upload className="h-3.5 w-3.5" /> {uploading ? "Subiendo…" : "Subir foto"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
              />
            </label>
            {isUploaded && <span className="text-[11px] text-emerald-600">✓ foto subida seleccionada</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Inicio (opcional)</span>
            <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="h-9" />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Fin (opcional)</span>
            <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="h-9" />
          </label>
        </div>

        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">¿Quién la ve?</span>
          <div className="flex gap-2">
            {([["all", "Todos"], ["admins", "Solo admins"]] as const).map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisibility(v)}
                className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                  visibility === v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : id ? "Guardar cambios" : "Publicar noticia"}</Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}
