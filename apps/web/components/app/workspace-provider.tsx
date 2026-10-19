"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ApiError } from "../../lib/api-client";
import {
  demoProjectOptions,
  getProjectOptions,
  type ProjectOption,
} from "../../lib/dashboard-data";

type Workspace = {
  status: "loading" | "ready" | "error";
  preview: boolean;
  accessToken: string | null;
  projects: ProjectOption[];
  storedProjectId: string | null;
  message?: string;
  expired?: boolean;
};
const WorkspaceContext = createContext<Workspace | null>(null);

function subscribe(callback: () => void) {
  window.addEventListener("insighthub:auth-session-changed", callback);
  window.addEventListener("storage", callback);
  window.addEventListener("insighthub:workspace-changed", callback);
  return () => {
    window.removeEventListener("insighthub:auth-session-changed", callback);
    window.removeEventListener("storage", callback);
    window.removeEventListener("insighthub:workspace-changed", callback);
  };
}
function snapshot() {
  return JSON.stringify([
    localStorage.getItem("insighthub.accessToken"),
    localStorage.getItem("insighthub.projectId"),
  ]);
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const identity = useSyncExternalStore(subscribe, snapshot, () => "checking");
  const [result, setResult] = useState<{
    identity: string;
    projects: ProjectOption[];
    message?: string;
    expired?: boolean;
  }>();
  const [accessToken, storedProjectId] =
    identity === "checking"
      ? [null, null]
      : (JSON.parse(identity) as [string | null, string | null]);

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    void getProjectOptions(accessToken, controller.signal)
      .then((projects) => {
        if (!controller.signal.aborted) setResult({ identity, projects });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setResult({
            identity,
            projects: [],
            message:
              error instanceof Error
                ? error.message
                : "Unable to load projects.",
            expired: error instanceof ApiError && error.status === 401,
          });
      });
    return () => controller.abort();
  }, [identity, accessToken]);

  let workspace: Workspace = {
    status: "loading",
    preview: false,
    accessToken,
    projects: [],
    storedProjectId,
  };
  if (identity !== "checking" && !accessToken)
    workspace = {
      ...workspace,
      status: "ready",
      preview: true,
      projects: demoProjectOptions,
    };
  else if (result?.identity === identity)
    workspace = {
      ...workspace,
      status: result.message ? "error" : "ready",
      projects: result.projects,
      message: result.message,
      expired: result.expired,
    };
  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error("WorkspaceProvider is required");
  return workspace;
}
