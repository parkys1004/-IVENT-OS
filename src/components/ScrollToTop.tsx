import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp } from 'lucide-react';
import clsx from 'clsx';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      let scrollTop = 0;
      
      if (e.target === document || e.target === window) {
        scrollTop = window.pageYOffset;
      } else if (e.target instanceof HTMLElement) {
        scrollTop = e.target.scrollTop;
      }
      
      if (scrollTop > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Use capture: true to catch scroll events from any nested element (like dashboard containers)
    window.addEventListener('scroll', handleScroll, true);
    
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    
    // For dashboard internal scrolling elements
    const dashboards = document.querySelectorAll('.overflow-y-auto');
    dashboards.forEach(el => {
      el.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={scrollToTop}
          className="hidden md:flex fixed bottom-8 right-8 z-[100] p-4 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-600/40 hover:bg-indigo-700 transition-colors border border-white/20 items-center justify-center"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-6 h-6 stroke-[3px]" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
