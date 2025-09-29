/**
 * 📊 EARNINGS TABLE ROW
 * Modulárny row komponent pre earnings tabuľku
 */

import { memo } from 'react';
import { EarningsData } from './types';
import {
  formatPercent,
  formatPrice,
  formatMarketCap,
  formatMarketCapDiff,
  getChangeColor,
  getSurpriseColor,
  getReportTimeLabel,
  getReportTimeColor,
  calculateEpsSurprise,
  calculateRevenueSurprise
} from './utils';

interface EarningsRowProps {
  data: EarningsData;
  index: number;
  style?: React.CSSProperties;
}

export const EarningsRow = memo(function EarningsRow({
  data,
  index,
  style
}: EarningsRowProps) {
  const epsSurprise = calculateEpsSurprise(data.epsActual, data.epsEstimate);
  const revenueSurprise = calculateRevenueSurprise(data.revenueActual, data.revenueEstimate);

  return (
    <tr
      className="hover:bg-gray-50 border-b border-gray-200"
      style={style}
    >
      {/* Index */}
      <td className="px-4 py-3 text-sm text-gray-500">
        {index + 1}
      </td>

      {/* Ticker */}
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        <div className="flex flex-col">
          <span className="font-semibold">{data.ticker}</span>
          <span className="text-xs text-gray-500">{data.companyName}</span>
        </div>
      </td>

      {/* Report Time */}
      <td className="px-4 py-3 text-sm">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getReportTimeColor(data.reportTime)}`}>
          {getReportTimeLabel(data.reportTime)}
        </span>
      </td>

      {/* Size */}
      <td className="px-4 py-3 text-sm text-gray-900">
        {data.size || 'N/A'}
      </td>

      {/* Market Cap */}
      <td className="px-4 py-3 text-sm text-gray-900">
        {formatMarketCap(data.marketCap)}
      </td>

      {/* Cap Diff */}
      <td className="px-4 py-3 text-sm">
        <div className="flex flex-col">
          <span className={getChangeColor(data.marketCapDiff)}>
            {formatPercent(data.marketCapDiff)}
          </span>
          <span className="text-xs text-gray-500">
            {formatMarketCapDiff(data.marketCapDiffBillions)}
          </span>
        </div>
      </td>

      {/* Price */}
      <td className="px-4 py-3 text-sm text-gray-900">
        {formatPrice(data.currentPrice)}
      </td>

      {/* Change */}
      <td className="px-4 py-3 text-sm">
        <span className={getChangeColor(data.priceChangePercent)}>
          {formatPercent(data.priceChangePercent)}
        </span>
      </td>

      {/* EPS Estimate */}
      <td className="px-4 py-3 text-sm text-gray-900">
        {data.epsEstimate !== null ? `$${data.epsEstimate.toFixed(2)}` : 'N/A'}
      </td>

      {/* EPS Actual */}
      <td className="px-4 py-3 text-sm text-gray-900">
        {data.epsActual !== null ? `$${data.epsActual.toFixed(2)}` : 'N/A'}
      </td>

      {/* EPS Surprise */}
      <td className="px-4 py-3 text-sm">
        <span className={getSurpriseColor(epsSurprise)}>
          {formatPercent(epsSurprise)}
        </span>
      </td>

      {/* Revenue Estimate */}
      <td className="px-4 py-3 text-sm text-gray-900">
        {data.revenueEstimate !== null ? formatMarketCap(data.revenueEstimate) : 'N/A'}
      </td>

      {/* Revenue Actual */}
      <td className="px-4 py-3 text-sm text-gray-900">
        {data.revenueActual !== null ? formatMarketCap(data.revenueActual) : 'N/A'}
      </td>

      {/* Revenue Surprise */}
      <td className="px-4 py-3 text-sm">
        <span className={getSurpriseColor(revenueSurprise)}>
          {formatPercent(revenueSurprise)}
        </span>
      </td>
    </tr>
  );
});
