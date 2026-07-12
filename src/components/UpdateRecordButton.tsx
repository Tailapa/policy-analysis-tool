import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';

interface UpdateRecordButtonProps<T> {
  isDark: boolean;
  previousGeneratedAt: string;
  label: string;
  onTrigger: () => Promise<unknown>;
  onPoll: () => Promise<{ data: T | null; generatedAt: string | null }>;
  onComplete: (data: T) => void;
}

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 45; // ~3 minutes, matching the generation-polling budget used elsewhere

export default function UpdateRecordButton<T>({
  isDark,
  previousGeneratedAt,
  label,
  onTrigger,
  onPoll,
  onComplete,
}: UpdateRecordButtonProps<T>) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const poll = async (count: number) => {
    try {
      const result = await onPoll();
      if (result.data && result.generatedAt && result.generatedAt !== previousGeneratedAt) {
        setUpdating(false);
        onComplete(result.data);
        return;
      }
    } catch {
      // keep polling — transient fetch errors shouldn't stop the loop
    }
    if (count >= MAX_POLLS) {
      setUpdating(false);
      setError('Update is taking longer than expected — it may still complete in the background. Try again in a bit.');
      return;
    }
    timerRef.current = setTimeout(() => poll(count + 1), POLL_INTERVAL_MS);
  };

  const handleClick = async () => {
    setUpdating(true);
    setError(null);
    try {
      await onTrigger();
      timerRef.current = setTimeout(() => poll(1), POLL_INTERVAL_MS);
    } catch (err: any) {
      setUpdating(false);
      setError(err.message || 'Failed to trigger update');
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleClick}
        disabled={updating}
        className={`px-4 py-2 text-xs font-bold rounded-full cursor-pointer transition-colors border shadow-md flex items-center gap-2 ${
          updating
            ? 'opacity-60 cursor-not-allowed border-indigo-600 bg-indigo-600 text-white'
            : isDark
              ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
              : 'bg-white border-zinc-250 text-zinc-700 hover:bg-zinc-50 shadow-sm'
        }`}
      >
        {updating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        <span>{updating ? 'Updating…' : label}</span>
      </button>
      {error && (
        <p className={`text-[10px] font-semibold text-center max-w-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{error}</p>
      )}
    </div>
  );
}
