# Tandem - Daily Pairs Puzzle Game

A fun daily word puzzle game where players match emoji pairs with words based on a theme.

## Features

- 🎮 Daily puzzle challenges
- 🌙 Dark mode support
- 🔊 Sound effects
- 📊 Statistics tracking
- 📱 PWA support (installable)
- 🎨 Beautiful gradient UI
- 🏆 Streak tracking

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Vercel KV (Redis)
- **Deployment**: Vercel
- **State Management**: Zustand
- **Validation**: Zod
- **PWA**: Web App Manifest

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Vercel account (for deployment)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/jason-bartz/tandem.git
cd tandem
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. Generate admin password hash:
```bash
npm run hash-password your-secure-password
```

5. Update `.env.local` with your configuration

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play the game.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
tandem/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # React components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API service layer
│   ├── lib/            # Utilities and helpers
│   └── store/          # State management
├── public/             # Static assets
├── scripts/            # Utility scripts
└── package.json
```

## Game Rules

1. Look at each emoji pair
2. Guess what they represent
3. Find the theme that links all 4 answers
4. You have 4 mistakes allowed
5. Complete the puzzle to maintain your streak!

## Deployment

### Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy!

The app will automatically:
- Set up Vercel KV database
- Configure edge functions
- Enable PWA features

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Credits

Created with ❤️ by Jason Bartz