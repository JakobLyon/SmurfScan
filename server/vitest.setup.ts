// vitest.setup.ts
import { vi } from "vitest";

vi.mock("node-fetch", () => {
  return {
    default: vi.fn(() => {
      throw new Error("Network call blocked during tests");
    }),
  };
});
