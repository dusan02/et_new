const { PrismaClient } = require('@prisma/client');

async function testPriceChange() {
  const prisma = new PrismaClient();
  
  try {
    const results = await prisma.todayEarningsMovements.findMany({
      select: {
        ticker: true,
        currentPrice: true,
        previousClose: true,
        priceChangePercent: true
      },
      where: {
        priceChangePercent: {
          not: null
        }
      },
      take: 10
    });
    
    console.log('Price change data:');
    results.forEach(row => {
      console.log(`${row.ticker}: ${row.currentPrice} -> ${row.previousClose} = ${row.priceChangePercent}%`);
    });
    
    const nonZeroCount = await prisma.todayEarningsMovements.count({
      where: {
        priceChangePercent: {
          not: null,
          not: 0
        }
      }
    });
    
    console.log(`\nNon-zero price changes: ${nonZeroCount}`);
    
  } finally {
    await prisma.$disconnect();
  }
}

testPriceChange().catch(console.error);
