import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const TradeForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    dateTime: new Date(),
    assetPair: '',
    direction: 'Long',
    entryPrice: '',
    exitPrice: '',
    stopLossPrice: '',
    riskPerTrade: '',
    result: 'Win',
    pnlAbsolute: '',
    rMultiple: '',
    strategyUsed: '',
    setupTags: [],
    notes: '',
    screenshotUrl: ''
  });
  const [tagInput, setTagInput] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      dateTime: date
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.setupTags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        setupTags: [...prev.setupTags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      setupTags: prev.setupTags.filter(tag => tag !== tagToRemove)
    }));
  };

  const calculateRMultiple = () => {
    const entry = parseFloat(formData.entryPrice);
    const exit = parseFloat(formData.exitPrice);
    const stopLoss = parseFloat(formData.stopLossPrice);
    const direction = formData.direction;

    if (entry && exit && stopLoss) {
      let risk;
      let reward;

      if (direction === 'Long') {
        risk = entry - stopLoss;
        reward = exit - entry;
      } else {
        risk = stopLoss - entry;
        reward = entry - exit;
      }

      if (risk > 0) {
        const rMultiple = reward / risk;
        setFormData(prev => ({
          ...prev,
          rMultiple: rMultiple.toFixed(2)
        }));

        // Calculate P&L if not set
        if (!formData.pnlAbsolute) {
          const pnl = reward;
          setFormData(prev => ({
            ...prev,
            pnlAbsolute: pnl.toFixed(2)
          }));
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        ...formData,
        dateTime: formData.dateTime.toISOString(),
        entryPrice: parseFloat(formData.entryPrice),
        exitPrice: parseFloat(formData.exitPrice),
        stopLossPrice: parseFloat(formData.stopLossPrice),
        riskPerTrade: parseFloat(formData.riskPerTrade),
        pnlAbsolute: parseFloat(formData.pnlAbsolute),
        rMultiple: parseFloat(formData.rMultiple)
      };

      await axios.post(`${API_URL}/trades`, payload);
      navigate('/trades');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create trade entry');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-16">
      <div className="border-4 border-black bg-white p-6 md:p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight uppercase mb-2">New Backtest Entry</h1>
        <div className="w-full h-1 bg-black mb-8"></div>

        {error && (
          <div className="mb-6 p-4 border-2 border-black bg-red-50 text-red-900">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Trade Details Section */}
          <div>
            <h2 className="text-2xl font-bold mb-4 uppercase">Trade Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2 uppercase">Date/Time</label>
                <DatePicker
                  selected={formData.dateTime}
                  onChange={handleDateChange}
                  showTimeSelect
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2 uppercase">Asset/Pair</label>
                  <input
                    type="text"
                    name="assetPair"
                    value={formData.assetPair}
                    onChange={handleChange}
                    required
                    placeholder="e.g., BTC/USD, AAPL"
                    className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase">Direction</label>
                  <select
                    name="direction"
                    value={formData.direction}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                  >
                    <option value="Long">Long</option>
                    <option value="Short">Short</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2 uppercase">Entry Price</label>
                  <input
                    type="number"
                    name="entryPrice"
                    value={formData.entryPrice}
                    onChange={handleChange}
                    onBlur={calculateRMultiple}
                    step="0.0001"
                    required
                    className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase">Exit Price</label>
                  <input
                    type="number"
                    name="exitPrice"
                    value={formData.exitPrice}
                    onChange={handleChange}
                    onBlur={calculateRMultiple}
                    step="0.0001"
                    required
                    className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase">Stop Loss Price</label>
                  <input
                    type="number"
                    name="stopLossPrice"
                    value={formData.stopLossPrice}
                    onChange={handleChange}
                    onBlur={calculateRMultiple}
                    step="0.0001"
                    required
                    className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 uppercase">Risk Per Trade (%)</label>
                <input
                  type="number"
                  name="riskPerTrade"
                  value={formData.riskPerTrade}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>
            </div>
          </div>

          {/* Outcomes Section */}
          <div>
            <h2 className="text-2xl font-bold mb-4 uppercase">Outcomes</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2 uppercase">Result</label>
                  <select
                    name="result"
                    value={formData.result}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                  >
                    <option value="Win">Win</option>
                    <option value="Loss">Loss</option>
                    <option value="Break Even">Break Even</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase">P&L (Absolute)</label>
                  <input
                    type="number"
                    name="pnlAbsolute"
                    value={formData.pnlAbsolute}
                    onChange={handleChange}
                    step="0.01"
                    required
                    className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase">R-Multiple</label>
                  <input
                    type="number"
                    name="rMultiple"
                    value={formData.rMultiple}
                    onChange={handleChange}
                    step="0.01"
                    required
                    className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Strategy & Context Section */}
          <div>
            <h2 className="text-2xl font-bold mb-4 uppercase">Strategy & Context</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2 uppercase">Strategy Used</label>
                <input
                  type="text"
                  name="strategyUsed"
                  value={formData.strategyUsed}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Moving Average Cross, Support Breakout"
                  className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 uppercase">Setup Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="e.g., Asian Session, High Volatility"
                    className="flex-1 px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-6 py-3 border-2 border-black bg-orange-600 text-white font-bold hover:bg-orange-500 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.setupTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-2 px-3 py-1 border-2 border-black bg-zinc-100 text-sm font-semibold"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 uppercase">Notes/Lessons</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="6"
                  placeholder="Detailed journal entry about the trade..."
                  className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 uppercase">Screenshot URL</label>
                <input
                  type="url"
                  name="screenshotUrl"
                  value={formData.screenshotUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/chart-screenshot.png"
                  className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-4 border-4 border-black bg-orange-600 text-white text-lg font-bold hover:bg-orange-500 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Trade Entry'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/trades')}
              className="px-6 py-4 border-4 border-black bg-white text-lg font-bold hover:bg-zinc-100 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TradeForm;

