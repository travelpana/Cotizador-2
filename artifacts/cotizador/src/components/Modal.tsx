import { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  titleRight?: React.ReactNode;
  children: React.ReactNode;
  size?: "md" | "lg" | "xl";
}

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  titleRight,
  children,
  size = "lg",
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const widthCls =
    size === "xl"
      ? "max-w-4xl"
      : size === "md"
        ? "max-w-md"
        : "max-w-2xl";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${widthCls} bg-white rounded-2xl shadow-2xl max-h-[88vh] flex flex-col overflow-hidden`}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {titleRight && <div>{titleRight}</div>}
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
