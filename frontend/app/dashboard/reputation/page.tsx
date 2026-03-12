"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Area, AreaChart } from "recharts"
import { TrendingUp, Target, Award, ExternalLink, CheckCircle, XCircle } from "lucide-react"

// Mock data for reputation chart
const reputationHistory = [
  { month: "Jul", score: 72, insights: 3 },
  { month: "Aug", score: 75, insights: 5 },
  { month: "Sep", score: 78, insights: 4 },
  { month: "Oct", score: 82, insights: 7 },
  { month: "Nov", score: 85, insights: 6 },
  { month: "Dec", score: 88, insights: 8 },
  { month: "Jan", score: 91, insights: 9 },
]

// Mock data for insight performance
const insightPerformance = [
  {
    id: "1",
    title: "Smart Contract Security Best Practices",
    accuracy: 97,
    purchases: 234,
    earnings: 2925,
    status: "verified",
  },
  {
    id: "2",
    title: "React Performance Optimization Guide",
    accuracy: 94,
    purchases: 189,
    earnings: 1512,
    status: "verified",
  },
  {
    id: "3",
    title: "DeFi Yield Farming Analysis",
    accuracy: 91,
    purchases: 156,
    earnings: 2340,
    status: "verified",
  },
  {
    id: "4",
    title: "Machine Learning Pipeline Architecture",
    accuracy: 88,
    purchases: 98,
    earnings: 1470,
    status: "pending",
  },
]

export default function ReputationPage() {
  const currentScore = 91
  const totalInsights = 42
  const totalEarnings = 8247
  const verificationRate = 94

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Reputation Dashboard
        </h2>
        <p className="text-muted-foreground">
          Track your agent trust score and historical performance
        </p>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <p className="text-xs text-muted-foreground mb-1">Trust Score</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-primary font-mono">{currentScore}</p>
                <span className="text-xs text-success mb-1">+3.4%</span>
              </div>
              <Progress value={currentScore} className="h-1.5 mt-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <p className="text-xs text-muted-foreground mb-1">Total Insights</p>
              <p className="text-3xl font-bold text-foreground font-mono">{totalInsights}</p>
              <p className="text-xs text-muted-foreground mt-1">Published</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <p className="text-xs text-muted-foreground mb-1">Total Earnings</p>
              <p className="text-3xl font-bold text-foreground font-mono">{totalEarnings.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">SWT</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <p className="text-xs text-muted-foreground mb-1">Verification Rate</p>
              <p className="text-3xl font-bold text-success font-mono">{verificationRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">Accuracy</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Accuracy graph */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              Trust Score History
            </CardTitle>
            <CardDescription>Your reputation score over the past 7 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                score: {
                  label: "Trust Score",
                  color: "#2AF6FF",
                },
              }}
              className="h-[250px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reputationHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2AF6FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2AF6FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} />
                  <YAxis domain={[60, 100]} tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#2AF6FF"
                    strokeWidth={2}
                    fill="url(#scoreGradient)"
                    name="Trust Score"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Insights published chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground text-lg">
              <Target className="w-5 h-5 text-primary" />
              Monthly Insights
            </CardTitle>
            <CardDescription>Number of insights published per month</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                insights: {
                  label: "Insights",
                  color: "#3DDC97",
                },
              }}
              className="h-[250px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reputationHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} />
                  <YAxis domain={[0, 12]} tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="insights"
                    stroke="#3DDC97"
                    strokeWidth={2}
                    dot={{ fill: '#3DDC97', strokeWidth: 2 }}
                    name="Insights"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Historical insights performance */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground text-lg">
            <Award className="w-5 h-5 text-primary" />
            Insight Performance
          </CardTitle>
          <CardDescription>Your top performing insights and their on-chain metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Insight</th>
                  <th className="text-right text-xs font-medium text-muted-foreground py-3 px-4">Accuracy</th>
                  <th className="text-right text-xs font-medium text-muted-foreground py-3 px-4">Purchases</th>
                  <th className="text-right text-xs font-medium text-muted-foreground py-3 px-4">Earnings</th>
                  <th className="text-right text-xs font-medium text-muted-foreground py-3 pl-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {insightPerformance.map((insight) => (
                  <tr key={insight.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="py-3 pr-4">
                      <p className="text-sm text-foreground font-medium line-clamp-1">{insight.title}</p>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="text-sm font-mono text-success">{insight.accuracy}%</span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="text-sm font-mono text-foreground">{insight.purchases}</span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="text-sm font-mono text-primary">{insight.earnings} SWT</span>
                    </td>
                    <td className="text-right py-3 pl-4">
                      {insight.status === "verified" ? (
                        <Badge variant="secondary" className="bg-success/10 text-success border-0">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-warning/10 text-warning border-0">
                          Pending
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* On-chain reference */}
      <Card className="mt-6 bg-secondary/30 border-border">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <ExternalLink className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-foreground text-sm mb-1">On-Chain Reputation</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your reputation score is computed from verified insights, accuracy ratings, and 
                peer verifications. All data is logged to Hedera Consensus Service and can be 
                independently verified on-chain.
              </p>
              <p className="text-xs text-muted-foreground font-mono mt-2">
                Agent ID: 0x7F3d...9A2b
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
