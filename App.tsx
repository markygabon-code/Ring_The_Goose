import React, { useState } from 'react';
import GameEngine from './components/GameEngine';
import GameOverlay from './components/GameOverlay';
import { GameStatus } from './types';
import { MAX_HOOPS } from './constants';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hoopsLeft, setHoopsLeft] = useState(MAX_HOOPS);

  const handleStart = () => {
    setScore(0);
    setStreak(0);
    setHoopsLeft(MAX_HOOPS);
    setStatus(GameStatus.PLAYING);
  };

  const handleScoreUpdate = (points: number, isHit: boolean) => {
    if (isHit) {
      const multiplier = Math.min(streak + 1, 5); // Max 5x multiplier
      setScore(prev => prev + (points * multiplier));
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
    }
  };

  const handleHoopThrow = () => {
    setHoopsLeft(prev => {
      const newVal = prev - 1;
      if (newVal <= 0) {
        // Wait for throw animation to finish before showing game over
        setTimeout(() => {
            setStatus(GameStatus.GAME_OVER);
        }, 2000); 
      }
      return newVal;
    });
  };

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden select-none">
      <GameEngine 
        status={status}
        setStatus={setStatus}
        onScoreUpdate={handleScoreUpdate}
        onHoopThrow={handleHoopThrow}
      />
      <GameOverlay 
        status={status}
        score={score}
        streak={streak}
        hoopsLeft={hoopsLeft}
        onStart={handleStart}
        onRestart={handleStart}
      />
    </div>
  );
};

export default App;