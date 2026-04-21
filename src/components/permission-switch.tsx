"use client";

export function PermissionSwitch({
  checked,
  onChange,
  disabled = false,
  keepCheckedColorWhenDisabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  keepCheckedColorWhenDisabled?: boolean;
}) {
  const disabledClass = keepCheckedColorWhenDisabled
    ? checked
      ? "cursor-not-allowed border-secondary bg-secondary/80"
      : "cursor-not-allowed border-slate-200 bg-slate-100"
    : "cursor-not-allowed border-slate-200 bg-slate-100";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center border transition-colors ${
        disabled
          ? disabledClass
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
