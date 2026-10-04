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
      <div className="flex items-center space-x-2 p-1.5 glass-panel rounded-2xl border border-white/10 backdrop-blur-xl shadow-glass flex-nowrap">
        <button
          onClick={() => onSelectStation('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide whitespace-nowrap transition-all duration-200 ${
            selectedStation === 'ALL'
              ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-glow-sky border border-sky-400/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
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
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-glow-sky border border-sky-400/40'
                  : 'text-slate-300 hover:text-white bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/15'
              }`}
            >
              <span>{stn}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-sky-800 text-white' : 'bg-slate-800/90 text-sky-300 border border-sky-500/30'
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

