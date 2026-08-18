import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Office } from "./Office";

describe("Office", () => {
  it("exposes agent state accessibly", () => {
    const html = renderToStaticMarkup(<Office state="THINKING" onObject={vi.fn()} />);
    expect(html).toContain("Current state: THINKING");
    expect(html).toContain("state-thinking");
  });
});
