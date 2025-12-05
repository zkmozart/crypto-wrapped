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
    monthlyActivity: Array(12).fill(0).map((_, i) => ({
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
      if (monthIndex < 12) stats.monthlyActivity[monthIndex].txs++;
      
      stats.tokenCounts['ETH'] = (stats.tokenCounts['ETH'] || 0) + 1;
    });

    tokenTransfers.forEach(tx => {
      const symbol = tx.tokenSymbol || 'UNKNOWN';
      stats.tokenCounts[symbol] = (stats.tokenCounts[symbol] || 0) + 1;
      
      const date = new Date(parseInt(tx.timeStamp) * 1000);
      const monthIndex = date.getMonth();
      if (monthIndex < 12) stats.monthlyActivity[monthIndex].txs++;
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

    // Track token trades with timestamps for hold time and P&L
    // tokenTrades[symbol] = { trades: [], mint, currentPrice }
    const tokenTrades = {};
    const walletAddress = solAddress;
    const solPrice = tokenPrices['SOL'] || 200;

    console.log('Processing for wallet:', walletAddress);
    console.log('SOL price:', solPrice);

    // Sort transactions by timestamp (oldest first) for proper hold time calculation
    const sortedTxs = [...transactions].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    sortedTxs.forEach(tx => {
      stats.totalTransactions++;
      const txTimestamp = tx.timestamp ? tx.timestamp * 1000 : Date.now();

      // Helius fee is in the 'fee' field (in lamports)
      const feeLamports = tx.fee || 5000;
      stats.gasSpent += (feeLamports / 1e9) * solPrice;

      if (tx.timestamp) {
        const date = new Date(tx.timestamp * 1000);
        stats.timestamps.push(date);
        const monthIndex = date.getMonth();
        if (monthIndex < 12) stats.monthlyActivity[monthIndex].txs++;
      }

      // Process SWAP transactions - these are the key trades for P&L
      if (tx.type === 'SWAP' && tx.tokenTransfers && tx.tokenTransfers.length > 0) {
        stats.swapCount = (stats.swapCount || 0) + 1;

        // In a swap, identify what we sent (sold) and what we received (bought)
        // The USD value comes from looking at the SOL/USDC side of the trade
        let sentTransfers = [];
        let receivedTransfers = [];

        tx.tokenTransfers.forEach(transfer => {
          const amount = transfer.tokenAmount || 0;
          if (amount <= 0) return;

          if (transfer.fromUserAccount === walletAddress) {
            sentTransfers.push(transfer);
          }
          if (transfer.toUserAccount === walletAddress) {
            receivedTransfers.push(transfer);
          }
        });

        // Also check native SOL transfers
        if (tx.nativeTransfers) {
          tx.nativeTransfers.forEach(transfer => {
            const solAmount = Math.abs(transfer.amount) / 1e9;
            if (solAmount < 0.001) return; // Skip tiny amounts (fees)

            if (transfer.fromUserAccount === walletAddress) {
              sentTransfers.push({
                mint: 'So11111111111111111111111111111111111111112',
                tokenAmount: solAmount,
                fromUserAccount: walletAddress,
              });
            }
            if (transfer.toUserAccount === walletAddress) {
              receivedTransfers.push({
                mint: 'So11111111111111111111111111111111111111112',
                tokenAmount: solAmount,
                toUserAccount: walletAddress,
              });
            }
          });
        }

        // Calculate USD value of the swap from the SOL/USDC side
        let swapUsdValue = 0;
        const stableMints = [
          'So11111111111111111111111111111111111111112', // SOL
          'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
          'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
        ];

        // Try to get USD value from what we sent or received that's SOL/USDC
        for (const transfer of [...sentTransfers, ...receivedTransfers]) {
          const symbol = getSymbol(transfer.mint);
          const price = getPrice(transfer.mint);
          if (stableMints.includes(transfer.mint) || symbol === 'USDC' || symbol === 'USDT') {
            const amount = transfer.tokenAmount || 0;
            if (symbol === 'USDC' || symbol === 'USDT') {
              swapUsdValue = Math.max(swapUsdValue, amount);
            } else {
              swapUsdValue = Math.max(swapUsdValue, amount * price);
            }
          }
        }

        // Process each non-stable token involved in the swap
        [...sentTransfers, ...receivedTransfers].forEach(transfer => {
          const symbol = getSymbol(transfer.mint);
          const amount = transfer.tokenAmount || 0;
          const price = getPrice(transfer.mint);

          // Skip stables - we only care about the meme coins
          if (symbol === 'USDC' || symbol === 'USDT' || symbol === 'SOL') return;

          if (!tokenTrades[symbol]) {
            tokenTrades[symbol] = {
              trades: [],
              mint: transfer.mint,
              currentPrice: price,
              totalBought: 0,
              totalSold: 0,
              totalSpentUsd: 0,
              totalReceivedUsd: 0,
              firstBuyTime: null,
              lastSellTime: null,
              holdingBalance: 0,
            };
          }

          tokenTrades[symbol].currentPrice = price;

          // Received tokens = BUY (we spent SOL/USDC to get this)
          if (transfer.toUserAccount === walletAddress) {
            // Use swap USD value if available, otherwise estimate from current price
            const costUsd = swapUsdValue > 0 ? swapUsdValue : amount * price;

            tokenTrades[symbol].trades.push({
              type: 'buy',
              amount,
              usdValue: costUsd,
              timestamp: txTimestamp
            });
            tokenTrades[symbol].totalBought += amount;
            tokenTrades[symbol].totalSpentUsd += costUsd;
            tokenTrades[symbol].holdingBalance += amount;

            if (!tokenTrades[symbol].firstBuyTime) {
              tokenTrades[symbol].firstBuyTime = txTimestamp;
            }
          }

          // Sent tokens = SELL (we received SOL/USDC for this)
          if (transfer.fromUserAccount === walletAddress) {
            // Use swap USD value if available, otherwise estimate from current price
            const saleUsd = swapUsdValue > 0 ? swapUsdValue : amount * price;

            tokenTrades[symbol].trades.push({
              type: 'sell',
              amount,
              usdValue: saleUsd,
              timestamp: txTimestamp
            });
            tokenTrades[symbol].totalSold += amount;
            tokenTrades[symbol].totalReceivedUsd += saleUsd;
            tokenTrades[symbol].holdingBalance -= amount;
            tokenTrades[symbol].lastSellTime = txTimestamp;
          }
        });
      }

      // Process all token transfers for volume tracking
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
  const tokenLogos = {
    ETH: '⟠', SOL: '◎', USDC: '💵', USDT: '💵', PEPE: '🐸',
    WIF: '🐕', BONK: '🦴', JUP: '🪐', RAY: '☀️', ORCA: '🐋',
    LINK: '⛓️', UNI: '🦄', AAVE: '👻', ARB: '🔵', OP: '🔴',
    PUMP: '🎰', GIGA: '🦍', IQ: '🧠',
  };

  const tokenTrades = stats.tokenTrades || {};
  const tokenAnalysis = [];
  const now = Date.now();

  // First pass: calculate total portfolio value for concentration
  let totalPortfolioSpent = 0;
  Object.entries(tokenTrades).forEach(([symbol, data]) => {
    if (symbol === 'USDC' || symbol === 'USDT' || symbol === 'SOL') return;
    totalPortfolioSpent += data.totalSpentUsd || 0;
  });

  // Analyze each token
  Object.entries(tokenTrades).forEach(([symbol, data]) => {
    if (symbol === 'USDC' || symbol === 'USDT') return; // Skip stables

    const totalBought = data.totalBought || 0;
    const totalSold = data.totalSold || 0;
    const holdingBalance = data.holdingBalance || 0;
    const currentPrice = data.currentPrice || 0;
    const tradeCount = data.trades?.length || 0;

    // Calculate USD values
    const totalSpentUsd = data.totalSpentUsd || 0;
    const totalReceivedUsd = data.totalReceivedUsd || 0;
    const currentHoldingValueUsd = holdingBalance * currentPrice;

    // Calculate portfolio concentration (% of total spent on this token)
    const concentrationPercent = totalPortfolioSpent > 0 ? (totalSpentUsd / totalPortfolioSpent) * 100 : 0;

    // Calculate P&L based on actual USD flows
    // If we spent $100 and received $150 back, that's $50 profit (50%)
    // If we still hold tokens, add their current value
    const totalValueOut = totalReceivedUsd + currentHoldingValueUsd;
    const totalPnL = totalValueOut - totalSpentUsd;
    
    // P&L percentage - NEVER show 0% if there was activity
    let pnlPercent = 0;
    if (totalSpentUsd > 0) {
      pnlPercent = (totalPnL / totalSpentUsd) * 100;
      // If calculation results in 0 but there was trading activity, estimate based on price movement
      if (pnlPercent === 0 && tradeCount > 0) {
        // Use a small non-zero value to indicate activity occurred
        pnlPercent = totalPnL >= 0 ? 0.1 : -0.1;
      }
    }

    // Realized P&L = what we actually received from sales vs cost basis
    let realizedPnL = 0;
    let realizedPnLPercent = 0;
    if (totalSold > 0 && totalBought > 0 && totalSpentUsd > 0) {
      const avgCostPerToken = totalSpentUsd / totalBought;
      const costBasisSold = totalSold * avgCostPerToken;
      realizedPnL = totalReceivedUsd - costBasisSold;
      realizedPnLPercent = costBasisSold > 0 ? (realizedPnL / costBasisSold) * 100 : 0;
    }

    // Unrealized P&L = current value of holdings - cost basis of holdings
    let unrealizedPnL = 0;
    if (holdingBalance > 0 && totalBought > 0 && totalSpentUsd > 0) {
      const avgCostPerToken = totalSpentUsd / totalBought;
      const costBasisHeld = holdingBalance * avgCostPerToken;
      unrealizedPnL = currentHoldingValueUsd - costBasisHeld;
    }

    // Calculate hold time - use transaction timestamps if firstBuyTime not set
    let holdTimeMs = 0;
    let holdTimeDays = 0;
    
    // Get first and last trade timestamps
    const tradeTimestamps = data.trades?.map(t => t.timestamp).filter(t => t) || [];
    const firstTradeTime = tradeTimestamps.length > 0 ? Math.min(...tradeTimestamps) : null;
    const lastTradeTime = tradeTimestamps.length > 0 ? Math.max(...tradeTimestamps) : null;
    
    // Use firstBuyTime if available, otherwise use first trade time
    const startTime = data.firstBuyTime || firstTradeTime;
    
    if (startTime) {
      // If still holding, hold time is from first buy to now
      // If sold everything, hold time is from first buy to last sell
      const endTime = holdingBalance > 0 ? now : (data.lastSellTime || lastTradeTime || now);
      holdTimeMs = endTime - startTime;
      holdTimeDays = Math.max(0, Math.floor(holdTimeMs / (1000 * 60 * 60 * 24)));
    }

    // Check if ever held more than $1
    const maxHoldingValue = Math.max(totalSpentUsd, currentHoldingValueUsd);
    const heldSignificantValue = maxHoldingValue >= 1;

    // Calculate ranking score based on user requirements:
    // 1. Longer hold time = higher ranking
    // 2. Higher realized profit % = higher ranking
    // 3. Higher concentration (% of portfolio) = higher ranking
    const holdTimeScore = holdTimeDays * 5; // 5 points per day held
    const realizedGainScore = realizedPnLPercent > 0 ? realizedPnLPercent * 2 : 0; // 2x multiplier for gains
    const concentrationScore = concentrationPercent * 3; // 3 points per % of portfolio
    const rankingScore = holdTimeScore + realizedGainScore + concentrationScore;

    tokenAnalysis.push({
      symbol,
      totalBought,
      totalSold,
      holdingBalance,
      currentPrice,
      tradeCount,
      totalSpentUsd,
      totalReceivedUsd,
      currentHoldingValueUsd,
      realizedPnL,
      unrealizedPnL,
      totalPnL,
      pnlPercent,
      realizedPnLPercent,
      concentrationPercent,
      holdTimeDays,
      heldSignificantValue,
      rankingScore,
      volumeUsd: totalSpentUsd + totalReceivedUsd,
    });
  });

  console.log('Token Analysis:', tokenAnalysis);

  // Sort tokens by ranking score (highest first)
  const rankedTokens = [...tokenAnalysis]
    .filter(t => t.volumeUsd > 0)
    .sort((a, b) => b.rankingScore - a.rankingScore);

  // Find best trade (highest USD gain)
  const sortedByPnLUsd = [...tokenAnalysis]
    .filter(t => t.totalPnL !== 0)
    .sort((a, b) => b.totalPnL - a.totalPnL);

  // Find worst trade (biggest USD loss)
  const sortedByLoss = [...tokenAnalysis]
    .filter(t => t.totalPnL < 0)
    .sort((a, b) => a.totalPnL - b.totalPnL); // Most negative first

  // Find best % gain
  const sortedByPnLPercent = [...tokenAnalysis]
    .filter(t => t.pnlPercent > 0 && t.totalSpentUsd >= 1) // Only count if spent at least $1
    .sort((a, b) => b.pnlPercent - a.pnlPercent);

  // Top 5 tokens by ranking
  const topTokens = rankedTokens.slice(0, 5);

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

  // Determine trading personality based on swap count AND average hold time
  const swapCount = stats.swapCount || 0;
  
  // Calculate average hold time across all tokens
  const tokensWithHolds = tokenAnalysis.filter(t => t.holdTimeDays > 0 && t.symbol !== 'SOL' && t.symbol !== 'ETH');
  const avgHoldTime = tokensWithHolds.length > 0 
    ? tokensWithHolds.reduce((sum, t) => sum + t.holdTimeDays, 0) / tokensWithHolds.length 
    : 0;
  
  let personality, personalityDesc;
  
  // Murad Mode = long average hold times (30+ days average)
  if (avgHoldTime >= 30) {
    personality = 'Murad Mode';
    personalityDesc = `${Math.round(avgHoldTime)} day avg hold. You believe in your picks.`;
  } else if (swapCount > 200) {
    personality = 'Hyperactive Degen';
    personalityDesc = `${swapCount} swaps this year! You live for the pump.`;
  } else if (swapCount > 100) {
    personality = 'Active Trader';
    personalityDesc = 'Regular swapper with a taste for alpha.';
  } else if (swapCount > 50) {
    personality = 'Selective Sniper';
    personalityDesc = 'You pick your shots carefully. Quality over quantity.';
  } else if (avgHoldTime >= 14) {
    personality = 'Patient Holder';
    personalityDesc = `${Math.round(avgHoldTime)} day avg hold. Patience pays off.`;
  } else {
    personality = 'Getting Started';
    personalityDesc = 'Building your on-chain history. Keep going!';
  }

  // Calculate degen score
  const uniqueTokens = Object.keys(stats.tokenCounts).length;
  let degenScore = Math.min(100, Math.round(
    (swapCount * 2) +
    (uniqueTokens * 3) +
    (stats.totalTransactions / 5) +
    (peakHour >= 22 || peakHour <= 5 ? 15 : 0)
  ));

  // Find tokens with longest and shortest hold times (excluding SOL, ETH, stables)
  const tokensWithHoldTime = tokenAnalysis.filter(t => 
    t.holdTimeDays > 0 && 
    t.heldSignificantValue && 
    t.symbol !== 'SOL' && 
    t.symbol !== 'ETH' &&
    t.symbol !== 'USDC' &&
    t.symbol !== 'USDT'
  );
  const sortedByHoldTime = [...tokensWithHoldTime].sort((a, b) => b.holdTimeDays - a.holdTimeDays);
  const longestHoldToken = sortedByHoldTime[0];
  const shortestHoldToken = sortedByHoldTime[sortedByHoldTime.length - 1];

  // Comfort coin = longest held token (excluding gas tokens)
  const comfortCoin = longestHoldToken || rankedTokens[0] || { symbol: 'N/A', tradeCount: 0, holdTimeDays: 0 };

  // Find best trade (highest % gain with at least $1 spent)
  const bestTrade = sortedByPnLPercent[0] || null;

  // Find worst trade (biggest USD loss)
  const worstTrade = sortedByLoss[0] || null;

  // If no worst trade found from losses, find the one with lowest P&L %
  const fallbackWorstTrade = worstTrade || [...tokenAnalysis]
    .filter(t => t.totalSpentUsd >= 1)
    .sort((a, b) => a.pnlPercent - b.pnlPercent)[0] || null;

  console.log('Final stats calculation:', {
    rankedTokens,
    topTokens,
    bestTrade,
    worstTrade,
    totalPnL: tokenAnalysis.reduce((sum, t) => sum + t.totalPnL, 0)
  });

  // Calculate total P&L across all tokens
  const totalRealizedPnL = tokenAnalysis.reduce((sum, t) => sum + t.realizedPnL, 0);
  const totalUnrealizedPnL = tokenAnalysis.reduce((sum, t) => sum + t.unrealizedPnL, 0);

  return {
    ...stats,
    totalVolume: Math.round(stats.totalVolume),
    gasSpent: Math.round(stats.gasSpent * 100) / 100,
    mostTradedToken: {
      symbol: comfortCoin.symbol,
      count: comfortCoin.holdTimeDays,
      logo: tokenLogos[comfortCoin.symbol] || '🪙',
    },
    topTokens: topTokens.map(t => ({
      symbol: t.symbol,
      volume: Math.round(t.volumeUsd),
      pnl: Math.round(t.totalPnL),
      pnlPercent: Math.round(t.pnlPercent) || (t.totalPnL >= 0 ? 1 : -1), // Never show 0%
      realizedPnLPercent: Math.round(t.realizedPnLPercent),
      concentrationPercent: Math.round(t.concentrationPercent),
      tradeCount: t.tradeCount,
      holdTimeDays: t.holdTimeDays,
      logo: tokenLogos[t.symbol] || '🪙',
    })),
    bestTrade: bestTrade ? {
      token: bestTrade.symbol,
      gain: Math.round(bestTrade.pnlPercent),
      pnlUsd: Math.round(bestTrade.totalPnL),
      totalSpentUsd: Math.round(bestTrade.totalSpentUsd),
      totalReceivedUsd: Math.round(bestTrade.totalReceivedUsd),
    } : { token: 'N/A', gain: 0, pnlUsd: 0, totalSpentUsd: 0, totalReceivedUsd: 0 },
    worstTrade: fallbackWorstTrade ? {
      token: fallbackWorstTrade.symbol,
      loss: Math.round(fallbackWorstTrade.pnlPercent),
      pnlUsd: Math.round(fallbackWorstTrade.totalPnL),
      totalSpentUsd: Math.round(fallbackWorstTrade.totalSpentUsd),
      totalReceivedUsd: Math.round(fallbackWorstTrade.totalReceivedUsd),
    } : { token: 'N/A', loss: 0, pnlUsd: 0, totalSpentUsd: 0, totalReceivedUsd: 0 },
    peakHour: `${peakHour === 0 ? 12 : peakHour > 12 ? peakHour - 12 : peakHour}:00 ${peakHour >= 12 ? 'PM' : 'AM'}`,
    peakDay: days[peakDayIndex],
    tradingPersonality: personality,
    personalityDescription: personalityDesc,
    longestHold: longestHoldToken ? {
      token: longestHoldToken.symbol,
      days: longestHoldToken.holdTimeDays,
    } : { token: 'N/A', days: 0 },
    shortestHold: shortestHoldToken ? {
      token: shortestHoldToken.symbol,
      days: shortestHoldToken.holdTimeDays,
    } : { token: 'N/A', days: 0 },
    uniqueTokens,
    degenScore,
    swapCount,
    totalRealizedPnL: Math.round(totalRealizedPnL),
    totalUnrealizedPnL: Math.round(totalUnrealizedPnL),
    totalPnL: Math.round(totalRealizedPnL + totalUnrealizedPnL),
    tokenAnalysis, // Include full analysis for debugging
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
