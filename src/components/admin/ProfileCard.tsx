import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signAvatars } from "@/lib/activity";
import { roleLabel } from "@/lib/roles";
import { AdminAvatar } from "./AdminAvatar";
import { IMAGE_ACCEPT } from "@/lib/file-accept";

const inputCls =
  "w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40 focus:bg-secondary/60";
const labelCls = "mb-1.5 block text-[0.6rem] tracking-[0.22em] text-muted-foreground";
const btnCls =
  "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[0.65rem] font-semibold tracking-[0.18em] text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50";
const ghostCls =
  "inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-[0.6rem] tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-40";

type Me = { user_id: string; email: string; name: string; avatar_url: string; role: string };

export function ProfileCard({ onSaved }: { onSaved?: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [avatarPath, setAvatarPath] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const me = useQuery({
    queryKey: ["admin", "me-profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Нет сессии");
      const { data, error } = await (supabase as any)
        .from("admin_users")
        .select("user_id, email, name, avatar_url, role")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as Me | null;
    },
  });

  useEffect(() => {
    if (!me.data) return;
    setName(me.data.name ?? "");
    setAvatarPath(me.data.avatar_url ?? "");
    if (me.data.avatar_url) {
      signAvatars([me.data.avatar_url]).then((m) => setPreview(m[me.data!.avatar_url] ?? null));
    } else {
      setPreview(null);
    }
  }, [me.data]);

  async function persist(nextName: string, nextPath: string) {
    const { error } = await (supabase as any).rpc("admin_update_profile", {
      p_name: nextName,
      p_avatar_url: nextPath,
    });
    if (error) throw new Error(error.message);
    onSaved?.();
    me.refetch();
  }

  async function onUpload(file: File) {
    if (!me.data) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Нужен файл изображения");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${me.data.user_id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw new Error(error.message);
      if (avatarPath) await supabase.storage.from("avatars").remove([avatarPath]);
      await persist(name, path);
      setAvatarPath(path);
      const signed = await signAvatars([path]);
      setPreview(signed[path] ?? null);
      toast.success("Аватар обновлён");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось загрузить фото");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onRemove() {
    if (!avatarPath) return;
    setBusy(true);
    try {
      await supabase.storage.from("avatars").remove([avatarPath]);
      await persist(name, "");
      setAvatarPath("");
      setPreview(null);
      toast.success("Аватар удалён");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось удалить фото");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveName(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await persist(name.trim(), avatarPath);
      toast.success("Профиль сохранён");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  if (!me.data) return null;

  return (
    <form onSubmit={onSaveName} className="glass space-y-5 rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-4">
        <AdminAvatar name={name} email={me.data.email} url={preview} size={64} />
        <div className="min-w-0">
          <p className="truncate text-sm text-foreground">{name || me.data.email}</p>
          <p className="mt-1 text-[0.6rem] tracking-[0.22em] text-muted-foreground">
            {roleLabel(me.data.role).toUpperCase()} · {me.data.email}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className={ghostCls}
          >
            <ImagePlus size={13} /> {avatarPath ? "ЗАМЕНИТЬ ФОТО" : "ЗАГРУЗИТЬ ФОТО"}
          </button>
          {avatarPath && (
            <button type="button" disabled={busy} onClick={onRemove} className={ghostCls}>
              <Trash2 size={13} /> УДАЛИТЬ ФОТО
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_ACCEPT}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
          }}
        />
      </div>

      <div>
        <label className={labelCls}>ИМЯ</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Как вас показывать в журнале"
          className={inputCls}
        />
      </div>

      <button type="submit" disabled={busy} className={btnCls}>
        {busy ? "СОХРАНЕНИЕ…" : "СОХРАНИТЬ ПРОФИЛЬ"}
      </button>
    </form>
  );
}
