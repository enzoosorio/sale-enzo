// OverlayForMusicPlayer.tsx
import React from "react";

export const BottomPart = ({ bottomPartRef }: { bottomPartRef?: React.RefObject<HTMLDivElement> }) => {
  return (
    <div
      ref={bottomPartRef}
      className="bottom-part fixed inset-0 z-10 pointer-events-none transition-all"
    />
  );
};

export const RightPart = ({ rightPartRef }: { rightPartRef?: React.RefObject<HTMLDivElement> }) => {
  return (
    <div
      ref={rightPartRef}
      className="right-part fixed inset-0 z-10 pointer-events-none transition-all"
    />
  );
};

export const LeftPart = ({ leftPartRef }: { leftPartRef?: React.RefObject<HTMLDivElement> }) => {
  return (
    <div
      ref={leftPartRef}
      className="left-part fixed inset-0 z-10 pointer-events-none transition-all"
    />
  );
};
