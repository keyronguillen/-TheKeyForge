/**
 * Active project (tenant) context. After login the user picks a project; that
 * choice is persisted and sent on every API call (X-Project-Id). A user can
 * belong to several projects but only works inside one at a time — projects are
 * never merged.
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, projectStore } from '../api/client.js';

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [activeId, setActiveId] = useState(projectStore.get());
  const [loading, setLoading] = useState(true);

  // Load the projects this user may open.
  useEffect(() => {
    let alive = true;
    api.get('/me/projects')
      .then(({ projects }) => {
        if (!alive) return;
        setProjects(projects);
        // Drop a stale stored project that's no longer accessible.
        const stored = projectStore.get();
        if (stored && !projects.some((p) => p.id === stored)) {
          projectStore.clear();
          setActiveId(null);
        }
        // Auto-select when there's exactly one.
        if (!projectStore.get() && projects.length === 1) {
          projectStore.set(projects[0].id);
          setActiveId(projects[0].id);
        }
      })
      .catch(() => setProjects([]))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const selectProject = useCallback((id) => {
    projectStore.set(id);
    setActiveId(id);
  }, []);

  const clearProject = useCallback(() => {
    projectStore.clear();
    setActiveId(null);
  }, []);

  const active = projects.find((p) => p.id === activeId) ?? null;

  return (
    <ProjectContext.Provider value={{ projects, active, activeId, loading, selectProject, clearProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export const useProject = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
};
