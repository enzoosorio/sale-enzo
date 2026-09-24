import Link from "next/link"
import {
  BreadcrumbItem,
  BreadcrumbLink,
} from "@/components/ui/breadcrumb"
import { BreadcrumbItemCustomProps } from "./Breadcrumbs"


export const BreadcrumbItemCustom = ({ href, label, svgIcon, onSelect }: BreadcrumbItemCustomProps) => {
  const content = (
    <>
      {label && (
        <span className="flex items-center gap-1 capitalize">{label}</span>
      )}
      {svgIcon}
    </>
  )

  return (
    <BreadcrumbItem className="text-lg font-prata hover:bg-orange-200/20 cursor-pointer rounded-sm transition-colors">
      <BreadcrumbLink asChild>
        {onSelect ? (
          <button type="button" onClick={onSelect} aria-label={label ? undefined : "Todas las categorías"} className="cursor-pointer">
            {content}
          </button>
        ) : (
          <Link href={href} aria-label={label ? undefined : "Todos los productos"}>{content}</Link>
        )}
      </BreadcrumbLink>
    </BreadcrumbItem>
  )
}
