# Earnings Table Ubuntu - Modern Tech Stack

A modern, real-time earnings dashboard built with Next.js 15, Node.js, PostgreSQL, and Redis.

## 🚀 Features

- **Real-time Updates**: WebSocket-powered live data updates
- **Modern UI**: Built with React, TypeScript, and TailwindCSS
- **High Performance**: TanStack Table with virtualization for large datasets
- **Background Jobs**: Bull Queue with Redis for reliable data processing
- **Type Safety**: Full TypeScript support with Prisma ORM
- **Responsive Design**: Works perfectly on desktop and mobile

## 🛠️ Tech Stack

### Frontend

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first CSS framework
- **TanStack Table** - Powerful table component with sorting/filtering
- **Recharts** - Data visualization library
- **Lucide React** - Beautiful icons

### Backend

- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **Prisma** - Type-safe database ORM
- **Bull Queue** - Background job processing
- **Socket.IO** - Real-time WebSocket communication

### Database & Cache

- **PostgreSQL** - Primary database
- **Redis** - Caching and job queue

### APIs

- **Polygon.io** - Market data and quotes
- **Finnhub** - Earnings calendar and company data

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── EarningsDashboard.tsx
│   ├── EarningsTable.tsx
│   ├── EarningsStats.tsx
│   ├── Header.tsx
│   └── Footer.tsx
├── server/               # Backend server
│   ├── app.ts           # Express app setup
│   ├── routes/          # API routes
│   ├── middleware/      # Express middleware
│   └── utils/           # Server utilities
├── queue/               # Background jobs
│   ├── worker.ts        # Queue worker
│   └── jobs/            # Job implementations
└── types/               # TypeScript type definitions
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL 16.x or higher
- Redis 7.x or higher
- API keys for Polygon.io and Finnhub

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd EarningsTableUbuntu
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp env.example .env
   ```

   Update `.env` with your configuration:

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/earnings_table"
   REDIS_URL="redis://localhost:6379"
   POLYGON_API_KEY="your_polygon_api_key"
   FINNHUB_API_KEY="your_finnhub_api_key"
   ```

4. **Set up the database**

   ```bash
   npm run db:generate
   npm run db:push
   ```

5. **Start the development servers**

   ```bash
   # Terminal 1: Start the backend server
   npm run dev:server

   # Terminal 2: Start the queue worker
   npm run queue:dev

   # Terminal 3: Start the frontend
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 📊 Available Scripts

- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run dev:server` - Start backend server
- `npm run queue:dev` - Start queue worker
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run test` - Run tests
- `npm run lint` - Run ESLint

## 🔄 Background Jobs

The application uses Bull Queue for background job processing:

- **Earnings Fetch** (every 2 minutes) - Fetches earnings data from APIs
- **Market Data Update** (every 5 minutes) - Updates stock prices and market data
- **Cleanup** (daily) - Removes old data to keep database clean

## 🌐 API Endpoints

- `GET /api/earnings/today` - Get today's earnings data
- `GET /api/earnings/ticker/:ticker` - Get specific ticker data
- `GET /api/earnings/stats` - Get earnings statistics
- `GET /api/cron/status` - Get cron job status
- `POST /api/cron/heartbeat` - Update cron job heartbeat

## 🚀 Deployment

### Ubuntu VPS Deployment

1. **Install dependencies on Ubuntu**

   ```bash
   # Install Node.js 20.x
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install PostgreSQL
   sudo apt-get install -y postgresql postgresql-contrib

   # Install Redis
   sudo apt-get install -y redis-server
   ```

2. **Set up the application**

   ```bash
   git clone <repository-url>
   cd EarningsTableUbuntu
   npm install
   npm run build
   ```

3. **Configure services**

   ```bash
   # Set up systemd services for the application
   sudo systemctl enable postgresql redis-server
   sudo systemctl start postgresql redis-server
   ```

4. **Start the application**
   ```bash
   npm start
   ```

## 📈 Performance Features

- **Virtual Scrolling** - Handle thousands of rows efficiently
- **Real-time Updates** - WebSocket-powered live data
- **Background Processing** - Non-blocking data fetching
- **Redis Caching** - Fast data retrieval
- **Database Indexing** - Optimized queries
- **Rate Limiting** - API protection

## 🔧 Configuration

### Environment Variables

| Variable          | Description                          | Required |
| ----------------- | ------------------------------------ | -------- |
| `DATABASE_URL`    | PostgreSQL connection string         | Yes      |
| `REDIS_URL`       | Redis connection string              | Yes      |
| `POLYGON_API_KEY` | Polygon.io API key                   | Yes      |
| `FINNHUB_API_KEY` | Finnhub API key                      | Yes      |
| `NODE_ENV`        | Environment (development/production) | No       |
| `PORT`            | Server port (default: 3001)          | No       |

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions, please open an issue on GitHub.
