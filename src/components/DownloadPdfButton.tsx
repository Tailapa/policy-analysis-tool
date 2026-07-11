import React from 'react';
import { Download } from 'lucide-react';

interface DownloadPdfButtonProps {
  isDark: boolean;
  label?: string;
}

export default function DownloadPdfButton({ isDark, label = 'Download as PDF' }: DownloadPdfButtonProps) {
  return (
    <div className="no-print flex justify-center pt-1">
      <button
        onClick={() => window.print()}
        className={`px-5 py-2.5 text-xs font-bold rounded-full cursor-pointer transition-colors border shadow-md flex items-center gap-2 ${
          isDark
            ? 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
            : 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50 shadow-sm'
        }`}
      >
        <Download size={14} />
        <span>{label}</span>
      </button>
    </div>
  );
}
