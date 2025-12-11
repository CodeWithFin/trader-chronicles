import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const TradeLog = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [filters, setFilters] = useState({
    assetPair: '',
    strategyUsed: '',
    result: '',
    setupTag: '',
    sortBy: 'dateTime',
    sortOrder: 'desc'
  });

  useEffect(() => {
    fetchTrades();
  }, [filters]);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await axios.get(`${API_URL}/trades?${params.toString()}`);
      setTrades(response.data.trades || response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch trades');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSort = (field) => {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getResultColor = (result) => {
    switch (result) {
      case 'Win': return 'bg-green-100 text-green-900 border-green-600';
      case 'Loss': return 'bg-red-100 text-red-900 border-red-600';
      case 'Break Even': return 'bg-yellow-100 text-yellow-900 border-yellow-600';
      default: return 'bg-zinc-100 text-zinc-900 border-zinc-600';
    }
  };

  const getRMultipleColor = (rMultiple) => {
    if (rMultiple > 0) return 'text-green-600 font-bold';
    if (rMultiple < 0) return 'text-red-600 font-bold';
    return 'text-yellow-600 font-bold';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center text-xl font-bold">Loading trades...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-16">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight uppercase mb-2">Trade Log</h1>
          <div className="w-full h-1 bg-black"></div>
        </div>
        <Link
          to="/trades/new"
          className="px-6 py-3 border-4 border-black bg-orange-600 text-white font-bold hover:bg-orange-500 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
        >
          + New Trade
        </Link>
      </div>

      {/* Filters */}
      <div className="border-4 border-black bg-white p-6 mb-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-xl font-bold mb-4 uppercase">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-bold mb-2 uppercase">Asset/Pair</label>
            <input
              type="text"
              name="assetPair"
              value={filters.assetPair}
              onChange={handleFilterChange}
              placeholder="Filter by asset..."
              className="w-full px-4 py-2 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 uppercase">Strategy</label>
            <input
              type="text"
              name="strategyUsed"
              value={filters.strategyUsed}
              onChange={handleFilterChange}
              placeholder="Filter by strategy..."
              className="w-full px-4 py-2 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 uppercase">Result</label>
            <select
              name="result"
              value={filters.result}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
            >
              <option value="">All</option>
              <option value="Win">Win</option>
              <option value="Loss">Loss</option>
              <option value="Break Even">Break Even</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 uppercase">Setup Tag</label>
            <input
              type="text"
              name="setupTag"
              value={filters.setupTag}
              onChange={handleFilterChange}
              placeholder="Filter by tag..."
              className="w-full px-4 py-2 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 border-2 border-black bg-red-50 text-red-900">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-100 border-b-2 border-black">
            <tr>
              <th className="px-4 py-3 text-left font-bold uppercase cursor-pointer hover:bg-zinc-200" onClick={() => handleSort('dateTime')}>
                Date {filters.sortBy === 'dateTime' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left font-bold uppercase cursor-pointer hover:bg-zinc-200" onClick={() => handleSort('assetPair')}>
                Asset {filters.sortBy === 'assetPair' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left font-bold uppercase">Direction</th>
              <th className="px-4 py-3 text-left font-bold uppercase">Entry</th>
              <th className="px-4 py-3 text-left font-bold uppercase">Exit</th>
              <th className="px-4 py-3 text-left font-bold uppercase cursor-pointer hover:bg-zinc-200" onClick={() => handleSort('pnlAbsolute')}>
                P&L {filters.sortBy === 'pnlAbsolute' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left font-bold uppercase cursor-pointer hover:bg-zinc-200" onClick={() => handleSort('rMultiple')}>
                R-Multiple {filters.sortBy === 'rMultiple' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left font-bold uppercase">Result</th>
              <th className="px-4 py-3 text-left font-bold uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-4 py-8 text-center text-zinc-600">
                  No trades found. <Link to="/trades/new" className="text-orange-600 font-bold hover:underline">Create your first trade entry</Link>
                </td>
              </tr>
            ) : (
              trades.map((trade) => (
                <tr key={trade.id} className="border-b border-zinc-200 hover:bg-zinc-50">
                  <td className="px-4 py-3">{format(new Date(trade.dateTime), 'MMM d, yyyy HH:mm')}</td>
                  <td className="px-4 py-3 font-semibold">{trade.assetPair}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 border-2 ${trade.direction === 'Long' ? 'border-green-600 bg-green-100 text-green-900' : 'border-red-600 bg-red-100 text-red-900'} font-bold text-xs`}>
                      {trade.direction}
                    </span>
                  </td>
                  <td className="px-4 py-3">{trade.entryPrice}</td>
                  <td className="px-4 py-3">{trade.exitPrice}</td>
                  <td className={`px-4 py-3 font-semibold ${trade.pnlAbsolute >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trade.pnlAbsolute >= 0 ? '+' : ''}{trade.pnlAbsolute}
                  </td>
                  <td className={`px-4 py-3 ${getRMultipleColor(trade.rMultiple)}`}>
                    {trade.rMultiple >= 0 ? '+' : ''}{trade.rMultiple}R
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 border-2 ${getResultColor(trade.result)} font-bold text-xs`}>
                      {trade.result}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedTrade(trade)}
                      className="px-3 py-1 border-2 border-black bg-white text-sm font-bold hover:bg-zinc-100 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Trade Detail Modal */}
      {selectedTrade && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedTrade(null)}>
          <div className="border-4 border-black bg-white p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-3xl font-bold uppercase">Trade Details</h2>
              <button
                onClick={() => setSelectedTrade(null)}
                className="px-4 py-2 border-2 border-black bg-red-600 text-white font-bold hover:bg-red-500 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-bold text-zinc-600 uppercase">Date/Time</p>
                  <p className="text-lg font-semibold">{format(new Date(selectedTrade.dateTime), 'MMMM d, yyyy HH:mm')}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-600 uppercase">Asset/Pair</p>
                  <p className="text-lg font-semibold">{selectedTrade.assetPair}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-600 uppercase">Direction</p>
                  <p className="text-lg font-semibold">{selectedTrade.direction}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-600 uppercase">Strategy</p>
                  <p className="text-lg font-semibold">{selectedTrade.strategyUsed}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-600 uppercase">Entry Price</p>
                  <p className="text-lg font-semibold">{selectedTrade.entryPrice}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-600 uppercase">Exit Price</p>
                  <p className="text-lg font-semibold">{selectedTrade.exitPrice}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-600 uppercase">Stop Loss</p>
                  <p className="text-lg font-semibold">{selectedTrade.stopLossPrice}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-600 uppercase">Risk Per Trade</p>
                  <p className="text-lg font-semibold">{selectedTrade.riskPerTrade}%</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-600 uppercase">P&L</p>
                  <p className={`text-lg font-semibold ${selectedTrade.pnlAbsolute >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedTrade.pnlAbsolute >= 0 ? '+' : ''}{selectedTrade.pnlAbsolute}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-600 uppercase">R-Multiple</p>
                  <p className={`text-lg font-semibold ${getRMultipleColor(selectedTrade.rMultiple)}`}>
                    {selectedTrade.rMultiple >= 0 ? '+' : ''}{selectedTrade.rMultiple}R
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-600 uppercase">Result</p>
                  <p className="text-lg font-semibold">{selectedTrade.result}</p>
                </div>
              </div>

              {selectedTrade.setupTags && selectedTrade.setupTags.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-zinc-600 uppercase mb-2">Setup Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTrade.setupTags.map((tag, index) => (
                      <span key={index} className="px-3 py-1 border-2 border-black bg-zinc-100 text-sm font-semibold">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedTrade.notes && (
                <div>
                  <p className="text-sm font-bold text-zinc-600 uppercase mb-2">Notes/Lessons</p>
                  <p className="text-base leading-relaxed whitespace-pre-wrap">{selectedTrade.notes}</p>
                </div>
              )}

              {selectedTrade.screenshotUrl && (
                <div>
                  <p className="text-sm font-bold text-zinc-600 uppercase mb-2">Chart Screenshot</p>
                  <img src={selectedTrade.screenshotUrl} alt="Trade chart" className="w-full border-2 border-black" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeLog;

