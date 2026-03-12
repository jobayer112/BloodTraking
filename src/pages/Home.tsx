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
    <div className="space-y-24 pb-24">
      {/* Hero Section */}
      <section className="relative min-h-[800px] flex items-center justify-center overflow-hidden py-20">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://picsum.photos/seed/medical/1920/1080?blur=2" 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-20 dark:opacity-10"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white/50 to-white dark:from-zinc-950 dark:via-zinc-950/50 dark:to-zinc-950" />
          
          {/* Animated Background Elements */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-red-600/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '-2s' }} />
        </div>
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 text-center space-y-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-full text-xs font-bold tracking-widest uppercase border border-red-100 dark:border-red-900/30"
          >
            <Droplets className="h-4 w-4" />
            Join the mission to save lives
          </motion.div>

          <div className="space-y-6">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-6xl md:text-8xl font-black tracking-tight text-zinc-900 dark:text-white leading-[0.9]"
            >
              Every Drop <br />
              <span className="text-red-600">Saves a Life.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto font-medium"
            >
              {t('hero_subtitle')}
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <Link 
              to="/search" 
              className="btn-primary py-5 px-10 text-lg shadow-2xl shadow-red-600/40"
            >
              <Search className="h-5 w-5" />
              {t('find_donor')}
            </Link>
            <Link 
              to="/requests" 
              className="px-10 py-5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-2xl font-bold text-lg transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center gap-2"
            >
              <Droplets className="h-5 w-5" />
              {t('request_blood')}
            </Link>
          </motion.div>

          {/* Quick Search Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="max-w-4xl mx-auto pt-8"
          >
            <div className="card !p-8 shadow-2xl border-zinc-200/50 dark:border-zinc-800/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2 text-left">
                  <label className="label-text ml-1">Blood Group</label>
                  <select
                    value={searchFilters.bloodGroup}
                    onChange={(e) => setSearchFilters({ ...searchFilters, bloodGroup: e.target.value })}
                    className="input-field font-bold text-red-600"
                  >
                    <option value="">Select Group</option>
                    {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div className="space-y-2 text-left">
                  <label className="label-text ml-1">Radius (km)</label>
                  <select
                    value={searchFilters.radius}
                    onChange={(e) => setSearchFilters({ ...searchFilters, radius: e.target.value })}
                    className="input-field"
                  >
                    <option value="5">5 km</option>
                    <option value="10">10 km</option>
                    <option value="20">20 km</option>
                    <option value="50">50 km</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => navigate(`/search?group=${searchFilters.bloodGroup}&radius=${searchFilters.radius}`)}
                    className="btn-primary w-full py-4"
                  >
                    <Search className="h-5 w-5" />
                    Search Donors
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-6 pt-6 mt-6 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                  <Navigation className="h-4 w-4 text-red-600" />
                  Auto-detect Location
                </div>
                <div className="h-1 w-1 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                <div className="text-xs font-bold text-zinc-500">
                  {profile?.district || 'Satkhira'}, {profile?.division || 'Khulna'}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="card text-center space-y-3 group hover:border-red-600/30 transition-all"
            >
              <div className={cn("p-3 rounded-2xl w-fit mx-auto bg-zinc-50 dark:bg-zinc-800 group-hover:scale-110 transition-transform", stat.color)}>
                <stat.icon className="h-8 w-8" />
              </div>
              <div className="text-4xl font-black text-zinc-900 dark:text-white">{stat.value}</div>
              <div className="text-xs text-zinc-400 font-bold uppercase tracking-widest">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Emergency Section */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="bg-red-600 rounded-[3rem] p-10 md:p-20 flex flex-col md:flex-row items-center justify-between gap-12 relative overflow-hidden shadow-2xl shadow-red-600/20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl -ml-32 -mb-32" />
          
          <div className="space-y-6 text-center md:text-left relative z-10">
            <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">{t('emergency_title')}</h2>
            <p className="text-red-100 text-lg max-w-xl font-medium">
              {t('emergency_desc')}
            </p>
          </div>
          <Link 
            to="/requests" 
            className="px-10 py-5 bg-white text-red-600 rounded-2xl font-black text-lg hover:scale-105 transition-all shadow-xl relative z-10 flex items-center gap-3"
          >
            <Droplets className="h-6 w-6" />
            {t('request_blood')}
          </Link>
        </div>
      </section>



      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 space-y-16">
        <div className="text-center space-y-4">
          <div className="text-red-600 font-black text-xs uppercase tracking-[0.3em]">Why BloodTraking</div>
          <h2 className="text-5xl font-black tracking-tight text-zinc-900 dark:text-white">{t('why_choose')}</h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto font-medium">
            We've built a professional platform to make blood donation seamless and efficient.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              title: t('smart_matching'),
              desc: t('smart_matching_desc'),
              icon: Search,
              color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
            },
            {
              title: t('contact_donors'),
              desc: "Find blood donors directly from your phone's contact list with one click.",
              icon: Users,
              color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
            },
            {
              title: t('realtime_alerts'),
              desc: t('realtime_alerts_desc'),
              icon: Bell,
              color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600'
            },
            {
              title: t('social_community'),
              desc: t('social_community_desc'),
              icon: MessageSquare,
              color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600'
            }
          ].map((feature, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="card group hover:border-zinc-300 dark:hover:border-zinc-600 transition-all"
            >
              <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center mb-6 ring-4 ring-white dark:ring-zinc-900 shadow-sm group-hover:scale-110 transition-transform", feature.color)}>
                <feature.icon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">{feature.title}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed text-sm font-medium">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
