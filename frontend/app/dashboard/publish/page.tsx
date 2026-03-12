"use client"

import React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Send, Loader2, CheckCircle, AlertCircle, FileText, Sparkles } from "lucide-react"

const categories = [
  { value: "development", label: "Development" },
  { value: "design", label: "Design" },
  { value: "data", label: "Data Science" },
  { value: "blockchain", label: "Blockchain" },
  { value: "ai", label: "AI & ML" },
  { value: "security", label: "Security" },
]

type TransactionStatus = "idle" | "processing" | "success" | "error"

export default function PublishPage() {
  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [category, setCategory] = useState("")
  const [confidence, setConfidence] = useState([75])
  const [price, setPrice] = useState("")
  const [status, setStatus] = useState<TransactionStatus>("idle")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("processing")
    
    // Simulate transaction processing
    setTimeout(() => {
      setStatus("success")
    }, 2500)
  }

  const resetForm = () => {
    setTitle("")
    setSummary("")
    setCategory("")
    setConfidence([75])
    setPrice("")
    setStatus("idle")
  }

  const isFormValid = title && summary && category && price

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Publish New Insight
        </h2>
        <p className="text-muted-foreground">
          Submit your knowledge for AI evaluation and tokenization on Hedera
        </p>
      </div>

      {/* Transaction status alerts */}
      {status === "success" && (
        <Alert className="mb-6 border-success bg-success/10">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">
            Insight successfully published! Transaction logged to Hedera Consensus Service and tokens minted via HTS.
          </AlertDescription>
        </Alert>
      )}

      {status === "error" && (
        <Alert className="mb-6 border-destructive bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            Failed to publish insight. Please check your connection and try again.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* Main form card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <FileText className="w-5 h-5 text-primary" />
              Insight Details
            </CardTitle>
            <CardDescription>
              Provide the details of your knowledge contribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-6">
              {/* Title */}
              <div className="grid gap-2">
                <Label htmlFor="title" className="text-foreground">Insight Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Advanced TypeScript Patterns for React Applications"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-input border-border"
                  disabled={status === "processing"}
                />
              </div>

              {/* Summary */}
              <div className="grid gap-2">
                <Label htmlFor="summary" className="text-foreground">Summary</Label>
                <Textarea
                  id="summary"
                  placeholder="Provide a detailed summary of your insight. This will be evaluated by Groq-powered AI agents..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="bg-input border-border min-h-[120px] resize-none"
                  disabled={status === "processing"}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 100 characters recommended for accurate AI evaluation
                </p>
              </div>

              {/* Category */}
              <div className="grid gap-2">
                <Label htmlFor="category" className="text-foreground">Category</Label>
                <Select value={category} onValueChange={setCategory} disabled={status === "processing"}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Confidence level */}
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <Label className="text-foreground">Confidence Level</Label>
                  <span className="text-sm font-mono text-primary">{confidence[0]}%</span>
                </div>
                <Slider
                  value={confidence}
                  onValueChange={setConfidence}
                  max={100}
                  min={50}
                  step={1}
                  disabled={status === "processing"}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Your self-assessed confidence in this insight (50-100%)
                </p>
              </div>

              {/* Price */}
              <div className="grid gap-2">
                <Label htmlFor="price" className="text-foreground">Price (SWT)</Label>
                <div className="relative">
                  <Input
                    id="price"
                    type="number"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="bg-input border-border pr-12"
                    disabled={status === "processing"}
                    min="0"
                    step="0.5"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">
                    SWT
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Suggested range: 5-25 SWT based on complexity
                </p>
              </div>

              {/* Submit buttons */}
              <div className="flex gap-3 pt-2">
                {status === "success" ? (
                  <Button type="button" onClick={resetForm} className="flex-1">
                    Publish Another Insight
                  </Button>
                ) : (
                  <>
                    <Button
                      type="submit"
                      disabled={!isFormValid || status === "processing"}
                      className="flex-1"
                    >
                      {status === "processing" ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Publishing to Hedera...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Publish Insight
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                      disabled={status === "processing"}
                      className="border-border bg-transparent"
                    >
                      Clear
                    </Button>
                  </>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info card */}
        <Card className="bg-secondary/30 border-border">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground text-sm mb-1">AI Evaluation Process</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your insight will be evaluated by Groq-powered AI agents. The decision 
                  will be logged to Hedera Consensus Service, and upon approval, Skill Worth 
                  Tokens (SWT) will be minted via Hedera Token Service.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
