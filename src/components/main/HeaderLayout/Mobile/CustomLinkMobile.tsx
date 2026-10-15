import Link from 'next/link'
import React from 'react'

interface CustomLinkMobileProps {
    onClose: () => void;
    href: string;
    children: React.ReactNode;
    auxId?: string;
    /** Opens in a new tab (e.g. the WhatsApp chat). */
    external?: boolean;
}

export const CustomLinkMobile = ({ onClose, href, children, auxId, external = false }: CustomLinkMobileProps) => {
  return (
    <Link
          href={href}
          onClick={onClose}
          {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
          className={`${auxId ? `group/${auxId}` : ''} mobile-menu-link overflow-hidden font-prata 
             w-full text-[#221C1C] [@media(hover:hover)]:hover:bg-black [@media(hover:hover)]:hover:text-white active:bg-black/10 transition-colors py-2
            text-2xl text-center
            `}
        >
          {children}
        </Link>
  )
}
