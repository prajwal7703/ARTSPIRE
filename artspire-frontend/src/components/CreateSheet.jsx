import { PenTool, Image, Film, Calendar, Tag, PenLine, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const OPTIONS = [
  { key: "artwork", label: "Artwork", icon: PenTool, path: "/create/artwork" },
  { key: "photo", label: "Photo", icon: Image, path: "/create/photo" },
  { key: "video", label: "Video / Reel", icon: Film, path: "/create/video" },
  { key: "event", label: "Event", icon: Calendar, path: "/create/event" },
  { key: "offer", label: "Offer / Service", icon: Tag, path: "/create/offer" },
  { key: "blog", label: "Write / Blog", icon: PenLine, path: "/create/blog" },
];

export default function CreateSheet({ onClose }) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-t-[2.5rem] bg-[#FBF7F2] px-6 pb-28 pt-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-3 gap-x-4 gap-y-8">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                onClick={() => {
                  onClose();
                  navigate(opt.path);
                }}
                className="flex flex-col items-center gap-3"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-stone-700 shadow-sm shadow-stone-300/50">
                  <Icon size={24} strokeWidth={1.6} />
                </span>
                <span className="text-center text-xs font-medium text-stone-600">{opt.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute bottom-8 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-300/60"
        >
          <X size={24} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
