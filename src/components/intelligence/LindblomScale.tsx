import React from 'react';

interface LindblomScaleProps {
  score: number; // 0 = rational-comprehensive, 1 = disjointed incrementalism
  isDark: boolean;
}

export default function LindblomScale({ score, isDark }: LindblomScaleProps) {
  const percent = Math.round(score * 100);

  return (
    <div className="w-full pt-2 pb-1">
      <div
        className="relative h-3 w-full rounded-full"
        style={{
          background: isDark
            ? 'linear-gradient(90deg, #6366F1 0%, #3F3F46 50%, #F59E0B 100%)'
            : 'linear-gradient(90deg, #185FA5 0%, #E4E4E7 50%, #EF9F27 100%)',
        }}
      >
        <div
          className={`absolute top-1/2 w-4 h-4 rounded-full border-2 shadow-md transition-all ${
            isDark ? 'bg-zinc-100 border-zinc-950' : 'bg-white border-zinc-900'
          }`}
          style={{ left: `${percent}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>
      <div className="flex justify-between mt-2.5 text-[10px] font-bold">
        <span className={isDark ? 'text-indigo-400' : 'text-[#185FA5]'}>Rational-Comprehensive</span>
        <span className={isDark ? 'text-amber-400' : 'text-amber-600'}>Disjointed Incrementalism</span>
      </div>
    </div>
  );
}
