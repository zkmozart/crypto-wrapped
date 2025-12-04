import React, { useState } from 'react';
import { 
  ChevronRight, ChevronLeft, Flame, TrendingUp, TrendingDown, 
  Clock, Zap, Diamond, Coins, Activity, Share2, Download, RotateCcw 
} from 'lucide-react';

const createSlides = (data) => [
  {
    id: 'intro',
    bg: 'from-purple-900 via-violet-800 to-indigo-900',
    render: () => (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="text-6xl mb-6 animate-pulse">🔮</div>
        <h1 className="text-4xl font-black mb-4 bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
          Your 2025
        </h1>
        <h2 className="text-5xl font-black mb-6 text-white">Crypto Wrapped</h2>
        <p className="text-purple-200 text-lg opacity-80">{data.timeframe}</p>
        <div className="flex gap-3 mt-8">
          {data.chains.map(chain => (
            <span key={chain} className="px-4 py-2 bg-white/10 rounded-full text-sm font-medium">
              {chain === 'ETH' ? '⟠' : '◎'} {chain}
            </span>
          ))}
        </div>
        {data.wallets.eth && (
          <p className="text-purple-300/60 text-xs mt-4">{data.wallets.eth}</p>
        )}
        {data.wallets.sol && (
          <p className="text-purple-300/60 text-xs mt-1">{data.wallets.sol}</p>
        )}
      </div>
    ),
  },
  {
    id: 'volume',
    bg: 'from-green-900 via-emerald-800 to-teal-900',
    render: () => (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <Coins className="w-16 h-16 text-green-300 mb-6" />
        <p className="text-green-200 text-xl mb-2">You moved</p>
        <h1 className="text-5xl font-black text-white mb-2">
          ${data.totalVolume.toLocaleString()}
        </h1>
        <p className="text-green-200 text-xl mb-8">across the blockchain</p>
        <div className="bg-white/10 rounded-2xl p-6 w-full max-w-xs">
          <p className="text-green-100 text-sm opacity-70">Across</p>
          <p className="text-2xl font-bold text-white">{data.chains.length} chain{data.chains.length > 1 ? 's' : ''}</p>
        </div>
      </div>
    ),
  },
  {
    id: 'transactions',
    bg: 'from-orange-900 via-amber-800 to-yellow-900',
    render: () => (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <Activity className="w-16 h-16 text-orange-300 mb-6" />
        <p className="text-orange-200 text-xl mb-2">You signed</p>
        <h1 className="text-7xl font-black text-white mb-2">{data.totalTransactions}</h1>
        <p className="text-orange-200 text-xl mb-8">transactions</p>
        <p className="text-orange-100 text-lg">
          That's about <span className="font-bold text-white">
            {(data.totalTransactions / 338).toFixed(1)} per day
          </span>
        </p>
      </div>
    ),
  },
  {
    id: 'gas',
    bg: 'from-red-900 via-rose-800 to-pink-900',
    render: () => (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <Flame className="w-16 h-16 text-red-300 mb-6" />
        <p className="text-red-200 text-xl mb-2">You burned</p>
        <h1 className="text-5xl font-black text-white mb-2">
          ${data.gasSpent.toLocaleString()}
        </h1>
        <p className="text-red-200 text-xl mb-8">on gas fees</p>
        <div className="bg-white/10 rounded-2xl p-4 w-full max-w-xs">
          <p className="text-red-100 text-sm">That could have been</p>
          <p className="text-xl font-bold text-white">
            {Math.round(data.gasSpent / 12)} Chipotle burritos 🌯
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'favorite',
    bg: 'from-blue-900 via-indigo-800 to-violet-900',
    render: () => (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="text-7xl mb-6">{data.mostTradedToken.logo}</div>
        <p className="text-blue-200 text-xl mb-2">Your comfort coin was</p>
        <h1 className="text-6xl font-black text-white mb-4">{data.mostTradedToken.symbol}</h1>
        <p className="text-blue-200 text-lg">
          You interacted with it <span className="font-bold text-white">{data.mostTradedToken.count} times</span>
        </p>
      </div>
    ),
  },
  {
    id: 'best',
    bg: 'from-emerald-900 via-green-800 to-lime-900',
    render: () => (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <TrendingUp className="w-16 h-16 text-green-300 mb-6" />
        <p className="text-green-200 text-xl mb-2">Your best trade</p>
        <h1 className="text-5xl font-black text-white mb-4">{data.bestTrade.token}</h1>
        <div className="text-6xl font-black text-green-400 mb-4">+{data.bestTrade.gain}%</div>
        <p className="text-green-200 text-sm opacity-70">
          In: ${data.bestTrade.buyPrice} → Out: ${data.bestTrade.sellPrice}
        </p>
      </div>
    ),
  },
  {
    id: 'worst',
    bg: 'from-slate-900 via-gray-800 to-zinc-900',
    render: () => (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <TrendingDown className="w-16 h-16 text-gray-400 mb-6" />
        <p className="text-gray-400 text-xl mb-2">We don't talk about</p>
        <h1 className="text-5xl font-black text-white mb-4">{data.worstTrade.token}</h1>
        <div className="text-5xl font-black text-red-500 mb-4">{data.worstTrade.loss}%</div>
        <p className="text-gray-500 text-sm">It happens to the best of us</p>
      </div>
    ),
  },
  {
    id: 'timing',
    bg: 'from-indigo-900 via-purple-800 to-fuchsia-900',
    render: () => (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <Clock className="w-16 h-16 text-purple-300 mb-6" />
        <p className="text-purple-200 text-xl mb-2">You're a</p>
        <h1 className="text-5xl font-black text-white mb-2">{data.peakHour}</h1>
        <p className="text-purple-200 text-xl mb-6">trader</p>
        <div className="bg-white/10 rounded-2xl p-4 w-full max-w-xs">
          <p className="text-purple-100 text-sm">Peak day:</p>
          <p className="text-2xl font-bold text-white">{data.peakDay}s</p>
        </div>
      </div>
    ),
  },
  {
    id: 'holds',
    bg: 'from-cyan-900 via-teal-800 to-emerald-900',
    render: () => (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <Zap className="w-16 h-16 text-cyan-300 mb-6" />
        <div className="space-y-6 w-full max-w-xs">
          <div className="bg-white/10 rounded-2xl p-6">
            <p className="text-cyan-200 text-sm mb-1">Longest hold</p>
            <p className="text-3xl font-black text-white">{data.longestHold.token}</p>
            <p className="text-cyan-300">{data.longestHold.days} days 💎</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-6">
            <p className="text-cyan-200 text-sm mb-1">Shortest hold</p>
            <p className="text-3xl font-black text-white">{data.shortestHold.token}</p>
            <p className="text-cyan-300">{data.shortestHold.minutes} minutes 📄</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'personality',
    bg: 'from-violet-900 via-purple-800 to-pink-900',
    render: () => (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <Diamond className="w-20 h-20 text-purple-300 mb-6" />
        <p className="text-purple-200 text-xl mb-2">Your trading personality</p>
        <h1 className="text-4xl font-black bg-gradient-to-r from-purple-300 via-pink-300 to-yellow-300 bg-clip-text text-transparent mb-4">
          {data.tradingPersonality}
        </h1>
        <p className="text-purple-200 text-lg max-w-xs">{data.personalityDescription}</p>
      </div>
    ),
  },
  {
    id: 'topTokens',
    bg: 'from-amber-900 via-orange-800 to-red-900',
    render: () => (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <p className="text-orange-200 text-xl mb-6">Your Top {Math.min(5, data.topTokens.length)} Tokens</p>
        <div className="space-y-3 w-full max-w-xs">
          {data.topTokens.slice(0, 5).map((token, i) => (
            <div
              key={token.symbol}
              className="flex items-center bg-white/10 rounded-xl p-3"
              style={{ opacity: 1 - i * 0.12 }}
            >
              <span className="text-2xl w-10">{token.logo}</span>
              <span className="text-xl font-bold text-white flex-1 text-left">{token.symbol}</span>
              <span className="text-orange-200">${(token.volume / 1000).toFixed(0)}k</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'activity',
    bg: 'from-sky-900 via-blue-800 to-indigo-900',
    render: () => {
      const maxTxs = Math.max(...data.monthlyActivity.map(m => m.txs), 1);
      const peakMonth = data.monthlyActivity.reduce((a, b) => a.txs > b.txs ? a : b);
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <p className="text-blue-200 text-xl mb-6">Your Year in Transactions</p>
          <div className="flex items-end gap-1 h-40 w-full max-w-xs">
            {data.monthlyActivity.map((month) => (
              <div key={month.month} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-sm min-h-[4px]"
                  style={{ height: `${(month.txs / maxTxs) * 100}%` }}
                />
                <span className="text-xs text-blue-300 mt-2">{month.month.slice(0, 1)}</span>
              </div>
            ))}
          </div>
          <p className="text-blue-200 text-sm mt-6">
            Peak month: <span className="font-bold text-white">{peakMonth.month}</span> with {peakMonth.txs} txs
          </p>
        </div>
      );
    },
  },
  {
    id: 'score',
    bg: 'from-fuchsia-900 via-pink-800 to-rose-900',
    render: () => (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <p className="text-pink-200 text-xl mb-4">Your Degen Score</p>
        <div className="relative w-48 h-48 mb-6">
          <svg className="w-full h-full -rotate-90">
            <circle cx="96" cy="96" r="88" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${data.degenScore * 5.53} 553`}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl font-black text-white">{data.degenScore}</span>
          </div>
        </div>
        <p className="text-pink-100 text-lg">
          {data.degenScore >= 80 ? 'Certified Degen 🎰' : 
           data.degenScore >= 50 ? 'Respectable Player 🎯' : 
           'Casual Vibes 😎'}
        </p>
      </div>
    ),
  },
  {
    id: 'outro',
    bg: 'from-violet-900 via-purple-900 to-indigo-900',
    render: (onReset) => (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <h1 className="text-4xl font-black text-white mb-4">That's a wrap!</h1>
        <p className="text-purple-200 text-lg mb-8">2025 was wild. Here's to 2026 🚀</p>
        <div className="space-y-3 w-full max-w-xs">
          <button 
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'My Crypto Wrapped 2025',
                  text: `I made ${data.totalTransactions} transactions and scored ${data.degenScore}/100 on my degen score!`,
                  url: window.location.href,
                });
              } else {
                navigator.clipboard.writeText(
                  `My Crypto Wrapped 2025: ${data.totalTransactions} txs, ${data.degenScore} degen score! 🔮`
                );
                alert('Copied to clipboard!');
              }
            }}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl font-bold text-white text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Share2 className="w-5 h-5" />
            Share Your Wrapped
          </button>
          <button 
            onClick={onReset}
            className="w-full py-4 bg-white/10 rounded-2xl font-bold text-white text-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Try Another Wallet
          </button>
        </div>
        <p className="text-purple-300 text-xs mt-8 opacity-50">Built with 💜</p>
      </div>
    ),
  },
];

export default function WrappedSlides({ data, onReset }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  
  const slides = createSlides(data);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const slide = slides[currentSlide];

  return (
    <div className="w-full max-w-md mx-auto h-[90vh] max-h-[800px] relative overflow-hidden rounded-3xl shadow-2xl">
      {/* Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${slide.bg} transition-all duration-500`} />

      {/* Progress dots */}
      <div className="absolute top-6 left-0 right-0 flex justify-center gap-1 z-10 px-8">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i === currentSlide ? 'bg-white' : i < currentSlide ? 'bg-white/50' : 'bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div
        className="relative h-full z-10 pt-12 animate-fade-slide"
        key={currentSlide}
      >
        {slide.id === 'outro' ? slide.render(onReset) : slide.render()}
      </div>

      {/* Navigation areas */}
      <div className="absolute left-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer" onClick={prevSlide} />
      <div className="absolute right-0 top-0 bottom-0 w-2/3 z-20 cursor-pointer" onClick={nextSlide} />

      {/* Navigation arrows (visible on hover) */}
      {currentSlide > 0 && (
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-white/10 rounded-full opacity-0 hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}
      {currentSlide < slides.length - 1 && (
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-white/10 rounded-full opacity-0 hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Slide counter */}
      <div className="absolute bottom-6 left-0 right-0 text-center z-10">
        <span className="text-white/40 text-sm">
          {currentSlide + 1} / {slides.length}
        </span>
      </div>
    </div>
  );
}
