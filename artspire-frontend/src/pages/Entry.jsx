// artspire-frontend/src/pages/Entry.jsx
//
// Mounted at "/" instead of Home directly. Decides what a visitor sees:
//   - Logged in (real token)              -> straight to Home, no gate
//   - Already chose "Just Looking" this browser session -> straight to Home
//   - Otherwise                            -> Gate (Artist / User / Guest picker)
//
// Uses sessionStorage (not localStorage) for the guest flag on purpose:
// closing the tab/browser and coming back later counts as "next time" and
// shows the gate (and the cat's nag) again, per your request. If you'd
// rather it only ever show once per device, change sessionStorage to
// localStorage below.

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
    <OnboardingGuide />
  </>
);
}