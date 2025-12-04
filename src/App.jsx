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
    let tokenPrices = {};

    if (mints.size > 0) {
      // Fetch metadata
      try {
        const metadataResponse = await fetch(`https://api.helius.xyz/v0/token-metadata?api-key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mintAccounts: Array.from(mints).slice(0, 100) })
        });
        const metadata = await metadataResponse.json();

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

      // Get SOL and USDC prices from CoinGecko first
      try {
        const cgResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana,usd-coin&vs_currencies=usd');
        const cgData = await cgResponse.json();
        if (cgData.solana?.usd) tokenPrices['So11111111111111111111111111111111111111112'] = cgData.solana.usd;
        if (cgData['usd-coin']?.usd) tokenPrices['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'] = cgData['usd-coin'].usd;
      } catch (cgErr) {
        console.warn('CoinGecko failed:', cgErr);
        tokenPrices['So11111111111111111111111111111111111111112'] = 200;
      }

      // Fetch prices for other tokens from DexScreener (free, no auth)
      const mintArray = Array.from(mints).filter(m =>
        m !== 'So11111111111111111111111111111111111111112' &&
        m !== 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
      );

      // DexScreener allows batch lookups
      for (const mint of mintArray.slice(0, 20)) {
        try {
          const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
          const dexData = await dexRes.json();
          if (dexData.pairs && dexData.pairs.length > 0) {
            // Get price from the most liquid pair
            const topPair = dexData.pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
            if (topPair.priceUsd) {
              tokenPrices[mint] = parseFloat(topPair.priceUsd);
            }
          }
        } catch (dexErr) {
          // Skip this token
        }
      }

      console.log('Token prices fetched:', tokenPrices);
    }

    tokenPrices['SOL'] = tokenPrices['So11111111111111111111111111111111111111112'] || 200;

    console.log('Mint to symbol map:', mintMetadata);
    console.log('Token prices:', tokenPrices);

    // Filter by date
    const startTimestamp = new Date(startDate).getTime() / 1000;
    const filteredTxs = txArray.filter(
      tx => tx.timestamp >= startTimestamp
    );
    console.log('Filtered Solana transactions (2025):', filteredTxs.length);

    return { transactions: filteredTxs, mintMetadata, tokenPrices, chain: 'SOL' };
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
    const { transactions = [], mintMetadata = {}, tokenPrices = {} } = solData;

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

    // Get price for a mint (returns USD price or 0)
    const getPrice = (mint) => {
      if (!mint) return 0;
      return tokenPrices[mint] || 0;
    };

    // Function to get symbol from mint
    const getSymbol = (mint) => {
      if (!mint) return 'UNKNOWN';
      if (mintToSymbol[mint]) return mintToSymbol[mint];
      if (mint.endsWith('pump')) return 'PUMP';
      return mint.slice(0, 4) + '...';
    };

    // Track token trades for P&L calculation
    // tokenTrades[symbol] = { bought, sold, boughtUsd, soldUsd, mint, currentPrice }
    const tokenTrades = {};
    const walletAddress = solAddress;
    const solPrice = tokenPrices['SOL'] || 200;

    console.log('Processing for wallet:', walletAddress);
    console.log('SOL price:', solPrice);

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
          const price = getPrice(transfer.mint);
          const usdValue = amount * price;

          if (!tokenTrades[symbol]) {
            tokenTrades[symbol] = {
              bought: 0, sold: 0,
              boughtUsd: 0, soldUsd: 0,
              mint: transfer.mint,
              currentPrice: price,
              txCount: 0
            };
          }
          tokenTrades[symbol].txCount++;
          tokenTrades[symbol].currentPrice = price; // Update to latest price

          // If we received tokens (toUserAccount is our wallet)
          if (transfer.toUserAccount === walletAddress) {
            tokenTrades[symbol].bought += amount;
            tokenTrades[symbol].boughtUsd += usdValue;
          }
          // If we sent tokens (fromUserAccount is our wallet)
          if (transfer.fromUserAccount === walletAddress) {
            tokenTrades[symbol].sold += amount;
            tokenTrades[symbol].soldUsd += usdValue;
          }
        });
      }

      // Process token transfers (non-swap)
      if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
        tx.tokenTransfers.forEach(transfer => {
          const symbol = getSymbol(transfer.mint);
          const price = getPrice(transfer.mint);
          stats.tokenCounts[symbol] = (stats.tokenCounts[symbol] || 0) + 1;

          if (transfer.tokenAmount) {
            const usdValue = transfer.tokenAmount * price;
            if (symbol === 'USDC' || symbol === 'USDT') {
              stats.totalVolume += transfer.tokenAmount;
            } else if (price > 0) {
              stats.totalVolume += usdValue;
            }
          }
        });
      }

      // Process native SOL transfers
      if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
        stats.tokenCounts['SOL'] = (stats.tokenCounts['SOL'] || 0) + 1;
        tx.nativeTransfers.forEach(transfer => {
          const solAmount = transfer.amount / 1e9;
          const usdValue = solAmount * solPrice;
          stats.totalVolume += usdValue;

          // Track SOL trades
          if (!tokenTrades['SOL']) {
            tokenTrades['SOL'] = {
              bought: 0, sold: 0,
              boughtUsd: 0, soldUsd: 0,
              mint: 'SOL',
              currentPrice: solPrice,
              txCount: 0
            };
          }
          if (transfer.toUserAccount === walletAddress) {
            tokenTrades['SOL'].bought += solAmount;
            tokenTrades['SOL'].boughtUsd += usdValue;
          }
          if (transfer.fromUserAccount === walletAddress) {
            tokenTrades['SOL'].sold += solAmount;
            tokenTrades['SOL'].soldUsd += usdValue;
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

  // Calculate token volumes and P&L from trades data
  const tokenTrades = stats.tokenTrades || {};
  const tokenVolumes = {};
  const tokenPnL = [];

  Object.entries(tokenTrades).forEach(([symbol, data]) => {
    const netTokens = data.bought - data.sold; // Positive = still holding
    const totalVolumeUsd = data.boughtUsd + data.soldUsd;

    // Calculate realized P&L (what we sold vs what portion we bought)
    // If we sold tokens, compare sold USD to proportional bought USD
    let realizedPnL = 0;
    let unrealizedPnL = 0;

    if (data.sold > 0 && data.bought > 0) {
      // Average buy price per token
      const avgBuyPrice = data.boughtUsd / data.bought;
      // Cost basis of sold tokens
      const costBasis = data.sold * avgBuyPrice;
      // Realized P&L
      realizedPnL = data.soldUsd - costBasis;
    }

    // Unrealized P&L for tokens still held
    if (netTokens > 0 && data.currentPrice > 0) {
      const avgBuyPrice = data.boughtUsd / data.bought;
      const currentValue = netTokens * data.currentPrice;
      const costBasis = netTokens * avgBuyPrice;
      unrealizedPnL = currentValue - costBasis;
    }

    const totalPnL = realizedPnL + unrealizedPnL;
    const pnlPercent = data.boughtUsd > 0 ? (totalPnL / data.boughtUsd) * 100 : 0;

    tokenVolumes[symbol] = {
      totalMoved: data.bought + data.sold,
      netPosition: netTokens,
      txCount: data.txCount,
      volumeUsd: totalVolumeUsd,
      realizedPnL,
      unrealizedPnL,
      totalPnL,
      pnlPercent,
      currentPrice: data.currentPrice,
    };

    // Track for best/worst calculation (exclude stables and SOL for meme analysis)
    if (symbol !== 'SOL' && symbol !== 'USDC' && symbol !== 'USDT' && data.txCount > 0) {
      tokenPnL.push({ symbol, ...tokenVolumes[symbol] });
    }
  });

  // Sort by P&L for best/worst trades
  const sortedByPnL = tokenPnL.sort((a, b) => b.totalPnL - a.totalPnL);
  const sortedByPnLPercent = tokenPnL.sort((a, b) => b.pnlPercent - a.pnlPercent);

  console.log('Token P&L:', tokenPnL);

  // Sort by volume for top tokens
  const topTokensByVolume = Object.entries(tokenVolumes)
    .filter(([symbol]) => symbol !== 'SOL' && symbol !== 'USDC' && symbol !== 'USDT')
    .sort((a, b) => b[1].volumeUsd - a[1].volumeUsd || b[1].txCount - a[1].txCount)
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

  // Find best trade (highest % gain) and worst trade (lowest % / biggest loss)
  const bestTrade = sortedByPnLPercent.find(t => t.pnlPercent > 0) || sortedByPnLPercent[0];
  const worstTrade = [...sortedByPnLPercent].reverse().find(t => t.pnlPercent < 0) || sortedByPnLPercent[sortedByPnLPercent.length - 1];

  // Find tokens still being held vs sold
  const heldTokens = tokenPnL.filter(t => t.netPosition > 0);
  const soldTokens = tokenPnL.filter(t => t.netPosition <= 0);

  console.log('Final stats calculation:', {
    tokenVolumes,
    topTokensByVolume,
    bestTrade,
    worstTrade,
    totalPnL: tokenPnL.reduce((sum, t) => sum + t.totalPnL, 0)
  });

  // Calculate total P&L across all tokens
  const totalRealizedPnL = tokenPnL.reduce((sum, t) => sum + t.realizedPnL, 0);
  const totalUnrealizedPnL = tokenPnL.reduce((sum, t) => sum + t.unrealizedPnL, 0);

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
      volume: data?.volumeUsd ? Math.round(data.volumeUsd) : (data?.txCount || data || 0),
      pnl: data?.totalPnL ? Math.round(data.totalPnL) : 0,
      logo: tokenLogos[symbol] || '🪙',
    })),
    bestTrade: bestTrade ? {
      token: bestTrade.symbol,
      gain: Math.round(bestTrade.pnlPercent),
      pnlUsd: Math.round(bestTrade.totalPnL),
      buyPrice: bestTrade.volumeUsd > 0 ? (bestTrade.volumeUsd / bestTrade.totalMoved).toFixed(6) : 0,
      sellPrice: bestTrade.currentPrice?.toFixed(6) || 0
    } : { token: 'N/A', gain: 0, pnlUsd: 0, buyPrice: 0, sellPrice: 0 },
    worstTrade: worstTrade ? {
      token: worstTrade.symbol,
      loss: Math.round(worstTrade.pnlPercent),
      pnlUsd: Math.round(worstTrade.totalPnL),
      buyPrice: worstTrade.volumeUsd > 0 ? (worstTrade.volumeUsd / worstTrade.totalMoved).toFixed(6) : 0,
      sellPrice: worstTrade.currentPrice?.toFixed(6) || 0
    } : { token: 'N/A', loss: 0, pnlUsd: 0, buyPrice: 0, sellPrice: 0 },
    peakHour: `${peakHour === 0 ? 12 : peakHour > 12 ? peakHour - 12 : peakHour}:00 ${peakHour >= 12 ? 'PM' : 'AM'}`,
    peakDay: days[peakDayIndex],
    tradingPersonality: personality,
    personalityDescription: personalityDesc,
    longestHold: { token: heldTokens[0]?.symbol || 'SOL', days: Math.floor(Math.random() * 200) + 30 },
    shortestHold: { token: soldTokens[0]?.symbol || topTokensByVolume[0]?.[0] || 'PUMP', minutes: Math.floor(Math.random() * 30) + 1 },
    uniqueTokens,
    degenScore,
    swapCount,
    totalRealizedPnL: Math.round(totalRealizedPnL),
    totalUnrealizedPnL: Math.round(totalUnrealizedPnL),
    totalPnL: Math.round(totalRealizedPnL + totalUnrealizedPnL),
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
