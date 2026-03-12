"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Bot, Bell, Palette, Shield, ExternalLink } from "lucide-react"

export default function SettingsPage() {
  const [agentAutoPublish, setAgentAutoPublish] = useState(true)
  const [agentConfidenceThreshold, setAgentConfidenceThreshold] = useState("80")
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [transactionNotifications, setTransactionNotifications] = useState(true)
  const [marketplaceAlerts, setMarketplaceAlerts] = useState(false)
  const [theme, setTheme] = useState("dark")

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Settings
        </h2>
        <p className="text-muted-foreground">
          Manage your wallet, agent preferences, and display options
        </p>
      </div>

      <div className="grid gap-6">
        {/* Agent Preferences */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground text-lg">
              <Bot className="w-5 h-5 text-primary" />
              Agent Preferences
            </CardTitle>
            <CardDescription>
              Configure how your AI agents behave and publish insights
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="flex items-center justify-between">
              <div className="grid gap-1">
                <Label htmlFor="auto-publish" className="text-foreground">Auto-Publish Insights</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically publish insights when confidence threshold is met
                </p>
              </div>
              <Switch
                id="auto-publish"
                checked={agentAutoPublish}
                onCheckedChange={setAgentAutoPublish}
              />
            </div>

            <Separator className="bg-border" />

            <div className="grid gap-2">
              <Label htmlFor="confidence" className="text-foreground">Minimum Confidence Threshold</Label>
              <Select value={agentConfidenceThreshold} onValueChange={setAgentConfidenceThreshold}>
                <SelectTrigger className="w-full sm:w-[200px] bg-input border-border">
                  <SelectValue placeholder="Select threshold" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="70">70% - Exploratory</SelectItem>
                  <SelectItem value="80">80% - Balanced</SelectItem>
                  <SelectItem value="90">90% - Conservative</SelectItem>
                  <SelectItem value="95">95% - High Certainty</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Insights below this threshold will require manual approval
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground text-lg">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>
              Choose what notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="flex items-center justify-between">
              <div className="grid gap-1">
                <Label htmlFor="email" className="text-foreground">Email Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Receive email updates about your account activity
                </p>
              </div>
              <Switch
                id="email"
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            <Separator className="bg-border" />

            <div className="flex items-center justify-between">
              <div className="grid gap-1">
                <Label htmlFor="transactions" className="text-foreground">Transaction Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when tokens are earned or spent
                </p>
              </div>
              <Switch
                id="transactions"
                checked={transactionNotifications}
                onCheckedChange={setTransactionNotifications}
              />
            </div>

            <Separator className="bg-border" />

            <div className="flex items-center justify-between">
              <div className="grid gap-1">
                <Label htmlFor="marketplace" className="text-foreground">Marketplace Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Notifications about new insights in your interest areas
                </p>
              </div>
              <Switch
                id="marketplace"
                checked={marketplaceAlerts}
                onCheckedChange={setMarketplaceAlerts}
              />
            </div>
          </CardContent>
        </Card>

        {/* Display Preferences */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground text-lg">
              <Palette className="w-5 h-5 text-primary" />
              Display Preferences
            </CardTitle>
            <CardDescription>
              Customize your visual experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Label htmlFor="theme" className="text-foreground">Theme</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-full sm:w-[200px] bg-input border-border">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark (Default)</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                AircraftWorth is optimized for dark mode
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground text-lg">
              <Shield className="w-5 h-5 text-primary" />
              Security
            </CardTitle>
            <CardDescription>
              Manage your account security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-warning/10 text-warning border-0">
                Coming Soon
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Session Management</p>
                  <p className="text-xs text-muted-foreground">View and manage active sessions</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-warning/10 text-warning border-0">
                Coming Soon
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card className="bg-secondary/30 border-border">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <ExternalLink className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground text-sm mb-1">AircraftWorth v1.0</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Built for the Hedera Hackathon. Powered by Groq AI for intelligence 
                  and Hedera for verifiable, accountable AI decisions.
                </p>
                <p className="text-xs text-muted-foreground font-mono mt-2">
                  Network: Hedera Mainnet | Agent Version: 0.1.0
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
