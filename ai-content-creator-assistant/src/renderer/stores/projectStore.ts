/**
 * Project State Management Store (Zustand)
 */

import { create } from 'zustand';
import { Project } from '../../common/types';

interface ProjectState {
  projects: Array<{ id: string; name: string; createdAt: Date; updatedAt: Date }>;
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadProjects: () => Promise<void>;
  createProject: (name: string) => Promise<Project>;
  openProject: (projectId: string) => Promise<void>;
  saveProject: () => Promise<void>;
  closeProject: () => void;
  deleteProject: (projectId: string) => Promise<void>;
  updateProject: (updates: Partial<Project>) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,

  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await window.electronAPI.project.list();
      set({ projects, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createProject: async (name: string) => {
    set({ isLoading: true, error: null });
    try {
      const project = await window.electronAPI.project.create(name);
      set(state => ({
        projects: [project, ...state.projects],
        currentProject: project,
        isLoading: false,
      }));
      return project;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  openProject: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      const project = await window.electronAPI.project.open(projectId);
      set({ currentProject: project, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  saveProject: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    set({ isLoading: true, error: null });
    try {
      await window.electronAPI.project.save(currentProject);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  closeProject: () => {
    set({ currentProject: null });
  },

  deleteProject: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      await window.electronAPI.project.delete(projectId);
      set(state => ({
        projects: state.projects.filter(p => p.id !== projectId),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateProject: (updates: Partial<Project>) => {
    set(state => ({
      currentProject: state.currentProject ? { ...state.currentProject, ...updates } : null,
    }));
  },
}));
