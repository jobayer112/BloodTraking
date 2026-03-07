import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Droplets, Users, Heart, Bell, Search, MessageSquare, MapPin, Navigation } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn, BLOOD_GROUPS } from '../utils/helpers';
import BloodDonationAnimation from '../components/BloodDonationAnimation';

const Home = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [searchFilters, setSearchFilters] = React.useState({
    bloodGroup: '',
    radius: '20'
  });

  const stats = [
    { label: t('active_donors'), value: '1,200+', icon: Users, color: 'text-blue-600' },
    { label: t('requests'), value: '450+', icon: Droplets, color: 'text-red-600' },
    { label: t('lives_saved'), value: '3,000+', icon: Heart, color: 'text-pink-600' },
    { label: t('emergency_alerts'), value: '12', icon: Bell, color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden bg-zinc-900 text-white py-20">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://picsum.photos/seed/blood/1920/1080?blur=4" 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-40"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-zinc-900/50" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center space-y-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <BloodDonationAnimation />
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold tracking-tighter"
          >
            {t('hero_title').split(',')[0]}, <span className="text-red-600">{t('hero_title').split(',')[1]}</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-zinc-300 max-w-2xl mx-auto"
          >
            {t('hero_subtitle')}
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link 
              to="/search" 
              className="w-full sm:w-auto px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-red-600/20"
            >
              {t('find_donor')}
            </Link>
            <Link 
              to="/requests" 
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-zinc-100 text-zinc-900 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
            >
              {t('request_blood')}
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-3xl mx-auto pt-4"
          >
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-[32px] shadow-2xl space-y-6">
              <div className="flex items-center gap-2 text-white/80 mb-2">
                <Search className="h-5 w-5 text-red-500" />
                <h3 className="font-bold text-lg">Find Blood Donor Near You</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider ml-2">Blood Group</label>
                  <select
                    value={searchFilters.bloodGroup}
                    onChange={(e) => setSearchFilters({ ...searchFilters, bloodGroup: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 text-white appearance-none"
                  >
                    <option value="" className="bg-zinc-900">Select Group</option>
                    {BLOOD_GROUPS.map(g => <option key={g} value={g} className="bg-zinc-900">{g}</option>)}
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider ml-2">Radius (km)</label>
                  <select
                    value={searchFilters.radius}
                    onChange={(e) => setSearchFilters({ ...searchFilters, radius: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 text-white appearance-none"
                  >
                    <option value="5" className="bg-zinc-900">5 km</option>
                    <option value="10" className="bg-zinc-900">10 km</option>
                    <option value="20" className="bg-zinc-900">20 km</option>
                    <option value="50" className="bg-zinc-900">50 km</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => navigate(`/search?group=${searchFilters.bloodGroup}&radius=${searchFilters.radius}`)}
                    className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                  >
                    <Search className="h-5 w-5" />
                    Search Donors
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 pt-2 border-t border-white/10">
                <div className="flex items-center gap-1.5 text-xs text-white/60">
                  <Navigation className="h-3.5 w-3.5" />
                  Auto-detect Location
                </div>
                <div className="h-1 w-1 rounded-full bg-white/20" />
                <div className="text-xs text-white/60">
                  {profile?.district || 'Satkhira'}, {profile?.division || 'Khulna'}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-zinc-800 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-700 shadow-sm text-center space-y-2"
            >
              <stat.icon className={cn("h-8 w-8 mx-auto", stat.color)} />
              <div className="text-3xl font-bold text-zinc-900 dark:text-white">{stat.value}</div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Emergency Section */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">{t('emergency_title')}</h2>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-xl">
              {t('emergency_desc')}
            </p>
          </div>
          <Link 
            to="/requests" 
            className="px-8 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all flex items-center gap-2"
          >
            <Droplets className="h-5 w-5" />
            {t('request_blood')}
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">{t('why_choose')}</h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
            We've built a professional platform to make blood donation seamless and efficient.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: t('smart_matching'),
              desc: t('smart_matching_desc'),
              icon: Search
            },
            {
              title: t('contact_donors'),
              desc: "Find blood donors directly from your phone's contact list with one click.",
              icon: Users
            },
            {
              title: t('realtime_alerts'),
              desc: t('realtime_alerts_desc'),
              icon: Bell
            },
            {
              title: t('social_community'),
              desc: t('social_community_desc'),
              icon: MessageSquare
            }
          ].map((feature, index) => (
            <div key={index} className="p-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl space-y-4 border border-zinc-100 dark:border-zinc-700">
              <div className="h-12 w-12 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
                <feature.icon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{feature.title}</h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
