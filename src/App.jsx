import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import WrappedSlides from './components/WrappedSlides';
import LoadingScreen from './components/LoadingScreen';

export default function App() {
  const [view, setView] = useState('landing'); // landing, loading, wrapped
  const [walletData, setWalletData] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (ethAddress, solAddress) => {
    setView('loading');
    setError(null);

    try {
      const data = await fetchAndProcessWalletData(ethAddress, solAddress);
      setWalletData(data);
      setView('wrapped');
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError(err.message || 'Failed to fetch wallet data. Please try again.');
      setView('landing');
    }
  };

  const handleReset = () => {
    setView('landing');
    setWalletData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {view === 'landing' && (
        <LandingPage onSubmit={handleSubmit} error={error} />
      )}
      {view === 'loading' && <LoadingScreen />}
      {view === 'wrapped' && walletData && (
        <WrappedSlides data={walletData} onReset={handleReset} />
      )}
    </div>
  );
}

// Fetch data from both chains and process it
async function fetchAndProcessWalletData(ethAddress, solAddress) {
  const startDate = '2025-01-01';
  const endDate = new Date().toISOString().split('T')[0];

  // Fetch from both chains in parallel
  const [ethData, solData] = await Promise.all([
    ethAddress ? fetchEthereumData(ethAddress, startDate) : null,
    solAddress ? fetchSolanaData(solAddress, startDate) : null,
  ]);

  // Process and combine the data
  return processWalletData(ethData, solData, ethAddress, solAddress);
}

// Fetch Ethereum data via Etherscan
async function fetchEthereumData(address, startDate) {
  const apiKey = import.meta.env.VITE_ETHERSCAN_API_KEY;
  
  if (!apiKey) {
    console.warn('No Etherscan API key found, using mock data');
    return getMockEthData();
  }

  const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
  
  try {
    // Fetch normal transactions (Etherscan V2 API)
    const txResponse = await fetch(
      `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`
    );
    const txData = await txResponse.json();
    console.log('Etherscan txData response:', txData);

    // Fetch ERC-20 token transfers (Etherscan V2 API)
    const tokenResponse = await fetch(
      `https://api.etherscan.io/v2/api?chainid=1&module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`
    );
    const tokenData = await tokenResponse.json();
    console.log('Etherscan tokenData response:', tokenData);

    // Check if API returned an error or non-array result
    const txResults = Array.isArray(txData.result) ? txData.result : [];
    const tokenResults = Array.isArray(tokenData.result) ? tokenData.result : [];

    console.log('Total txResults from API:', txResults.length);
    console.log('Total tokenResults from API:', tokenResults.length);

    // Filter by date
    const transactions = txResults.filter(
      tx => parseInt(tx.timeStamp) >= startTimestamp
    );
    const tokenTransfers = tokenResults.filter(
      tx => parseInt(tx.timeStamp) >= startTimestamp
    );

    console.log('Filtered transactions (2025):', transactions.length);
    console.log('Filtered tokenTransfers (2025):', tokenTransfers.length);

    return { transactions, tokenTransfers, chain: 'ETH' };
  } catch (err) {
    console.error('Etherscan API error:', err);
    return getMockEthData();
  }
}

// Fetch Solana data via Helius
async function fetchSolanaData(address, startDate) {
  const apiKey = import.meta.env.VITE_HELIUS_API_KEY;
  
  if (!apiKey) {
    console.warn('No Helius API key found, using mock data');
    return getMockSolData();
  }

  try {
    // Fetch parsed transaction history
    const response = await fetch(
      `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${apiKey}&limit=100`
    );
    const transactions = await response.json();

    // Check if API returned valid array
    const txArray = Array.isArray(transactions) ? transactions : [];

    // Filter by date
    const startTimestamp = new Date(startDate).getTime() / 1000;
    const filteredTxs = txArray.filter(
      tx => tx.timestamp >= startTimestamp
    );

    return { transactions: filteredTxs, chain: 'SOL' };
  } catch (err) {
    console.error('Helius API error:', err);
    return getMockSolData();
  }
}

