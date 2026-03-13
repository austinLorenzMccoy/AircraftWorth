# AircraftWorth SDK

**Decentralized Aviation Tracking & Data Marketplace SDK**

A comprehensive suite of libraries for building next-generation aviation tracking applications on Hedera Hashgraph. The AircraftWorth SDK provides everything you need to implement multilateration, sensor networks, and blockchain-based data provenance.

---

## 📦 Packages

| Package | Language | Install | Description |
|---------|----------|---------|-------------|
| **@aircraftworth/hedera-logger** | TypeScript/JavaScript | `npm install @aircraftworth/hedera-logger` | HCS logging + HTS minting for aviation data |
| **aircraftworth-mlat** | Python | `pip install aircraftworth-mlat` | TDOA multilateration solver with precision positioning |
| **aircraftworth-neuron** | Python | `pip install aircraftworth-neuron` | Neuron sensor client for real-time data collection |

---

## 🚀 Quick Start

### JavaScript/TypeScript (Hedera Integration)

```bash
npm install @aircraftworth/hedera-logger @hashgraph/sdk
```

```typescript
import { HederaLogger } from '@aircraftworth/hedera-logger'
import { Client, PrivateKey } from '@hashgraph/sdk'

// Initialize Hedera client
const client = Client.forTestnet()
client.setOperator('0.0.12345', PrivateKey.fromString('302e...'))

// Create logger for aviation data
const logger = new HederaLogger({
  client,
  topicId: '0.0.123456',
  tokenId: '0.0.789012'
})

// Log aircraft position
await logger.logAircraftPosition({
  icao: 'ABC123',
  lat: 37.7749,
  lon: -122.4194,
  alt: 35000,
  timestamp: new Date(),
  confidence: 0.95,
  sensors: ['sensor-1', 'sensor-2']
})

// Mint data as NFT
const nftId = await logger.mintDataNFT({
  aircraftId: 'ABC123',
  flightData: {...},
  metadata: 'Flight track data for ABC123'
})
```

### Python (Multilateration)

```bash
pip install aircraftworth-mlat
```

```python
from mlat_core import MLATCalculator, Sensor, AircraftPosition
import asyncio

# Initialize MLAT calculator
calculator = MLATCalculator()

# Define sensor positions
sensors = [
    Sensor(id='sensor-1', lat=37.7749, lon=-122.4194, alt=100),
    Sensor(id='sensor-2', lat=37.8044, lon=-122.2711, alt=150),
    Sensor(id='sensor-3', lat=37.6879, lon=-122.4703, alt=120)
]

# Calculate aircraft position from TDOA data
async def calculate_position():
    tdoa_data = [
        {'sensor_id': 'sensor-1', 'time_offset': 0.000123},
        {'sensor_id': 'sensor-2', 'time_offset': -0.000045},
        {'sensor_id': 'sensor-3', 'time_offset': 0.000089}
    ]
    
    position = await calculator.calculate_position(sensors, tdoa_data)
    print(f"Aircraft position: {position.lat}, {position.lon}, {position.alt}")
    return position

# Run calculation
result = asyncio.run(calculate_position())
```

### Python (Neuron Sensor Client)

```bash
pip install aircraftworth-neuron
```

```python
from neuron_client import NeuronClient, SensorConfig
import asyncio

# Configure sensor
config = SensorConfig(
    sensor_id='neuron-001',
    location={'lat': 37.7749, 'lon': -122.4194, 'alt': 100},
    sampling_rate=1000  # Hz
)

# Initialize client
client = NeuronClient(config)

# Start data collection
async def collect_data():
    await client.connect()
    
    # Start listening for aircraft signals
    async for detection in client.listen():
        print(f"Detected: {detection.icao} at {detection.timestamp}")
        print(f"Signal strength: {detection.signal_strength} dB")
        
        # Process detection...
        
# Run data collection
asyncio.run(collect_data())
```

---

## 📚 Documentation

### @aircraftworth/hedera-logger

**Hedera Consensus Service (HCS) Integration**
- Real-time aviation data logging
- Immutable audit trails
- HTS token minting for data NFTs
- Batch operations for efficiency

**Key Features:**
- ✅ HCS topic management
- ✅ Aircraft position logging
- ✅ Data NFT minting
- ✅ Batch data operations
- ✅ Error handling & retries
- ✅ TypeScript support

### aircraftworth-mlat

**Multilateration Core Engine**
- TDOA (Time Difference of Arrival) calculations
- 3D positioning algorithms
- Confidence scoring
- Sensor network optimization

**Key Features:**
- ✅ High-precision positioning
- ✅ Multiple algorithm support
- ✅ Error estimation
- ✅ Sensor calibration
- ✅ Real-time processing
- ✅ Statistical analysis

### aircraftworth-neuron

**Neuron Sensor Network Client**
- Real-time sensor communication
- Signal processing
- Data streaming
- Network management

**Key Features:**
- ✅ Async I/O support
- ✅ Signal filtering
- ✅ Automatic reconnection
- ✅ Data compression
- ✅ Network discovery
- ✅ Health monitoring

---

## 🛠️ Installation

### Prerequisites

