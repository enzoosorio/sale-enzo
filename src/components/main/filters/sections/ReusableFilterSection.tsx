import React from 'react'

interface ReusableFilterSectionProps {
 title?: string;
 children: React.ReactNode;
 className?: string;
 classNameForWrapper?: string;
 darkMode?: boolean;
}

export const ReusableFilterSection = ({ title, children, className, classNameForWrapper, darkMode = false }: ReusableFilterSectionProps) => {
  return (
     <section className={`flex flex-col w-full items-start justify-center gap-4 px-2 pt-2 ${classNameForWrapper || ""}`}>
        {title && <h3 className={`font-prata pl-2 text-4xl w-full ${darkMode ? 'text-white' : ''}`}>{title}</h3>}
        <div className={`${className || ""} w-full`}>
            {children}
        </div>
    </section>
  )
}
