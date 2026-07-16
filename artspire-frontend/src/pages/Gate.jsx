// artspire-frontend/src/pages/Gate.jsx
//
// The very first thing a not-logged-in visitor sees. Three choices:
//   - "I'm an Artist"  -> /artist-login
//   - "I'm Looking for Artists" -> /login
//   - "Just Looking Around" -> shows the cat mascot modal, then drops
//     them into the feed as a guest (no account) for this browser session
//
// PUT YOUR CAT IMAGE HERE:
//   Save the cat picture as: artspire-frontend/public/cat-guest.png
//   (I already generated that exact file for you to drop in.)
//
// This component itself doesn't need a route change on your part beyond
// what's in the Entry.jsx wrapper I also gave you — Gate is rendered BY
// Entry, not routed directly.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Palette, Search, Compass } from "lucide-react";

const CAT_IMG = "/cat-guest.png"; // <-- must match the filename you saved in public/

export default function Gate({ onGuestEnter }) {
  const navigate = useNavigate();
  const [showCat, setShowCat] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#FBF3E7] px-6">
      <GateStyles />

      {/* Watercolor background wash â€” same language as the rest of the app */}
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -top-16 -right-10 h-64 w-64 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="absolute top-1/3 -left-16 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute bottom-24 -right-16 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
        <h1 className="font-serif text-4xl italic tracking-tight text-stone-900">
          Art<span className="text-violet-600">Spire</span>
        </h1>
        <p className="mt-2 text-sm text-stone-500">Who's joining us today?</p>

        <div className="mt-10 flex w-full flex-col gap-3">
          <button
            onClick={() => navigate("/artist-login")}
            className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-white px-5 py-4 text-left shadow-sm transition active:scale-[0.98]"
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
            className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-white px-5 py-4 text-left shadow-sm transition active:scale-[0.98]"
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
            className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-5 py-4 text-left shadow-sm transition active:scale-[0.98]"
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
      <div className="cat-modal-pop relative w-full max-w-sm rounded-t-3xl bg-white p-6 pb-8 text-center shadow-2xl sm:rounded-3xl">
        <img src={CAT_IMG} alt="Grumpy guest cat" className="cat-rise mx-auto h-36 w-36 rounded-2xl object-cover" />

        <div className="cat-bubble-pop relative mx-auto mt-4 max-w-[260px] rounded-2xl bg-violet-50 px-4 py-3 text-sm font-medium text-violet-700">
          Fine. Just this once I'll let you browse without logging in.
          <br />
          <span className="text-violet-500">Next time, log in â€” I'm watching.</span>
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
    `}</style>
  );
}