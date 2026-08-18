import { beforeEach, describe, expect, it, vi } from "vitest";
import { Store } from "./store.js";

describe("Store events", () => {
  let store: Store;
  beforeEach(() => { store = new Store(); });

  it("delivers safe realtime events to subscribers", () => {
    const listener = vi.fn();
    store.listeners.add(listener);
    const event = store.emit("agent.status", { state: "WORKING", text: "Using a tool…" }, "task-1");
    expect(listener).toHaveBeenCalledWith(event);
    expect(event.payload).not.toHaveProperty("reasoning");
  });

  it("caps replay history", () => {
    for (let i = 0; i < 510; i++) store.emit("task.updated", { progress: i });
    expect(store.events).toHaveLength(500);
  });
});
