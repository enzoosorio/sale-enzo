'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
export const DynamicButton = ({ children, nav }: { children: React.ReactNode, nav: string }) => {
  
    const router = useRouter();

    return (
    <button 
            onClick={() => {
                router.push(nav);
                // winwdow scroll smoohth to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-foreground border-b border-b-black/70 font-semibold hover:underline">
                {children}
            </button>
  )
}
