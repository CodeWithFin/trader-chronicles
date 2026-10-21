"""
Trader Chronicles Sync Agent - Main Application
Connects to MetaTrader 5 and syncs trade history to Trader Chronicles web app.
"""

import sys
import os
import json
import time
import threading
import logging
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QPushButton, QComboBox, QSpinBox,
    QTextEdit, QCheckBox, QGroupBox, QFormLayout, QMessageBox,
    QSystemTrayIcon, QMenu, QProgressBar, QTabWidget
)
from PyQt6.QtCore import Qt, QTimer, pyqtSignal, QObject, QThread
from PyQt6.QtGui import QIcon, QAction

import requests
import MetaTrader5 as mt5
from dotenv import load_dotenv
import keyring

# Load environment variables
load_dotenv(Path(__file__).parent / '.env')

# Configuration
APP_NAME = "Trader Chronicles Sync"
ORG_NAME = "TraderChronicles"
CONFIG_KEY = "sync_config"
TOKEN_KEY = "sync_token"

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(Path(__file__).parent / 'sync_agent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class SyncWorker(QObject):
    """Background worker for syncing trades."""
    log_signal = pyqtSignal(str)
    progress_signal = pyqtSignal(int)
    finished_signal = pyqtSignal(bool, str)
    stats_signal = pyqtSignal(dict)

    def __init__(self, config):
        super().__init__()
        self.config = config
        self.running = False
        self.mt5_connected = False

    def log(self, message):
        self.log_signal.emit(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
        logger.info(message)

    def connect_mt5(self):
        """Initialize MT5 connection."""
        try:
            # Get MT5 path from config or use default
            mt5_path = self.config.get('mt5_path', '')
            login = int(self.config.get('mt5_login', 0))
            password = self.config.get('mt5_password', '')
            server = self.config.get('mt5_server', '')

            if not mt5.initialize(path=mt5_path if mt5_path else None):
                self.log(f"MT5 initialize failed: {mt5.last_error()}")
                return False

            if login and password and server:
                if not mt5.login(login, password=password, server=server):
                    self.log(f"MT5 login failed: {mt5.last_error()}")
                    return False

            self.mt5_connected = True
            account_info = mt5.account_info()
            if account_info:
                self.log(f"Connected to MT5: {account_info.login} ({account_info.server})")
            return True
        except Exception as e:
            self.log(f"MT5 connection error: {e}")
            return False

    def disconnect_mt5(self):
        """Shutdown MT5 connection."""
        if self.mt5_connected:
            mt5.shutdown()
            self.mt5_connected = False
            self.log("Disconnected from MT5")

    def get_trades(self, from_date, to_date):
        """Fetch closed trades from MT5 history."""
        try:
            if not self.mt5_connected:
                if not self.connect_mt5():
                    return []

            # Get history deals
            deals = mt5.history_deals_get(from_date, to_date)
            if deals is None:
                self.log(f"Failed to get deals: {mt5.last_error()}")
                return []

            trades = []
            for deal in deals:
                # Only process entry/exit deals (not balance/credit operations)
                if deal.entry not in (mt5.DEAL_ENTRY_IN, mt5.DEAL_ENTRY_OUT):
                    continue

                # Get position info for this deal
                position_id = deal.position_id
                if position_id == 0:
                    continue

                # We need both entry and exit deals to calculate P&L
                # For simplicity, process DEAL_ENTRY_OUT (closed positions)
                if deal.entry == mt5.DEAL_ENTRY_OUT:
                    # Find corresponding entry deal
                    entry_deals = mt5.history_deals_get(
                        from_date, to_date,
                        position=position_id
                    )
                    entry_price = deal.price
                    entry_time = deal.time
                    if entry_deals:
                        for d in entry_deals:
                            if d.entry == mt5.DEAL_ENTRY_IN:
                                entry_price = d.price
                                entry_time = d.time
                                break

                    # Calculate P&L (profit + commission + swap)
                    pnl = deal.profit + deal.commission + deal.swap

                    trade = {
                        'dateTime': datetime.fromtimestamp(entry_time).isoformat() + 'Z',
                        'endDate': datetime.fromtimestamp(deal.time).isoformat() + 'Z',
                        'assetPair': deal.symbol,
                        'direction': 'Long' if deal.type == mt5.DEAL_TYPE_BUY else 'Short',
                        'entryPrice': round(entry_price, 5),
                        'exitPrice': round(deal.price, 5),
                        'result': 'Win' if pnl >= 0 else 'Loss',
                        'pnlAbsolute': round(pnl, 2),
                        'stopLossPrice': 0,  # Would need order history
                        'riskPerTrade': 0,
                        'rMultiple': 0,
                        'strategyUsed': '',
                        'setupTags': [],
                        'notes': f'MT5 Auto-sync (Position #{position_id})',
                        'screenshotUrl': ''
                    }
                    trades.append(trade)

            self.log(f"Found {len(trades)} closed trades")
            return trades

        except Exception as e:
            self.log(f"Error fetching trades: {e}")
            return []

    def send_trades(self, trades):
        """Send trades to web app API."""
        if not trades:
            return True, "No new trades to sync"

        api_url = self.config.get('api_url', '').rstrip('/')
        account_id = self.config.get('account_id', '')
        token = self.config.get('auth_token', '')

        if not api_url or not account_id:
            return False, "API URL or Account ID not configured"

        url = f"{api_url}/api/trading-accounts/{account_id}/sync"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}' if token else ''
        }

        payload = {'trades': trades}

        try:
            self.log(f"Sending {len(trades)} trades to {url}")
            response = requests.post(url, json=payload, headers=headers, timeout=30)

            if response.status_code == 200:
                data = response.json()
                synced = data.get('synced', 0)
                self.log(f"Successfully synced {synced} trades")
                return True, f"Synced {synced} trades"
            else:
                error_msg = response.json().get('error', response.text)
                self.log(f"Sync failed: {error_msg}")
                return False, f"Sync failed: {error_msg}"

        except requests.exceptions.Timeout:
            self.log("Sync request timed out")
            return False, "Request timed out"
        except requests.exceptions.ConnectionError:
            self.log("Cannot connect to server")
            return False, "Cannot connect to server"
        except Exception as e:
            self.log(f"Sync error: {e}")
            return False, str(e)

    def sync_once(self):
        """Perform a single sync operation."""
        try:
            # Get trades from last 30 days (or from last sync)
            last_sync = self.config.get('last_sync')
            if last_sync:
                from_date = datetime.fromisoformat(last_sync.replace('Z', '+00:00'))
            else:
                from_date = datetime.now() - timedelta(days=30)

            to_date = datetime.now()

            self.log(f"Fetching trades from {from_date} to {to_date}")
            trades = self.get_trades(from_date, to_date)

            if trades:
                success, message = self.send_trades(trades)
                if success:
                    # Update last sync time
                    self.config['last_sync'] = datetime.now().isoformat() + 'Z'
                    self.save_config()
                return success, message
            else:
                self.log("No new trades found")
                return True, "No new trades"

        except Exception as e:
            self.log(f"Sync error: {e}")
            return False, str(e)

    def save_config(self):
        """Save config to keyring."""
        try:
            keyring.set_password(ORG_NAME, CONFIG_KEY, json.dumps(self.config))
        except Exception as e:
            self.log(f"Failed to save config: {e}")

    def run_sync_loop(self):
        """Main sync loop."""
        self.running = True
        interval = self.config.get('sync_interval', 5) * 60  # minutes to seconds

        self.log(f"Starting sync loop (interval: {interval//60} minutes)")

        while self.running:
            self.sync_once()

            # Wait for interval or until stopped
            for _ in range(interval):
                if not self.running:
                    break
                time.sleep(1)

        self.log("Sync loop stopped")
        self.finished_signal.emit(True, "Sync loop stopped")

    def stop(self):
        """Stop the sync loop."""
        self.running = False


