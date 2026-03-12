"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Zap } from "lucide-react"
import { Logo } from "@/components/brand/logo"

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/20" />
      
      {/* Animated grid pattern */}
      <div className="absolute inset-0 opacity-20">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(42, 246, 255, 0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(42, 246, 255, 0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Glowing orb effect */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />

      {/* Header with Logo */}
      <header className="relative z-10 py-6 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <Logo size="md" />
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/mlat" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              MLAT Dashboard
            </Link>
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <div className="container mx-auto px-4 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-secondary/50 backdrop-blur-sm mb-8">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono text-muted-foreground">Neuron Network + Hedera Consensus</span>
          </div>

          {/* Main headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-balance">
            <span className="text-foreground">Decentralized Aircraft</span>
            <br />
            <span className="text-primary">Tracking via MLAT</span>
          </h1>

          {/* Subtext */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed text-pretty">
            Real-time multilateration using the Neuron sensor network. 
            Every aircraft position is calculated, verified, and logged immutably on Hedera.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="group">
              <Link href="/mlat">
                View Live MLAT Dashboard
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-border hover:bg-secondary/80 bg-transparent">
              <Link href="/dashboard">
                System Dashboard
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-primary font-mono">TDOA</p>
              <p className="text-xs text-muted-foreground mt-1">Multilateration</p>
            </div>
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-primary font-mono">HCS</p>
              <p className="text-xs text-muted-foreground mt-1">Consensus Logging</p>
            </div>
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-primary font-mono">Mode-S</p>
              <p className="text-xs text-muted-foreground mt-1">ADS-B Signals</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-muted-foreground/50 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  )
}
