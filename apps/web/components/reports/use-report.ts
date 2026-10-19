"use client";

import { useEffect, useState } from "react";
import { ApiError } from "../../lib/api-client";
import {
  firstParam,
  getSelectedProject,
  parseDays,
  resolveProjectId,
  type DataRequest,
  type ProjectOption,
  type ReportParams,
} from "../../lib/dashboard-data";
import { useWorkspace } from "../app/workspace-provider";

export type ReportState<T> =
  | {
      status: "loading" | "empty" | "error";
      message?: string;
      expired?: boolean;
    }
  | {
      status: "ready";
      data: T;
      days: number;
      projectId: string;
      selectedProject: ProjectOption;
      projectOptions: ProjectOption[];
      preview: boolean;
    };

export function useReport<T>(
  params: ReportParams,
  load: (
    input: DataRequest & { eventName?: string; funnelId?: string },
  ) => Promise<T>,
): ReportState<T> {
  const workspace = useWorkspace();
  const days = parseDays(params.days);
  const requested = firstParam(params.projectId);
  const eventName = firstParam(params.eventName);
  const funnelId = firstParam(params.funnelId);
  const projectId = resolveProjectId(
    params.projectId,
    workspace.projects,
    workspace.storedProjectId,
  );
  const selectedProject = getSelectedProject(projectId, workspace.projects);
  const invalidProject =
    !!requested &&
    !workspace.projects.some((project) => project.id === requested);
  const key = JSON.stringify([
    workspace.accessToken,
    workspace.preview,
    projectId,
    days,
    eventName,
    funnelId,
  ]);
  const [result, setResult] = useState<{
    key: string;
    data?: T;
    error?: string;
    expired?: boolean;
  }>();

  useEffect(() => {
    if (workspace.status !== "ready" || !projectId || invalidProject) return;
    const controller = new AbortController();
    void load({
      projectId,
      days,
      eventName,
      funnelId,
      preview: workspace.preview,
      accessToken: workspace.accessToken,
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load this report.",
            expired: error instanceof ApiError && error.status === 401,
          });
      });
    return () => controller.abort();
  }, [
    key,
    load,
    workspace.status,
    invalidProject,
    projectId,
    days,
    eventName,
    funnelId,
    workspace.preview,
    workspace.accessToken,
  ]);

  if (workspace.status === "error")
    return {
      status: "error",
      message: workspace.message,
      expired: workspace.expired,
    };
  if (workspace.status !== "ready") return { status: "loading" };
  if (!selectedProject) return { status: "empty" };
  if (invalidProject)
    return {
      status: "error",
      message:
        "This project is not available in your workspace. Open the dashboard to select one of your projects.",
    };
  if (result?.key !== key) return { status: "loading" };
  if (result.error)
    return { status: "error", message: result.error, expired: result.expired };
  return {
    status: "ready",
    data: result.data as T,
    days,
    projectId,
    selectedProject,
    projectOptions: workspace.projects,
    preview: workspace.preview,
  };
}
