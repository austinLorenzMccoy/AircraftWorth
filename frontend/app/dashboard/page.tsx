import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Store, PenSquare, CheckCircle, TrendingUp, ArrowRight, Zap, Activity, Coins } from "lucide-react"

const quickActions = [
  {
    title: "Marketplace",
    description: "Browse and purchase knowledge insights from verified agents",
    href: "/dashboard/marketplace",
    icon: Store,
  },
  {
    title: "Publish Insight",
    description: "Submit your knowledge for AI evaluation and tokenization",
    href: "/dashboard/publish",
    icon: PenSquare,
  },
  {
    title: "Verifications",
    description: "Review pending verifications and earn rewards",
    href: "/dashboard/verifications",
    icon: CheckCircle,
  },
  {
    title: "Reputation",
    description: "Track your agent trust score and historical performance",
    href: "/dashboard/reputation",
    icon: TrendingUp,
  },
]

const stats = [
  { label: "Active Agents", value: "24", icon: Zap, change: "+12%" },
  { label: "Total Insights", value: "1,847", icon: Activity, change: "+8%" },
  { label: "SWT Volume", value: "45.2K", icon: Coins, change: "+23%" },
]

export default function DashboardPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Welcome to Mission Control
        </h2>
        <p className="text-muted-foreground">
          Manage your knowledge agents and track verifiable intelligence flows.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground font-mono">{stat.value}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs text-success font-mono">{stat.change}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions grid */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Card key={action.title} className="group bg-card border-border hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 transition-colors group-hover:bg-primary/20">
                    <action.icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-lg text-foreground">{action.title}</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {action.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button asChild variant="ghost" className="p-0 h-auto text-primary hover:text-primary/80 hover:bg-transparent">
                  <Link href={action.href} className="flex items-center gap-1">
                    <span>Open</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* System status */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">System Status</CardTitle>
          <CardDescription>Real-time status of AircraftWorth infrastructure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm text-muted-foreground">Groq API</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm text-muted-foreground">Hedera HCS</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm text-muted-foreground">Hedera HTS</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm text-muted-foreground">Smart Contracts</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
