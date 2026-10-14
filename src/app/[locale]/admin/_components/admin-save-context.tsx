"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

type SaveHandler = () => void | Promise<void>;

export interface AdminSaveState {
  visible: boolean;
  dirty: boolean;
  saving: boolean;
  canSave: boolean;
  label: string;
  onSave: SaveHandler | null;
}

const DEFAULT_SAVE_STATE: AdminSaveState = {
  visible: false,
  dirty: false,
  saving: false,
  canSave: false,
  label: "Salvar",
  onSave: null,
};

interface AdminSaveContextValue {
  state: AdminSaveState;
  setSaveState: (next: Partial<AdminSaveState>) => void;
  resetSaveState: () => void;
  triggerSave: () => void;
}

const AdminSaveContext = createContext<AdminSaveContextValue | null>(null);

export function AdminSaveProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<AdminSaveState>(DEFAULT_SAVE_STATE);

  const setSaveState = useCallback((next: Partial<AdminSaveState>) => {
    setState((prev) => ({ ...prev, ...next }));
  }, []);

  const resetSaveState = useCallback(() => {
    setState(DEFAULT_SAVE_STATE);
  }, []);

  useEffect(() => {
    setState(DEFAULT_SAVE_STATE);
  }, [pathname]);

  const triggerSave = useCallback(() => {
    setState((current) => {
      if (!current.onSave || !current.canSave || current.saving || !current.dirty) {
        return current;
      }
      void current.onSave();
      return current;
    });
  }, []);

  const value = useMemo(
    () => ({ state, setSaveState, resetSaveState, triggerSave }),
    [state, setSaveState, resetSaveState, triggerSave]
  );

  return <AdminSaveContext.Provider value={value}>{children}</AdminSaveContext.Provider>;
}

export function useAdminSave() {
  const ctx = useContext(AdminSaveContext);
  if (!ctx) {
    throw new Error("useAdminSave must be used inside AdminSaveProvider");
  }
  return ctx;
}

export function useAdminSaveRegistration({
  label,
  canSave,
  saving,
  dirty,
  onSave,
}: {
  label: string;
  canSave: boolean;
  saving: boolean;
  dirty: boolean;
  onSave: SaveHandler;
}) {
  const { setSaveState, resetSaveState } = useAdminSave();
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    setSaveState({
      visible: true,
      label,
      canSave,
      saving,
      onSave: () => {
        if (onSaveRef.current) {
          return onSaveRef.current();
        }
      },
      dirty,
    });
  }, [setSaveState, label, canSave, saving, dirty]);

  useEffect(() => resetSaveState, [resetSaveState]);
}

export function useDirtySnapshot<T>(value: T, ready = true) {
  const baselineRef = useRef<string | null>(null);
  const serialized = useMemo(() => JSON.stringify(value), [value]);

  useEffect(() => {
    if (ready && baselineRef.current === null) {
      baselineRef.current = serialized;
    }
  }, [ready, serialized]);

  const isDirty = ready && baselineRef.current !== null && baselineRef.current !== serialized;

  const markClean = useCallback(
    (nextValue?: T) => {
      baselineRef.current =
        nextValue === undefined ? serialized : JSON.stringify(nextValue);
    },
    [serialized]
  );

  const resetBaseline = useCallback(() => {
    baselineRef.current = null;
  }, []);

  return { isDirty, markClean, resetBaseline };
}
