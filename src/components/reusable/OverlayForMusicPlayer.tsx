import React from 'react'


export const BottomPart = ({ bottomPartRef }: { bottomPartRef?: React.RefObject<HTMLDivElement> }) => {
  return (
    <div ref={bottomPartRef} className="bottom-part fixed bg-black/0 transition-all inset-0 -z-20" />
  )
}

export const RightPart = ({ rightPartRef }: { rightPartRef?: React.RefObject<HTMLDivElement> }) => {
  return (
    <div ref={rightPartRef} className="right-part fixed bg-black/0 transition-all inset-0 -z-20" />
  )
}

export const LeftPart = ({ leftPartRef }: { leftPartRef?: React.RefObject<HTMLDivElement> }) => {
  return (
    <div ref={leftPartRef} className="left-part fixed bg-black/0 transition-all inset-0 -z-20" />
  )
}