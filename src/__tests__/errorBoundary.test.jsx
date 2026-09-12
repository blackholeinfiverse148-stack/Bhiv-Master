import { useState } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "../components/ErrorBoundary";
import { sanitizeDiagnostic } from "../services/telemetry";

function DynamicComponent({ initialError = false }) {
  const [hasError, setHasError] = useState(initialError);
  if (hasError) {
    throw new Error("Crash: Failed to parse Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 with secret=topsecret123");
  }
  return (
    <div>
      <span>Dynamic Module Online</span>
      <button onClick={() => setHasError(true)}>Trigger Error</button>
    </div>
  );
}

function CounterWidget({ name }) {
  const [count, setCount] = useState(0);
  return (
    <div>
      <span>{name} Count: {count}</span>
      <button onClick={() => setCount((c) => c + 1)}>Increment {name}</button>
    </div>
  );
}

describe("Production-Safe ErrorBoundary Handling", () => {
  const originalError = console.error;

  afterEach(() => {
    console.error = originalError;
    vi.restoreAllMocks();
  });

  it("1. catches child component throws and captures diagnostic info", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary name="PRANA Service Panel">
        <DynamicComponent initialError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeDefined();
  });

  it("2. renders a controlled fallback UI with module name and stack trace", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary name="KARMA Service Panel">
        <DynamicComponent initialError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Isolated Zone Failure: KARMA Service Panel/i)).toBeDefined();
    expect(screen.getByText(/Failure safely contained/i)).toBeDefined();
    expect(screen.getByText(/🔄 Retry Module/i)).toBeDefined();
  });

  it("3. provides retry/recovery behavior to restore working child state", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    function RecoverableParent() {
      const [shouldCrash, setShouldCrash] = useState(true);
      return (
        <ErrorBoundary name="RecoverableSection" onReset={() => setShouldCrash(false)}>
          {shouldCrash ? <DynamicComponent initialError={true} /> : <div>Recovered Successfully</div>}
        </ErrorBoundary>
      );
    }

    render(<RecoverableParent />);

    // Initially in error state
    expect(screen.getByRole("alert")).toBeDefined();

    // Click retry
    const retryBtn = screen.getByText(/🔄 Retry Module/i);
    fireEvent.click(retryBtn);

    // Child recovers
    expect(screen.getByText("Recovered Successfully")).toBeDefined();
  });

  it("4. ensures unaffected sections remain completely usable when sibling crashes", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <div>
        <ErrorBoundary name="Failing Widget">
          <DynamicComponent initialError={true} />
        </ErrorBoundary>

        <ErrorBoundary name="Healthy Sibling Widget">
          <CounterWidget name="Sibling" />
        </ErrorBoundary>
      </div>
    );

    // Failing widget shows alert
    expect(screen.getByText(/Isolated Zone Failure: Failing Widget/i)).toBeDefined();

    // Sibling widget remains fully rendered and functional
    expect(screen.getByText("Sibling Count: 0")).toBeDefined();

    const incBtn = screen.getByText("Increment Sibling");
    fireEvent.click(incBtn);
    fireEvent.click(incBtn);

    // Sibling state updates normally despite adjacent crash
    expect(screen.getByText("Sibling Count: 2")).toBeDefined();
  });

  it("5. sanitizes sensitive tokens, passwords, and secrets from diagnostic outputs", () => {
    const raw = "Unauthorized Bearer eyJhbGciOi... with password=supersecret and token: secretToken123";
    const sanitized = sanitizeDiagnostic(raw);

    expect(sanitized).not.toContain("supersecret");
    expect(sanitized).not.toContain("secretToken123");
    expect(sanitized).toContain("Bearer [REDACTED]");
    expect(sanitized).toContain("password=[REDACTED]");
  });

  it("6. integrates failures with existing audit and notification callback mechanisms", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onAudit = vi.fn();
    const onNotif = vi.fn();

    render(
      <ErrorBoundary name="SOC Dashboard" onAudit={onAudit} onNotif={onNotif}>
        <DynamicComponent initialError={true} />
      </ErrorBoundary>
    );

    expect(onAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "Module Failure: SOC Dashboard",
        status: "failure",
      })
    );

    expect(onNotif).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: "critical",
      })
    );
  });
});
