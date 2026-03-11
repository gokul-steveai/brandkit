import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/useToast";

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: () => Promise<void>;
  onAfterSave?: () => void;
  debounceMs?: number;
  enabled?: boolean;
}

export function useAutoSave<T>({ data, onSave, onAfterSave, debounceMs = 2000, enabled = true }: UseAutoSaveOptions<T>) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPreference, setIsLoadingPreference] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  const initialDataRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string | null>(null);
  const wasEnabledRef = useRef(false);

  // Load user's auto-save preference
  useEffect(() => {
    const loadPreference = async () => {
      if (!user) return;

      const { data: profile } = await supabase.from("profiles").select("auto_save").eq("id", user.id).maybeSingle();

      if (profile !== null) {
        setAutoSaveEnabled(profile.auto_save ?? true);
      }
      setIsLoadingPreference(false);
    };

    loadPreference();
  }, [user]);

  // Reset refs when enabled becomes true (initial data loaded)
  useEffect(() => {
    if (enabled && !wasEnabledRef.current) {
      wasEnabledRef.current = true;
      initialDataRef.current = JSON.stringify(data);
      lastSavedDataRef.current = JSON.stringify(data);
      setHasUnsavedChanges(false);
    }
  }, [enabled, data]);

  // Detect changes only when enabled
  useEffect(() => {
    if (!enabled) return;

    const currentData = JSON.stringify(data);
    const hasChanges = currentData !== lastSavedDataRef.current;
    setHasUnsavedChanges(hasChanges);
  }, [data, enabled]);

  // Store callbacks in refs to avoid stale closures
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const onAfterSaveRef = useRef(onAfterSave);
  onAfterSaveRef.current = onAfterSave;

  // Store current data in a ref for the save function
  const dataRef = useRef(data);
  dataRef.current = data;

  const triggerSave = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      await onSaveRef.current();
      // Use the current data ref value, not the stale closure
      lastSavedDataRef.current = JSON.stringify(dataRef.current);
      setHasUnsavedChanges(false);
      setLastError(null);
      onAfterSaveRef.current?.();

      if (autoSaveEnabled) {
        toast({
          title: "Changes saved",
          variant: "success",
          duration: 2000,
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || "An unexpected error occurred";
      setLastError(errorMessage);
      toast({
        title: "Failed to save",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [autoSaveEnabled, toast, isSaving]);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  // Auto-save with debounce
  useEffect(() => {
    if (!enabled || !autoSaveEnabled || !hasUnsavedChanges || isLoadingPreference) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      await triggerSave();
    }, debounceMs);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, autoSaveEnabled, hasUnsavedChanges, isLoadingPreference, enabled, triggerSave, debounceMs]);

  const manualSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await triggerSave();
  }, [triggerSave]);

  return {
    autoSaveEnabled,
    hasUnsavedChanges,
    isSaving,
    isLoadingPreference,
    lastError,
    clearError,
    manualSave,
  };
}
