import React from 'react';
import { motion } from 'motion/react';

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-[#FFFAEE] dark:bg-[#14100B] transition-colors duration-200">
      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.1] bg-[radial-gradient(#64748b_1px,transparent_1px)] [background-size:32px_32px]">
      </div>

      {/* Dynamic radial gradients inspired by "Atmospheric" recipe */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 100, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 dark:bg-indigo-600/5 blur-[120px]"
      />
      
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          x: [0, -120, 0],
          y: [0, 80, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-amber-500/10 dark:bg-amber-600/5 blur-[100px]"
      />
      
      <motion.div
        animate={{
          scale: [1, 1.5, 1],
          x: [0, 50, 0],
          y: [0, -100, 0],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute -bottom-[10%] left-[20%] w-[70%] h-[70%] rounded-full bg-rose-500/10 dark:bg-rose-600/5 blur-[140px]"
      />
      
      {/* Floating particles/dots for extra flair */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -100, 0],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: 10 + i * 2,
            repeat: Infinity,
            delay: i * 3,
          }}
          style={{
            left: `${15 + i * 15}%`,
            top: `${80 - i * 10}%`,
          }}
          className="absolute w-1 h-1 bg-indigo-400 dark:bg-indigo-300 rounded-full"
        />
      ))}
    </div>
  );
}
