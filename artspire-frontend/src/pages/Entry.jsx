// artspire-frontend/src/pages/Entry.jsx
import { useState } from "react";
import { getToken } from "../utils/auth";
import Gate from "./Gate";
import Home from "./Home";
import OnboardingGuide from "../components/OnboardingGuide";

const GUEST_FLAG = "artspire_guest_entered";

export default function Entry() {
  const [entered, setEntered] = useState(
    () => Boolean(getToken()) || sessionStorage.getItem(GUEST_FLAG) === "true"
  );

  if (!entered) {
    return (
      <Gate
        onGuestEnter={() => {
          sessionStorage.setItem(GUEST_FLAG, "true");
          setEntered(true);
        }}
      />
    );
  }

  return (
    <>
      <Home />
      <OnboardingGuide
        targets={{
          1: '[data-tour="chips"]',
          2: '[data-tour="feed"]',
          3: '[data-tour="like"]',
          4: '[data-tour="create"]',
          5: '[data-tour="explore"]',
          6: '[data-tour="profile"]',
        }}
      />
    </>
  );
}