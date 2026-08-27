import { useEffect, useState } from 'react';
import { getAutomationToken } from '@/services/automation';

/** Fired by the API client (and the settings reset) when the panel re-locks. */
export const AUTOMATION_LOCKED_EVENT = 'automation:locked';
/** Fired by AutomationLayout once a password unlock succeeds. */
export const AUTOMATION_UNLOCKED_EVENT = 'automation:unlocked';

/**
 * Whether the Automation panel is currently unlocked.
 *
 * Panel pages render `<AutomationLayout>` themselves, so the layout is their
 * *child* — it cannot hand them the gate state through React context. The unlock
 * token in sessionStorage is the shared source of truth instead, and these two
 * window events tell a page when it changes.
 *
 * Pages must gate every fetch on this. Without it a page mounted behind the
 * password screen still runs its effects, fires a request, gets 403, and toasts
 * an error the user cannot even see behind the gate.
 *
 * Starts `false` so the first render never fires a request during SSR or before
 * hydration has read sessionStorage.
 */
export function useAutomationUnlocked(): boolean {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const sync = () => setUnlocked(Boolean(getAutomationToken()));

    sync();
    window.addEventListener(AUTOMATION_LOCKED_EVENT, sync);
    window.addEventListener(AUTOMATION_UNLOCKED_EVENT, sync);
    return () => {
      window.removeEventListener(AUTOMATION_LOCKED_EVENT, sync);
      window.removeEventListener(AUTOMATION_UNLOCKED_EVENT, sync);
    };
  }, []);

  return unlocked;
}
