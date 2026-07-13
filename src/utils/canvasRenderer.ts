import { CaptionSegment, StyleConfig } from '../types';
import { convertToLegacySafe } from './legacyConverter';

/**
 * Unified Canvas-based Caption Renderer.
 * Draws the current word/segment onto a CanvasRenderingContext2D using HTML5 Canvas APIs.
 * This is the canonical source of truth for subtitle rendering in both preview and export.
 */
export function drawCaptionFrame(
  ctx: CanvasRenderingContext2D,
  segment: CaptionSegment | null,
  style: StyleConfig,
  timeMs: number,
  isLegacyFont: boolean
) {
  if (!segment) return;

  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;

  // Base font size scale ratio relative to a design width of 1920px
  const scale = canvasWidth / 1920;
  
  // Custom font size constraints: user requested 1px to 200px range with no artificial floor
  const baseFontSize = Math.max(1, style.fontSize || 44);
  const fontSize = baseFontSize * scale;
  const strokeWidth = (style.strokeWidth || 0) * scale;
  const shadowBlur = (style.shadowBlur || 0) * scale;

  // Calculate text positioning (0-100 percentage layout)
  const posX = style.positionX !== undefined ? style.positionX : 50;
  const posY = style.positionY !== undefined ? style.positionY : 80;
  const centerX = (posX / 100) * canvasWidth;
  const centerY = (posY / 100) * canvasHeight;

  // 1. Process legacy font character encoding if needed
  const formatText = (txt: string) => {
    if (isLegacyFont) {
      try {
        return convertToLegacySafe(txt, style.fontFamily);
      } catch (err) {
        console.warn('[සිCaps Canvas Renderer] Legacy conversion failed:', err);
        return txt;
      }
    }
    return txt;
  };

  const rawText = segment.text;
  const renderedText = formatText(rawText);

  // 2. Compute animation states based on elapsed time within segment
  const elapsed = timeMs - segment.start;
  const duration = segment.end - segment.start;
  const progress = Math.min(1, Math.max(0, elapsed / (duration || 1)));

  // Transitions: 150ms entry phase, 100ms exit phase
  const entryDuration = Math.min(150, duration * 0.3);
  const exitDuration = Math.min(100, duration * 0.2);

  let animScale = 1;
  let opacity = 1;
  let animOffsetY = 0;
  let animOffsetX = 0;

  const preset = style.animationPreset || 'fade-in';

  // Entry Transition
  if (elapsed < entryDuration && entryDuration > 0) {
    const t = elapsed / entryDuration;
    if (preset === 'fade-in') {
      opacity = t;
    } else if (preset === 'pop' || preset === 'bounce') {
      // Elastic pop effect
      opacity = t;
      animScale = 0.4 + 0.75 * Math.sin(t * Math.PI / 2);
    } else if (preset === 'slide-up') {
      opacity = t;
      animOffsetY = (1 - t) * 40 * scale;
    } else if (preset === 'apple-keynote') {
      opacity = t;
      animScale = 0.7 + 0.3 * t;
      animOffsetY = (1 - t) * -20 * scale;
    } else if (preset === 'kinetic-zoom') {
      opacity = t;
      animScale = 0.8 + 0.2 * t;
    }
  }
  // Exit Transition
  else if (elapsed > duration - exitDuration && exitDuration > 0) {
    const t = (segment.end - timeMs) / exitDuration;
    const clampedT = Math.min(1, Math.max(0, t));
    if (preset === 'fade-in' || preset === 'pop' || preset === 'bounce' || preset === 'apple-keynote') {
      opacity = clampedT;
    } else if (preset === 'slide-up') {
      opacity = clampedT;
      animOffsetY = (1 - clampedT) * -20 * scale;
    }
  }

  // Continuous animation presets
  if (preset === 'kinetic-zoom') {
    // Zoom slowly over the entire segment duration
    animScale = 0.95 + 0.15 * progress;
  } else if (preset === 'shake') {
    // Continuous dynamic shake
    animOffsetX = Math.sin(timeMs * 0.05) * 3 * scale;
    animOffsetY = Math.cos(timeMs * 0.05) * 3 * scale;
  } else if (preset === 'neon-glow') {
    // Pulsing shadow blur
    ctx.shadowBlur = shadowBlur + Math.sin(timeMs * 0.01) * 8 * scale;
  } else if (preset === 'glitch' && Math.random() < 0.15) {
    // Cyberpunk screen shifts
    animOffsetX = (Math.random() - 0.5) * 15 * scale;
    animOffsetY = (Math.random() - 0.5) * 5 * scale;
  }

  // Apply visual configurations to 2D context
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.font = `600 ${fontSize}px "${style.fontFamily}", "Inter", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Apply shadow / glow
  if (shadowBlur > 0) {
    ctx.shadowColor = style.shadowColor || 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // Draw background card first if enabled
  if (style.backgroundCardEnabled && style.backgroundColor) {
    const textWidth = ctx.measureText(renderedText).width;
    const padX = 24 * scale;
    const padY = 16 * scale;
    const cardW = textWidth + padX * 2;
    const cardH = fontSize + padY * 2;
    
    ctx.fillStyle = style.backgroundColor;
    // Draw rounded background card
    ctx.beginPath();
    const rx = centerX + animOffsetX - cardW / 2;
    const ry = centerY + animOffsetY - cardH / 2;
    const radius = 12 * scale;
    
    ctx.roundRect ? ctx.roundRect(rx, ry, cardW, cardH, radius) : ctx.rect(rx, ry, cardW, cardH);
    ctx.fill();
  }

  // Helper to get text fill color or gradient
  const getFillStyle = (startColor: string, endColor: string, customWidth: number, customX: number) => {
    if (style.gradientEnabled) {
      const grad = ctx.createLinearGradient(
        customX - customWidth / 2, 0,
        customX + customWidth / 2, 0
      );
      grad.addColorStop(0, startColor);
      grad.addColorStop(1, endColor);
      return grad;
    }
    return startColor;
  };

  // Translate and scale for pop/slide transition effects
  ctx.translate(centerX + animOffsetX, centerY + animOffsetY);
  ctx.scale(animScale, animScale);

  // 3. Handle Word-by-word Karaoke Highlighting
  // "karaoke highlight: default color yellow, toggle off by default; active-word detection must use segment.start <= timeMs < segment.end precisely."
  const isKaraokeActive = style.highlightEnabled && rawText.trim().includes(' ');

  if (isKaraokeActive) {
    const words = rawText.trim().split(/\s+/);
    const wordDuration = duration / words.length;

    // Convert each word individually to legacy font representation if required
    const convertedWords = words.map(w => formatText(w));
    
    // Measure word widths to compute exact side-by-side spacing
    const wordWidths = convertedWords.map(w => ctx.measureText(w).width);
    const spaceWidth = ctx.measureText(' ').width;
    const totalWidth = wordWidths.reduce((acc, w) => acc + w, 0) + (words.length - 1) * spaceWidth;

    let currentX = -totalWidth / 2;

    words.forEach((word, idx) => {
      const convertedWord = convertedWords[idx];
      const wordW = wordWidths[idx];
      
      // Calculate precise timestamp boundaries
      const wordStart = segment.start + idx * wordDuration;
      const wordEnd = segment.start + (idx + 1) * wordDuration;
      const isHighlighted = (timeMs >= wordStart && timeMs < wordEnd);

      ctx.save();
      
      // Setup colors
      if (isHighlighted) {
        ctx.fillStyle = style.highlightColor || '#facc15';
      } else {
        ctx.fillStyle = getFillStyle(style.textColor, style.gradientEnd || style.textColor, wordW, currentX + wordW / 2);
      }

      // Draw stroke/outline
      if (strokeWidth > 0) {
        ctx.strokeStyle = style.strokeColor || '#000000';
        ctx.lineWidth = strokeWidth;
        ctx.lineJoin = 'round';
        ctx.strokeText(convertedWord, currentX + wordW / 2, 0);
      }

      // Draw main text
      ctx.fillText(convertedWord, currentX + wordW / 2, 0);
      ctx.restore();

      // Advance layout coordinate
      currentX += wordW + spaceWidth;
    });
  } else {
    // Standard segment text rendering path (No karaoke or single word)
    const textW = ctx.measureText(renderedText).width;
    ctx.fillStyle = getFillStyle(style.textColor, style.gradientEnd || style.textColor, textW, 0);

    // Draw stroke/outline
    if (strokeWidth > 0) {
      ctx.strokeStyle = style.strokeColor || '#000000';
      ctx.lineWidth = strokeWidth;
      ctx.lineJoin = 'round';
      ctx.strokeText(renderedText, 0, 0);
    }

    // Draw main text
    ctx.fillText(renderedText, 0, 0);
  }

  ctx.restore();
}
