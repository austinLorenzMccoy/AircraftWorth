# 🎨 AircraftWorth Frontend

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38bdf8?style=for-the-badge)
![Hedera](https://img.shields.io/badge/Hedera-HashPack-8b5cf6?style=for-the-badge)
![Marketplace](https://img.shields.io/badge/Data-Marketplace-green?style=for-the-badge)

> **Complete frontend for AircraftWorth MLAT tracking & Data Marketplace.** Next.js 16 dashboard with real-time aircraft tracking, interactive marketplace, and comprehensive earnings management.

## 🚀 Highlights

### 🛩️ Aircraft Tracking
- **Live MLAT Dashboard**: Real-time aircraft positions with confidence scores
- **Interactive Map**: Leaflet-based visualization with sensor network
- **Hedera Proof Explorer**: Blockchain verification of all calculations
- **Real-time Updates**: Live data streaming via Supabase

### 🏪 Data Marketplace
- **Interactive Marketplace**: Geographic sensor discovery with filtering
- **Flexible Pricing**: Per-message, subscriptions, and bundle options
- **Hedera Wallet Integration**: HashPack wallet for secure payments
- **Purchase Management**: Subscription tracking and API key access

### 📊 Dashboard & Analytics
- **Earnings Dashboard**: Revenue tracking for sensor operators
- **Subscription Management**: Usage monitoring and access control
- **Performance Analytics**: Sensor health and data quality metrics
- **Responsive Design**: Works seamlessly on all devices

## ⚙️ Setup

### Prerequisites
- Node.js 20+
- pnpm 9+
- Supabase project
- Hedera testnet account (for marketplace)

### Installation
```bash
# Navigate to frontend
cd frontend

# Install dependencies
pnpm install
```

### Environment Configuration
Create `.env.local`:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Backend API
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Hedera (optional - for marketplace)
NEXT_PUBLIC_HEDERA_NETWORK=testnet
NEXT_PUBLIC_HEDERA_CHAIN_ID=296
```

## 🚀 Development

### Start Development Server
```bash
pnpm dev
```

### Build for Production
```bash
pnpm build
pnpm start
```

## 📄 Pages & Features

### 🏠 Landing Page (`/`)
- **Hero Section**: AircraftWorth value proposition
- **Feature Overview**: MLAT tracking and marketplace highlights
- **Interactive Demo**: Quick access to main features
- **Navigation**: Clear paths to tracking and marketplace

### 🛩️ MLAT Dashboard (`/mlat`)
- **Live Map**: Real-time aircraft positions with confidence indicators
- **Sensor Network**: Visualization of sensor coverage and health
- **Hedera Proof**: Blockchain verification of MLAT calculations
- **Replay Controls**: Historical data playback and testing

### 🏪 Data Marketplace (`/marketplace`)
- **Sensor Discovery**: Interactive map with filtering options
- **Offering Cards**: Detailed pricing and data type information
- **Purchase Flow**: Hedera wallet integration and transaction processing
- **Marketplace Stats**: Real-time platform metrics

### 📊 Dashboard (`/dashboard`)
- **Main Dashboard**: Overview of system status and activity
- **Earnings** (`/dashboard/earnings`): Revenue tracking and analytics
- **Subscriptions**: Active data access and usage monitoring
- **API Management**: Key generation and access control

---

**The AircraftWorth frontend provides a professional, feature-rich interface for aircraft tracking and data marketplace functionality.**
