import { create } from 'zustand';
import type { ClipboardEntry } from '@/lib/constants';

interface ClipboardState {
  currentText: string;
  log: ClipboardEntry[];
  isExpanded: boolean;
  setCurrentText: (text: string) => void;
  addLogEntry: (entry: ClipboardEntry) => void;
  clearLog: () => void;
  setLog: (log: ClipboardEntry[]) => void;
  setIsExpanded: (expanded: boolean) => void;
}

export const useClipboardStore = create<ClipboardState>((set) => ({
  currentText: '',
  log: [],
  isExpanded: false,

  setCurrentText: (text) => set({ currentText: text }),

  addLogEntry: (entry) =>
    set((state) => {
      const exists = state.log.some((e) => e.id === entry.id);
      if (exists) {
        return {
          log: state.log.map((e) => e.id === entry.id ? entry : e)
        };
      }
      return {
        log: [entry, ...state.log],
      };
    }),

  clearLog: () => set({ log: [] }),
  setLog: (log) => set({ log }),
  setIsExpanded: (isExpanded) => set({ isExpanded }),
}));
