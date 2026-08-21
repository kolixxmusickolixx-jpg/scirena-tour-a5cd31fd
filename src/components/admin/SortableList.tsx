import { useEffect, useId, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type ReorderTable =
  | "shows"
  | "faq_items"
  | "social_links"
  | "gallery_albums"
  | "gallery_photos"
  | "media_items"
  | "releases";

type Item = { id: string };

type Props<T extends Item> = {
  items: T[];
  table: ReorderTable;
  layout?: "list" | "grid";
  className?: string;
  onSaved?: () => void;
  renderItem: (item: T, handle: React.ReactNode, dragging: boolean) => React.ReactNode;
};

export function DragHandle({
  attributes,
  listeners,
  compact,
}: {
  attributes: Record<string, any>;
  listeners: Record<string, any> | undefined;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label="Перетащить"
      {...attributes}
      {...listeners}
      className={`touch-none cursor-grab rounded-lg border border-border bg-secondary/40 text-muted-foreground transition-colors select-none hover:text-foreground active:cursor-grabbing ${
        compact ? "p-1" : "p-2"
      }`}
    >
      <GripVertical size={compact ? 12 : 15} />
    </button>
  );
}

function SortableItem<T extends Item>({
  item,
  render,
  compact,
}: {
  item: T;
  render: Props<T>["renderItem"];
  compact: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 30 : undefined,
      }}
      className={
        isDragging
          ? "relative scale-[1.01] opacity-95 shadow-2xl shadow-black/40 ring-1 ring-foreground/20 rounded-2xl"
          : "relative"
      }
    >
      {render(
        item,
        <DragHandle attributes={attributes} listeners={listeners} compact={compact} />,
        isDragging,
      )}
    </div>
  );
}

export function SortableList<T extends Item>({
  items,
  table,
  layout = "list",
  className,
  onSaved,
  renderItem,
}: Props<T>) {
  const [order, setOrder] = useState(items);
  const savingRef = useRef(false);
  const dndId = useId();

  useEffect(() => {
    if (!savingRef.current) setOrder(items);
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = order.findIndex((i) => i.id === active.id);
    const to = order.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;

    const prev = order;
    const next = arrayMove(order, from, to);
    setOrder(next);
    savingRef.current = true;

    const { error } = await (supabase.rpc as any)("reorder_items", {
      p_table: table,
      p_ids: next.map((i) => i.id),
    });

    savingRef.current = false;
    if (error) {
      setOrder(prev);
      toast.error(error.message);
      return;
    }
    onSaved?.();
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={layout === "list" ? [restrictToVerticalAxis, restrictToParentElement] : []}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={order.map((i) => i.id)}
        strategy={layout === "list" ? verticalListSortingStrategy : rectSortingStrategy}
      >
        <div className={className ?? (layout === "list" ? "space-y-4" : "grid grid-cols-3 gap-2 sm:grid-cols-6")}>
          {order.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              render={renderItem}
              compact={layout === "grid"}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
