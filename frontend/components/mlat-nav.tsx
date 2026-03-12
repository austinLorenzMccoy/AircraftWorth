import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plane, LayoutDashboard } from 'lucide-react'

export function MLATNav() {
  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <div className="flex items-center gap-2 mr-8">
          <Plane className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">AircraftWorth</span>
        </div>
        
        <div className="flex gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/mlat">
              <Plane className="h-4 w-4 mr-2" />
              MLAT Tracking
            </Link>
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 border border-success/20">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-medium text-success">Live</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
