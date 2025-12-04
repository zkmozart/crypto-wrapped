# Crypto Wrapped 2025 🔮

A "Spotify Wrapped" style experience for your crypto journey. Enter your ETH or SOL wallet address and see your 2025 trading stats visualized in a swipeable story format.

## Features

- 📊 Total volume and transaction counts
- 🔥 Gas fees burned (with burrito conversion)
- 🏆 Most traded token ("comfort coin")
- 📈 Best and worst trades
- ⏰ Peak trading hours analysis
- 💎 Trading personality assessment
- 🎯 Degen score (0-100)

## Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd crypto-wrapped
npm install
```

### 2. Get Your API Keys (Free)

**Etherscan API Key:**
1. Go to [etherscan.io/apis](https://etherscan.io/apis)
2. Create a free account
3. Generate an API key

**Helius API Key:**
1. Go to [helius.dev](https://helius.dev)
2. Create a free account
3. Generate an API key (free tier = 100k requests/month)

### 3. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
```
VITE_ETHERSCAN_API_KEY=your_key_here
VITE_HELIUS_API_KEY=your_key_here
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Deploy to Vercel (Recommended)

### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=YOUR_REPO_URL)

### Option 2: Manual Deploy

1. Push code to GitHub

2. Go to [vercel.com](https://vercel.com) and sign in with GitHub

3. Click "New Project" → Import your repo

4. Add Environment Variables:
   - `VITE_ETHERSCAN_API_KEY` = your key
   - `VITE_HELIUS_API_KEY` = your key

5. Click Deploy!

Your app will be live at `your-project.vercel.app`

---

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Etherscan API** - Ethereum data
- **Helius API** - Solana data
- **Lucide React** - Icons

## Project Structure

```
crypto-wrapped/
├── src/
│   ├── App.jsx              # Main app + data fetching logic
│   ├── main.jsx             # Entry point
│   ├── index.css            # Tailwind + animations
│   └── components/
│       ├── LandingPage.jsx  # Wallet input form
│       ├── LoadingScreen.jsx # Loading animation
│       └── WrappedSlides.jsx # Story cards carousel
├── .env.example             # Environment template
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
└── README.md
```

## Customization

### Add More Chains

To add more chains (Base, Arbitrum, etc.), add a new fetch function in `App.jsx`:

```javascript
async function fetchBaseData(address, startDate) {
  // Use Basescan API (same format as Etherscan)
}
```

### Modify Slides

Edit `WrappedSlides.jsx` to add/remove/modify story cards. Each slide has:
- `id` - Unique identifier
- `bg` - Tailwind gradient classes
- `render` - Function returning JSX

### Change Date Range

Modify the `startDate` in `App.jsx`:
```javascript
const startDate = '2024-01-01'; // Change to any date
```

---

## API Rate Limits

| Service | Free Tier |
|---------|-----------|
| Etherscan | 5 calls/sec, 100k/day |
| Helius | 100k requests/month |

The app uses mock data as fallback if APIs are unavailable.

---

## License

MIT - Do whatever you want with it! 🚀
