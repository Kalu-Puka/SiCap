import { ProjectState } from '../types';

/**
 * Core Graphics Engine
 * Supports applying filters, canvas blend layers, and scene transitions (crossfades, slides).
 */
export class GraphicsEngine {
  constructor() {
    console.log('[Core Graphics Engine] Initialized');
  }

  /**
   * Apply filters and visual adjustments on a canvas rendering context
   */
  public applyFilter(
    ctx: CanvasRenderingContext2D,
    filterType: 'none' | 'sepia' | 'grayscale' | 'vintage' | 'warm' | 'cool'
  ) {
    switch (filterType) {
      case 'sepia':
        ctx.filter = 'sepia(0.85)';
        break;
      case 'grayscale':
        ctx.filter = 'grayscale(1.0)';
        break;
      case 'vintage':
        ctx.filter = 'contrast(1.2) brightness(0.9) sepia(0.3)';
        break;
      case 'warm':
        ctx.filter = 'hue-rotate(10deg) saturate(1.2)';
        break;
      case 'cool':
        ctx.filter = 'hue-rotate(-10deg) saturate(1.1) brightness(1.05)';
        break;
      case 'none':
      default:
        ctx.filter = 'none';
        break;
    }
  }

  /**
   * Reset any active canvas filter settings
   */
  public resetFilters(ctx: CanvasRenderingContext2D) {
    ctx.filter = 'none';
  }
}
