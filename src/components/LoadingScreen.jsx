import React, { useState, useEffect } from 'react';

const loadingMessages = [
  'Connecting to the blockchain...',
  'Scanning your transactions...',
  'Counting your gas fees (sorry)...',
  'Analyzing your trading patterns...',
  'Calculating your degen score...',
  'Finding your best trades...',
  'Preparing your wrapped...',
];

export default function LoadingScreen() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + Math.random() * 15, 95));
    }, 500);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="w-full max-w-md mx-auto text-center">
      {/* Animated Logo */}
      <div className="relative w-32 h-32 mx-auto mb-8">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-spin opacity-20" 
             style={{ animationDuration: '3s' }} />
        <div className="absolute inset-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 animate-spin opacity-40"
             style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
        <div className="absolute inset-4 rounded-full bg-[#0f0f1a] flex items-center justify-center">
          <span className="text-4xl animate-pulse">🔮</span>
        </div>
      </div>

      {/* Loading Message */}
      <p className="text-gray-300 text-lg mb-6 h-6 transition-opacity duration-300">
        {loadingMessages[messageIndex]}
      </p>

      {/* Progress Bar */}
      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Chain indicators */}
      <div className="flex justify-center gap-4 mt-8">
        <div className="flex items-center gap-2 text-gray-400">
          <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          <span className="text-sm">ETH</span>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
          <span className="text-sm">SOL</span>
        </div>
      </div>
    </div>
  );
}
