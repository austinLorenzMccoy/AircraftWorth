'use client'

interface ClientOnlyWrapperProps {
  children: React.ReactNode
}

export default function ClientOnlyWrapper({ children }: ClientOnlyWrapperProps) {
  return <>{children}</>
}
