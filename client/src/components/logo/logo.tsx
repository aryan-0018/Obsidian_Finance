import { PROTECTED_ROUTES } from "@/routes/common/routePath"
import { Link } from "react-router-dom"

const Logo = (props: { url?: string }) => {
  return (
    <Link to={props.url || PROTECTED_ROUTES.OVERVIEW} className="flex items-center gap-2">
      <img src="/logo.png" alt="ObsidianFinance Logo" className="h-8 w-8 object-contain rounded-sm" />
      <span className="font-semibold text-lg">ObsidianFinance</span>
    </Link>
  )
}

export default Logo