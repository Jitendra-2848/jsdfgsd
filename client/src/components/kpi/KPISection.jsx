import React from 'react';
import { KPICard } from './KPICard';
import { Activity, Target, Compass, Zap } from 'lucide-react';
import { SkeletonLoader } from '../ui/SkeletonLoader';

export function KPISection({ summary, loading }) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card-panel p-4 space-y-3">
            <div className="flex justify-between">
              <SkeletonLoader width="w-20" height="h-4" />
              <SkeletonLoader width="w-12" height="h-4" />
            </div>
            <SkeletonLoader width="w-32" height="h-8" />
            <SkeletonLoader width="w-full" height="h-3" />
          </div>
        ))}
      </div>
    );
  }

  const {
    mae = 0,
    rmse = 0,
    mape = 0,
    mbe = 0,
    avgActualMW = 0,
    avgForecastMW = 0,
    overForecastPct = 0,
    underForecastPct = 0,
    netImbalanceMWh = 0,
  } = summary;

  const isOverforecastBiased = mbe > 0;
  const biasLabel = mbe === 0 ? 'Balanced' : isOverforecastBiased ? 'Over-Forecast' : 'Under-Forecast';
  const biasVariant = isOverforecastBiased ? 'error' : 'surplus';

  return (
    <section className="mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Mean Absolute Error (MAE)"
          value={mae.toLocaleString()}
          unit="MW"
          subtitle={`${mape.toFixed(1)}% MAPE across delivery intervals`}
          badgeText={mae < 800 ? 'Low Volatility' : 'High Volatility'}
          badgeVariant={mae < 800 ? 'actual' : 'error'}
          accentColor="#96732D"
          icon={Target}
        />

        <KPICard
          title="Root Mean Sq. Error (RMSE)"
          value={rmse.toLocaleString()}
          unit="MW"
          subtitle={`Spread vs MAE: +${(rmse - mae).toFixed(0)} MW volatility`}
          badgeText={`Peak Gap`}
          badgeVariant="neutral"
          accentColor="#B84F49"
          icon={Activity}
        />

        <KPICard
          title="Mean Bias Error (MBE)"
          value={`${mbe > 0 ? '+' : ''}${mbe.toLocaleString()}`}
          unit="MW"
          subtitle={
            isOverforecastBiased
              ? 'Forecast exceeds actuals (Thermal deficit risk)'
              : 'Actuals exceed forecast (Renewable surplus)'
          }
          badgeText={biasLabel}
          badgeVariant={biasVariant}
          accentColor={isOverforecastBiased ? '#B84F49' : '#416F9C'}
          icon={Compass}
        />

        <KPICard
          title="Avg Wind Generation"
          value={Math.round(avgActualMW).toLocaleString()}
          unit="MW"
          subtitle={`Forecast: ${Math.round(avgForecastMW).toLocaleString()} MW (${overForecastPct}% over / ${underForecastPct}% under)`}
          badgeText={`${(netImbalanceMWh / 1000).toFixed(1)} GWh net`}
          badgeVariant={netImbalanceMWh >= 0 ? 'error' : 'surplus'}
          accentColor="#527D68"
          icon={Zap}
        />
      </div>
    </section>
  );
}
