# Earnings Table - Simplified Architecture

A modern earnings dashboard built with Next.js 15, TypeScript, and simplified cron-based data ingestion.

## 🚀 Features

- **Modern UI**: Built with React, TypeScript, and TailwindCSS
- **High Performance**: TanStack Table with sorting and filtering
- **Guidance Analytics**: Corporate guidance surprise calculations
- **Cron-based Ingestion**: Simple, reliable data fetching
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

- **Next.js API Routes** - Server-side API endpoints
- **Prisma** - Type-safe database ORM
- **Cron Jobs** - Simple data ingestion

### Database

- **SQLite** - Local development database
- **PostgreSQL** - Production database (optional)

### APIs

- **Polygon.io** - Market data and quotes
- **Finnhub** - Earnings calendar and company data

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/              # API routes
│   │   └── earnings/     # Earnings API endpoints
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/           # React components
│   ├── ui/              # Reusable UI components
│   ├── EarningsDashboard.tsx
│   ├── EarningsTable.tsx
│   ├── EarningsStats.tsx
│   ├── Header.tsx
│   └── Footer.tsx
├── jobs/                # Cron jobs
│   └── fetch-today.ts   # Data ingestion script
├── lib/                 # Utility libraries
│   ├── prisma.ts        # Prisma client
│   ├── guidance.ts      # Guidance calculations
│   ├── dates.ts         # Date utilities
│   └── bigint-utils.ts  # BigInt serialization
└── utils/               # TypeScript utilities
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or higher
- API keys for Polygon.io and Finnhub
- SQLite (included with Node.js) or PostgreSQL for production

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
   cp env.example .env.local
   ```

   Update `.env.local` with your configuration:

   ```env
   DATABASE_URL="file:./dev.db"
   POLYGON_API_KEY="your_polygon_api_key"
   FINNHUB_API_KEY="your_finnhub_api_key"
   ```

4. **Set up the database**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 📊 Available Scripts

- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run fetch:data` - Run data ingestion script manually
- `npx prisma generate` - Generate Prisma client
- `npx prisma db push` - Push schema to database
- `npx prisma studio` - Open Prisma Studio
- `npm run test` - Run tests
- `npm run lint` - Run ESLint

## 🔄 Data Ingestion

The application uses a simple cron-based approach for data ingestion:

- **Manual Fetch** - Run `npm run fetch:data` to fetch today's earnings data
- **Cron Setup** - Set up system cron to run the script every 10 minutes
- **API Integration** - Fetches data from Finnhub and Polygon APIs

## 🌐 API Endpoints

- `GET /api/earnings` - Get today's earnings data with guidance calculations
- `GET /api/earnings/stats` - Get earnings statistics

## 🚀 Deployment

### Ubuntu VPS Deployment

1. **Install dependencies on Ubuntu**

   ```bash
   # Install Node.js 20.x
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Set up the application**

   ```bash
   git clone <repository-url>
   cd EarningsTableUbuntu
   npm install
   npm run build
   ```

3. **Set up cron job for data ingestion**

   ```bash
   # Add to crontab (run every 10 minutes)
   */10 * * * * cd /path/to/EarningsTableUbuntu && npm run fetch:data
   ```

4. **Start the application**
   ```bash
   npm start
   ```

## 📈 Performance Features

- **Efficient Sorting** - Fast client-side sorting and filtering
- **Guidance Analytics** - Real-time guidance surprise calculations
- **Simple Architecture** - Easy to deploy and maintain
- **Database Indexing** - Optimized queries with Prisma
- **Type Safety** - Full TypeScript support

## 🔧 Configuration

### Environment Variables

| Variable          | Description                                    | Required |
| ----------------- | ---------------------------------------------- | -------- |
| `DATABASE_URL`    | Database connection string (SQLite/PostgreSQL) | Yes      |
| `POLYGON_API_KEY` | Polygon.io API key                             | Yes      |
| `FINNHUB_API_KEY` | Finnhub API key                                | Yes      |
| `NODE_ENV`        | Environment (development/production)           | No       |

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
