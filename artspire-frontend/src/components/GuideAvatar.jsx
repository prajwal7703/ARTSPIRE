// artspire-frontend/src/components/GuideAvatar.jsx
//
// The doodle guide character. Hand-drawn line-art style, a few poses so it
// feels alive as it walks the user through the app. Used by OnboardingGuide.

export default function GuideAvatar({ pose = "explain", size = 92 }) {
  const armWave = (
    <path
      d="M78 86 Q100 92 100 68 Q100 58 92 54"
      stroke="#1f1f1f"
      strokeWidth="4.5"
      strokeLinecap="round"
      fill="none"
    />
  );
  const armPoint = (
    <path
      d="M78 86 Q106 82 118 62"
      stroke="#1f1f1f"
      strokeWidth="4.5"
      strokeLinecap="round"
      fill="none"
    />
  );
  const armRest = (
    <path
      d="M78 86 Q92 92 90 104"
      stroke="#1f1f1f"
      strokeWidth="4.5"
      strokeLinecap="round"
      fill="none"
    />
  );
  const armExplain = (
    <path
      d="M78 84 Q98 78 96 60 Q95 54 88 50"
      stroke="#1f1f1f"
      strokeWidth="4.5"
      strokeLinecap="round"
      fill="none"
    />
  );

  const arm =
    pose === "wave" ? armWave : pose === "point" ? armPoint : pose === "rest" ? armRest : armExplain;

  return (
    <svg viewBox="0 0 130 140" width={size} height={(size * 140) / 130} aria-hidden="true">
      <path
        d="M32 138 Q30 100 40 88 Q52 80 65 80 Q78 80 90 88 Q100 100 98 138 Z"
        fill="#fdfaf3"
        stroke="#1f1f1f"
        strokeWidth="3"
      />
      <path d="M52 88 L65 100 L78 88" fill="none" stroke="#1f1f1f" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M61 92 L65 100 L69 92 L67 116 L65 122 L63 116 Z" fill="#e0932f" stroke="#1f1f1f" strokeWidth="2" />
      <path d="M61 92 L65 100 L69 92" fill="none" stroke="#1f1f1f" strokeWidth="1.5" />

      {pose !== "wave" && (
        <path d="M52 88 Q34 92 30 108" stroke="#1f1f1f" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      )}

      <rect x="58" y="70" width="14" height="14" fill="#e7b18a" stroke="#1f1f1f" strokeWidth="2" />
      <ellipse cx="65" cy="48" rx="27" ry="25" fill="#f0c39a" stroke="#1f1f1f" strokeWidth="3" />

      <path
        d="M38 40 Q34 14 50 8 Q46 22 56 12 Q58 2 70 8 Q68 18 78 10 Q92 14 90 32
           Q96 26 92 42 Q94 30 88 26 Q84 16 74 20 Q80 10 70 12 Q72 20 62 14
           Q64 24 52 16 Q50 26 42 22 Q40 30 38 40 Z"
        fill="#1c2b2b"
        stroke="#123"
        strokeWidth="1.5"
      />
      <path d="M40 30 Q42 18 52 14" stroke="#2f6b63" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M78 22 Q86 20 90 30" stroke="#2f6b63" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      <circle cx="39" cy="50" r="4.5" fill="#f0c39a" stroke="#1f1f1f" strokeWidth="2" />
      <circle cx="91" cy="50" r="4.5" fill="#f0c39a" stroke="#1f1f1f" strokeWidth="2" />

      <circle cx="52" cy="50" r="10.5" fill="none" stroke="#1f1f1f" strokeWidth="2.5" />
      <circle cx="78" cy="50" r="10.5" fill="none" stroke="#1f1f1f" strokeWidth="2.5" />
      <path d="M62.5 50 L67.5 50" stroke="#1f1f1f" strokeWidth="2.5" />
      <path d="M41.5 47 L34 44" stroke="#1f1f1f" strokeWidth="2" />
      <path d="M88.5 47 L96 44" stroke="#1f1f1f" strokeWidth="2" />

      {pose === "wave" ? (
        <>
          <path d="M47 50 Q52 46 57 50" stroke="#1f1f1f" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M73 50 Q78 46 83 50" stroke="#1f1f1f" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="52" cy="50" r="3" fill="#d8641e" />
          <circle cx="78" cy="50" r="3" fill="#d8641e" />
        </>
      )}

      <path d="M45 38 L59 40" stroke="#1f1f1f" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M71 40 L85 38" stroke="#1f1f1f" strokeWidth="2.2" strokeLinecap="round" />

      <path
        d={pose === "wave" ? "M58 62 Q65 67 72 62" : "M59 63 L71 63"}
        stroke="#1f1f1f"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />

      {arm}
    </svg>
  );
}