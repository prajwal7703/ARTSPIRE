// artspire-frontend/src/components/MissionIntro.jsx
//
// Full-screen "why we exist" reveal, redesigned around the one thing this
// product actually does: painting. No mascot. The signature move is a
// brush-stroke that wipes across the canvas and paints the wordmark into
// existence, with a few drips falling off it before the mission line and
// CTA settle in.
//
// Runs once (localStorage), meant to play before OnboardingGuide's
// step-by-step tour.
//
// Usage:
//   <MissionIntro onContinue={() => setShowTour(true)} />
//
// Edit the copy in MISSION below — nothing else needs to change.

import { useEffect, useState } from "react";

const MISSION = {
  eyebrow: "OUR MISSION",
  title: "ARTSPIRE",
  line: "Every artist starts somewhere. We built a place where your first sketch gets the same love as your best piece — seen, supported, and pushed further by people who actually care about the work.",
  cta: "Pick up the brush",
};

const SEEN_FLAG = "artspire_mission_seen";

export default function MissionIntro({ onContinue, forceShow = false }) {
  const [visible, setVisible] = useState(false);
  const [stage, setStage] = useState(0); // 0 = stroke drawing, 1 = title+line settled, 2 = cta ready

  useEffect(() => {
    const alreadySeen = localStorage.getItem(SEEN_FLAG) === "true";
    if (forceShow || !alreadySeen) setVisible(true);
  }, [forceShow]);

  useEffect(() => {
    if (!visible) return;
    const t1 = setTimeout(() => setStage(1), 1100);
    const t2 = setTimeout(() => setStage(2), 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [visible]);

  function handleContinue() {
    localStorage.setItem(SEEN_FLAG, "true");
    setVisible(false);
    onContinue?.();
  }

  if (!visible) return null;

  return (
    <div className="mi-overlay">
      <style>{CSS}</style>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;1,9..144,600;1,9..144,900&family=Manrope:wght@500;600;700&display=swap"
      />

      <div className="mi-grain" />

      <button className={`mi-skip ${stage >= 1 ? "mi-fade-in" : ""}`} onClick={handleContinue}>
        Skip
      </button>

      <div className="mi-stage">
        <p className="mi-eyebrow">{MISSION.eyebrow}</p>

        <div className="mi-brush-wrap">
          <svg className="mi-brush-svg" viewBox="0 0 420 60" preserveAspectRatio="none" aria-hidden="true">
            <path
              className="mi-brush-path"
              d="M6 34 C 60 12, 120 50, 180 26 C 240 4, 300 46, 414 24"
              fill="none"
              stroke="url(#brushGrad)"
              strokeWidth="26"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="brushGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#d9a441" />
                <stop offset="55%" stopColor="#ef6a4c" />
                <stop offset="100%" stopColor="#d9a441" />
              </linearGradient>
            </defs>
          </svg>

          <h1 className="mi-title">{MISSION.title}</h1>

          <span className="mi-drip mi-drip-1" />
          <span className="mi-drip mi-drip-2" />
          <span className="mi-drip mi-drip-3" />
        </div>

        {stage >= 1 && <p className="mi-line mi-fade-up">{MISSION.line}</p>}

        {stage >= 2 && (
          <button className="mi-cta mi-fade-up" onClick={handleContinue}>
            {MISSION.cta}
            <span className="mi-cta-arrow">&rarr;</span>
          </button>
        )}
      </div>
    </div>
  );
}

const CSS = `
.mi-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background:
    radial-gradient(ellipse 900px 600px at 50% -10%, rgba(217,164,65,0.20), transparent 60%),
    radial-gradient(ellipse 700px 500px at 90% 100%, rgba(239,106,76,0.16), transparent 55%),
    linear-gradient(160deg, #1c1224 0%, #221527 45%, #2c1a38 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mi-grain {
  position: absolute;
  inset: 0;
  opacity: 0.05;
  pointer-events: none;
  background-image:
    repeating-linear-gradient(0deg, #fff 0px, transparent 1px, transparent 2px),
    repeating-linear-gradient(90deg, #fff 0px, transparent 1px, transparent 2px);
  mix-blend-mode: overlay;
}

.mi-skip {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(245,234,210,0.08);
  border: 1px solid rgba(245,234,210,0.25);
  color: #f5ead2;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 20px;
  cursor: pointer;
  opacity: 0;
}

.mi-stage {
  position: relative;
  width: 100%;
  max-width: 500px;
  padding: 32px 24px;
  text-align: center;
}

.mi-eyebrow {
  margin: 0 0 10px;
  font-family: 'Manrope', sans-serif;
  color: #d9a441;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 5px;
  opacity: 0;
  animation: mi-fade-in 0.5s ease forwards;
}

.mi-brush-wrap {
  position: relative;
  display: inline-block;
}

.mi-brush-svg {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 130%;
  height: 130%;
  transform: translate(-50%, -50%);
  z-index: 0;
}

.mi-brush-path {
  stroke-dasharray: 620;
  stroke-dashoffset: 620;
  animation: mi-draw 0.9s cubic-bezier(0.5, 0, 0.2, 1) 0.15s forwards;
}

@keyframes mi-draw {
  to { stroke-dashoffset: 0; }
}

.mi-title {
  position: relative;
  z-index: 1;
  margin: 0;
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-optical-sizing: auto;
  font-weight: 900;
  font-size: 64px;
  letter-spacing: 1px;
  color: #f5ead2;
  opacity: 0;
  animation: mi-title-in 0.6s ease 0.85s forwards;
}

@keyframes mi-title-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.mi-drip {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50% 50% 50% 0;
  background: #ef6a4c;
  top: 62%;
  opacity: 0;
  animation: mi-drip-fall 1.1s ease-in 1.05s forwards;
}
.mi-drip-1 { left: 22%; animation-delay: 1.05s; }
.mi-drip-2 { left: 54%; width: 6px; height: 6px; background: #d9a441; animation-delay: 1.2s; }
.mi-drip-3 { left: 76%; animation-delay: 1.35s; }

@keyframes mi-drip-fall {
  0% { opacity: 0.9; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(26px) scale(0.6); }
}

.mi-line {
  margin: 22px auto 0;
  max-width: 380px;
  font-family: 'Manrope', sans-serif;
  color: #cbb8d6;
  font-size: 15px;
  line-height: 1.6;
}

.mi-fade-up {
  opacity: 0;
  transform: translateY(14px);
  animation: mi-fade-up 0.6s ease forwards;
}
@keyframes mi-fade-up {
  to { opacity: 1; transform: translateY(0); }
}
.mi-fade-in { animation: mi-fade-in 0.4s ease forwards; }
@keyframes mi-fade-in { to { opacity: 1; } }

.mi-cta {
  margin-top: 26px;
  font-family: 'Manrope', sans-serif;
  background: linear-gradient(135deg, #d9a441, #ef6a4c);
  color: #221527;
  border: none;
  font-weight: 700;
  font-size: 14px;
  padding: 14px 30px;
  border-radius: 60% 40% 55% 45% / 55% 45% 60% 40%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 0 0 0 rgba(217,164,65,0.5);
  animation: mi-fade-up 0.6s ease forwards, mi-morph 4s ease-in-out infinite, mi-pulse 2s ease-in-out 0.7s infinite;
}

@keyframes mi-morph {
  0%, 100% { border-radius: 60% 40% 55% 45% / 55% 45% 60% 40%; }
  50% { border-radius: 45% 55% 40% 60% / 40% 60% 45% 55%; }
}

.mi-cta-arrow { transition: transform 0.2s ease; }
.mi-cta:hover .mi-cta-arrow { transform: translateX(4px); }

@keyframes mi-pulse {
  0% { box-shadow: 0 0 0 0 rgba(217,164,65,0.5); }
  70% { box-shadow: 0 0 0 16px rgba(217,164,65,0); }
  100% { box-shadow: 0 0 0 0 rgba(217,164,65,0); }
}

@media (max-width: 480px) {
  .mi-title { font-size: 46px; }
}

@media (prefers-reduced-motion: reduce) {
  .mi-brush-path, .mi-title, .mi-drip, .mi-fade-up, .mi-fade-in, .mi-cta {
    animation: none !important;
    opacity: 1 !important;
    stroke-dashoffset: 0 !important;
    transform: none !important;
  }
}
`;