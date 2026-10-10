'use client';

/**
 * Shared form primitives — h-11 inputs, text-base, label above input.
 * Optimized for mobile-first 30+ users per WCAG 2.2 + Material 3 guidance.
 */

import { type ReactNode } from 'react';

export function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800 mb-1">
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1" role="alert">{error}</p>}
    </div>
  );
}

const baseInputClass =
  'w-full h-11 px-3 rounded-lg border border-slate-300 bg-white text-base text-slate-900 ' +
  'focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none ' +
  'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed';

export function TextInput({
  id,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
  autoComplete,
  disabled,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      placeholder={placeholder}
      autoComplete={autoComplete}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      className={baseInputClass + (invalid ? ' border-red-400' : '')}
    />
  );
}

export function NumberInput({
  id,
  value,
  onChange,
  min,
  max,
  step = 1,
  required,
  disabled,
  invalid,
}: {
  id: string;
  value: number | '';
  onChange: (v: number | '') => void;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <input
      id={id}
      type="number"
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === '' ? '' : Number(v));
      }}
      min={min}
      max={max}
      step={step}
      required={required}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      inputMode="numeric"
      className={baseInputClass + (invalid ? ' border-red-400' : '')}
    />
  );
}

export function Select({
  id,
  value,
  onChange,
  required,
  disabled,
  children,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  children: ReactNode;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      className={baseInputClass + ' pr-9 appearance-none bg-no-repeat bg-[right_0.75rem_center] ' +
        '[background-image:url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'><path fill=\'%2364748b\' d=\'M6 8L0 0h12z\'/></svg>")]' +
        (invalid ? ' border-red-400' : '')}
    >
      {children}
    </select>
  );
}

export function Textarea({
  id,
  value,
  onChange,
  rows = 3,
  placeholder,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      disabled={disabled}
      className={
        'w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-base text-slate-900 ' +
        'focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none resize-y ' +
        'disabled:bg-slate-50 disabled:text-slate-500'
      }
    />
  );
}

export function Button({
  type = 'button',
  variant = 'primary',
  disabled,
  onClick,
  children,
  className = '',
}: {
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const variants = {
    primary:   'bg-primary-700 hover:bg-primary-800 text-white',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300',
    danger:    'bg-red-600 hover:bg-red-700 text-white',
    ghost:     'bg-transparent hover:bg-slate-100 text-slate-700',
  } as const;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={
        'inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg font-medium text-base ' +
        'disabled:opacity-60 disabled:cursor-not-allowed transition ' +
        variants[variant] + ' ' + className
      }
    >
      {children}
    </button>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    aktif:        { label: 'Aktif',         cls: 'bg-green-100 text-green-800' },
    tidak_cukup:  { label: 'Tidak Cukup',   cls: 'bg-amber-100 text-amber-800' },
    rosak:        { label: 'Rosak',         cls: 'bg-red-100 text-red-800' },
    dalam_servis: { label: 'Dalam Servis',  cls: 'bg-blue-100 text-blue-800' },
    dilupuskan:   { label: 'Dilupuskan',    cls: 'bg-slate-200 text-slate-700' },
    dipinjam:     { label: 'Dipinjam',      cls: 'bg-violet-100 text-violet-800' },
    hilang:       { label: 'Hilang',        cls: 'bg-rose-100 text-rose-800' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-700' };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
