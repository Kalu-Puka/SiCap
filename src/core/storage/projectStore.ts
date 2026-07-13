import { ProjectState } from '../types';

/**
 * Core Storage & History Manager
 * Saves project configurations and coordinates Undo/Redo operations.
 */
export class ProjectStore {
  private static STORAGE_KEY = 'sicap_editor_project';

  /**
   * Save project state to local storage
   */
  public static saveProject(state: ProjectState) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('[ProjectStore] Failed to save project state:', e);
    }
  }

  /**
   * Load project state from local storage or return a default empty project
   */
  public static loadProject(): ProjectState | null {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('[ProjectStore] Failed to load project state:', e);
    }
    return null;
  }

  /**
   * Return default state
   */
  public static createDefaultState(): ProjectState {
    return {
      projectName: 'Untitled Video Project',
      aspectRatio: '16:9',
      currentTime: 0,
      duration: 10, // Initial 10s timeline
      tracks: [
        {
          id: 'v1',
          type: 'video',
          name: 'Video Track 1',
          clips: [],
        },
        {
          id: 'a1',
          type: 'audio',
          name: 'Audio Track 1',
          clips: [],
        },
        {
          id: 't1',
          type: 'text',
          name: 'Text Track 1',
          clips: [],
        }
      ],
      assets: [],
    };
  }
}
