import clsx from "clsx";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, ...props }, ref) {
    return <button ref={ref} {...props} className={clsx(className)} />;
  },
);
