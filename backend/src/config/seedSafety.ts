type Environment = Record<string, string | undefined>;

export const assertDestructiveSeedAllowed = (env: Environment = process.env) => {
  const allowedEnvironment = env.NODE_ENV === "development" || env.NODE_ENV === "test";
  if (!allowedEnvironment || env.ALLOW_DESTRUCTIVE_SEED !== "true") {
    throw new Error(
      "Destructive seed refused: set NODE_ENV to development or test and ALLOW_DESTRUCTIVE_SEED=true explicitly."
    );
  }
};
