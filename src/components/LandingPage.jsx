import React, { useState } from 'react';
import { Wallet, Sparkles, AlertCircle } from 'lucide-react';

export default function LandingPage({ onSubmit, error }) {
  const [ethAddress, setEthAddress] = useState('');
  const [solAddress, setSolAddress] = useState('');
  const [validationError, setValidationError] = useState('');

  const validateEthAddress = (address) => {
    if (!address) return true;
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const validateSolAddress = (address) => {
    if (!address) return true;
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!ethAddress && !solAddress) {
      setValidationError('Please enter at least one wallet address');
      return;
    }

    if (ethAddress && !validateEthAddress(ethAddress)) {
      setValidationError('Invalid Ethereum address format');
      return;
    }

    if (solAddress && !validateSolAddress(solAddress)) {
      setValidationError('Invalid Solana address format');
      return;
    }

    onSubmit(ethAddress || null, solAddress || null);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-6 animate-float">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-black text-white mb-3">
          Crypto Wrapped
        </h1>
        <p className="text-gray-400 text-lg">
          Your 2025 on-chain journey, visualized
        </p>
        <div className="flex justify-center gap-3 mt-4">
          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">
            ⟠ Ethereum
          </span>
          <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm font-medium">
            ◎ Solana
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Ethereum Input */}
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Ethereum Wallet
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-gray-500 text-lg">⟠</span>
            </div>
            <input
              type="text"
              value={ethAddress}
              onChange={(e) => setEthAddress(e.target.value.trim())}
              placeholder="0x..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Solana Input */}
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Solana Wallet
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-gray-500 text-lg">◎</span>
            </div>
            <input
              type="text"
              value={solAddress}
              onChange={(e) => setSolAddress(e.target.value.trim())}
              placeholder="Your Solana address..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Error Messages */}
        {(validationError || error) && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{validationError || error}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold text-white text-lg hover:opacity-90 transition-all animate-pulse-glow mt-6 flex items-center justify-center gap-2"
        >
          <Wallet className="w-5 h-5" />
          Generate My Wrapped
        </button>

        <p className="text-center text-gray-500 text-xs mt-4">
          We only read public blockchain data. Your keys stay with you.
        </p>
      </form>

      {/* Features */}
      <div className="mt-12 grid grid-cols-3 gap-4 text-center">
        <div className="p-4">
          <div className="text-2xl mb-2">📊</div>
          <p className="text-gray-400 text-xs">Trading Stats</p>
        </div>
        <div className="p-4">
          <div className="text-2xl mb-2">🏆</div>
          <p className="text-gray-400 text-xs">Top Tokens</p>
        </div>
        <div className="p-4">
          <div className="text-2xl mb-2">🎯</div>
          <p className="text-gray-400 text-xs">Degen Score</p>
        </div>
      </div>
    </div>
  );
}
