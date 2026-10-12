import Link from "next/link";

interface LinkForFooterProps {
  name: string;
  href: string;
}

export const LinkForFooter = ({ name, href }: LinkForFooterProps) => {
  return (
    <li className="text-color text-off-black sm:text-right">
      <Link href={href} className="w-max h-max li-effect">
        {name}
      </Link>
    </li>
  );
};
