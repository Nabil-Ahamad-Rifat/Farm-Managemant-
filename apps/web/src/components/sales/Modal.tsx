"use client";

import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Phones: a sheet from the bottom; larger screens: a centred card. */}
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-slate-100 bg-white px-5 pb-5 shadow-xl sm:pb-6 sm:rounded-2xl sm:px-6">
        <div className="sticky top-0 z-10 -mx-5 flex items-start justify-between border-b border-slate-100 bg-white px-5 pb-4 pt-5 sm:-mx-6 sm:px-6 sm:pt-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-700">
      {message}
    </div>
  );
}

export function FormFooter({ onCancel, loading, label }: { onCancel: () => void; loading: boolean; label: string }) {
  return (
    // Stays in view at the bottom of long forms.
    <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:-mx-6 sm:-mb-6 sm:px-6">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 sm:flex-none sm:py-2.5"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading}
        className="flex-[2] rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 sm:flex-none sm:py-2.5"
      >
        {loading ? 'Saving...' : label}
      </button>
    </div>
  );
}
