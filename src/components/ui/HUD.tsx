import React from 'react';
import { GameLoopState, GameStatus } from '../../types';
import './HUD.css';

interface HUDProps {
  state: GameLoopState;
  onNextLevel: () => void;
  onOpenShop: () => void;
}

export const HUD: React.FC<HUDProps> = ({ state, onNextLevel, onOpenShop }) => {
  const handleClick = () => {
    if (state.level % 5 === 0 && state.status === GameStatus.COMPLETED) {
      onOpenShop();
    } else {
      onNextLevel();
    }
  };

  const buttonLabel = state.level % 5 === 0 && state.status === GameStatus.COMPLETED ? 'Enter Shop' : 'Next Level';

  return (
    <div className="hud">
      <div className="hud-info">
        <span>Level: {state.level}</span>
        <span>Data Cores: {state.dataCores}</span>
        <span>Status: {state.status}</span>
      </div>
      {state.status === GameStatus.COMPLETED && (
        <button className="hud-next-btn" onClick={handleClick}>
          {buttonLabel}
        </button>
      )}
    </div>
  );
};
