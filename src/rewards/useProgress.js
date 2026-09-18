import { useEffect, useState } from 'react';
import { getProgress, onProgressChange } from '@/core/progress';

const EMPTY = { stamps: {}, reviewed: [], prefs: {} };

// getProgress() already returns a fresh copy; the defaults keep a broken save from crashing a screen.
const read = () => ({ ...EMPTY, ...(getProgress() ?? {}) });

// Reads progress through core/ and re-renders whenever it changes, so a gold
// stamp earned on the check-in screen shows up here without a reload.
export function useProgress() {
  const [progress, setProgress] = useState(read);

  useEffect(() => onProgressChange(() => setProgress(read())), []);

  return progress;
}
