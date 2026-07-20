// artspire-frontend/src/components/GuideAvatar.jsx
//
// The doodle guide character — now the "Artist Boy" illustrated character.
// Real cropped illustration stills (not hand-drawn SVG) mapped per pose.
// Used by OnboardingGuide.
//
// Drop the 4 PNGs from guide-avatar-assets/ into:
//   src/assets/pose-explain.png
//   src/assets/pose-wave.png
//   src/assets/pose-point.png
//   src/assets/pose-rest.png

import poseExplain from "../assets/pose-explain.png";
import poseWave from "../assets/pose-wave.png";
import posePoint from "../assets/pose-point.png";
import poseRest from "../assets/pose-rest.png";

const POSES = {
  wave: poseWave,
  point: posePoint,
  rest: poseRest,
  explain: poseExplain,
};

export default function GuideAvatar({ pose = "explain", size = 92 }) {
  const src = POSES[pose] || POSES.explain;

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        border: "2px solid #1f1f1f",
        background: "#fdfaf3",
        display: "block",
        flexShrink: 0,
      }}
    />
  );
}