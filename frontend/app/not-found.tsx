import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, LayoutDashboard } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/AircraftWorth-Icon.svg"
            alt="AircraftWorth"
            width={64}
            height={64}
            className="w-16 h-16"
          />
        </div>

        {/* Error code */}
        <h1 className="text-6xl font-bold text-primary font-mono mb-4">404</h1>

        {/* Message */}
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Knowledge Node Not Found
        </h2>
        <p className="text-muted-foreground mb-8">
          This knowledge node doesn{"'"}t exist in the AircraftWorth network. 
          It may have been moved or the URL might be incorrect.
        </p>

        {/* Navigation buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto border-border bg-transparent">
            <Link href="/dashboard">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Link>
          </Button>
        </div>

        {/* Decorative element */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground">
            AircraftWorth | Verifiable Intelligence. Tokenized Potential.
          </p>
        </div>
      </div>
    </div>
  )
}
