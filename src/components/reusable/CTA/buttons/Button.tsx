import React from 'react'

export type CTAButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    className?: string
}

export const PrimaryButton = ({ className, ...props}: CTAButtonProps) => {
  
  return (
    <button 
    className={`font-prata cursor-pointer bg-black text-white min-h-10 px-14 xl:px-20 text-lg primary-button ${className}`} {...props}>
        {props.children}
    </button>
  )
}
