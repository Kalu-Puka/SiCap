import { TimelineClip } from '../types';
import { convertToLegacySafe } from '../../utils/legacyConverter';

/**
 * Core Text Engine
 * Manages text layout, Sinhala fonts support, animations, presets, and subtitle drawing.
 */
export class TextEngine {
  constructor() {
    console.log('[Core Text Engine] Initialized');
  }

  /**
   * Draw a standard subtitle/text clip frame onto the canvas
   */
  public drawTextClip(
    ctx: CanvasRenderingContext2D,
    clip: TimelineClip,
    timeMs: number,
    isLegacyFont: boolean
  ) {
    if (!clip.textProperties) return;
    const style = clip.textProperties;

    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    const scale = canvasWidth / 1920;

    const fontSize = Math.max(1, style.fontSize || 44) * scale;
    const strokeWidth = (style.strokeWidth || 0) * scale;
    const shadowBlur = (style.shadowBlur || 0) * scale;

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight * 0.8; // Default lower third positioning

    // Convert encoding if needed
    const text = isLegacyFont 
      ? convertToLegacySafe(style.text, style.fontFamily)
      : style.text;

    ctx.save();
    ctx.font = `600 ${fontSize}px "${style.fontFamily}", "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Apply shadow / glow
    if (shadowBlur > 0) {
      ctx.shadowColor = style.shadowColor || 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = shadowBlur;
    }

    // Background box/card
    if (style.backgroundCardEnabled && style.backgroundColor) {
      const textWidth = ctx.measureText(text).width;
      const padX = 24 * scale;
      const padY = 16 * scale;
      const cardW = textWidth + padX * 2;
      const cardH = fontSize + padY * 2;
      
      ctx.fillStyle = style.backgroundColor;
      ctx.beginPath();
      const rx = centerX - cardW / 2;
      const ry = centerY - cardH / 2;
      const radius = 12 * scale;
      ctx.roundRect ? ctx.roundRect(rx, ry, cardW, cardH, radius) : ctx.rect(rx, ry, cardW, cardH);
      ctx.fill();
    }

    // Text Fill color or Gradient
    if (style.gradientEnabled) {
      const textWidth = ctx.measureText(text).width;
      const grad = ctx.createLinearGradient(
        centerX - textWidth / 2, 0,
        centerX + textWidth / 2, 0
      );
      grad.addColorStop(0, style.gradientStart || style.textColor);
      grad.addColorStop(1, style.gradientEnd || style.textColor);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = style.textColor || '#ffffff';
    }

    // Draw stroke
    if (strokeWidth > 0) {
      ctx.strokeStyle = style.strokeColor || '#000000';
      ctx.lineWidth = strokeWidth;
      ctx.lineJoin = 'round';
      ctx.strokeText(text, centerX, centerY);
    }

    // Draw solid text
    ctx.fillText(text, centerX, centerY);
    ctx.restore();
  }
}
