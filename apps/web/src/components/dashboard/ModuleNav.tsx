import { useState } from "react";
import type { ModuleWithId } from "../../hooks/useClassModules";

type ModuleStatus = "current" | "locked" | "complete";

function getModuleStatus(
  module: ModuleWithId,
  selectedId: string | null
): ModuleStatus {
  if (selectedId === module.id) return "current";
  if (
    module.releaseMode === "time-released" &&
    module.releasedAt != null &&
    module.releasedAt > Date.now()
  ) {
    return "locked";
  }
  return "complete";
}

function StatusIcon({ status }: { status: ModuleStatus }) {
  if (status === "locked") {
    return (
      <svg className="h-4 w-4 shrink-0 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
      </svg>
    );
  }
  if (status === "current") {
    return (
      <svg className="h-4 w-4 shrink-0 text-primary" fill="currentColor" viewBox="0 0 20 20">
        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
      </svg>
    );
  }
  if (status === "complete") {
    return (
      <svg className="h-4 w-4 shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    );
  }
  return null;
}

interface ModuleNavProps {
  modules: ModuleWithId[];
  loading: boolean;
  selectedModule: ModuleWithId | null;
  onSelectModule: (module: ModuleWithId | null) => void;
  isTeacher?: boolean;
  onCreateModule?: (name: string) => Promise<void>;
  onDeleteModule?: (id: string) => Promise<void>;
}

export function ModuleNav({
  modules,
  loading,
  selectedModule,
  onSelectModule,
  isTeacher = false,
  onCreateModule,
  onDeleteModule,
}: ModuleNavProps) {
  const [newModuleName, setNewModuleName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleName.trim() || !onCreateModule) return;
    setCreating(true);
    try {
      await onCreateModule(newModuleName.trim());
      setNewModuleName("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-w-0 shrink-0 lg:w-64">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Modules</h3>
      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {!loading && modules.length === 0 && (
        <p className="text-sm text-gray-600">No modules yet.</p>
      )}
      {!loading && modules.length > 0 && (
        <nav className="space-y-0.5">
          {modules.map((m) => {
            const status = getModuleStatus(m, selectedModule?.id ?? null);
            const isLocked = status === "locked";
            const isSelected = selectedModule?.id === m.id;

            return (
              <div key={m.id} className="flex flex-col">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => !isLocked && onSelectModule(m)}
                    className={`flex flex-1 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                      isSelected
                        ? "bg-gray-100 font-medium text-gray-900"
                        : isLocked
                        ? "cursor-not-allowed text-gray-500"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <StatusIcon status={status} />
                    <span className="min-w-0 truncate">{m.name}</span>
                  </button>
                  {isTeacher && onDeleteModule && (
                    <button
                      type="button"
                      onClick={() => onDeleteModule(m.id)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                      aria-label={`Delete ${m.name}`}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </nav>
      )}
      {isTeacher && onCreateModule && (
        <form onSubmit={handleCreateModule} className="mt-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New module"
              value={newModuleName}
              onChange={(e) => setNewModuleName(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={creating || !newModuleName.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
