import { describe, it, expect } from "vitest";
import { resolve } from "path";

process.env.OPENAI_API_KEY = "test";
process.env.SERPAPI_API_KEY = "test";
process.env.SUPABASE_URL = "test";
process.env.SUPABASE_ANON_KEY = "test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test";
process.env.LANGFUSE_BASE_URL = "test";
process.env.LANGFUSE_PUBLIC_KEY = "test";
process.env.LANGFUSE_SECRET_KEY = "test";

describe("config", () => {
  it("processes the environment variables", async () => {
    const vars = await import("./config");
    expect(vars.OPENAI_API_KEY).toBe("test");
    expect(vars.SERPAPI_API_KEY).toBe("test");
    expect(vars.SUPABASE_URL).toBe("test");
    expect(vars.SUPABASE_ANON_KEY).toBe("test");
    expect(vars.SUPABASE_SERVICE_ROLE_KEY).toBe("test");
    expect(vars.LANGFUSE_BASE_URL).toBe("test");
    expect(vars.LANGFUSE_PUBLIC_KEY).toBe("test");
    expect(vars.PUBLIC_DIR).toBe(resolve(__dirname, "..", "public"));
  });
});
