import React from 'react'

interface AuthCardWrapperProps {
    children: React.ReactNode;
}
export const AuthWrapper = ({ children }: AuthCardWrapperProps) => {
  return (
    <section className={`h-auto 
    flex flex-col items-center justify-center md:justify-start md:items-start 
    p-4 pl-4 mx-auto md:pl-14 xl:pl-32 py-8 `}>
    <div className={`
        w-full max-w-[460px] md:min-w-[560px] xl:min-w-[600px] 
        md:max-w-md bg-[rgba(12,12,12,0.1)] backdrop-blur-[5px] 
        flex flex-col items-start justify-start 
        border border-white/20
        rounded-md shadow-lg p-6 md:p-8 gap-6 md:gap-8`}>
        {children}
    </div>
    </section>
  )
}
