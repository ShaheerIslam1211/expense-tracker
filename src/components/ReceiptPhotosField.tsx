import { useRef, useState } from "react";
import { Camera, RefreshCw, Trash2, X } from "lucide-react";
import { cn } from "../utils/cn";
import { MAX_EXPENSE_RECEIPT_PHOTOS } from "../utils/expenseReceiptStorage";

type Props = {
  photos: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  className?: string;
  density?: "compact" | "default";
};

export function ReceiptPhotosField({ photos, onChange, disabled, className, density = "default" }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceIndexRef = useRef<number | null>(null);
  const [fileInputMultiple, setFileInputMultiple] = useState(true);

  const openPicker = (replaceIndex: number | null) => {
    replaceIndexRef.current = replaceIndex;
    setFileInputMultiple(replaceIndex === null);
    queueMicrotask(() => fileInputRef.current?.click());
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (files.length === 0) return;

    const dataUrls = await Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          }),
      ),
    );

    const ri = replaceIndexRef.current;
    replaceIndexRef.current = null;

    if (ri !== null) {
      const next = [...photos];
      if (dataUrls[0]) next[ri] = dataUrls[0];
      onChange(next);
      return;
    }

    const room = MAX_EXPENSE_RECEIPT_PHOTOS - photos.length;
    const toAdd = dataUrls.slice(0, Math.max(0, room));
    onChange([...photos, ...toAdd]);
  };

  const removeAt = (i: number) => {
    onChange(photos.filter((_, idx) => idx !== i));
  };

  const thumbClass =
    density === "compact" ? "h-20 w-20 sm:h-24 sm:w-24" : "h-24 w-24 sm:h-28 sm:w-28";

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={fileInputMultiple}
        onChange={handleFiles}
        className="hidden"
      />

      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((src, i) => (
            <div
              key={`${i}-${src.slice(0, 48)}`}
              className={cn(
                "relative rounded-xl border border-border overflow-hidden shrink-0 group bg-muted/30",
                thumbClass,
              )}
            >
              <img
                src={src}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/45 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 p-1">
                <button
                  type="button"
                  title="Remove"
                  onClick={() => removeAt(i)}
                  disabled={disabled}
                  className="p-1.5 rounded-lg bg-destructive text-destructive-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Replace"
                  onClick={() => openPicker(i)}
                  disabled={disabled}
                  className="p-1.5 rounded-lg bg-primary text-primary-foreground"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || photos.length >= MAX_EXPENSE_RECEIPT_PHOTOS}
          onClick={() => openPicker(null)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background hover:bg-accent text-xs font-black uppercase tracking-widest"
        >
          <Camera className="h-4 w-4" />
          {photos.length === 0 ? "Add photos" : "Add more"}
        </button>
        {photos.length > 0 && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange([])}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-destructive/40 text-destructive hover:bg-destructive/10 text-xs font-black uppercase tracking-widest"
          >
            <Trash2 className="h-4 w-4" />
            Remove all
          </button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground font-medium">
        Up to {MAX_EXPENSE_RECEIPT_PHOTOS} photos. Remove or replace any thumbnail without closing the form.
      </p>
    </div>
  );
}
