// Data quality monitoring utilities
export interface DataQualityMetrics {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  missingFields: string[];
  coverage: number;
}

export class DataQualityMonitor {
  static validateEarningsData(data: any[]): DataQualityMetrics {
    const totalRecords = data.length;
    let validRecords = 0;
    const missingFields: string[] = [];
    
    data.forEach((record, index) => {
      const requiredFields = ['ticker', 'reportDate'];
      const hasAllRequired = requiredFields.every(field => {
        if (!record[field]) {
          missingFields.push(`Record ${index}: missing ${field}`);
          return false;
        }
        return true;
      });
      
      if (hasAllRequired) {
        validRecords++;
      }
    });
    
    const invalidRecords = totalRecords - validRecords;
    const coverage = totalRecords > 0 ? (validRecords / totalRecords) * 100 : 0;
    
    return {
      totalRecords,
      validRecords,
      invalidRecords,
      missingFields,
      coverage
    };
  }
  
  static getQualityScore(metrics: DataQualityMetrics): number {
    return metrics.coverage;
  }
  
  static shouldAlert(metrics: DataQualityMetrics, threshold: number = 80): boolean {
    return metrics.coverage < threshold;
  }
}