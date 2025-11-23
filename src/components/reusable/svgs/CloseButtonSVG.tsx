import React from "react";

interface Props {
    className : string; 
}

export const CloseButtonSVG = (props: Props) => {
  return (
    <svg
      viewBox="0 0 28 29"
      fill="none"
      className={props.className}
    >
      <path
        d="M27.1799 0.173523L0.179932 28.1735M0.179932 0.173523L27.1799 28.1735"
        stroke="black"
        strokeWidth="0.5"
      />
    </svg>
  );
};