class SyncThread(QThread):
    """Thread for running sync worker."""
    def __init__(self, worker):
        super().__init__()
        self.worker = worker

    def run(self):
        self.worker.run_sync_loop()


class MainWindow(QMainWindow):
    """Main application window."""

    def __init__(self):
        super().__init__()
        self.setWindowTitle(APP_NAME)
        self.setMinimumSize(600, 500)

        # Load saved config
        self.config = self.load_config()

        # Setup UI
        self.setup_ui()
        self.setup_tray()
        self.apply_config()

        # Sync worker
        self.worker = None
        self.sync_thread = None

        # Timer for periodic UI updates
        self.update_timer = QTimer()
        self.update_timer.timeout.connect(self.update_status)
        self.update_timer.start(5000)

    def load_config(self):
        """Load config from keyring."""
        try:
            data = keyring.get_password(ORG_NAME, CONFIG_KEY)
            if data:
                return json.loads(data)
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
        return {}

    def save_config(self):
        """Save config to keyring."""
        try:
            keyring.set_password(ORG_NAME, CONFIG_KEY, json.dumps(self.config))
            self.log("Configuration saved")
        except Exception as e:
            self.log(f"Failed to save config: {e}")

    def setup_ui(self):
        """Create the main UI."""
        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)

        # Tabs
        tabs = QTabWidget()
        layout.addWidget(tabs)

        # --- Connection Tab ---
        conn_tab = QWidget()
        conn_layout = QVBoxLayout(conn_tab)
        tabs.addTab(conn_tab, "Connection")

        # Web App Connection
        web_group = QGroupBox("Trader Chronicles Web App")
        web_form = QFormLayout(web_group)

        self.api_url_input = QLineEdit()
        self.api_url_input.setPlaceholderText("https://your-domain.com")
        self.api_url_input.textChanged.connect(self.on_config_change)
        web_form.addRow("API Base URL:", self.api_url_input)

        self.account_id_input = QLineEdit()
        self.account_id_input.setPlaceholderText("UUID from web app")
        self.account_id_input.textChanged.connect(self.on_config_change)
        web_form.addRow("Account ID:", self.account_id_input)

        self.token_input = QLineEdit()
        self.token_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.token_input.setPlaceholderText("Optional: Auth token")
        self.token_input.textChanged.connect(self.on_config_change)
        web_form.addRow("Auth Token:", self.token_input)

        conn_layout.addWidget(web_group)

        # MT5 Connection
        mt5_group = QGroupBox("MetaTrader 5")
        mt5_form = QFormLayout(mt5_group)

        self.mt5_path_input = QLineEdit()
        self.mt5_path_input.setPlaceholderText("Auto-detect or enter path to terminal64.exe")
        self.mt5_path_input.textChanged.connect(self.on_config_change)
        mt5_form.addRow("MT5 Path:", self.mt5_path_input)

        self.mt5_login_input = QLineEdit()
        self.mt5_login_input.setPlaceholderText("Your MT5 login number")
        self.mt5_login_input.textChanged.connect(self.on_config_change)
        mt5_form.addRow("Login:", self.mt5_login_input)

        self.mt5_password_input = QLineEdit()
        self.mt5_password_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.mt5_password_input.setPlaceholderText("MT5 trading password")
        self.mt5_password_input.textChanged.connect(self.on_config_change)
        mt5_form.addRow("Password:", self.mt5_password_input)

        self.mt5_server_input = QLineEdit()
        self.mt5_server_input.setPlaceholderText("Broker server (e.g., JustMarkets-Live2)")
        self.mt5_server_input.textChanged.connect(self.on_config_change)
        mt5_form.addRow("Server:", self.mt5_server_input)

        conn_layout.addWidget(mt5_group)

        # Test Connection Button
        test_layout = QHBoxLayout()
        self.test_mt5_btn = QPushButton("Test MT5 Connection")
        self.test_mt5_btn.clicked.connect(self.test_mt5_connection)
        test_layout.addWidget(self.test_mt5_btn)

        self.test_api_btn = QPushButton("Test API Connection")
        self.test_api_btn.clicked.connect(self.test_api_connection)
        test_layout.addWidget(self.test_api_btn)

        conn_layout.addLayout(test_layout)

        # --- Sync Settings Tab ---
        sync_tab = QWidget()
        sync_layout = QVBoxLayout(sync_tab)
        tabs.addTab(sync_tab, "Sync Settings")

        sync_group = QGroupBox("Sync Configuration")
        sync_form = QFormLayout(sync_group)

        self.sync_interval_input = QSpinBox()
        self.sync_interval_input.setRange(1, 1440)
        self.sync_interval_input.setSuffix(" minutes")
        self.sync_interval_input.setValue(self.config.get('sync_interval', 5))
        self.sync_interval_input.valueChanged.connect(self.on_config_change)
        sync_form.addRow("Sync Interval:", self.sync_interval_input)

        self.auto_start_check = QCheckBox("Start syncing automatically on launch")
        self.auto_start_check.setChecked(self.config.get('auto_start', False))
        self.auto_start_check.toggled.connect(self.on_config_change)
        sync_form.addRow("", self.auto_start_check)

        self.minimize_tray_check = QCheckBox("Minimize to system tray on close")
        self.minimize_tray_check.setChecked(self.config.get('minimize_to_tray', True))
        self.minimize_tray_check.toggled.connect(self.on_config_change)
        sync_form.addRow("", self.minimize_tray_check)

        sync_layout.addWidget(sync_group)

        # Manual Sync
        manual_group = QGroupBox("Manual Sync")
        manual_layout = QVBoxLayout(manual_group)

        self.sync_now_btn = QPushButton("Sync Now")
        self.sync_now_btn.clicked.connect(self.manual_sync)
        self.sync_now_btn.setMinimumHeight(40)
        manual_layout.addWidget(self.sync_now_btn)

        self.progress_bar = QProgressBar()
        self.progress_bar.setRange(0, 0)  # Indeterminate
        self.progress_bar.setVisible(False)
        manual_layout.addWidget(self.progress_bar)

        sync_layout.addWidget(manual_group)

        # --- Logs Tab ---
        logs_tab = QWidget()
        logs_layout = QVBoxLayout(logs_tab)
        tabs.addTab(logs_tab, "Logs")

        self.log_output = QTextEdit()
        self.log_output.setReadOnly(True)
        self.log_output.setFontFamily("Consolas")
        logs_layout.addWidget(self.log_output)

        log_btns = QHBoxLayout()
        clear_btn = QPushButton("Clear Logs")
        clear_btn.clicked.connect(self.log_output.clear)
        log_btns.addWidget(clear_btn)

        save_logs_btn = QPushButton("Save Logs")
        save_logs_btn.clicked.connect(self.save_logs)
        log_btns.addWidget(save_logs_btn)

        logs_layout.addLayout(log_btns)

        # --- Status Bar ---
        self.status_label = QLabel("Ready")
        self.statusBar().addWidget(self.status_label)

        self.sync_status_label = QLabel("● Stopped")
        self.sync_status_label.setStyleSheet("color: red;")
        self.statusBar().addPermanentWidget(self.sync_status_label)

    def setup_tray(self):
        """Setup system tray icon."""
        self.tray_icon = QSystemTrayIcon(self)
        # Use a simple icon - in production, add a proper icon file
        self.tray_icon.setToolTip(APP_NAME)

        tray_menu = QMenu()
        show_action = QAction("Show", self)
        show_action.triggered.connect(self.show_window)
        tray_menu.addAction(show_action)

        sync_action = QAction("Sync Now", self)
        sync_action.triggered.connect(self.manual_sync)
        tray_menu.addAction(sync_action)

        tray_menu.addSeparator()

        quit_action = QAction("Quit", self)
        quit_action.triggered.connect(QApplication.quit)
        tray_menu.addAction(quit_action)

        self.tray_icon.setContextMenu(tray_menu)
        self.tray_icon.activated.connect(self.tray_activated)

        if self.config.get('minimize_to_tray', True):
            self.tray_icon.show()

    def tray_activated(self, reason):
        if reason == QSystemTrayIcon.ActivationReason.DoubleClick:
            self.show_window()

    def show_window(self):
        self.show()
        self.raise_()
        self.activateWindow()

    def apply_config(self):
        """Apply loaded config to UI."""
        self.api_url_input.setText(self.config.get('api_url', ''))
        self.account_id_input.setText(self.config.get('account_id', ''))
        self.token_input.setText(self.config.get('auth_token', ''))
        self.mt5_path_input.setText(self.config.get('mt5_path', ''))
        self.mt5_login_input.setText(str(self.config.get('mt5_login', '')))
        self.mt5_password_input.setText(self.config.get('mt5_password', ''))
        self.mt5_server_input.setText(self.config.get('mt5_server', ''))
        self.sync_interval_input.setValue(self.config.get('sync_interval', 5))
        self.auto_start_check.setChecked(self.config.get('auto_start', False))
        self.minimize_tray_check.setChecked(self.config.get('minimize_to_tray', True))

    def on_config_change(self):
        """Update config from UI."""
        self.config['api_url'] = self.api_url_input.text().strip()
        self.config['account_id'] = self.account_id_input.text().strip()
        self.config['auth_token'] = self.token_input.text().strip()
        self.config['mt5_path'] = self.mt5_path_input.text().strip()
        self.config['mt5_login'] = self.mt5_login_input.text().strip()
        self.config['mt5_password'] = self.mt5_password_input.text().strip()
        self.config['mt5_server'] = self.mt5_server_input.text().strip()
        self.config['sync_interval'] = self.sync_interval_input.value()
        self.config['auto_start'] = self.auto_start_check.isChecked()
        self.config['minimize_to_tray'] = self.minimize_tray_check.isChecked()
        self.save_config()

    def log(self, message):
        """Add message to log output."""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        self.log_output.append(f"[{timestamp}] {message}")
        # Auto-scroll to bottom
        self.log_output.verticalScrollBar().setValue(
            self.log_output.verticalScrollBar().maximum()
        )

    def update_status(self):
        """Update status bar."""
        if self.worker and self.worker.running:
            self.sync_status_label.setText("● Running")
            self.sync_status_label.setStyleSheet("color: green;")
        else:
            self.sync_status_label.setText("● Stopped")
            self.sync_status_label.setStyleSheet("color: red;")

    def test_mt5_connection(self):
        """Test MT5 connection."""
        self.on_config_change()  # Save current config

        def test():
            try:
                mt5_path = self.config.get('mt5_path', '')
                if not mt5.initialize(path=mt5_path if mt5_path else None):
                    self.log(f"MT5 init failed: {mt5.last_error()}")
                    QMessageBox.critical(self, "MT5 Connection Failed", f"Failed to initialize MT5:\n{mt5.last_error()}")
                    return

                login = int(self.config.get('mt5_login', 0))
                password = self.config.get('mt5_password', '')
                server = self.config.get('mt5_server', '')

                if login and password and server:
                    if not mt5.login(login, password=password, server=server):
                        self.log(f"MT5 login failed: {mt5.last_error()}")
                        QMessageBox.critical(self, "MT5 Login Failed", f"Failed to login:\n{mt5.last_error()}")
                        mt5.shutdown()
                        return

                account = mt5.account_info()
                if account:
                    self.log(f"MT5 connected: {account.login} | Balance: {account.balance} | Server: {account.server}")
                    QMessageBox.information(self, "MT5 Connected",
                        f"Connected successfully!\n\n"
                        f"Account: {account.login}\n"
                        f"Name: {account.name}\n"
                        f"Server: {account.server}\n"
                        f"Balance: {account.balance:,.2f} {account.currency}\n"
                        f"Leverage: 1:{account.leverage}")
                else:
                    self.log("MT5 connected but no account info")
                    QMessageBox.information(self, "MT5 Connected", "Connected to MT5 terminal")

                mt5.shutdown()

            except Exception as e:
                self.log(f"MT5 test error: {e}")
                QMessageBox.critical(self, "Error", f"Connection test failed:\n{e}")

        threading.Thread(target=test, daemon=True).start()

    def test_api_connection(self):
        """Test API connection."""
        self.on_config_change()

        api_url = self.config.get('api_url', '').rstrip('/')
        account_id = self.config.get('account_id', '')
        token = self.config.get('auth_token', '')

        if not api_url or not account_id:
            QMessageBox.warning(self, "Missing Config", "Please enter API URL and Account ID")
            return

        def test():
            try:
                url = f"{api_url}/api/trading-accounts/{account_id}/sync"
                headers = {'Authorization': f'Bearer {token}'} if token else {}

                self.log(f"Testing API: {url}")
                response = requests.get(url, headers=headers, timeout=10)

                if response.status_code == 200:
                    data = response.json()
                    self.log(f"API test successful: {data.get('accountId', 'OK')}")
                    QMessageBox.information(self, "API Connected",
                        f"Successfully connected to Trader Chronicles!\n\n"
                        f"Account ID: {data.get('accountId', 'N/A')}\n"
                        f"MT Account: {data.get('mtAccountNumber', 'N/A')}\n"
                        f"Broker: {data.get('mtBrokerServer', 'N/A')}\n"
                        f"Platform: {data.get('mtPlatform', 'N/A')}\n"
                        f"Last Synced: {data.get('lastSyncedAt', 'Never')}")
                elif response.status_code == 401:
                    self.log("API test failed: Unauthorized (check auth token)")
                    QMessageBox.critical(self, "API Error", "Authentication failed. Check your auth token.")
                else:
                    error = response.json().get('error', response.text)
                    self.log(f"API test failed: {error}")
                    QMessageBox.critical(self, "API Error", f"Connection failed:\n{error}")

            except Exception as e:
                self.log(f"API test error: {e}")
                QMessageBox.critical(self, "Error", f"API test failed:\n{e}")

        threading.Thread(target=test, daemon=True).start()

    def manual_sync(self):
        """Trigger manual sync."""
        if self.worker and self.worker.running:
            QMessageBox.information(self, "Sync Running", "Auto-sync is running. Wait for it to complete or stop it first.")
            return

        self.on_config_change()

        if not self.config.get('api_url') or not self.config.get('account_id'):
            QMessageBox.warning(self, "Missing Config", "Please configure API URL and Account ID first")
            return

        self.sync_now_btn.setEnabled(False)
        self.progress_bar.setVisible(True)
        self.status_label.setText("Syncing...")

        def do_sync():
            worker = SyncWorker(self.config.copy())
            worker.log_signal.connect(self.log)
            worker.finished_signal.connect(self.on_sync_finished)

            if worker.connect_mt5():
                success, message = worker.sync_once()
                worker.disconnect_mt5()
                worker.finished_signal.emit(success, message)
            else:
                worker.finished_signal.emit(False, "Failed to connect to MT5")

        threading.Thread(target=do_sync, daemon=True).start()

    def on_sync_finished(self, success, message):
        """Handle sync completion."""
        self.sync_now_btn.setEnabled(True)
        self.progress_bar.setVisible(False)
        self.status_label.setText("Ready")

        if success:
            self.log(f"✓ {message}")
            QMessageBox.information(self, "Sync Complete", message)
        else:
            self.log(f"✗ {message}")
            QMessageBox.critical(self, "Sync Failed", message)

    def start_auto_sync(self):
        """Start automatic sync loop."""
        if self.worker and self.worker.running:
            return

        self.on_config_change()

        if not self.config.get('api_url') or not self.config.get('account_id'):
            self.log("Cannot start auto-sync: Missing API URL or Account ID")
            return

        self.worker = SyncWorker(self.config.copy())
        self.worker.log_signal.connect(self.log)
        self.worker.finished_signal.connect(self.on_auto_sync_finished)

        self.sync_thread = SyncThread(self.worker)
        self.sync_thread.start()

        self.log("Auto-sync started")
        self.status_label.setText("Auto-sync running")

    def on_auto_sync_finished(self, success, message):
        """Handle auto-sync loop finish."""
        self.log(f"Auto-sync stopped: {message}")
        self.status_label.setText("Ready")
        self.worker = None
        self.sync_thread = None

    def stop_auto_sync(self):
        """Stop automatic sync loop."""
        if self.worker:
            self.worker.stop()
            self.log("Stopping auto-sync...")

    def save_logs(self):
        """Save logs to file."""
        from PyQt6.QtWidgets import QFileDialog
        path, _ = QFileDialog.getSaveFileName(self, "Save Logs", "sync_logs.txt", "Text Files (*.txt)")
        if path:
            with open(path, 'w') as f:
                f.write(self.log_output.toPlainText())
            self.log(f"Logs saved to {path}")

    def closeEvent(self, event):
        """Handle window close."""
        if self.config.get('minimize_to_tray', True):
            event.ignore()
            self.hide()
            self.tray_icon.showMessage(
                APP_NAME,
                "Application minimized to tray. Double-click to restore.",
                QSystemTrayIcon.MessageIcon.Information,
                2000
            )
        else:
            self.stop_auto_sync()
            if self.worker:
                self.worker.disconnect_mt5()
            event.accept()


def main():
    app = QApplication(sys.argv)
    app.setApplicationName(APP_NAME)
    app.setOrganizationName(ORG_NAME)
    app.setQuitOnLastWindowClosed(False)

    # Set style
    app.setStyle('Fusion')

    window = MainWindow()

    # Auto-start sync if configured
    if window.config.get('auto_start', False):
        QTimer.singleShot(1000, window.start_auto_sync)

    window.show()
    sys.exit(app.exec())


if __name__ == '__main__':
    main()