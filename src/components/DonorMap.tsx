import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, Droplets, Phone, User, CheckCircle, Navigation } from 'lucide-react';
import { UserProfile } from '../types';

interface DonorMapProps {
  donors: UserProfile[];
}

const DonorMap: React.FC<DonorMapProps> = ({ donors }) => {
  const [selectedDonor, setSelectedDonor] = useState<UserProfile | null>(null);

  // This is a simulated map view using a grid/visual representation 
  // since real Google Maps requires an API key and specific setup
  return (
    <div className="relative h-[600px] bg-zinc-100 dark:bg-zinc-800 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
      {/* Simulated Map Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0" style={{ 
          backgroundImage: 'radial-gradient(circle, #ccc 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }} />
      </div>

      {/* Map Markers */}
      <div className="absolute inset-0 p-12">
        {donors.map((donor, index) => {
          // Deterministic random positions based on UID
          const x = (donor.uid.charCodeAt(0) * 7) % 80 + 10;
          const y = (donor.uid.charCodeAt(1) * 7) % 80 + 10;

          return (
            <motion.button
              key={donor.uid}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => setSelectedDonor(donor)}
              className="absolute group"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div className="relative">
                <div className="h-10 w-10 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white transform group-hover:scale-110 transition-transform">
                  <Droplets className="h-5 w-5" />
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white dark:bg-zinc-900 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm border border-zinc-100 dark:border-zinc-800">
                  {donor.bloodGroup}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Donor Details Overlay */}
      {selectedDonor && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-80 bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-2xl border border-zinc-100 dark:border-zinc-800 space-y-4"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <User className="h-6 w-6 text-zinc-400" />
              </div>
              <div>
                <h4 className="font-bold flex items-center gap-1">
                  {selectedDonor.name}
                  {selectedDonor.isVerified && <CheckCircle className="h-3 w-3 text-blue-500" />}
                </h4>
                <p className="text-xs text-zinc-500">{selectedDonor.district}</p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedDonor(null)}
              className="text-zinc-400 hover:text-zinc-600"
            >
              <Plus className="h-5 w-5 rotate-45" />
            </button>
          </div>

          <div className="flex items-center justify-between py-2 border-y border-zinc-50 dark:border-zinc-800/50">
            <span className="text-xs font-bold text-zinc-400 uppercase">Blood Group</span>
            <span className="text-lg font-bold text-red-600">{selectedDonor.bloodGroup}</span>
          </div>

          <div className="flex gap-2">
            <a
              href={`tel:${selectedDonor.phone}`}
              className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-sm"
            >
              <Phone className="h-4 w-4" />
              Call
            </a>
            <button className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 rounded-xl">
              <Navigation className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Map Controls */}
      <div className="absolute top-6 right-6 flex flex-col gap-2">
        <div className="bg-white dark:bg-zinc-900 p-2 rounded-xl shadow-lg border border-zinc-100 dark:border-zinc-800">
          <div className="text-[10px] font-bold text-zinc-400 uppercase px-2 pb-1">Legend</div>
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="h-2 w-2 bg-red-600 rounded-full" />
            <span className="text-[10px] font-medium">Available Donor</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Plus = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14M12 5v14"/></svg>
);

export default DonorMap;
