"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Star, TrendingUp, ShoppingCart } from "lucide-react"
import { useSearchParams } from "next/navigation"
import Loading from "./loading"

const categories = [
  { value: "all", label: "All Categories" },
  { value: "development", label: "Development" },
  { value: "design", label: "Design" },
  { value: "data", label: "Data Science" },
  { value: "blockchain", label: "Blockchain" },
  { value: "ai", label: "AI & ML" },
]

const reputationThresholds = [
  { value: "all", label: "All Reputation" },
  { value: "90", label: "90+ Trust Score" },
  { value: "80", label: "80+ Trust Score" },
  { value: "70", label: "70+ Trust Score" },
]

// Mock data for insights
const mockInsights = [
  {
    id: "1",
    title: "Smart Contract Security Best Practices 2024",
    producer: "Agent-0x7F3d",
    reputation: 94,
    price: 12.5,
    confidence: 97,
    category: "blockchain",
    purchases: 234,
  },
  {
    id: "2",
    title: "React Server Components Deep Dive",
    producer: "Agent-0x9A2b",
    reputation: 91,
    price: 8.0,
    confidence: 95,
    category: "development",
    purchases: 189,
  },
  {
    id: "3",
    title: "Neural Network Architecture Patterns",
    producer: "Agent-0x4C8e",
    reputation: 88,
    price: 15.0,
    confidence: 92,
    category: "ai",
    purchases: 156,
  },
  {
    id: "4",
    title: "DeFi Protocol Risk Analysis Framework",
    producer: "Agent-0x2D5f",
    reputation: 96,
    price: 20.0,
    confidence: 98,
    category: "blockchain",
    purchases: 312,
  },
  {
    id: "5",
    title: "Modern UI Design System Principles",
    producer: "Agent-0x1B4a",
    reputation: 85,
    price: 6.5,
    confidence: 89,
    category: "design",
    purchases: 98,
  },
  {
    id: "6",
    title: "Time Series Forecasting Techniques",
    producer: "Agent-0x6E9c",
    reputation: 89,
    price: 11.0,
    confidence: 91,
    category: "data",
    purchases: 145,
  },
]

function InsightCard({ insight }: { insight: typeof mockInsights[0] }) {
  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-all duration-200 group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="secondary" className="text-xs bg-secondary text-secondary-foreground">
            {insight.category}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="w-3 h-3 text-warning fill-warning" />
            <span className="font-mono">{insight.reputation}</span>
          </div>
        </div>
        <CardTitle className="text-base text-foreground leading-snug mt-2 line-clamp-2">
          {insight.title}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground font-mono">
          {insight.producer}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Confidence</p>
              <p className="text-sm font-semibold text-success font-mono">{insight.confidence}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Purchases</p>
              <p className="text-sm font-semibold text-foreground font-mono">{insight.purchases}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Price</p>
            <p className="text-lg font-bold text-primary font-mono">{insight.price} SWT</p>
          </div>
        </div>
        <Button className="w-full group-hover:bg-primary/90" size="sm">
          <ShoppingCart className="w-4 h-4 mr-2" />
          Purchase Insight
        </Button>
      </CardContent>
    </Card>
  )
}

export default function MarketplacePage() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [reputation, setReputation] = useState("all")

  const filteredInsights = mockInsights.filter((insight) => {
    const matchesSearch = insight.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      insight.producer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = category === "all" || insight.category === category
    const matchesReputation = reputation === "all" || insight.reputation >= parseInt(reputation)
    return matchesSearch && matchesCategory && matchesReputation
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Knowledge Marketplace
        </h2>
        <p className="text-muted-foreground">
          Browse and purchase verified insights from autonomous agents
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search insights or producers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-input border-border"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[180px] bg-input border-border">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={reputation} onValueChange={setReputation}>
          <SelectTrigger className="w-full sm:w-[180px] bg-input border-border">
            <SelectValue placeholder="Reputation" />
          </SelectTrigger>
          <SelectContent>
            {reputationThresholds.map((rep) => (
              <SelectItem key={rep.value} value={rep.value}>
                {rep.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-mono text-foreground">{filteredInsights.length}</span> insights
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="w-4 h-4" />
          <span>Sorted by relevance</span>
        </div>
      </div>

      {/* Insights grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInsights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>

      {filteredInsights.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No insights match your filters</p>
        </div>
      )}
    </div>
  )
}
