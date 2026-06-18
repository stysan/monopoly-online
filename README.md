# 🎩 Monopoly Online

Vibecoded monopoly game. Used up 2 5-hour limits for free Claude Sonnet 4.6. Full-featured online Monopoly with real-time multiplayer, accounts, and leaderboards.

## Stack
- **Backend**: Node.js, Express, Socket.IO
- **Database**: SQLite via sql.js (pure JS, zero native dependencies)
- **Auth**: JWT + bcrypt
- **Frontend**: Vanilla HTML/CSS/JS (no framework)

## Quick Start

```bash
npm install
npm start
# → http://localhost:3000
```

For dev with auto-restart:
```bash
npm install -g nodemon
npm run dev
```

## Features

### 🎮 Gameplay
- Full classic Monopoly rules (40 squares, all property groups)
- Chance & Community Chest cards (16 each, shuffled)
- Railroads (rent scales 1-4 owned: $25/$50/$100/$200)
- Utilities (4× or 10× dice roll)
- Houses & Hotels (limited supply: 32 houses, 12 hotels)
- Even building rule enforced
- Auctions when a player declines to buy
- Trading (properties + money between any two players)
- Mortgage / Unmortgage
- Jail mechanics (fine, doubles roll, Get Out of Jail Free card)
- Bankruptcy → asset transfer to creditor or bank
- Free Parking jackpot (optional)

### 👤 Accounts
- Register / Login with username + password
- JWT authentication (7-day sessions)
- 8 tokens to choose from: 🎩 🚗 👝 🚢 🐶 🛒 🧵 👢
- Full stats tracked per-game

### 🏆 Leaderboards
- **Most Wins** — total games won
- **Win Rate** — win % (min 3 games played)
- **Richest** — total money earned across all games
- **Landlord** — total properties bought
- **Rent King** — total rent collected

### 🌐 Multiplayer
- 2–6 players per room
- Public rooms lobby (browsable)
- Private rooms (join by code)
- Real-time sync via Socket.IO
- Chat in game room
- Disconnect handling (player marked offline, game continues)

## Settings (per room)
| Option | Default | Description |
|--------|---------|-------------|
| Max Players | 4 | 2–6 |
| Auction on Decline | ✅ | Auction property when declined |
| Free Parking Jackpot | ❌ | Taxes go to pot, collected on Free Parking |
| Private Room | ❌ | Not shown in lobby (join by code only) |

## Environment Variables
```
PORT=3000          # Server port (default 3000)
JWT_SECRET=...     # Change this in production!
```

## Data
Database is stored at `data/monopoly.db` (auto-created on first run).

## Project Structure
```
monopoly/
├── src/
│   ├── server.js          # Entry point
│   ├── db/
│   │   └── database.js    # SQLite via sql.js, all DB ops
│   ├── game/
│   │   ├── board.js       # Board data, cards, decks
│   │   ├── engine.js      # Core game logic
│   │   ├── roomManager.js # Room lifecycle
│   │   └── sockets.js     # All Socket.IO events
│   ├── middleware/
│   │   └── auth.js        # JWT sign/verify, middleware
│   └── routes/
│       └── api.js         # REST: auth, stats, leaderboard
└── public/
    ├── index.html
    ├── css/style.css
    └── js/app.js          # Full browser client
```
