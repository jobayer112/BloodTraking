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
  Droplets
} from 'lucide-react';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/helpers';
import { motion, AnimatePresence } from 'motion/react';

const Navbar = () => {
  const { profile, signOut } = useAuth();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', profile.uid),
      where('isRead', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [profile]);

  const navItems = [
    { name: t('home'), path: '/', icon: Home },
    { name: t('find_donor'), path: '/search', icon: Search },
    { name: t('contact_donors'), path: '/contacts', icon: Users },
    { name: t('requests'), path: '/requests', icon: PlusSquare },
    { name: t('feed'), path: '/feed', icon: MessageSquare },
    { name: t('profile'), path: '/profile', icon: User },
  ];

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'bn' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between h-14">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-1.5">
              <Droplets className="h-6 w-6 text-red-600" />
              <span className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                Blood<span className="text-red-600">Traking</span>
              </span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname === item.path
                    ? "text-red-600 bg-red-50 dark:bg-red-900/20"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-red-600 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                )}
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.name}
              </Link>
            ))}
            
            {profile && (
              <Link 
                to="/notifications" 
                className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-red-600 relative"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-zinc-900">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )}

            <button
              onClick={toggleLanguage}
              className="px-3 py-1 rounded border border-zinc-200 dark:border-zinc-700 text-xs font-bold uppercase"
            >
              {i18n.language === 'en' ? 'BN' : 'EN'}
            </button>
            {profile ? (
              <button
                onClick={() => signOut()}
                className="ml-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
              >
                {t('logout')}
              </button>
            ) : (
              <Link
                to="/login"
                className="ml-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
              >
                {t('login')}
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            {profile && (
              <Link 
                to="/notifications" 
                className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-red-600 relative"
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-5 w-5 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-zinc-900">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )}
             <button
              onClick={toggleLanguage}
              className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 text-xs font-bold uppercase"
            >
              {i18n.language === 'en' ? 'BN' : 'EN'}
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-zinc-600 dark:text-zinc-400"
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
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 overflow-hidden"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "flex items-center px-3 py-3 rounded-md text-base font-medium",
                    location.pathname === item.path
                      ? "text-red-600 bg-red-50 dark:bg-red-900/20"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-red-600"
                  )}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              ))}
              {profile ? (
                <button
                  onClick={() => {
                    signOut();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left flex items-center px-3 py-3 rounded-md text-base font-medium text-red-600"
                >
                  {t('logout')}
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center px-3 py-3 rounded-md text-base font-medium text-red-600"
                >
                  {t('login')}
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
