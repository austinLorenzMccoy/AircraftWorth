# 🎨 AircraftWorth Frontend

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38bdf8?style=for-the-badge)
![WalletConnect](https://img.shields.io/badge/WalletConnect-2.0-3b99fc?style=for-the-badge)

> **Interface for a Decentralized Knowledge Economy.** A mission-control grade dashboard + landing page showcasing Groq cognition and Hedera trust.

## 🚀 Highlights
- **Landing Page**: Story-driven hero, animated “How it Works”, Hedera-proof section, and CTA funnel.
- **Dashboard**: Collapsible sidebar, marketplace, publishing, verification, reputation, and settings routes — all demo-ready.
- **Wallet Onboarding**: Web3Modal + Hedera testnet chain config, including placeholder metadata.
- **Design Language**: “Cognitive Ledger” theme (obsidian background, electric cyan accents, Space Grotesk typography).

## 🗂 Structure
```
frontend/
├── app/
│   ├── page.tsx                # Landing page
│   └── dashboard/              # Nested routes (marketplace, publish, etc.)
├── components/
│   ├── landing/                # Hero, How it Works, Why Hedera, Footer
│   ├── dashboard/              # Sidebar + utility components
│   └── ui/                     # shadcn-derived primitives
├── lib/wallets/                # WalletConnect provider + custom hooks
├── styles/                     # Global styles (Tailwind 4 layer)
└── components.json             # shadcn registry
```

## ⚙️ Setup
```bash
cd frontend
pnpm install
cp .env.example .env.local   # if needed
pnpm dev --port 3000
```
- The app expects the backend at `http://localhost:8000` (configure via `NEXT_PUBLIC_API_URL`).

## 🌈 Environment Variables
Create `frontend/.env.local` with:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_id
```
> Without a project ID, Web3Modal will fall back to `demo` mode.

## 🧭 Key Pages
| Route | Description |
|-------|-------------|
| `/` | Hero + narrative sections connecting Groq + Hedera story.
| `/dashboard` | Mission control overview with stats, quick actions, and system status.
| `/dashboard/marketplace` | Mocked insights grid with filters and purchase CTA.
| `/dashboard/publish` | Form with transaction status simulation.
| `/dashboard/verifications` | Interactive verification queue with rewards.
| `/dashboard/reputation` | Charts & tables visualizing historical credibility.
| `/404` | On-brand knowledge-node not found page.

## 🧱 Design Tokens
- **Colors**: `--color-primary: #2AF6FF`, `--color-background: #0B0E11`, supporting success/warning palettes.
- **Typography**: Space Grotesk (headlines), Inter (body), JetBrains Mono (monospaced stats).
- **Spacing & Components**: Derived from shadcn/ui but customized for darker theme + motion primitives.

## 🧩 Component Notes
- `AppSidebar`: Collapsible + persistent via `SidebarProvider` and localStorage (TODO hook ready).
- `HeroSection`: Wallet UI integration with `useWalletInterface` to display connected Hedera account.
- `System Status`: Animated pulses to spotlight Groq/Hedera health pillars.

## 🛠 Tooling
- **Next.js 16 App Router**
- **TypeScript strict**
- **Tailwind 4** with CSS variables (no `tailwind.config.ts` needed)
- **Radix UI + shadcn** component suite
- **pnpm** for package management

## 📦 Scripts
| Script | Description |
|--------|-------------|
| `pnpm dev` | Start Next.js dev server (watch mode).
| `pnpm build` | Production build.
| `pnpm start` | Start the built app.
| `pnpm lint` | Run ESLint (Next.js preset).

## 🤝 Integrations Checklist
- [ ] Update `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` with a real ID before production demo.
- [ ] Confirm backend origin in `NEXT_PUBLIC_API_URL` (or use Next.js rewrites/proxy).
- [ ] Replace placeholder icons in `/public` with brand assets if available.

## 🧪 Testing & QA
- Manual focus states audited; consider adding automated Playwright/Chromatic if time permits.
- Storybook not configured to keep footprint small; rely on App Router previews.

## 📘 References
- [`docs/frontend.md`](../docs/frontend.md) — deep dive into design philosophy and route requirements.
- [`docs/wireframe.md`](../docs/wireframe.md) — original low-fi sketches.

Happy shipping! 🛰️
