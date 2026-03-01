import React from "react";

interface Props {
  className: string;
}

export const CloseButtonSVG = (props: Props) => {
  return (
    <svg
      width="28"
      height="29"
      viewBox="0 0 28 29"
      fill="none"
      className={props.className}
    >
      <path
        id="close-svg"
        d="M27.1801 0.17334L0.180176 28.1733M0.180176 0.17334L27.1801 28.1733"
        stroke="black"
      />
    </svg>
  );
};

export const CloseButtonSVGAux = (props: Props) => {
  return (
    <svg
      width="28"
      height="29"
      viewBox="0 0 28 29"
      fill="none"
      className={props.className}
    >
      <path
        id="close-svg-aux"
        d="M27.1801 0.17334L0.180176 28.1733M0.180176 0.17334L27.1801 28.1733"
        stroke="black"
      />
    </svg>
  );
};

export const OpenButtonSVG = (props: Props) => {
  return (
    <svg
      width="28"
      height="30"
      viewBox="0 0 28 30"
      fill="none"
      className={props.className}
    >
      <path
        id="close-svg-open"
        d="M27.6812 0.130859L10.1812 28.6309L0.181152 18.1309"
        stroke="black"
      />
    </svg>
  );
};
