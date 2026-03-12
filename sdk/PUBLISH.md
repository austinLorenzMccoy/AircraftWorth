# AircraftWorth SDK — Publish Guide

Three commands. Three packages. Live on npm and PyPI.

---

## Prerequisites

```bash
# npm account at https://www.npmjs.com
# PyPI account at https://pypi.org (or use TestPyPI first)
# Twine for PyPI uploads
pip install twine hatchling --break-system-packages
```

---

## 1. @aircraftworth/hedera-logger (npm)

```bash
cd sdk/hedera-logger

# Install dependencies
npm install

# Run tests (must pass before publish)
npm test

# Build (compiles TypeScript → dist/)
npm run build

# Check what will be published
npm pack --dry-run

# Login to npm
npm login

# Publish
npm publish --access public
```

**Live at:** `https://www.npmjs.com/package/@aircraftworth/hedera-logger`

**Verify install works:**
```bash
mkdir /tmp/test-hedera && cd /tmp/test-hedera
npm init -y
npm install @aircraftworth/hedera-logger @hashgraph/sdk
node -e "const { HederaLogger } = require('@aircraftworth/hedera-logger'); console.log('✓ installed')"
```

---

## 2. aircraftworth-mlat (PyPI)

```bash
cd sdk/mlat-core

# Install dev dependencies
pip install -e ".[dev]" --break-system-packages

# Run tests (all must pass — centroid fallback is GONE)
pytest tests/ -v

# Build wheel + sdist
python -m hatchling build
# or: python -m build

# Check dist contents
ls dist/
# → aircraftworth_mlat-0.1.0-py3-none-any.whl
# → aircraftworth_mlat-0.1.0.tar.gz

# Upload to TestPyPI first (recommended)
twine upload --repository testpypi dist/*
# Test install from TestPyPI:
pip install --index-url https://test.pypi.org/simple/ aircraftworth-mlat --break-system-packages

# Upload to real PyPI
twine upload dist/*
```

**Live at:** `https://pypi.org/project/aircraftworth-mlat/`

**Verify install works:**
```bash
pip install aircraftworth-mlat --break-system-packages
python -c "from mlat_core import MLATCalculator; print('✓ installed')"
```

---

## 3. aircraftworth-neuron (PyPI)

```bash
cd sdk/neuron-client

pip install -e ".[dev]" --break-system-packages
pytest tests/ -v

python -m hatchling build
twine upload dist/*
```

**Live at:** `https://pypi.org/project/aircraftworth-neuron/`

**Verify install works:**
```bash
pip install aircraftworth-neuron --break-system-packages
python -c "from neuron_client import NeuronClient; print('✓ installed')"
```

---

## After Publishing — Update Your README

Add these install badges to your main project README:

```markdown
## SDK Packages

| Package | Install | Description |
|---------|---------|-------------|
| `@aircraftworth/hedera-logger` | `npm install @aircraftworth/hedera-logger` | HCS logging + HTS minting |
| `aircraftworth-mlat` | `pip install aircraftworth-mlat` | TDOA multilateration solver |
| `aircraftworth-neuron` | `pip install aircraftworth-neuron` | Neuron sensor client |
```

And update your SDK Roadmap section from "Phase 2: Planned" to "Phase 2: Complete ✅"

---

## Versioning Strategy

Current: `0.1.0` (alpha — APIs may change)

For hackathon: stay at `0.1.0`. Post-bounty:
- Bug fixes → `0.1.x`
- New features → `0.x.0`
- Breaking changes → `x.0.0`

---

## What This Does to Your Score

Before: README says "SDK-ready architecture" (marketing)
After: `npm install @aircraftworth/hedera-logger` works (proof)

That gap is the difference between claiming reusability and demonstrating it.
Judges who check will find real packages. That is rare.

---

## Quick Test Commands

```bash
# Test all three packages
cd sdk/hedera-logger && npm test
cd sdk/mlat-core && pytest tests/
cd sdk/neuron-client && pytest tests/

# Build all three packages
cd sdk/hedera-logger && npm run build
cd sdk/mlat-core && python -m hatchling build
cd sdk/neuron-client && python -m hatchling build
```

Ready to publish! 🚀
