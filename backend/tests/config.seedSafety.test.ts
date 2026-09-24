import { assertDestructiveSeedAllowed } from "../src/config/seedSafety";

describe("destructive seed safety", () => {
  it("allows an explicitly enabled development or test database", () => {
    expect(() =>
      assertDestructiveSeedAllowed({ NODE_ENV: "development", ALLOW_DESTRUCTIVE_SEED: "true" })
    ).not.toThrow();
    expect(() => assertDestructiveSeedAllowed({ NODE_ENV: "test", ALLOW_DESTRUCTIVE_SEED: "true" })).not.toThrow();

    const previousConsent = process.env.ALLOW_DESTRUCTIVE_SEED;
    process.env.ALLOW_DESTRUCTIVE_SEED = "true";
    expect(() => assertDestructiveSeedAllowed()).not.toThrow();
    if (previousConsent === undefined) delete process.env.ALLOW_DESTRUCTIVE_SEED;
    else process.env.ALLOW_DESTRUCTIVE_SEED = previousConsent;
  });

  it("rejects production and missing explicit consent", () => {
    expect(() => assertDestructiveSeedAllowed({ NODE_ENV: "production", ALLOW_DESTRUCTIVE_SEED: "true" })).toThrow(
      "Destructive seed refused"
    );
    expect(() => assertDestructiveSeedAllowed({ NODE_ENV: "development" })).toThrow(
      "Destructive seed refused"
    );
  });
});
