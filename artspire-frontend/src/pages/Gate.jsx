// artspire-frontend/src/pages/Gate.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Palette, Search, Compass } from "lucide-react";
import GuideAvatar from "../components/GuideAvatar";

const CAT_IMG = "/cat-guest.png";

export default function Gate({ onGuestEnter }) {
  const navigate = useNavigate();
  const [showCat, setShowCat] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#FBF3E7] px-6">
      <GateStyles />

      <svg className="pointer-events-none fixed inset-0 -z-0 h-full w-full" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <path d="M20 60 Q60 20 110 55 Q150 85 130 130" fill="none" stroke="#d8641e" strokeWidth="3" strokeLinecap="round" opacity="0.25" />
        <path d="M330 90 Q300 130 340 160 Q370 180 350 220" fill="none" stroke="#534ab7" strokeWidth="3" strokeLinecap="round" opacity="0.22" />
        <circle cx="345" cy="70" r="26" fill="#f0997b" opacity="0.18" />
        <circle cx="40" cy="640" r="34" fill="#7f77dd" opacity="0.15" />
        <circle cx="360" cy="700" r="22" fill="#1d9e75" opacity="0.18" />
        <path d="M10 400 Q40 380 30 420 Q20 450 55 445" fill="none" stroke="#1d9e75" strokeWidth="3" strokeLinecap="round" opacity="0.2" />
        <path d="M250 20 L262 44 L288 46 L268 62 L276 86 L250 72 L224 86 L232 62 L212 46 L238 44 Z" fill="#e0932f" opacity="0.15" />
      </svg>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
        <div className="mb-2 rotate-[-3deg]">
          <GuideAvatar pose="wave" size={90} />
        </div>

        <h1 className="font-serif text-4xl italic tracking-tight text-stone-900">
          Art<span className="text-violet-600">Spire</span>
        </h1>
        <p className="mt-2 text-sm text-stone-500">Who's joining us today?</p>

        <div className="mt-10 flex w-full flex-col gap-3">
          <button
            onClick={() => navigate("/artist-login")}
            className="gate-card flex items-center gap-3 rounded-2xl border-2 border-stone-900 bg-white px-5 py-4 text-left shadow-[3px_3px_0_0_#1f1f1f] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
              <Palette size={19} strokeWidth={1.8} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-stone-900">I'm an Artist</span>
              <span className="block text-xs text-stone-400">Share your work, get booked</span>
            </span>
          </button>

          <button
            onClick={() => navigate("/login")}
            className="gate-card flex items-center gap-3 rounded-2xl border-2 border-stone-900 bg-white px-5 py-4 text-left shadow-[3px_3px_0_0_#1f1f1f] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <Search size={19} strokeWidth={1.8} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-stone-900">I'm Looking for Artists</span>
              <span className="block text-xs text-stone-400">Find and book local talent</span>
            </span>
          </button>

          <button
            onClick={() => setShowCat(true)}
            className="gate-card flex items-center gap-3 rounded-2xl border-2 border-stone-900 bg-white px-5 py-4 text-left shadow-[3px_3px_0_0_#1f1f1f] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600">
              <Compass size={19} strokeWidth={1.8} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-stone-900">Just Looking Around</span>
              <span className="block text-xs text-stone-400">Browse without an account</span>
            </span>
          </button>
        </div>
      </div>

      {showCat && (
        <CatGuestModal
          onContinue={() => {
            setShowCat(false);
            onGuestEnter();
          }}
        />
      )}
    </div>
  );
}

function CatGuestModal({ onContinue }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
      <div className="cat-modal-pop relative w-full max-w-sm rounded-t-3xl border-2 border-stone-900 bg-white p-6 pb-8 text-center shadow-2xl sm:rounded-3xl">
        <img src={CAT_IMG} alt="Grumpy guest cat" className="cat-rise mx-auto h-36 w-36 rounded-2xl object-cover" />
        <div className="cat-bubble-pop relative mx-auto mt-4 max-w-[260px] rounded-2xl bg-violet-50 px-4 py-3 text-sm font-medium text-violet-700">
          Fine. Just this once I'll let you browse without logging in.
          <br />
          <span className="text-violet-500">Next time, log in — I'm watching.</span>
        </div>
        <button
          onClick={onContinue}
          className="mt-5 w-full rounded-full bg-violet-600 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
        >
          Okay, let me in
        </button>
      </div>
    </div>
  );
}

function GateStyles() {
  return (
    <style>{`
      @keyframes catRise {
        0%   { transform: translateY(40px) scale(0.85) rotate(-4deg); opacity: 0; }
        60%  { transform: translateY(-6px) scale(1.03) rotate(1deg); opacity: 1; }
        80%  { transform: translateY(2px) scaleY(0.92); }
        100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
      }
      .cat-rise { animation: catRise 0.7s cubic-bezier(.22,.61,.36,1) both; }

      @keyframes bubblePop {
        0%   { transform: scale(0.7); opacity: 0; }
        70%  { transform: scale(1.05); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      .cat-bubble-pop { animation: bubblePop 0.4s ease-out 0.55s both; }

      @keyframes modalUp {
        from { transform: translateY(24px); opacity: 0; }
        to   { transform: translateY(0); opacity: 1; }
      }
      .cat-modal-pop { animation: modalUp 0.3s ease-out both; }

      .gate-card { animation: cardIn 0.4s ease-out both; }
      .gate-card:nth-child(1) { animation-delay: 0.05s; }
      .gate-card:nth-child(2) { animation-delay: 0.15s; }
      .gate-card:nth-child(3) { animation-delay: 0.25s; }
      @keyframes cardIn {
        from { transform: translateY(12px); opacity: 0; }
        to   { transform: translateY(0); opacity: 1; }
      }
    `}</style>
  );
}