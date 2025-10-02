# 📁 Project Structure

## 🎯 **Cleanup Summary (October 2025)**

This document reflects the cleaned and unified project structure after removing duplicates and consolidating utilities.

## 📂 **Root Directory**

```
EarningsTableUbuntu/
├── src/                          # Main source code
├── docs/                         # Documentation
├── scripts/                      # Build and utility scripts
├── deployment/                   # Docker deployment files
├── prisma/                       # Database schema and migrations
├── public/                       # Static assets
├── node_modules/                 # Dependencies
├── package.json                  # Project configuration
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── next.config.js                # Next.js configuration
├── .env                          # Environment variables
├── .env.production               # Production environment
├── .gitignore                    # Git ignore rules
└── README.md                     # Project overview
```

## 🏗️ **Source Code Structure (`src/`)**

### **Core Application**

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── earnings/             # Earnings data endpoints
│   │   ├── monitoring/           # Health and metrics
│   │   └── data-quality/         # Data quality checks
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/                   # React components
│   ├── earnings/                 # Earnings-specific components
│   ├── ui/                       # Reusable UI components
│   └── *.tsx                     # Main components
├── lib/                          # External library setup
│   ├── prisma.ts                 # Database client
│   ├── redis-cache.ts            # Redis client
│   ├── monitoring.ts             # Monitoring setup
│   └── validation.ts             # Request validation
└── middleware.ts                 # Next.js middleware
```

### **Modular Architecture (`src/modules/`)**

```
src/modules/
├── index.ts                      # Main module exports
├── earnings/                     # Earnings business domain
│   ├── index.ts                  # Domain exports
│   ├── services/                 # Business logic
│   ├── repositories/             # Data access layer
│   ├── types/                    # Type definitions
│   └── utils/                    # Domain utilities
├── market-data/                  # Market data domain
│   ├── index.ts                  # Domain exports
│   ├── services/                 # Business logic
│   ├── repositories/             # Data access layer
│   ├── types/                    # Type definitions
│   └── utils/                    # Domain utilities
├── shared/                       # Common utilities
│   ├── index.ts                  # Shared exports
│   ├── config/                   # Configuration
│   ├── constants/                # App constants
│   ├── types/                    # Common types
│   ├── utils/                    # Shared utilities
│   ├── validation/               # Data validation
│   └── monitoring/               # Monitoring utilities
└── data-integration/             # Cross-domain services
    ├── services/                 # Integration services
    ├── types/                    # Integration types
    └── utils/                    # Integration utilities
```

### **Background Jobs**

```
src/
├── jobs/                         # Background job scripts
│   └── fetch-today.ts            # Daily data fetching
├── queue/                        # Job queue system
│   ├── worker-new.js             # Cron worker
│   └── jobs/                     # Queue job definitions
└── services/                     # Service layer
    └── earnings/                 # Earnings services
```

### **Testing**

```
src/
├── __tests__/                    # Test files
│   ├── api-*.test.js             # API tests
│   ├── components/               # Component tests
│   ├── lib/                      # Library tests
│   └── *.test.ts                 # Unit tests
└── utils/                        # Test utilities
```

## 🔧 **Shared Utilities (`src/modules/shared/utils/`)**

### **Unified Utility Structure**

```
src/modules/shared/utils/
├── index.ts                      # Main exports
├── bigint.utils.ts               # BigInt handling
├── date.utils.ts                 # Date/time utilities
├── format.utils.ts               # Formatting functions
├── json.utils.ts                 # JSON serialization
└── number.utils.ts               # Number utilities
```

### **Key Features**

- **Centralized exports** - All utilities accessible via `@/modules/shared`
- **Type safety** - Full TypeScript support
- **BigInt handling** - Safe serialization and formatting
- **Date utilities** - NY timezone support and market hours
- **Smart formatting** - Automatic microunits detection
- **JSON safety** - BigInt serialization for APIs

## 🚀 **Deployment Structure**

### **Docker Configuration**

```
deployment/
├── docker-compose.yml            # Development setup
├── docker-compose.optimized.yml  # Optimized setup
└── Dockerfile                    # Container definition
```

### **Production Scripts**

```
├── deploy-production.bat         # Windows production deployment
├── deploy-production.sh          # Linux production deployment
├── backup-production.sh          # Database backup
├── monitor-production.sh         # Production monitoring
└── pm2-deploy.sh                 # PM2 deployment
```

## 📚 **Documentation (`docs/`)**

```
docs/
├── README.md                     # Project overview
├── API_SETUP.md                  # API configuration
├── CLEANUP_SUMMARY.md            # Cleanup documentation
├── DATA_QUALITY.md               # Data quality guidelines
├── PROJECT_STRUCTURE.md          # This file
├── REFACTORING_SUMMARY.md        # Refactoring details
└── SERVER-DEPLOYMENT-GUIDE.md    # Server deployment
```

## 🎯 **Import Conventions**

### **Unified Import Structure**

```typescript
// ✅ CORRECT - Business modules
import { EarningsService } from "@/modules/earnings";
import { MarketDataService } from "@/modules/market-data";
import { formatDate, toJSONSafe } from "@/modules/shared";

// ✅ CORRECT - External libraries
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/validation";

// ❌ AVOID - Direct utility imports
import { formatDate } from "@/lib/dates"; // Use @/modules/shared instead
```

### **Module Organization**

- **`@/modules/`** - Business logic and domain-specific code
- **`@/lib/`** - External library setup and configuration
- **`@/components/`** - React components
- **`@/app/`** - Next.js App Router pages and API routes

## 🔄 **Migration Notes**

### **What Was Cleaned Up**

1. **Removed duplicate `et_new/` directory** - Eliminated complete project duplication
2. **Unified utilities** - Moved from `src/lib/` to `src/modules/shared/utils/`
3. **Consolidated deployment scripts** - Removed duplicate `.bat` and `.sh` files
4. **Updated imports** - All imports now use unified `@/modules/shared` convention
5. **Removed timestamp files** - Cleaned up temporary deployment trigger files

### **Benefits**

- **Better maintainability** - Single source of truth for utilities
- **Improved readability** - Clear separation of concerns
- **Type safety** - Centralized type definitions
- **Consistent imports** - Unified import conventions
- **Reduced duplication** - No more duplicate files or directories

## 🚀 **Getting Started**

1. **Install dependencies**: `npm install`
2. **Setup environment**: Copy `.env.example` to `.env`
3. **Run development**: `npm run dev`
4. **Start cron jobs**: `npm run cron`
5. **View application**: `http://localhost:3000`

## 📖 **Further Reading**

- [API Setup Guide](API_SETUP.md)
- [Refactoring Summary](REFACTORING_SUMMARY.md)
- [Data Quality Guidelines](DATA_QUALITY.md)
- [Server Deployment Guide](../SERVER-DEPLOYMENT-GUIDE.md)