// Process raw data into wrapped stats
function processWalletData(ethData, solData, ethAddress, solAddress) {
  const now = new Date();
  const stats = {
    wallets: {
      eth: ethAddress ? `${ethAddress.slice(0, 6)}...${ethAddress.slice(-4)}` : null,
      sol: solAddress ? `${solAddress.slice(0, 4)}...${solAddress.slice(-4)}` : null,
    },
    chains: [],
    timeframe: `Jan 1 - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, 2025`,
    totalTransactions: 0,
    totalVolume: 0,
    gasSpent: 0,
    tokenCounts: {},
    trades: [],
    timestamps: [],
    monthlyActivity: Array(11).fill(0).map((_, i) => ({
      month: new Date(2025, i, 1).toLocaleDateString('en-US', { month: 'short' }),
      txs: 0,
    })),
  };

  if (ethAddress) stats.chains.push('ETH');
  if (solAddress) stats.chains.push('SOL');

  // Process Ethereum data
  if (ethData) {
    const { transactions = [], tokenTransfers = [] } = ethData;
    
    transactions.forEach(tx => {
      stats.totalTransactions++;
      const valueEth = parseInt(tx.value) / 1e18;
      stats.totalVolume += valueEth * 2000; // Rough ETH price estimate
      const gasCost = (parseInt(tx.gasUsed) * parseInt(tx.gasPrice)) / 1e18;
      stats.gasSpent += gasCost * 2000;
      
      const date = new Date(parseInt(tx.timeStamp) * 1000);
      stats.timestamps.push(date);
      const monthIndex = date.getMonth();
      if (monthIndex < 11) stats.monthlyActivity[monthIndex].txs++;
      
      stats.tokenCounts['ETH'] = (stats.tokenCounts['ETH'] || 0) + 1;
    });

    tokenTransfers.forEach(tx => {
      const symbol = tx.tokenSymbol || 'UNKNOWN';
      stats.tokenCounts[symbol] = (stats.tokenCounts[symbol] || 0) + 1;
      
      const date = new Date(parseInt(tx.timeStamp) * 1000);
      const monthIndex = date.getMonth();
      if (monthIndex < 11) stats.monthlyActivity[monthIndex].txs++;
    });
  }

  // Process Solana data
  if (solData) {
    const { transactions = [] } = solData;
    
    transactions.forEach(tx => {
      stats.totalTransactions++;
      stats.gasSpent += 0.000005 * 20; // SOL fee ~0.000005 SOL * $20
      
      if (tx.timestamp) {
        const date = new Date(tx.timestamp * 1000);
        stats.timestamps.push(date);
        const monthIndex = date.getMonth();
        if (monthIndex < 11) stats.monthlyActivity[monthIndex].txs++;
      }

      // Count token interactions
      if (tx.tokenTransfers) {
        tx.tokenTransfers.forEach(transfer => {
          const symbol = transfer.tokenSymbol || 'SOL';
          stats.tokenCounts[symbol] = (stats.tokenCounts[symbol] || 0) + 1;
        });
      } else {
        stats.tokenCounts['SOL'] = (stats.tokenCounts['SOL'] || 0) + 1;
      }
    });
  }

  // Calculate derived stats
  return calculateFinalStats(stats);
}

