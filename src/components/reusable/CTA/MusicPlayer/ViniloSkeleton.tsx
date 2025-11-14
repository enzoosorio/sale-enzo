import React from "react";

export const ViniloSkeleton = ({className} : {className?: string}) => {
  return (
    <svg
      viewBox="0 0 104 104"
      className={` ${className}`}
    >
      <g id="vinilo">
        <circle
          id="Ellipse 5"
          cx="52"
          cy="52"
          r="52"
          fill="#D9D9D9"
          fillOpacity="0.8"
        />
        <circle id="Ellipse-6" cx="52" cy="52" r="43.5" stroke="#BFBFBF" className="ellipses-skeleton" />
        <circle id="Ellipse-7" cx="52" cy="52" r="31.5" stroke="#BFBFBF" className="ellipses-skeleton"/>
      </g>
    </svg>
  );
};
