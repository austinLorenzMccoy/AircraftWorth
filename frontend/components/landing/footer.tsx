import Link from "next/link"
import { Github, FileText, LayoutDashboard } from "lucide-react"
import { Logo } from "@/components/brand/logo"

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "https://github.com", label: "GitHub", icon: Github, external: true },
  { href: "#", label: "Docs", icon: FileText },
]

export function Footer() {
  return (
    <footer className="py-12 bg-secondary/20 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo and tagline */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <Logo size="sm" />
            <p className="text-xs text-muted-foreground">
              Verifiable Intelligence. Tokenized Potential.
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <link.icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            {new Date().getFullYear()} AircraftWorth. Built for the Hedera Hackathon.
          </p>
        </div>
      </div>
    </footer>
  )
}
