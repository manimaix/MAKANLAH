import { useEffect, useId, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LoaderCircle, Search, X } from "lucide-react";
import { initials } from "../api";
export function Avatar({
  name = "Makanlah",
  large = false,
}: {
  name?: string;
  large?: boolean;
}) {
  return (
    <span className={`avatar ${large ? "large" : ""}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" />
      <span>Loading…</span>
    </div>
  );
}
export function Empty({
  title,
  children,
  action,
  to,
}: {
  title: string;
  children?: ReactNode;
  action?: string;
  to?: string;
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action && to && (
        <Link className="btn" to={to}>
          {action}
          <ArrowRight size={17} />
        </Link>
      )}
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <p>{message}</p>
      {retry && (
        <button className="btn secondary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Search dishes, places, cravings…",
}: {
  value: string;
  onChange: (s: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
}) {
  return (
    <form
      className="search-bar"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <Search size={22} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button aria-label="Search food" type="submit" className="round gold">
        <ArrowRight size={21} />
      </button>
    </form>
  );
}
export function SectionHead({
  title,
  copy,
  action,
  to,
}: {
  title: string;
  copy?: string;
  action?: string;
  to?: string;
}) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {copy && <p>{copy}</p>}
      </div>
      {action && to && (
        <Link className="text-link" to={to}>
          {action}
          <ArrowRight size={18} />
        </Link>
      )}
    </div>
  );
}
export function Drawer({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    ref.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, []);
  return (
    <dialog
      className="drawer"
      aria-labelledby={titleId}
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="drawer-inner">
        <header>
          <h2 id={titleId}>{title}</h2>
          <button className="round" aria-label="Close panel" onClick={onClose}>
            <X />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
export function SampleNote({ compact = false }: { compact?: boolean }) {
  return (
    <p className={`sample-note ${compact ? "compact" : ""}`}>
      {compact
        ? "Sample listing"
        : "Exploring the local preview? Listings, prices, reviews and map points marked “Sample” are design examples."}
    </p>
  );
}
