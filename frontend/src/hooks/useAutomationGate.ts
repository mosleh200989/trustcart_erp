import { useEffect, useState } from 'react';

/** Fired by the API client (and the settings reset) when the panel re-locks. */
export const AUTOMATION_LOCKED_EVENT = 'automation:locked';
/** Fired by AutomationLayout once a password unlock succeeds. */
export const AUTOMATION_UNLOCKED_EVENT = 'automation:unlocked';
/** Internal: fired whenever the layout's gate state changes at all. */
const AUTOMATION_GATE_CHANGED_EVENT = 'automation:gate-changed';

/**
 * Whether the Automation panel is open for business.
 *
 * AutomationLayout owns this. Panel pages render the layout themselves, so the
 * layout is their *child* and cannot hand them state through React context —
 * this module is the shared channel instead.
 *
 * It deliberately does NOT infer the answer from a token in sessionStorage. The
 * panel password is optional, and when it is switched off no token is ever
 * issued, so a token check reports "locked" forever: every page's loader
 * early-returns before clearing its loading flag and the whole panel sits on
 * "Loading…". The layout knows the real answer; it just has to say so.
 */
let unlockedState = false;

/** Called only by AutomationLayout, whenever its gate state changes. */
export function setAutomationUnlocked(next: boolean): void {
  if (unlockedState === next) return;
  unlockedState = next;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTOMATION_GATE_CHANGED_EVENT));
  }
}

export function isAutomationUnlocked(): boolean {
  return unlockedState;
}

/**
 * Pages gate every fetch on this. Without it a page mounted behind the password
 * screen still runs its effects, fires a request, gets 403, and toasts an error
 * the user cannot see behind the gate.
 */
export function useAutomationUnlocked(): boolean {
  // The layout is a child, so its effect runs before this one — by the time we
  // subscribe, unlockedState may already be true. Read it, don't just wait.
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const sync = () => setUnlocked(isAutomationUnlocked());

    sync();
    window.addEventListener(AUTOMATION_GATE_CHANGED_EVENT, sync);
    window.addEventListener(AUTOMATION_LOCKED_EVENT, sync);
    window.addEventListener(AUTOMATION_UNLOCKED_EVENT, sync);
    return () => {
      window.removeEventListener(AUTOMATION_GATE_CHANGED_EVENT, sync);
      window.removeEventListener(AUTOMATION_LOCKED_EVENT, sync);
      window.removeEventListener(AUTOMATION_UNLOCKED_EVENT, sync);
    };
  }, []);

  return unlocked;
}
