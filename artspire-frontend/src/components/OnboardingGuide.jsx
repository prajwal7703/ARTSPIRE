// artspire-frontend/src/components/OnboardingGuide.jsx
//
// A doodle mascot ("Inkling") that greets first-time visitors right after
// they clear the Entry gate, and walks them through the app in a few short,
// skippable beats. Shows once ever per browser (localStorage), not once per
// session like the guest flag in Entry.jsx.
//
// Drop this file in src/components/OnboardingGuide.jsx and render it once,
// as a sibling to <Home />, from Entry.jsx (see integration note at bottom
// of this file).

import { useEffect, useState } from "react";

const SEEN_FLAG = "artspire_onboarding_seen";

// Edit this array to change the tour. Each step is one thing Inkling says,
// paired with a pose. Keep steps short — one idea per beat.
const STEPS = [
  {
    pose: "wave",
    title: "Hey, welcome to Artspire!",
    text: "I'm Inkling. Give me thirty seconds and I'll show you where everything lives.",
  },
  {
    pose: "point",
    title: "This is your feed",
    text: "Fresh work from artists you follow shows up here first. Scroll, react, get inspired.",
  },
  {
    pose: "sparkle",
    title: "Sharing your own work",
    text: "Hit the upload button any time to post a piece. Tag it well and it'll find the right audience.",
  },
  {
    pose: "heart",
    title: "Following artists",
    text: "Found someone whose work you love? Follow them and their new posts land straight in your feed.",
  },
  {
    pose: "bow",
    title: "That's the whole tour",
    text: "Poke around, everything else you'll find as you go. Have fun out there!",
  },
];

function InklingPose({ pose }) {
  // A small doodle cat, hand-drawn feel via slightly wobbly paths.
  // Pose changes ears/paw/eyes just enough to feel alive without needing
  // real animation assets.
  const common = (
    <>
      <ellipse cx="60" cy="78" rx="34" ry="26" fill="var(--ink-body, #2b2b2b)" />
      <path d="M32 58 L24 30 L46 46 Z" fill="var(--ink-body, #2b2b2b)" />
      <path d="M88 58 L96 30 L74 46 Z" fill="var(--ink-body, #2b2b2b)" />
    </>
  );

  const eyes =
    pose === "sparkle" ? (
      <>
        <path d="M46 68 L50 72 L46 76 L42 72 Z" fill="#fff" />
        <path d="M74 68 L78 72 L74 76 L70 72 Z" fill="#fff" />
      </>
    ) : (
      <>
        <circle cx="48" cy="72" r="3.2" fill="#fff" />
        <circle cx="72" cy="72" r="3.2" fill="#fff" />
      </>
    );

  const paw =
    pose === "point" ? (
      <path d="M84 92 Q104 84 112 68" stroke="var(--ink-body, #2b2b2b)" strokeWidth="7" strokeLinecap="round" fill="none" />
    ) : pose === "wave" ? (
      <path d="M84 92 Q108 96 106 74" stroke="var(--ink-body, #2b2b2b)" strokeWidth="7" strokeLinecap="round" fill="none" />
    ) : pose === "bow" ? (
      <path d="M40 96 Q60 108 80 96" stroke="var(--ink-body, #2b2b2b)" strokeWidth="7" strokeLinecap="round" fill="none" />
    ) : (
      <path d="M84 92 Q100 90 100 78" stroke="var(--ink-body, #2b2b2b)" strokeWidth="7" strokeLinecap="round" fill="none" />
    );

  return (
    <svg viewBox="0 0 130 110" width="88" height="74" aria-hidden="true">
      {common}
      {eyes}
      <path d="M60 80 Q64 84 60 87 Q56 84 60 80 Z" fill="#ff9d76" />
      {paw}
      {pose === "heart" && (
        <path
          d="M100 40 C100 34 108 34 108 40 C108 34 116 34 116 40 C116 46 108 52 108 52 C108 52 100 46 100 40 Z"
          fill="#ff6b6b"
        />
      )}
    </svg>
  );
}

export default function OnboardingGuide({ forceShow = false, onDone }) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const alreadySeen = localStorage.getItem(SEEN_FLAG) === "true";
    if (forceShow || !alreadySeen) {
      setVisible(true);
    }
  }, [forceShow]);

  function finish() {
    localStorage.setItem(SEEN_FLAG, "true");
    setVisible(false);
    onDone?.();
  }

  function next() {
    if (step === STEPS.length - 1) {
      finish();
    } else {
      setStep((s) => s + 1);
    }
  }

  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div style={styles.overlay} role="dialog" aria-label="Welcome tour">
      <div style={styles.card}>
        <button style={styles.skip} onClick={finish} aria-label="Skip tour">
          Skip
        </button>

        <div style={styles.mascotRow}>
          <div style={styles.mascotBubbleWrap}>
            <InklingPose pose={current.pose} />
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
              <span
                key={i}
                style={{
                  ...styles.dot,
                  ...(i === step ? styles.dotActive : {}),
                }}
              />
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
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(20, 18, 24, 0.55)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    padding: 24,
    zIndex: 2000,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    background: "#fffaf3",
    borderRadius: 20,
    padding: "20px 20px 16px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
    position: "relative",
    border: "2px solid #2b2b2b",
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
  mascotRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  mascotBubbleWrap: {
    flexShrink: 0,
  },
  speechBubble: {
    position: "relative",
    background: "#2b2b2b",
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
    borderRight: "8px solid #2b2b2b",
  },
  title: {
    margin: "0 0 4px",
    fontSize: 15,
    fontWeight: 700,
  },
  text: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.4,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  dots: {
    display: "flex",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#d8d0c2",
  },
  dotActive: {
    background: "#2b2b2b",
    width: 16,
    borderRadius: 4,
  },
  buttons: {
    display: "flex",
    gap: 8,
  },
  secondaryBtn: {
    padding: "8px 14px",
    borderRadius: 10,
    border: "2px solid #2b2b2b",
    background: "transparent",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  primaryBtn: {
    padding: "8px 16px",
    borderRadius: 10,
    border: "2px solid #2b2b2b",
    background: "#2b2b2b",
    color: "#fffaf3",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
};

/*
INTEGRATION — Entry.jsx

import OnboardingGuide from "../components/OnboardingGuide";

...inside the `return <Home />;` branch, change to:

  return (
    <>
      <Home />
      <OnboardingGuide />
    </>
  );

That's it — OnboardingGuide checks localStorage itself and renders nothing
after the first visit. If you only want it shown to fresh signups (not
returning logged-in users or repeat guests), pass a condition instead, e.g.
`forceShow={justSignedUp}` and clear that flag in onDone.
*/