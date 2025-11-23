import React from "react";

interface BackButtonProps {
  className?: string;
}
export const BackButton = ({ className }: BackButtonProps) => {
  return (
    <svg
    viewBox="0 0 32 32"
    fill="none"
    className={`group ${className}`}
    >
      <circle cx="16" cy="16" r="15.75" stroke="black" strokeWidth="0.5" />
      <path d="M20.5 7L8 16L20.5 24.5" stroke="black" strokeWidth="0.5" className="transition-transform group-hover:-translate-x-0.5 group-hover:scale-x-[0.85]" />
    </svg>
  );
};
