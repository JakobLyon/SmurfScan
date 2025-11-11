// Replace all fetch calls with a version that throws if called
jest.mock("node-fetch", () =>
  jest.fn(() => {
    throw new Error(
      "Network call blocked: tests should mock node-fetch or PlayerService"
    );
  })
);
