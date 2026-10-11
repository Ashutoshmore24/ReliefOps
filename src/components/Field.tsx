import type { InputHTMLAttributes } from 'react';
interface Props extends InputHTMLAttributes<HTMLInputElement> { label: string; error?: string }
export function Field({ label, error, id, ...props }: Props) {
  return <label className="field" htmlFor={id}><span>{label}</span><input {...props} id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}/>{error && <small className="field-error" id={`${id}-error`}>{error}</small>}</label>;
}
