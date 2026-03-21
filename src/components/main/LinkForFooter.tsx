import Link from "next/link";

interface LinkForFooterProps {
  name: string;
  href: string;
}

export const LinkForFooter = ({ name, href }: LinkForFooterProps) => {
  return (
    <li className="text-white text-right w-full  ">
      <Link href={href} className="w-max h-max li-effect">
        {name}
      </Link>
    </li>
  );
};
