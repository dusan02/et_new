'use client';

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Disclaimer</h3>
            <p className="text-sm text-gray-600 max-w-4xl mx-auto leading-relaxed">
              This website provides company earnings reports, guidance data, and related financial information 
              for informational and educational purposes only. While we strive for accuracy, we cannot guarantee 
              that the information is complete, correct, or up to date. The information is provided as-is and is 
              not intended as investment advice. We are not affiliated with any company mentioned.
            </p>
          </div>
          
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              © 2025 EarningsTable. All rights reserved. | Data sourced from Polygon.io
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}


