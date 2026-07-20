// artspire-frontend/src/components/OnboardingGuide.jsx
//
// Doodle guide (see GuideAvatar.jsx) that walks a first-time visitor through
// the app. Shows once ever per browser (localStorage).
//
// No `targets` prop -> generic floating card.
// `targets` prop supplied -> for each step, if targets[i] selector matches a
// real element, the guide moves next to it and draws a highlight ring
// around it. Falls back to floating mode for any step whose selector
// isn't found yet.

import { useEffect, useState } from "react";
import GuideAvatar from "./GuideAvatar";

const SEEN_FLAG = "artspire_onboarding_seen";

const STEPS = [
  {
    pose: "wave",
    title: "Hey, welcome to Artspire!",
    text: "I'm Sketch. Give me thirty seconds and I'll show you where everything lives.",
  },
  {
    pose: "point",
    title: "Browse by style",
    text: "Tap a category — watercolor, portraits, landscapes — to filter your feed to just that.",
  },
  {
    pose: "explain",
    title: "This is your feed",
    text: "Fresh work from artists shows up here. Scroll down to see more.",
  },
  {
    pose: "point",
    title: "Show some love",
    text: "Tap the heart to like a piece — it helps that artist get seen by more people.",
  },
  {
    pose: "explain",
    title: "Share your own work",
    text: "This button posts something new. Tag it well and it'll find the right audience.",
  },
  {
    pose: "point",
    title: "Explore",
    text: "Find new artists and fresh styles you haven't seen yet.",
  },
  {
    pose: "point",
    title: "Your profile",
    text: "Your posts, saves, and account settings all live here.",
  },
  {
    pose: "rest",
    title: "That's the whole tour",
    text: "Poke around, everything else you'll find as you go. Have fun out there!",
  },
];

export default function OnboardingGuide({ forceShow = false, onDone, targets = {} }) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  useEffect(() => {
    const alreadySeen = localStorage.getItem(SEEN_FLAG) === "true";
    if (forceShow || !alreadySeen) setVisible(true);
  }, [forceShow]);

  useEffect(() => {
    if (!visible) return;
    const selector = targets[step];
    if (!selector) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(selector);
    if (!el) {
      setTargetRect(null);
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => {
      const r = el.getBoundingClientRect();
      setTargetRect({
        top: r.top + window.scrollY,
        left: r.left + window.scrollX,
        width: r.width,
        height: r.height,
      });
    }, 350);
    return () => clearTimeout(t);
  }, [step, visible, targets]);

  function finish() {
    localStorage.setItem(SEEN_FLAG, "true");
    setVisible(false);
    onDone?.();
  }

  function next() {
    if (step === STEPS.length - 1) finish();
    else setStep((s) => s + 1);
  }

  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const hasTarget = Boolean(targetRect);

  return (
    <>
      <div style={styles.backdrop} />

      {hasTarget && (
        <div
          style={{
            position: "absolute",
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            borderRadius: 14,
            border: "3px solid #1f1f1f",
            boxShadow: "0 0 0 4000px rgba(20,18,24,0.55)",
            zIndex: 2001,
            pointerEvents: "none",
            transition: "all 0.35s ease",
          }}
        />
      )}

      <div
        style={
          hasTarget
            ? {
                ...styles.card,
                position: "absolute",
                top: targetRect.top + targetRect.height + 16,
                left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 380)),
                maxWidth: 360,
              }
            : { ...styles.card, ...styles.cardFloating }
        }
      >
        <button style={styles.skip} onClick={finish} aria-label="Skip tour">
          Skip
        </button>

        <div style={styles.mascotRow}>
          <div style={styles.mascotWrap}>
            <GuideAvatar pose={current.pose} size={80} />
          </div>
          <div style={styles.speechBubble}>
            <div style={styles.speechTail} />
            <h3 style={styles.title}>{current.title}</h3>
            <p style={styles.text}>{current.text}</p>
          </div>
        </div>

        <div style={styles.footer}>
          <div style={styles.dots}>
            {STEPS.map((_, i) => (
              <span key={i} style={{ ...styles.dot, ...(i === step ? styles.dotActive : {}) }} />
            ))}
          </div>
          <div style={styles.buttons}>
            {step > 0 && (
              <button style={styles.secondaryBtn} onClick={back}>
                Back
              </button>
            )}
            <button style={styles.primaryBtn} onClick={next}>
              {isLast ? "Let's go" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 2000,
    background: "transparent",
  },
  card: {
    width: "100%",
    background: "#fffaf3",
    borderRadius: 20,
    padding: "20px 20px 16px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
    border: "2px solid #1f1f1f",
    zIndex: 2002,
  },
  cardFloating: {
    position: "fixed",
    left: 24,
    right: 24,
    bottom: 24,
    maxWidth: 460,
    margin: "0 auto",
  },
  skip: {
    position: "absolute",
    top: 12,
    right: 14,
    background: "none",
    border: "none",
    fontSize: 13,
    color: "#8a8378",
    cursor: "pointer",
    textDecoration: "underline",
  },
  mascotRow: { display: "flex", alignItems: "flex-end", gap: 10, marginTop: 8 },
  mascotWrap: { flexShrink: 0 },
  speechBubble: {
    position: "relative",
    background: "#1f1f1f",
    color: "#fffaf3",
    borderRadius: 14,
    padding: "12px 14px",
    flex: 1,
  },
  speechTail: {
    position: "absolute",
    left: -8,
    bottom: 14,
    width: 0,
    height: 0,
    borderTop: "8px solid transparent",
    borderBottom: "8px solid transparent",
    borderRight: "8px solid #1f1f1f",
  },
  title: { margin: "0 0 4px", fontSize: 15, fontWeight: 700 },
  text: { margin: 0, fontSize: 14, lineHeight: 1.4 },
  footer: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  dots: { display: "flex", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: "50%", background: "#d8d0c2" },
  dotActive: { background: "#1f1f1f", width: 16, borderRadius: 4 },
  buttons: { display: "flex", gap: 8 },
  secondaryBtn: {
    padding: "8px 14px",
    borderRadius: 10,
    border: "2px solid #1f1f1f",
    background: "transparent",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  primaryBtn: {
    padding: "8px 16px",
    borderRadius: 10,
    border: "2px solid #1f1f1f",
    background: "#1f1f1f",
    color: "#fffaf3",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
};