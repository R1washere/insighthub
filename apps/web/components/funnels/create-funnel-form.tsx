"use client";

import { FormEvent, useMemo, useState } from "react";
import type { FunnelListItem } from "@insighthub/shared";

import { buildHref } from "../app/report-controls";
import { requestApi } from "../../lib/api-client";

type CreateFunnelFormProps = {
  days: number;
  eventNames: string[];
  projectId: string;
};

type CreateState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "missing-token" }
  | { status: "error"; message: string };

export function CreateFunnelForm({
  days,
  eventNames,
  projectId,
}: CreateFunnelFormProps) {
  const [state, setState] = useState<CreateState>({ status: "idle" });
  const defaultSteps = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => eventNames[index] ?? "").filter(
        Boolean,
      ),
    [eventNames],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const accessToken = localStorage.getItem("insighthub.accessToken");

    if (!accessToken) {
      setState({ status: "missing-token" });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const steps = formData
      .getAll("steps")
      .map((value) => String(value).trim())
      .filter(Boolean)
      .map((eventName) => ({ eventName }));

    if (name.length < 2) {
      setState({ status: "error", message: "Funnel name is too short" });
      return;
    }

    if (steps.length < 2) {
      setState({
        status: "error",
        message: "Choose at least two ordered events for a funnel",
      });
      return;
    }

    setState({ status: "saving" });

    try {
      const funnel = await requestApi<FunnelListItem>(
        `/projects/${projectId}/funnels`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ name, steps }),
        },
      );

      window.location.href = buildHref("/funnels", {
        days,
        funnelId: funnel.id,
        projectId,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Unable to create funnel",
      });
    }
  }

  return (
    <form className="create-funnel-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Funnel name</span>
        <input
          name="name"
          type="text"
          minLength={2}
          maxLength={100}
          placeholder="Activation to paid conversion"
          defaultValue="Activation to paid conversion"
        />
      </label>

      <div className="funnel-builder-steps">
        {Array.from({ length: 5 }, (_, index) => (
          <label className="field" key={index}>
            <span>Step {index + 1}</span>
            <input
              name="steps"
              type="text"
              maxLength={120}
              placeholder={index < 2 ? "Required event name" : "Optional"}
              defaultValue={defaultSteps[index] ?? ""}
            />
          </label>
        ))}
      </div>

      {eventNames.length > 0 ? (
        <div className="event-contract" aria-label="Suggested events">
          {eventNames.slice(0, 8).map((eventName) => (
            <span key={eventName}>{eventName}</span>
          ))}
        </div>
      ) : null}

      {state.status === "missing-token" ? (
        <p className="form-error">
          Sign in first. The demo keeps the JWT in local storage and uses it to
          save funnels through the NestJS API.
        </p>
      ) : null}

      {state.status === "error" ? (
        <p className="form-error">{state.message}</p>
      ) : null}

      <button
        className="button full-width"
        disabled={state.status === "saving"}
      >
        {state.status === "saving" ? "Creating funnel..." : "Create funnel"}
      </button>
    </form>
  );
}
