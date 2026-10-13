import Link from "next/link";

interface LinkForFooterProps {
  name: string;
  href: string;
  /** Opens in a new tab (e.g. the WhatsApp chat). */
  external?: boolean;
}

export const LinkForFooter = ({ name, href, external = false }: LinkForFooterProps) => {
  return (
    <li className="text-color text-off-black sm:text-right">
      <Link
        href={href}
        className="w-max h-max li-effect"
        {...(external && { target: "_blank", rel: "noopener noreferrer" })}
      >
        {name}
      </Link>
    </li>
  );
};
