import React from 'react';
import { StationWorkload } from '../types/index.js';

interface StationFilterProps {
  selectedStation: string;
  onSelectStation: (station: string) => void;
  stations: string[];
  stationWorkloads: StationWorkload[];
}

export const StationFilter: React.FC<StationFilterProps> = ({
  selectedStation,
  onSelectStation,
  stations,
  stationWorkloads,
}) => {
  const getWorkload = (station: string) => {
    return stationWorkloads.find((w) => w.station.toLowerCase() === station.toLowerCase());
  };

  return (
    <div className="flex items-center space-x-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
      <div className="flex items-center space-x-2 p-1.5 bg-neu-sunken rounded-2xl border border-neu-borderSubtle shadow-neu-inset-sm flex-nowrap">
        <button
          onClick={() => onSelectStation('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-wide whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95 ${
            selectedStation === 'ALL'
              ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-glow-sky border border-sky-400/40'
              : 'bg-neu-surface text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-neu-border shadow-neu-raised-sm hover:shadow-neu-raised'
          }`}
        >
          All Stations
        </button>

        {stations.map((stn) => {
          const workload = getWorkload(stn);
          const isActive = selectedStation.toLowerCase() === stn.toLowerCase();
          const count = workload?.total_active ?? 0;

          return (
            <button
              key={stn}
              onClick={() => onSelectStation(stn)}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-wide whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-glow-sky border border-sky-400/40'
                  : 'bg-neu-surface text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-neu-border shadow-neu-raised-sm hover:shadow-neu-raised'
              }`}
            >
              <span>{stn}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? 'bg-sky-800 text-white'
                      : 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
