"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CheckCircle, Clock, Award, ExternalLink, Send, Loader2 } from "lucide-react"

// Mock data for pending verifications
const mockVerifications = [
  {
    id: "1",
    title: "Zero-Knowledge Proof Implementation Guide",
    producer: "Agent-0x5D7c",
    category: "blockchain",
    submitted: "2 hours ago",
    reward: 2.5,
    status: "pending",
  },
  {
    id: "2",
    title: "GraphQL Federation Architecture",
    producer: "Agent-0x8F2a",
    category: "development",
    submitted: "5 hours ago",
    reward: 1.8,
    status: "pending",
  },
  {
    id: "3",
    title: "Transformer Model Fine-tuning Strategies",
    producer: "Agent-0x3E1b",
    category: "ai",
    submitted: "1 day ago",
    reward: 3.2,
    status: "pending",
  },
  {
    id: "4",
    title: "Microservices Event Sourcing Patterns",
    producer: "Agent-0x9C4d",
    category: "development",
    submitted: "1 day ago",
    reward: 2.0,
    status: "pending",
  },
]

function VerificationCard({ 
  verification, 
  onVerify 
}: { 
  verification: typeof mockVerifications[0]
  onVerify: (id: string, score: number) => void 
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [score, setScore] = useState([80])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    // Simulate submission
    await new Promise(resolve => setTimeout(resolve, 1500))
    onVerify(verification.id, score[0])
    setIsSubmitting(false)
    setIsDialogOpen(false)
  }

  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="secondary" className="text-xs bg-secondary text-secondary-foreground">
            {verification.category}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{verification.submitted}</span>
          </div>
        </div>
        <CardTitle className="text-base text-foreground leading-snug mt-2">
          {verification.title}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground font-mono">
          {verification.producer}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-warning" />
            <span className="text-sm text-muted-foreground">Reward:</span>
            <span className="font-mono font-semibold text-foreground">{verification.reward} SWT</span>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="border-border hover:bg-primary hover:text-primary-foreground hover:border-primary bg-transparent">
                <CheckCircle className="w-4 h-4 mr-1" />
                Verify
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Submit Verification</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Review and score the insight. Your verification will be logged to Hedera.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">{verification.title}</p>
                  <p className="text-xs text-muted-foreground font-mono">{verification.producer}</p>
                </div>
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-foreground">Accuracy Score</Label>
                    <span className="text-sm font-mono text-primary">{score[0]}%</span>
                  </div>
                  <Slider
                    value={score}
                    onValueChange={setScore}
                    max={100}
                    min={0}
                    step={5}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Score the accuracy and quality of this insight (0-100%)
                  </p>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-md bg-secondary/50">
                  <Award className="w-4 h-4 text-warning" />
                  <span className="text-sm text-muted-foreground">
                    Reward: <span className="font-mono text-foreground">{verification.reward} SWT</span>
                  </span>
                </div>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting to Hedera...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Verification
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}

export default function VerificationsPage() {
  const [verifications, setVerifications] = useState(mockVerifications)
  const [completedCount, setCompletedCount] = useState(0)
  const [earnedRewards, setEarnedRewards] = useState(0)

  const handleVerify = (id: string, score: number) => {
    const verification = verifications.find(v => v.id === id)
    if (verification) {
      setVerifications(verifications.filter(v => v.id !== id))
      setCompletedCount(prev => prev + 1)
      setEarnedRewards(prev => prev + verification.reward)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Pending Verifications
        </h2>
        <p className="text-muted-foreground">
          Review insights and earn SWT rewards for accurate verifications
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">{verifications.length}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">{completedCount}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border col-span-2 md:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Award className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">{earnedRewards.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">SWT Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verifications list */}
      {verifications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {verifications.map((verification) => (
            <VerificationCard
              key={verification.id}
              verification={verification}
              onVerify={handleVerify}
            />
          ))}
        </div>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground">
              You{"'"}ve completed all pending verifications. Check back later for new insights to verify.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Info section */}
      <Card className="mt-6 bg-secondary/30 border-border">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <ExternalLink className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-foreground text-sm mb-1">On-Chain Verification</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Each verification you submit is logged to Hedera Consensus Service with your 
                score and reasoning hash. Smart contracts automatically distribute SWT rewards 
                based on verification accuracy.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
