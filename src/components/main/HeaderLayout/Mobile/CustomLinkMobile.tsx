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
             w-full hover:bg-black hover:text-white hover:backdrop-brightness-100 backdrop-brightness-150 transition-all  py-2
            text-2xl text-foreground text-center
            `}
        >
          {children}
        </Link>
  )
}
