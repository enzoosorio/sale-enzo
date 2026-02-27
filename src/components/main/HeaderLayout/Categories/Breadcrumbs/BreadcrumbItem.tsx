import Link from "next/link"
import {
  BreadcrumbItem,
  BreadcrumbLink,
} from "@/components/ui/breadcrumb"
import { BreadcrumbItemCustomProps } from "./Breadcrumbs"


export const BreadcrumbItemCustom = ({ href, label, svgIcon }: BreadcrumbItemCustomProps) => {
  return (
    <BreadcrumbItem className="text-lg font-prata hover:bg-orange-200/20 cursor-pointer rounded-sm transition-colors">
          <BreadcrumbLink asChild>
            <Link href={href}>
            {label && (
                <span className="flex items-center gap-1 capitalize">{label}</span>
            )}
            {svgIcon && (
               svgIcon
            )}
            </Link>
          </BreadcrumbLink>
    </BreadcrumbItem>
  )
}
