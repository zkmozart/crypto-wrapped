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

  console.log('Helius API key present:', !!apiKey);

  if (!apiKey) {
    console.warn('No Helius API key found, using mock data');
    return getMockSolData();
  }

  try {
    // Fetch parsed transaction history
    const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${apiKey}&limit=100`;
    console.log('Fetching Helius URL:', url.replace(apiKey, 'HIDDEN'));

    const response = await fetch(url);
    const transactions = await response.json();

    // Check if API returned valid array or error
    if (transactions.error) {
      console.error('Helius API error:', transactions.error);
      return getMockSolData();
    }

    const txArray = Array.isArray(transactions) ? transactions : [];
    console.log('Total Helius transactions:', txArray.length);

    // Collect unique mint addresses
    const mints = new Set();
    txArray.forEach(tx => {
      if (tx.tokenTransfers) {
        tx.tokenTransfers.forEach(t => {
          if (t.mint) mints.add(t.mint);
        });
      }
    });

    // Fetch token metadata for all mints
    let mintMetadata = {};
    if (mints.size > 0) {
      try {
        const metadataResponse = await fetch(`https://api.helius.xyz/v0/token-metadata?api-key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mintAccounts: Array.from(mints).slice(0, 100) })
        });
        const metadata = await metadataResponse.json();
        console.log('Token metadata:', metadata);

        if (Array.isArray(metadata)) {
          metadata.forEach(m => {
            if (m.account && m.onChainMetadata?.metadata?.data?.symbol) {
              mintMetadata[m.account] = m.onChainMetadata.metadata.data.symbol.replace(/\0/g, '').trim();
            } else if (m.account && m.legacyMetadata?.symbol) {
              mintMetadata[m.account] = m.legacyMetadata.symbol;
            }
          });
        }
      } catch (metaErr) {
        console.warn('Failed to fetch token metadata:', metaErr);
      }
    }
    console.log('Mint to symbol map:', mintMetadata);

    // Filter by date
    const startTimestamp = new Date(startDate).getTime() / 1000;
    const filteredTxs = txArray.filter(
      tx => tx.timestamp >= startTimestamp
    );
    console.log('Filtered Solana transactions (2025):', filteredTxs.length);

    return { transactions: filteredTxs, mintMetadata, chain: 'SOL' };
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
    const { transactions = [], mintMetadata = {} } = solData;

    // Common Solana token mint addresses to symbols (fallback)
    const defaultMintToSymbol = {
      'So11111111111111111111111111111111111111112': 'SOL',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
      'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 'WIF',
      'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'JUP',
    };

    // Merge fetched metadata with defaults
    const mintToSymbol = { ...defaultMintToSymbol, ...mintMetadata };

    // Function to get symbol from mint
    const getSymbol = (mint) => {
      if (!mint) return 'UNKNOWN';
      if (mintToSymbol[mint]) return mintToSymbol[mint];
      if (mint.endsWith('pump')) return 'PUMP';
      return mint.slice(0, 4) + '...';
    };

    // Track token trades for P&L calculation
    // tokenTrades[symbol] = { bought: amount, sold: amount, spent: usdValue, received: usdValue, mint }
    const tokenTrades = {};
    // Use the full solAddress passed to processWalletData
    const walletAddress = solAddress;
    console.log('Processing for wallet:', walletAddress);

    transactions.forEach(tx => {
      stats.totalTransactions++;

      // Helius fee is in the 'fee' field (in lamports)
      const feeLamports = tx.fee || 5000;
      stats.gasSpent += (feeLamports / 1e9) * 200;

      if (tx.timestamp) {
        const date = new Date(tx.timestamp * 1000);
        stats.timestamps.push(date);
        const monthIndex = date.getMonth();
        if (monthIndex < 11) stats.monthlyActivity[monthIndex].txs++;
      }

      // Process SWAP transactions for P&L
      if (tx.type === 'SWAP' && tx.tokenTransfers && tx.tokenTransfers.length > 0) {
        stats.swapCount = (stats.swapCount || 0) + 1;

        tx.tokenTransfers.forEach(transfer => {
          const symbol = getSymbol(transfer.mint);
          const amount = transfer.tokenAmount || 0;

          if (!tokenTrades[symbol]) {
            tokenTrades[symbol] = { bought: 0, sold: 0, mint: transfer.mint, txCount: 0 };
          }
          tokenTrades[symbol].txCount++;

          // If we received tokens (toUserAccount is our wallet)
          if (transfer.toUserAccount === walletAddress) {
            tokenTrades[symbol].bought += amount;
          }
          // If we sent tokens (fromUserAccount is our wallet)
          if (transfer.fromUserAccount === walletAddress) {
            tokenTrades[symbol].sold += amount;
          }
        });
      }

      // Process token transfers (non-swap)
      if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
        tx.tokenTransfers.forEach(transfer => {
          const symbol = getSymbol(transfer.mint);
          stats.tokenCounts[symbol] = (stats.tokenCounts[symbol] || 0) + 1;

          if (transfer.tokenAmount && (symbol === 'USDC' || symbol === 'USDT')) {
            stats.totalVolume += transfer.tokenAmount;
          }
        });
      }

      // Process native SOL transfers
      if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
        stats.tokenCounts['SOL'] = (stats.tokenCounts['SOL'] || 0) + 1;
        tx.nativeTransfers.forEach(transfer => {
          const solAmount = transfer.amount / 1e9;
          stats.totalVolume += solAmount * 200;

          // Track SOL trades
          if (!tokenTrades['SOL']) {
            tokenTrades['SOL'] = { bought: 0, sold: 0, mint: 'SOL', txCount: 0 };
          }
          if (transfer.toUserAccount === walletAddress) {
            tokenTrades['SOL'].bought += solAmount;
          }
          if (transfer.fromUserAccount === walletAddress) {
            tokenTrades['SOL'].sold += solAmount;
          }
        });
      }
    });

    // Store token trades for P&L calculation
    stats.tokenTrades = tokenTrades;

    console.log('Solana stats:', {
      totalTx: stats.totalTransactions,
      tokens: stats.tokenCounts,
      trades: tokenTrades,
      volume: stats.totalVolume,
      swaps: stats.swapCount
    });
  }

  // Calculate derived stats
  return calculateFinalStats(stats);
}

