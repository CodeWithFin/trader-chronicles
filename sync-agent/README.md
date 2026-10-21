# Trader Chronicles Sync Agent
# Python-based desktop app that connects to MT5 and syncs trades to web app

## Requirements
- Python 3.9+
- MetaTrader 5 terminal installed
- MetaTrader5 Python package: `pip install MetaTrader5`

## Installation
```bash
cd sync-agent
pip install -r requirements.txt
```

## Development Run
```bash
python main.py
```

## Build Executable
```bash
pip install pyinstaller
pyinstaller --onefile --windowed --name "TraderChroniclesSync" main.py
# Output: dist/TraderChroniclesSync.exe (Windows) or dist/TraderChroniclesSync (Linux/Mac)
```