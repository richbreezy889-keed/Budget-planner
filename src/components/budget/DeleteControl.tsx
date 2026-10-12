import { useState } from "react";

/** An inline Edit-less delete button that asks for confirmation before acting. */
export function DeleteControl({
  name,
  message,
  onConfirm,
}: {
  name: string;
  message?: string;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        className="text-danger hover:underline"
        aria-label={`Delete ${name}`}
        onClick={() => setConfirming(true)}
      >
        Delete
      </button>
    );
  }

  return (
    <>
      <span className="text-muted-foreground">{message ?? `Delete "${name}"?`}</span>
      <button
        type="button"
        className="font-medium text-danger"
        onClick={() => {
          onConfirm();
          setConfirming(false);
        }}
      >
        Confirm delete
      </button>
      <button type="button" className="text-muted-foreground" onClick={() => setConfirming(false)}>
        Cancel
      </button>
    </>
  );
}