function calculateFinalStats(stats) {
  // Sort tokens by transaction count
  const sortedTokens = Object.entries(stats.tokenCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const tokenLogos = {
    ETH: '⟠', SOL: '◎', USDC: '💵', USDT: '💵', PEPE: '🐸',
    WIF: '🐕', BONK: '🦴', JUP: '🪐', RAY: '☀️', ORCA: '🐋',
    LINK: '⛓️', UNI: '🦄', AAVE: '👻', ARB: '🔵', OP: '🔴',
    PUMP: '🎰', GIGA: '🦍', IQ: '🧠',
  };

  // Calculate token volumes from trades data
  const tokenTrades = stats.tokenTrades || {};
  const tokenVolumes = {};

  Object.entries(tokenTrades).forEach(([symbol, data]) => {
    // Volume = total tokens moved (bought + sold)
    tokenVolumes[symbol] = {
      totalMoved: data.bought + data.sold,
      netPosition: data.bought - data.sold, // positive = holding, negative = sold more
      txCount: data.txCount,
    };
  });

  // Sort by volume for top tokens
  const topTokensByVolume = Object.entries(tokenVolumes)
    .filter(([symbol]) => symbol !== 'SOL' && symbol !== 'USDC' && symbol !== 'USDT')
    .sort((a, b) => b[1].txCount - a[1].txCount)
    .slice(0, 5);

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

  // Determine trading personality based on swap count
  const swapCount = stats.swapCount || 0;
  let personality, personalityDesc;
  if (swapCount > 50) {
    personality = 'Hyperactive Degen';
    personalityDesc = `${swapCount} swaps this year! You live for the pump.`;
  } else if (swapCount > 20) {
    personality = 'Active Trader';
    personalityDesc = 'Regular swapper with a taste for alpha.';
  } else if (swapCount > 5) {
    personality = 'Selective Sniper';
    personalityDesc = 'You pick your shots carefully. Quality over quantity.';
  } else {
    personality = 'Diamond Hands';
    personalityDesc = 'Holding strong. Few trades, maximum conviction.';
  }

  // Calculate degen score
  const uniqueTokens = Object.keys(stats.tokenCounts).length;
  let degenScore = Math.min(100, Math.round(
    (swapCount * 2) +
    (uniqueTokens * 3) +
    (stats.totalTransactions / 5) +
    (peakHour >= 22 || peakHour <= 5 ? 15 : 0)
  ));

  // Find most traded token (by transaction count, excluding stables)
  const mostTraded = topTokensByVolume[0] || [sortedTokens[0]?.[0] || 'SOL', { txCount: 0 }];

  // For best/worst trades, use tokens with net positions
  // Best = token we sold (negative net) with most activity (likely profit taking)
  // Worst = token we're still holding (positive net) with few recent trades
  const soldTokens = Object.entries(tokenVolumes)
    .filter(([s, d]) => d.netPosition < 0 && s !== 'SOL' && s !== 'USDC')
    .sort((a, b) => b[1].txCount - a[1].txCount);

  const heldTokens = Object.entries(tokenVolumes)
    .filter(([s, d]) => d.netPosition > 0 && s !== 'SOL' && s !== 'USDC')
    .sort((a, b) => a[1].txCount - b[1].txCount);

  const bestToken = soldTokens[0]?.[0] || topTokensByVolume[0]?.[0] || 'SOL';
  const worstToken = heldTokens[0]?.[0] || topTokensByVolume[topTokensByVolume.length - 1]?.[0] || 'UNKNOWN';

  console.log('Final stats calculation:', { tokenVolumes, topTokensByVolume, bestToken, worstToken });

  return {
    ...stats,
    totalVolume: Math.round(stats.totalVolume),
    gasSpent: Math.round(stats.gasSpent * 100) / 100,
    mostTradedToken: {
      symbol: mostTraded[0],
      count: mostTraded[1]?.txCount || sortedTokens[0]?.[1] || 0,
      logo: tokenLogos[mostTraded[0]] || '🪙',
    },
    topTokens: (topTokensByVolume.length > 0 ? topTokensByVolume : sortedTokens.slice(0, 5)).map(([symbol, data]) => ({
      symbol,
      volume: data?.txCount || data || 0,
      logo: tokenLogos[symbol] || '🪙',
    })),
    bestTrade: {
      token: bestToken,
      gain: Math.floor(Math.random() * 300) + 50, // Placeholder - would need price API
      buyPrice: 0.001,
      sellPrice: 0.005
    },
    worstTrade: {
      token: worstToken,
      loss: -(Math.floor(Math.random() * 60) + 20), // Placeholder
      buyPrice: 1.00,
      sellPrice: 0.50
    },
    peakHour: `${peakHour === 0 ? 12 : peakHour > 12 ? peakHour - 12 : peakHour}:00 ${peakHour >= 12 ? 'PM' : 'AM'}`,
    peakDay: days[peakDayIndex],
    tradingPersonality: personality,
    personalityDescription: personalityDesc,
    longestHold: { token: heldTokens[heldTokens.length - 1]?.[0] || 'SOL', days: Math.floor(Math.random() * 200) + 30 },
    shortestHold: { token: soldTokens[0]?.[0] || topTokensByVolume[0]?.[0] || 'PUMP', minutes: Math.floor(Math.random() * 30) + 1 },
    uniqueTokens,
    degenScore,
    swapCount,
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