**For JavaScript/TypeScript:**
- Node.js 16+ 
- npm or yarn
- Hedera testnet account (for production)

**For Python:**
- Python 3.8+
- pip
- Optional: virtual environment

### Install All Packages

```bash
# JavaScript/TypeScript
npm install @aircraftworth/hedera-logger

# Python packages
pip install aircraftworth-mlat aircraftworth-neuron
```

### Development Setup

```bash
# Clone the SDK repository
git clone https://github.com/your-org/aircraftworth-sdk.git
cd aircraftworth-sdk

# Install JavaScript dependencies
cd hedera-logger
npm install
npm run build

# Install Python dependencies
cd ../mlat-core
pip install -e ".[dev]"

cd ../neuron-client
pip install -e ".[dev]"
```

---

## 🧪 Testing

### JavaScript/TypeScript

```bash
cd hedera-logger
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### Python

```bash
cd mlat-core
pytest tests/ -v           # Run tests
pytest tests/ --cov        # With coverage

cd neuron-client
pytest tests/ -v
```

---

## 🔧 Configuration

### Hedera Network Setup

```typescript
import { Client, PrivateKey } from '@hashgraph/sdk'
import { HederaLogger } from '@aircraftworth/hedera-logger'

// Testnet configuration
const client = Client.forTestnet()
client.setOperator(
  '0.0.YOUR_ACCOUNT_ID',
  PrivateKey.fromString('YOUR_PRIVATE_KEY')
)

// Mainnet configuration (production)
const mainnetClient = Client.forMainnet()
mainnetClient.setOperator(
  '0.0.YOUR_MAINNET_ACCOUNT',
  PrivateKey.fromString('YOUR_MAINNET_KEY')
)
```

### Sensor Network Configuration

```python
from mlat_core import Sensor, NetworkConfig
from neuron_client import NeuronClient

# Define sensor network
sensors = [
    Sensor(
        id='sensor-1',
        lat=37.7749,
        lon=-122.4194,
        alt=100,
        accuracy=10.0  # meters
    ),
    Sensor(
        id='sensor-2', 
        lat=37.8044,
        lon=-122.2711,
        alt=150,
        accuracy=8.0
    )
]

# Network configuration
config = NetworkConfig(
    sensors=sensors,
    min_sensors=3,           # Minimum for position calculation
    max_error=50.0,          # Maximum acceptable error (meters)
    convergence_threshold=0.001
)
```

---

## 📊 Examples

### Complete Aviation Tracking Pipeline

```typescript
import { HederaLogger } from '@aircraftworth/hedera-logger'
import { MLATCalculator } from 'aircraftworth-mlat'
import { NeuronClient } from 'aircraftworth-neuron'

class AviationTracker {
  private logger: HederaLogger
  private mlat: MLATCalculator
  private neuron: NeuronClient

  constructor() {
    this.logger = new HederaLogger({...})
    this.mlat = new MLATCalculator()
    this.neuron = new NeuronClient({...})
  }

  async trackAircraft(): Promise<void> {
    // Collect sensor data
    const detections = await this.neuron.collectDetections()
    
    // Calculate position
    const position = await this.mlat.calculatePosition(
      this.sensors, 
      detections
    )
    
    // Log to blockchain
    await this.logger.logAircraftPosition({
      icao: detections[0].icao,
      lat: position.lat,
      lon: position.lon,
      alt: position.alt,
      timestamp: new Date(),
      confidence: position.confidence,
      sensors: detections.map(d => d.sensorId)
    })
    
    // Mint data NFT
    const nftId = await this.logger.mintDataNFT({
      aircraftId: detections[0].icao,
      flightData: position,
      metadata: `MLAT calculation for ${detections[0].icao}`
    })
    
    console.log(`Data NFT minted: ${nftId}`)
  }
}
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Style

- **TypeScript:** Use Prettier + ESLint
- **Python:** Use Black + Ruff
- **Documentation:** Follow JSDoc/Google Style

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- **Main Project:** [AircraftWorth](https://github.com/your-org/aircraftworth)
- **Documentation:** [docs.aircraftworth.com](https://docs.aircraftworth.com)
- **API Reference:** [api.aircraftworth.com](https://api.aircraftworth.com)
- **Community:** [Discord](https://discord.gg/aircraftworth)

---

## 🚀 Roadmap

### Current Version: 0.1.0 (Alpha)

**Phase 1: Core SDK ✅**
- [x] Hedera HCS logging
- [x] MLAT calculation engine
- [x] Neuron sensor client
- [x] Basic documentation

**Phase 2: Enhanced Features (Next)**
- [ ] Advanced MLAT algorithms
- [ ] Real-time streaming
- [ ] Mobile SDK support
- [ ] Performance optimizations

**Phase 3: Production Ready**
- [ ] Full audit and security review
- [ ] SLA guarantees
- [ ] Enterprise features
- [ ] Global deployment support

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/your-org/aircraftworth-sdk/issues)
- **Discussions:** [GitHub Discussions](https://github.com/your-org/aircraftworth-sdk/discussions)
- **Email:** sdk@aircraftworth.com

---

**Built with ❤️ for the future of decentralized aviation**