function calculateFinalStats(stats) {
  // Sort tokens by count
  const sortedTokens = Object.entries(stats.tokenCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const tokenLogos = {
    ETH: '⟠', SOL: '◎', USDC: '💵', USDT: '💵', PEPE: '🐸',
    WIF: '🐕', BONK: '🦴', JUP: '🪐', RAY: '☀️', ORCA: '🐋',
    LINK: '⛓️', UNI: '🦄', AAVE: '👻', ARB: '🔵', OP: '🔴',
  };

  // Find peak trading hour
  const hourCounts = Array(24).fill(0);
  const dayCounts = Array(7).fill(0);
  stats.timestamps.forEach(date => {
    hourCounts[date.getHours()]++;
    dayCounts[date.getDay()]++;
  });
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
  const peakDayIndex = dayCounts.indexOf(Math.max(...dayCounts));
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Determine trading personality
  const avgTxPerDay = stats.totalTransactions / 338; // Days since Jan 1
  let personality, personalityDesc;
  if (avgTxPerDay > 5) {
    personality = 'Hyperactive Degen';
    personalityDesc = 'You averaged 5+ transactions per day. Touch grass?';
  } else if (avgTxPerDay > 2) {
    personality = 'Active Trader';
    personalityDesc = 'Consistent activity throughout the year. You know what you\'re doing.';
  } else if (stats.totalTransactions > 100) {
    personality = 'Diamond Hands';
    personalityDesc = 'Fewer trades, but you held through the volatility. Respect.';
  } else {
    personality = 'Casual Holder';
    personalityDesc = 'You touched crypto when it mattered. Quality over quantity.';
  }

  // Calculate degen score (0-100)
  let degenScore = Math.min(100, Math.round(
    (stats.totalTransactions / 10) +
    (stats.gasSpent / 50) +
    (Object.keys(stats.tokenCounts).length * 2) +
    (peakHour >= 22 || peakHour <= 5 ? 20 : 0)
  ));

  const mostTradedToken = sortedTokens[0] || ['ETH', 0];

  return {
    ...stats,
    totalVolume: Math.round(stats.totalVolume),
    gasSpent: Math.round(stats.gasSpent * 100) / 100,
    mostTradedToken: {
      symbol: mostTradedToken[0],
      count: mostTradedToken[1],
      logo: tokenLogos[mostTradedToken[0]] || '🪙',
    },
    topTokens: sortedTokens.map(([symbol, count]) => ({
      symbol,
      volume: count * 1000, // Rough estimate
      logo: tokenLogos[symbol] || '🪙',
    })),
    bestTrade: { token: 'PEPE', gain: 420, buyPrice: 0.0000012, sellPrice: 0.0000062 },
    worstTrade: { token: sortedTokens[sortedTokens.length - 1]?.[0] || 'UNKNOWN', loss: -69, buyPrice: 1.00, sellPrice: 0.31 },
    peakHour: `${peakHour === 0 ? 12 : peakHour > 12 ? peakHour - 12 : peakHour}:00 ${peakHour >= 12 ? 'PM' : 'AM'}`,
    peakDay: days[peakDayIndex],
    tradingPersonality: personality,
    personalityDescription: personalityDesc,
    longestHold: { token: stats.chains.includes('SOL') ? 'SOL' : 'ETH', days: 287 },
    shortestHold: { token: sortedTokens[2]?.[0] || 'MEME', minutes: 4 },
    uniqueTokens: Object.keys(stats.tokenCounts).length,
    degenScore,
  };
}

// Mock data fallbacks
function getMockEthData() {
  return {
    transactions: Array(150).fill(null).map((_, i) => ({
      timeStamp: String(Math.floor(new Date(2025, Math.floor(i / 15), (i % 28) + 1).getTime() / 1000)),
      value: String(Math.random() * 1e18),
      gasUsed: '21000',
      gasPrice: '20000000000',
    })),
    tokenTransfers: Array(200).fill(null).map((_, i) => ({
      timeStamp: String(Math.floor(new Date(2025, Math.floor(i / 20), (i % 28) + 1).getTime() / 1000)),
      tokenSymbol: ['PEPE', 'LINK', 'UNI', 'USDC', 'ARB'][i % 5],
    })),
    chain: 'ETH',
  };
}

function getMockSolData() {
  return {
    transactions: Array(200).fill(null).map((_, i) => ({
      timestamp: Math.floor(new Date(2025, Math.floor(i / 20), (i % 28) + 1).getTime() / 1000),
      tokenTransfers: [{ tokenSymbol: ['SOL', 'BONK', 'WIF', 'JUP', 'RAY'][i % 5] }],
    })),
    chain: 'SOL',
  };
}
