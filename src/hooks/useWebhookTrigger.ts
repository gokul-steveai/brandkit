import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Fire-and-forget webhook trigger that notifies partner integrations
 * after a brand kit save. Errors are logged but never surface to the user.
 */
export function useWebhookTrigger(brandKitId: string) {
  const { user } = useAuth();
  const lastTriggeredRef = useRef<number>(0);
  const MIN_INTERVAL_MS = 5000; // Debounce: at most once every 5s

  const trigger = useCallback(async () => {
    if (!user?.id || !brandKitId) return;

    const now = Date.now();
    if (now - lastTriggeredRef.current < MIN_INTERVAL_MS) return;
    lastTriggeredRef.current = now;

    try {
      await supabase.functions.invoke("partner-webhook/trigger", {
        body: {
          brand_kit_id: brandKitId,
          user_id: user.id,
          event_type: "brand_kit.upserted",
        },
      });
    } catch (err) {
      console.warn("[webhook-trigger] Failed to notify partners:", err);
    }
  }, [brandKitId, user?.id]);

  return trigger;
}
