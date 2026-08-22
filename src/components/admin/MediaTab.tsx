import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SortableList } from "@/components/admin/SortableList";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { useEffect, useState } from "react";

const inputCls =
  "w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40 focus:bg-secondary/60";
const labelCls = "mb-1.5 block text-[0.6rem] tracking-[0.22em] text-muted-foreground";
const btnCls =
  "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[0.65rem] font-semibold tracking-[0.18em] text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50";
const ghostCls =
  "inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-[0.6rem] tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground";
const cardCls = "glass rounded-2xl p-5 sm:p-6";

type MediaRow = {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumb_url: string;
  kind: string;
  published: boolean;
  sort_order: number;
};

const KINDS = [
  { id: "video", label: "Видео" },
  { id: "clip", label: "Клип" },
  { id: "backstage", label: "Бэкстейдж" },
  { id: "other", label: "Другое" },
];

export function MediaTab() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "media"] });

  const media = useQuery({
    queryKey: ["admin", "media"],
    queryFn: async (): Promise<MediaRow[]> => {
      const { data, error } = await supabase
        .from("media_items" as any)
        .select("id, title, description, video_url, thumb_url, kind, published, sort_order")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as MediaRow[];
    },
  });

  const rows = media.data ?? [];

  async function run(p: PromiseLike<{ error: { message: string } | null }>, msg: string) {
    const { error } = await p;
    if (error) toast.error(error.message);
    else {
      toast.success(msg);
      refresh();
    }
  }

  return (
    <div className="space-y-4">
      <button
        className={btnCls}
        onClick={() =>
          run(
            supabase
              .from("media_items" as any)
              .insert({ sort_order: rows.length } as any),
            "Материал добавлен",
          )
        }
      >
        <Plus size={14} /> ДОБАВИТЬ МАТЕРИАЛ
      </button>

      <SortableList
        items={rows}
        table="media_items"
        onSaved={refresh}
        renderItem={(row, handle) => <MediaCard row={row} onRun={run} handle={handle} />}
      />

      {!media.isLoading && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center text-[0.65rem] tracking-[0.25em] text-muted-foreground">
          МАТЕРИАЛОВ ПОКА НЕТ
        </div>
      )}
    </div>
  );
}

function MediaCard({
  row,
  onRun,
  handle,
}: {
  row: MediaRow;
  onRun: (p: PromiseLike<{ error: { message: string } | null }>, msg: string) => void;
  handle?: React.ReactNode;
}) {
  return (
    <form
      className={`${cardCls} space-y-4`}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onRun(
          supabase
            .from("media_items" as any)
            .update({
              title: String(f.get("title") ?? ""),
              description: String(f.get("description") ?? ""),
              video_url: String(f.get("video_url") ?? ""),
              thumb_url: String(f.get("thumb_url") ?? ""),
              kind: String(f.get("kind") ?? "video"),
              published: f.get("published") === "on",
            } as any)
            .eq("id", row.id),
          "Сохранено",
        );
      }}
    >
      {handle && <div className="flex">{handle}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls}>НАЗВАНИЕ</label>
          <input name="title" defaultValue={row.title} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>ОПИСАНИЕ</label>
          <textarea
            name="description"
            defaultValue={row.description}
            rows={2}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>ССЫЛКА НА ВИДЕО</label>
          <input name="video_url" defaultValue={row.video_url} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>ОБЛОЖКА (URL)</label>
          <input name="thumb_url" defaultValue={row.thumb_url} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>ТИП</label>
          <select name="kind" defaultValue={row.kind} className={inputCls}>
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-[0.65rem] tracking-[0.18em] text-muted-foreground">
        <input name="published" type="checkbox" defaultChecked={row.published} /> ОПУБЛИКОВАН
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className={btnCls}>
          <Save size={14} /> СОХРАНИТЬ
        </button>
        <button
          type="button"
          className={ghostCls}
          onClick={() =>
            onRun(
              supabase.from("media_items" as any).delete().eq("id", row.id),
              "Материал удалён",
            )
          }
        >
          <Trash2 size={13} /> УДАЛИТЬ
        </button>
      </div>
    </form>
  );
}
