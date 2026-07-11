import React from 'react';

interface AnalyticalBriefProps {
  heading: string;
  text: string;
  isDark: boolean;
}

export default function AnalyticalBrief({ heading, text, isDark }: AnalyticalBriefProps) {
  if (!text) return null;
  return (
    <div className={`mt-5 pt-4 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}>
      <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        {heading}
      </h4>
      <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{text}</p>
    </div>
  );
}
