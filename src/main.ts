import './style.css';
import { Game } from './game';

const bootstrap = () => {
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement | null;

  if (!canvas) {
    throw new Error('Canvas element with id "renderCanvas" was not found.');
  }

  const game = new Game(canvas);
  game.start();
};

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  bootstrap();
} else {
  document.addEventListener('DOMContentLoaded', bootstrap);
}
