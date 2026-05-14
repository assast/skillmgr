import { render, screen } from "@testing-library/react";

describe("Smoke Test", () => {
  it("should render correctly", () => {
    render(<div>Hello World</div>);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("should have access to test environment variables", () => {
    expect(import.meta.env.LLM_API_URL).toBeDefined();
    expect(import.meta.env.LLM_API_KEY).toBeDefined();
    expect(import.meta.env.LLM_MODEL).toBeDefined();
  });
});
