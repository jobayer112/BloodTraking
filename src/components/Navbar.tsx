import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Search, 
  PlusSquare, 
  MessageSquare, 
  User, 
  Users,
  Settings,
  Bell,
  Menu,
  X,
  Droplets,
  Share2
} from 'lucide-react';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/helpers';
import { motion, AnimatePresence } from 'motion/react';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  const { profile, signOut } = useAuth();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [unreadMessages, setUnreadMessages] = React.useState(0);

  React.useEffect(() => {
    if (!profile) return;

    // Notifications count
    const qNotify = query(
      collection(db, 'notifications'),
      where('userId', '==', profile.uid),
      where('isRead', '==', false)
    );

    const unsubNotify = onSnapshot(qNotify, (snapshot) => {
      setUnreadCount(snapshot.size);
    }, (error) => {
      console.error("Navbar Notifications Error:", error);
    });

    // Messages count
    const qMessages = query(
      collection(db, 'chatRooms'),
      where('participants', 'array-contains', profile.uid)
    );

    const unsubMessages = onSnapshot(qMessages, (snapshot) => {
      let total = 0;
      snapshot.docs.forEach(doc => {
        total += (doc.data().unreadCount?.[profile.uid] || 0);
      });
      setUnreadMessages(total);
    }, (error) => {
      console.error("Navbar Messages Error:", error);
    });

    return () => {
      unsubNotify();
      unsubMessages();
    };
  }, [profile]);

  const navItems = [
    { name: t('home'), path: '/', icon: Home },
    { name: t('find_donor'), path: '/search', icon: Search },
    { name: 'Community', path: '/feed', icon: Users },
    { name: t('requests'), path: '/requests', icon: PlusSquare },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
    { name: t('profile'), path: '/profile', icon: User },
  ];

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'bn' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="h-10 w-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/20 group-hover:scale-110 transition-transform">
                <Droplets className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight hidden sm:block">
                Blood<span className="text-red-600">Traking</span>
              </span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center px-4 py-2 rounded-xl text-sm font-bold transition-all",
                  location.pathname === item.path
                    ? "text-red-600 bg-red-50 dark:bg-red-900/20"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-red-600 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                )}
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.name}
                {item.path === '/messages' && unreadMessages > 0 && (
                  <span className="ml-2 h-5 w-5 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full ring-2 ring-white dark:ring-zinc-900">
                    {unreadMessages}
                  </span>
                )}
              </Link>
            ))}
            
            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-2" />

            {profile && (
              <Link 
                to="/notifications" 
                className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-red-600 relative transition-colors"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full ring-2 ring-white dark:ring-zinc-900">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )}

            <ThemeToggle />
            
            <button
              onClick={toggleLanguage}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold uppercase hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              {i18n.language === 'en' ? 'BN' : 'EN'}
            </button>

            {profile ? (
              <div className="flex items-center gap-3 ml-2">
                {profile.role !== 'donor' && (
                  <Link
                    to="/register-donor"
                    className="btn-primary py-2 px-4 text-xs"
                  >
                    Be a Donor
                  </Link>
                )}
                <button
                  onClick={() => signOut()}
                  className="px-4 py-2 text-zinc-600 dark:text-zinc-400 text-xs font-bold hover:text-red-600 transition-colors"
                >
                  {t('logout')}
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="btn-primary py-2 px-6 ml-2"
              >
                {t('login')}
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {profile && (
              <Link 
                to="/notifications" 
                className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-red-600 relative"
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-5 w-5 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full ring-2 ring-white dark:ring-zinc-900">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <ThemeToggle />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-2xl"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "flex items-center px-4 py-3 rounded-2xl text-base font-bold transition-all",
                    location.pathname === item.path
                      ? "text-red-600 bg-red-50 dark:bg-red-900/20"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-red-600 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  )}
                >
                  <item.icon className="h-5 w-5 mr-4" />
                  {item.name}
                  {item.path === '/messages' && unreadMessages > 0 && (
                    <span className="ml-auto h-6 w-6 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full ring-2 ring-white dark:ring-zinc-900">
                      {unreadMessages}
                    </span>
                  )}
                </Link>
              ))}
              
              <div className="pt-4 space-y-3">
                <button
                  onClick={() => {
                    toggleLanguage();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold"
                >
                  Language
                  <span className="text-red-600">{i18n.language === 'en' ? 'English' : 'বাংলা'}</span>
                </button>

                {profile ? (
                  <>
                    {profile.role !== 'donor' && (
                      <Link
                        to="/register-donor"
                        onClick={() => setIsMenuOpen(false)}
                        className="btn-primary w-full py-4"
                      >
                        Become a Donor
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        signOut();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center px-4 py-4 rounded-2xl text-red-600 font-bold hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                    >
                      {t('logout')}
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="btn-primary w-full py-4"
                  >
                    {t('login')}
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
