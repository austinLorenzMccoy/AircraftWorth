interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  showText?: boolean
  variant?: "full" | "icon"
}

const sizes = {
  sm: { icon: 24, text: "text-sm" },
  md: { icon: 32, text: "text-lg" },
  lg: { icon: 40, text: "text-xl" },
  xl: { icon: 56, text: "text-2xl" },
}

export function Logo({ 
  className = "", 
  size = "md", 
  showText = true,
  variant = "full" 
}: LogoProps) {
  const { icon: iconSize, text: textSize } = sizes[size]
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* AircraftWorth Logo - Use the new logo asset */}
      <img
        src="/AircraftWorth-Logo.svg"
        alt="AircraftWorth Logo"
        width={iconSize}
        height={iconSize}
        className="shrink-0"
        style={{ width: iconSize, height: 'auto' }}
      />
      
      {/* Wordmark */}
      {showText && variant === "full" && (
        <div className="flex flex-col">
          <span className={`font-semibold ${textSize} text-foreground tracking-tight leading-none`}>
            Aircraft<span className="text-primary">Worth</span>
          </span>
          {size !== "sm" && (
            <span className="text-[10px] text-muted-foreground tracking-widest uppercase mt-0.5">
              Verifiable Intelligence
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Icon-only version for favicons, small spaces
export function LogoIcon({ className = "", size = 32 }: { className?: string; size?: number }) {
  return (
    <img
      src="/AircraftWorth-Icon.svg"
      alt="AircraftWorth Icon"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: 'auto' }}
    />
  )
}
