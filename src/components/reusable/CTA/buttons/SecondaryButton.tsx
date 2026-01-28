import React from 'react'

export type CTAButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    className?: string
}

export const SecondaryButton = ({ className, ...props}: CTAButtonProps) => {
  return (
    <button className={`font-prata cursor-pointer bg-off-white text-shadow-black min-h-10 px-14 xl:px-20 text-lg secondary-button border-[0.5px] border-shadow-black ${className}`} {...props}>
        {props.children}
    </button>
  )
}
