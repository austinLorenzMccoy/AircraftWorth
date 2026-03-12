"use client"

import { Radio, MapPin, Database } from "lucide-react"

const steps = [
  {
    number: "01",
    title: "Sensors Capture Signals",
    description: "Neuron network sensors receive Mode-S ADS-B signals from aircraft, capturing precise timestamps and signal data.",
    icon: Radio,
  },
  {
    number: "02",
    title: "MLAT Calculates Position",
    description: "Time Difference of Arrival (TDOA) multilateration triangulates aircraft positions from multiple sensor readings.",
    icon: MapPin,
  },
  {
    number: "03",
    title: "Hedera Logs Results",
    description: "Aircraft positions are logged immutably to Hedera Consensus Service, creating verifiable flight track records.",
    icon: Database,
  },
]

export function HowItWorksSection() {
  return (
    <section className="py-24 bg-secondary/30 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            How MLAT Works
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Decentralized aircraft tracking using multilateration and Hedera consensus
          </p>
        </div>

        {/* Steps with connecting lines */}
        <div className="relative max-w-4xl mx-auto">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-24 left-0 right-0 h-px">
            <div className="h-full bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((step, index) => (
              <div key={step.number} className="relative group">
                {/* Step card */}
                <div className="relative bg-card border border-border rounded-lg p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
                  {/* Step number badge */}
                  <div className="absolute -top-3 left-6 px-3 py-1 bg-primary text-primary-foreground text-xs font-mono font-bold rounded">
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 mt-2 transition-colors group-hover:bg-primary/20">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-semibold mb-2 text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Connector dot for desktop */}
                <div className="hidden md:block absolute -top-[5.5rem] left-1/2 -translate-x-1/2 translate-y-24">
                  <div className="w-3 h-3 rounded-full bg-primary border-4 border-background" />
                </div>

                {/* Mobile connector */}
                {index < steps.length - 1 && (
                  <div className="md:hidden absolute left-1/2 -translate-x-1/2 -bottom-4 h-8 w-px bg-gradient-to-b from-primary/50 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </section>
  )
}
