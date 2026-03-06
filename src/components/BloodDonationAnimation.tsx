import React from 'react';
import { motion } from 'motion/react';
import { User, Droplet, Hand, Heart } from 'lucide-react';

const BloodDonationAnimation = () => {
  return (
    <div className="relative w-full max-w-md mx-auto h-56 flex items-center justify-between px-8 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 overflow-hidden">
      {/* Donor */}
      <div className="flex flex-col items-center gap-2 z-10 relative">
        <motion.div 
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          className="h-16 w-16 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/30 relative"
        >
          <User className="h-8 w-8 text-red-400" />
        </motion.div>
        <span className="text-xs font-bold text-red-200 uppercase tracking-wider">Donor</span>
        
        {/* Donor Hand Pouring */}
        <motion.div 
          animate={{ rotate: [0, -20, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          className="absolute -right-8 top-8 text-red-300 origin-bottom-left"
        >
          <Hand className="h-6 w-6 transform rotate-90" />
        </motion.div>
      </div>

      {/* Animated Blood Drop (Arc) */}
      <motion.div
        animate={{ 
          x: [0, 80, 160],
          y: [0, -30, 20],
          opacity: [0, 1, 1, 0],
          scale: [0.5, 1, 1, 0.5]
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 2.5, 
          ease: "easeInOut",
          times: [0, 0.4, 0.8, 1]
        }}
        className="absolute left-[110px] top-[100px] z-20"
      >
        <div className="relative">
          <Droplet className="h-6 w-6 text-red-500 fill-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
          <motion.div 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="absolute inset-0 bg-red-500 blur-md rounded-full -z-10"
          />
        </div>
      </motion.div>

      {/* Receiver */}
      <div className="flex flex-col items-center gap-2 z-10 relative">
        <motion.div 
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", delay: 1 }}
          className="h-16 w-16 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/30 relative"
        >
          <User className="h-8 w-8 text-blue-400" />
        </motion.div>
        <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">Receiver</span>

        {/* Receiver Hand Catching */}
        <motion.div 
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", delay: 0.5 }}
          className="absolute -left-8 top-10 text-blue-300"
        >
          <Hand className="h-6 w-6 transform -rotate-45" />
        </motion.div>
        
        {/* Heart pop when received */}
        <motion.div
          animate={{ 
            scale: [0, 1.5, 0],
            opacity: [0, 1, 0],
            y: [0, -20, -40]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 2.5, 
            ease: "easeOut",
            delay: 2 // Sync with drop arrival
          }}
          className="absolute -left-4 top-4 z-30"
        >
          <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />
        </motion.div>
      </div>
    </div>
  );
};

export default BloodDonationAnimation;
