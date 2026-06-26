import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

export type AttentionTab = 'gear' | 'certs' | 'stats';
type AttentionState = Record<AttentionTab, boolean>;

type AttentionContextType = {
  attention: AttentionState;
  setAttention: (tab: AttentionTab, value: boolean) => void;
};

const AttentionContext = createContext<AttentionContextType>({
  attention: { gear: false, certs: false, stats: false },
  setAttention: () => {},
});

export function AttentionProvider({ children }: { children: ReactNode }) {
  const [attention, setAttentionState] = useState<AttentionState>({
    gear: false,
    certs: false,
    stats: false,
  });

  const setAttention = useCallback((tab: AttentionTab, value: boolean) => {
    setAttentionState(prev => {
      if (prev[tab] === value) return prev;
      return { ...prev, [tab]: value };
    });
  }, []);

  return (
    <AttentionContext.Provider value={{ attention, setAttention }}>
      {children}
    </AttentionContext.Provider>
  );
}

export function useAttention() {
  return useContext(AttentionContext);
}
