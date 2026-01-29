'use client'
import Link from 'next/link'
import React from 'react'

type CustomLinkProps = React.ComponentProps<typeof Link> & {
    children: React.ReactNode;
    href: string;
    className?: string;
}

export const CustomLink = ({ children, ...props }: CustomLinkProps) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Ejecutar scroll inmediatamente
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    
    // Si hay un onClick custom, ejecutarlo también
    if (props.onClick) {
      props.onClick(e);
    }
  };

  return (
    <Link
      {...props}
      href={props.href}
      className={props.className}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}
