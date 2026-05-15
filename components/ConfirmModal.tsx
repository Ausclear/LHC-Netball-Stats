"use client";

export function ConfirmModal({
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onCancel}>
      <div className="bg-navy border-2 border-gold/40 rounded-2xl p-5 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}>
        <div className="font-display text-2xl text-gold tracking-widest mb-2 text-center">{title}</div>
        <div className="text-sm text-cream/80 leading-relaxed text-center mb-5">{body}</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onCancel}
            className="py-3 rounded-lg border border-white/15 text-cream/70 font-bold uppercase tracking-widest text-xs">
            {cancelLabel}
          </button>
          <button onClick={onConfirm}
            className={`py-3 rounded-lg font-bold uppercase tracking-widest text-xs ${
              destructive ? "bg-red-500 text-white" : "bg-gold text-navy-dark"
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
