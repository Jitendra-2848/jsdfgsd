/**
 * Utility to export matched wind forecast & actual records to CSV.
 */
export function exportMatchedDataToCsv(data, filename = 'uk_wind_day_ahead_matched.csv') {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return;
  }

  const headers = [
    'Timestamp_UTC',
    'DeliveryDate',
    'SettlementPeriod',
    'Actual_MW',
    'Forecast_MW',
    'Error_MW',
    'AbsError_MW',
    'PercentageError_Pct',
  ];

  const rows = data.map((d) => [
    d.timestamp || '',
    d.deliveryDate || '',
    d.settlementPeriod || '',
    d.actualMW !== undefined ? d.actualMW : '',
    d.forecastMW !== undefined ? d.forecastMW : '',
    d.errorMW !== undefined ? d.errorMW : '',
    d.absErrorMW !== undefined ? d.absErrorMW : '',
    d.percentageError !== undefined ? d.percentageError : '',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
