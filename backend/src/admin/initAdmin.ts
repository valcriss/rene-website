import path from "node:path";
import dotenv from "dotenv";
import { hashPassword } from "../auth/password";

export type InitAdminOptions = {
  name: string;
  email: string;
  password: string;
  forceUpdate: boolean;
};

type BootstrapUser = {
  id: string;
  name: string;
  email: string;
  role: "EDITOR" | "MODERATOR" | "ADMIN";
};

type BootstrapClient = {
  user: {
    findUnique: (args: { where: { email: string } }) => Promise<BootstrapUser | null>;
    create: (args: {
      data: { name: string; email: string; role: "ADMIN"; passwordHash: string };
    }) => Promise<BootstrapUser>;
    update: (args: {
      where: { email: string };
      data: { name: string; role: "ADMIN"; passwordHash: string };
    }) => Promise<BootstrapUser>;
  };
  $disconnect?: () => Promise<void>;
};

type Logger = {
  info: (message: string) => void;
};

type Env = Record<string, string | undefined>;

type RunInitAdminDependencies = {
  loadEnv?: () => void;
  createClient?: () => Promise<BootstrapClient>;
  logger?: Logger;
};

export const loadInitAdminEnv = () => {
  dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
};

const readEnvValue = (env: Env, ...keys: string[]) => {
  for (const key of keys) {
    const value = env[key]?.trim();
    if (!value) {
      continue;
    }

    if (key.startsWith("npm_config_") && (value === "true" || value === "false")) {
      continue;
    }

    if (value) {
      return value;
    }
  }

  return undefined;
};

const readEnvFlag = (env: Env, ...keys: string[]) => {
  for (const key of keys) {
    const value = env[key]?.trim().toLowerCase();
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
  }

  return false;
};

const readOptionValue = (args: string[], index: number, option: string) => {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${option}`);
  }
  return value;
};

export const parseInitAdminOptions = (
  args: string[],
  env: Env = process.env
): InitAdminOptions => {
  let name = readEnvValue(env, "ADMIN_INIT_NAME", "npm_config_name") || "Administrateur";
  let email = readEnvValue(env, "ADMIN_INIT_EMAIL", "npm_config_email") || "";
  let password = readEnvValue(env, "ADMIN_INIT_PASSWORD", "npm_config_password") || "";
  let forceUpdate = readEnvFlag(env, "ADMIN_INIT_FORCE_UPDATE", "npm_config_force_update");
  const positionalArgs: string[] = [];
  let hasNamedOptions = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--name") {
      hasNamedOptions = true;
      name = readOptionValue(args, index, arg).trim();
      index += 1;
      continue;
    }
    if (arg === "--email") {
      hasNamedOptions = true;
      email = readOptionValue(args, index, arg).trim();
      index += 1;
      continue;
    }
    if (arg === "--password") {
      hasNamedOptions = true;
      password = readOptionValue(args, index, arg).trim();
      index += 1;
      continue;
    }
    if (arg === "--force-update") {
      hasNamedOptions = true;
      forceUpdate = true;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    positionalArgs.push(arg.trim());
  }

  if (positionalArgs.length > 0) {
    if (hasNamedOptions) {
      throw new Error(`Unknown option: ${positionalArgs[0]}`);
    }

    if (positionalArgs.length === 1) {
      if (!email) {
        email = positionalArgs[0];
      } else if (!password) {
        password = positionalArgs[0];
      } else {
        throw new Error(`Unknown option: ${positionalArgs[0]}`);
      }
    } else if (positionalArgs.length === 2) {
      [email, password] = positionalArgs;
    } else if (positionalArgs.length === 3) {
      [name, email, password] = positionalArgs;
    } else {
      throw new Error(`Unknown option: ${positionalArgs[0]}`);
    }
  }

  if (!name) {
    throw new Error("Admin name is required");
  }
  if (!email) {
    throw new Error("Admin email is required");
  }
  if (!password) {
    throw new Error("Admin password is required");
  }

  return { name, email, password, forceUpdate };
};

export const createBootstrapPrismaClient = async (): Promise<BootstrapClient> => {
  const { PrismaClient } = await import("@prisma/client");
  return new PrismaClient();
};

export const ensureAdminUser = async (client: BootstrapClient, options: InitAdminOptions) => {
  const existing = await client.user.findUnique({ where: { email: options.email } });

  if (!existing) {
    const created = await client.user.create({
      data: {
        name: options.name,
        email: options.email,
        role: "ADMIN",
        passwordHash: hashPassword(options.password)
      }
    });

    return { action: "created" as const, user: created };
  }

  if (existing.role !== "ADMIN" && !options.forceUpdate) {
    throw new Error("A user with this email already exists and is not an admin. Use --force-update to promote it.");
  }

  if (options.forceUpdate) {
    const updated = await client.user.update({
      where: { email: options.email },
      data: {
        name: options.name,
        role: "ADMIN",
        passwordHash: hashPassword(options.password)
      }
    });

    return { action: "updated" as const, user: updated };
  }

  return { action: "unchanged" as const, user: existing };
};

export const runInitAdminCli = async (
  args: string[] = process.argv.slice(2),
  env: Env = process.env,
  dependencies?: RunInitAdminDependencies
) => {
  const resolvedDependencies = Object.assign(
    {
      loadEnv: loadInitAdminEnv,
      createClient: createBootstrapPrismaClient,
      logger: console as Logger
    },
    dependencies
  );

  const { loadEnv, createClient, logger } = resolvedDependencies;

  loadEnv();

  const options = parseInitAdminOptions(args, env);
  const client = await createClient();

  try {
    const result = await ensureAdminUser(client, options);
    if (result.action === "created") {
      logger.info(`Admin created: ${result.user.email}`);
      return result;
    }
    if (result.action === "updated") {
      logger.info(`Admin updated: ${result.user.email}`);
      return result;
    }

    logger.info(`Admin already exists: ${result.user.email}`);
    return result;
  } finally {
    await client.$disconnect?.();
  }
};