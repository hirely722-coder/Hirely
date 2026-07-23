import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      checked = false,
      disabled = false,
      onCheckedChange,
      onChange,
      id,
      ...props
    },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) onChange(e);
      if (onCheckedChange) onCheckedChange(e.target.checked);
    };

    return (
      <label
        className={cn(
          "relative inline-flex items-center justify-center shrink-0 cursor-pointer select-none align-middle",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <input
          type="checkbox"
          ref={ref}
          id={id}
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
          className="sr-only peer"
          {...props}
        />
        <div
          className={cn(
            "h-4 w-4 rounded border border-slate-300 bg-white transition-all flex items-center justify-center shadow-2xs",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-1",
            "peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-checked:text-white",
            "hover:border-slate-400"
          )}
        >
          {checked && (
            <Check className="h-3 w-3 stroke-[3] text-white animate-in zoom-in-50 duration-100" />
          )}
        </div>
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
export default Checkbox;
