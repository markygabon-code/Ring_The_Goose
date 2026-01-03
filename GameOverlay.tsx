import React from 'react';
import { GameStatus } from '../types';

interface GameOverlayProps {
  status: GameStatus;
  score: number;
  streak: number;
  hoopsLeft: number;
  onStart: () => void;
  onRestart: () => void;
}

const GameOverlay: React.FC<GameOverlayProps> = ({
  status,
  score,
  streak,
  hoopsLeft,
  onStart,
  onRestart,
}) => {
  if (status === GameStatus.PLAYING) {
    return (
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-4 flex flex-col justify-between z-10">
        <div className="flex justify-between items-start">
          <div className="bg-black/60 border-2 border-red-500 rounded-xl p-3 shadow-[0_0_15px_rgba(239,68,68,0.5)] backdrop-blur-sm">
            <h2 className="text-yellow-400 font-asian text-xl tracking-wider">SCORE</h2>
            <p className="text-white text-3xl font-bold">{score}</p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="bg-black/60 border-2 border-cyan-500 rounded-xl p-3 shadow-[0_0_15px_rgba(6,182,212,0.5)] backdrop-blur-sm">
              <h2 className="text-cyan-300 font-asian text-xl tracking-wider">HOOPS</h2>
              <div className="flex gap-1 mt-1">
                {Array.from({ length: Math.max(0, hoopsLeft) }).map((_, i) => (
                  <div key={i} className="w-4 h-4 rounded-full border-2 border-yellow-500 bg-transparent"></div>
                ))}
              </div>
            </div>
            
            {streak > 1 && (
              <div className="animate-bounce bg-yellow-500/90 text-black px-4 py-2 rounded-lg font-bold transform rotate-[-5deg] shadow-lg border-2 border-white">
                 🔥 {streak} STREAK! 🔥
              </div>
            )}
          </div>
        </div>
        
        <div className="text-center pb-8 opacity-70">
           <p className="text-white text-sm bg-black/40 inline-block px-3 py-1 rounded-full">Drag Down & Release to Throw!</p>
        </div>
      </div>
    );
  }

  if (status === GameStatus.MENU) {
    return (
      <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
        <div className="p-8 text-center max-w-md w-full">
          <h1 className="text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-b from-red-500 via-orange-400 to-yellow-300 font-asian font-bold mb-4 drop-shadow-[0_2px_10px_rgba(255,0,0,0.8)]">
            Goose Toss
          </h1>
          <p className="text-cyan-200 mb-8 text-lg">Night Market Challenge</p>
          
          <div className="bg-gray-900/80 p-6 rounded-lg border border-gray-700 mb-8 text-gray-300 text-sm leading-relaxed">
            <p className="mb-2">🥢 Catched the Goose to win points!</p>
            <p className="mb-2">🎯 Drag back to aim and shoot.</p>
            <p>🔥 Build streaks for combos.</p>
          </div>

          <button 
            onClick={onStart}
            className="group relative px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full text-xl transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(239,68,68,0.6)]"
          >
            START GAME
            <span className="absolute inset-0 rounded-full border-4 border-yellow-400 opacity-0 group-hover:opacity-100 animate-pulse"></span>
          </button>
        </div>
      </div>
    );
  }

  if (status === GameStatus.GAME_OVER) {
    return (
      <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-20">
        <h2 className="text-5xl font-asian text-white mb-2">GAME OVER</h2>
        <p className="text-gray-400 mb-6">Out of Hoops!</p>
        
        <div className="bg-white/10 p-6 rounded-2xl border border-white/20 backdrop-blur-md mb-8 flex flex-col items-center min-w-[200px]">
          <span className="text-yellow-400 text-sm uppercase tracking-widest mb-1">Final Score</span>
          <span className="text-6xl font-bold text-white">{score}</span>
          {streak > 2 && <span className="text-red-400 text-sm mt-2 font-bold">Max Streak: {streak}</span>}
        </div>

        <button 
          onClick={onRestart}
          className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-lg transition-colors shadow-[0_0_15px_rgba(8,145,178,0.5)]"
        >
          TRY AGAIN
        </button>
      </div>
    );
  }

  return null;
};

export default GameOverlay;