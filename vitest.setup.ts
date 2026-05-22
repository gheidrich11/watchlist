import "@testing-library/jest-dom/vitest";

// Required by React 19 to silence "not configured to support act(...)" warnings
// when using @testing-library/react in jsdom.
// See: https://github.com/reactwg/react-18/discussions/102
(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
