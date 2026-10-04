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
    <div className="flex flex-wrap items-center gap-2 mb-6 p-2 bg-bg-surface rounded-xl border border-bg-border">
      <button
        onClick={() => onSelectStation('ALL')}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
          selectedStation === 'ALL'
            ? 'bg-sky-500 text-white shadow-sm shadow-sky-600/40'
            : 'text-slate-400 hover:text-slate-200 hover:bg-bg-hover'
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
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              isActive
                ? 'bg-sky-500 text-white shadow-sm shadow-sky-600/40'
                : 'text-slate-300 hover:text-white bg-bg-card border border-bg-border/60 hover:bg-bg-hover'
            }`}
          >
            <span>{stn}</span>
            {count > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-sky-700 text-white' : 'bg-slate-800 text-sky-400 border border-sky-800/40'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
