"use client";

export function PermissionSwitch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center border transition-colors ${
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-100"
          : checked
            ? "border-secondary bg-secondary"
            : "border-slate-300 bg-white"
      }`}
    >
      <span
        className={`inline-block size-5 border bg-white transition-transform ${
          checked ? "translate-x-[23px] border-secondary" : "translate-x-1 border-slate-300"
        }`}
      />
    </button>
  );
}
