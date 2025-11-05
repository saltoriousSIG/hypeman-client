import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsibleProps {
  children: React.ReactNode
  defaultOpen?: boolean
  trigger: React.ReactNode
  className?: string
}

export function Collapsible({
  children,
  defaultOpen = false,
  trigger,
  className,
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <div className={cn("rounded-lg border border-white/10 bg-white/5 overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left p-2"
      >
        {trigger}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-white/60 transition-transform",
            isOpen && "transform rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="space-y-2 p-2 pt-0">
          {children}
        </div>
      </div>
    </div>
  )
}

