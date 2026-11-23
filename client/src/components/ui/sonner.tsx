import { Toaster as Sonner, ToasterProps } from "sonner"
import { useTheme } from "@/context/theme-provider"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()
  const resolvedTheme: ToasterProps["theme"] =
    theme === "light" || theme === "dark" || theme === "system" ? theme : "dark"

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
