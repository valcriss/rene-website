import dotenv from "dotenv";
import { hashPassword } from "../src/auth/password";
import {
  createBootstrapPrismaClient,
  ensureAdminUser,
  loadInitAdminEnv,
  parseInitAdminOptions,
  runInitAdminCli,
  type InitAdminOptions
} from "../src/admin/initAdmin";

type MockUser = {
  id: string;
  name: string;
  email: string;
  role: "EDITOR" | "MODERATOR" | "ADMIN";
};

const createClient = () => {
  const findUnique = jest.fn<Promise<MockUser | null>, [{ where: { email: string } }]>();
  const create = jest.fn<Promise<MockUser>, [{ data: { name: string; email: string; role: "ADMIN"; passwordHash: string } }]>();
  const update = jest.fn<Promise<MockUser>, [{ where: { email: string }; data: { name: string; role: "ADMIN"; passwordHash: string } }]>();
  const disconnect = jest.fn<Promise<void>, []>(async () => undefined);

  return {
    client: {
      user: { findUnique, create, update },
      $disconnect: disconnect
    },
    findUnique,
    create,
    update,
    disconnect
  };
};

const options: InitAdminOptions = {
  name: "Admin",
  email: "admin@example.com",
  password: "secret",
  forceUpdate: false
};

describe("admin init", () => {
  it("loads environment files from workspace and backend directories", () => {
    const configSpy = jest.spyOn(dotenv, "config").mockImplementation(() => ({ parsed: {} }));

    loadInitAdminEnv();

    expect(configSpy).toHaveBeenNthCalledWith(1, {
      path: expect.stringMatching(/[\\/]\.env$/)
    });
    expect(configSpy).toHaveBeenNthCalledWith(2, {
      path: expect.stringMatching(/[\\/]backend[\\/]\.env$/)
    });

    configSpy.mockRestore();
  });

  it("creates a prisma client lazily", async () => {
    const mockClient = { user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() } };

    jest.doMock("@prisma/client", () => ({
      PrismaClient: jest.fn(() => mockClient)
    }));

    const client = await createBootstrapPrismaClient();

    expect(client).toBe(mockClient);

    jest.dontMock("@prisma/client");
  });

  it("parses options from process env by default", () => {
    const previousEmail = process.env.ADMIN_INIT_EMAIL;
    const previousPassword = process.env.ADMIN_INIT_PASSWORD;
    const previousName = process.env.ADMIN_INIT_NAME;
    const previousForce = process.env.ADMIN_INIT_FORCE_UPDATE;

    process.env.ADMIN_INIT_NAME = "Process Admin";
    process.env.ADMIN_INIT_EMAIL = "process-admin@example.com";
    process.env.ADMIN_INIT_PASSWORD = "process-secret";
    process.env.ADMIN_INIT_FORCE_UPDATE = "true";

    const result = parseInitAdminOptions([]);

    expect(result).toEqual({
      name: "Process Admin",
      email: "process-admin@example.com",
      password: "process-secret",
      forceUpdate: true
    });

    process.env.ADMIN_INIT_EMAIL = previousEmail;
    process.env.ADMIN_INIT_PASSWORD = previousPassword;
    process.env.ADMIN_INIT_NAME = previousName;
    process.env.ADMIN_INIT_FORCE_UPDATE = previousForce;
  });

  it("parses options from env defaults", () => {
    const result = parseInitAdminOptions([], {
      ADMIN_INIT_NAME: "  Admin  ",
      ADMIN_INIT_EMAIL: "  admin@example.com  ",
      ADMIN_INIT_PASSWORD: "  secret  ",
      ADMIN_INIT_FORCE_UPDATE: "true"
    });

    expect(result).toEqual({
      name: "Admin",
      email: "admin@example.com",
      password: "secret",
      forceUpdate: true
    });
  });

  it("parses options from npm config env defaults", () => {
    const result = parseInitAdminOptions([], {
      npm_config_name: "  Npm Admin  ",
      npm_config_email: "  npm-admin@example.com  ",
      npm_config_password: "  npm-secret  ",
      npm_config_force_update: "true"
    });

    expect(result).toEqual({
      name: "Npm Admin",
      email: "npm-admin@example.com",
      password: "npm-secret",
      forceUpdate: true
    });
  });

  it("ignores boolean npm config placeholders and preserves false flags", () => {
    expect(parseInitAdminOptions(["admin@example.com"], {
      npm_config_email: "true",
      npm_config_password: "secret",
      npm_config_force_update: "false"
    })).toEqual({
      name: "Administrateur",
      email: "admin@example.com",
      password: "secret",
      forceUpdate: false
    });

    expect(parseInitAdminOptions([], {
      ADMIN_INIT_EMAIL: "admin@example.com",
      ADMIN_INIT_PASSWORD: "secret",
      ADMIN_INIT_FORCE_UPDATE: "false"
    }).forceUpdate).toBe(false);
  });

  it("parses cli options over env", () => {
    const result = parseInitAdminOptions(
      ["--name", "Boss", "--email", "boss@example.com", "--password", "pwd", "--force-update"],
      {
        ADMIN_INIT_NAME: "Admin",
        ADMIN_INIT_EMAIL: "admin@example.com",
        ADMIN_INIT_PASSWORD: "secret",
        ADMIN_INIT_FORCE_UPDATE: "false"
      }
    );

    expect(result).toEqual({
      name: "Boss",
      email: "boss@example.com",
      password: "pwd",
      forceUpdate: true
    });
  });

  it("parses positional args for npm run compatibility", () => {
    expect(parseInitAdminOptions(["admin@example.com", "secret"], {})).toEqual({
      name: "Administrateur",
      email: "admin@example.com",
      password: "secret",
      forceUpdate: false
    });

    expect(parseInitAdminOptions(["Boss", "boss@example.com", "secret"], {})).toEqual({
      name: "Boss",
      email: "boss@example.com",
      password: "secret",
      forceUpdate: false
    });

    expect(parseInitAdminOptions(["secret"], {
      ADMIN_INIT_EMAIL: "admin@example.com"
    })).toEqual({
      name: "Administrateur",
      email: "admin@example.com",
      password: "secret",
      forceUpdate: false
    });
  });

  it("uses default admin name", () => {
    const result = parseInitAdminOptions([], {
      ADMIN_INIT_EMAIL: "admin@example.com",
      ADMIN_INIT_PASSWORD: "secret"
    });

    expect(result.name).toBe("Administrateur");
  });

  it("rejects missing option values and unknown args", () => {
    expect(() => parseInitAdminOptions(["--email"], {})).toThrow("Missing value for --email");
    expect(() => parseInitAdminOptions(["--unknown"], {})).toThrow("Unknown option: --unknown");
    expect(() => parseInitAdminOptions(["--email", "admin@example.com", "secret"], {})).toThrow("Unknown option: secret");
    expect(() => parseInitAdminOptions(["extra"], {
      ADMIN_INIT_EMAIL: "admin@example.com",
      ADMIN_INIT_PASSWORD: "secret"
    })).toThrow("Unknown option: extra");
    expect(() => parseInitAdminOptions(["one", "two", "three", "four"], {})).toThrow("Unknown option: one");
  });

  it("rejects missing required values", () => {
    expect(() =>
      parseInitAdminOptions(
        ["--name", "   "],
        { ADMIN_INIT_EMAIL: "admin@example.com", ADMIN_INIT_PASSWORD: "secret" }
      )
    ).toThrow("Admin name is required");
    expect(() => parseInitAdminOptions([], { ADMIN_INIT_PASSWORD: "secret" })).toThrow("Admin email is required");
    expect(() => parseInitAdminOptions([], { ADMIN_INIT_EMAIL: "admin@example.com" })).toThrow("Admin password is required");
  });

  it("creates the admin when absent", async () => {
    const { client, findUnique, create } = createClient();
    const createdUser = { id: "1", name: "Admin", email: "admin@example.com", role: "ADMIN" as const };
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue(createdUser);

    const result = await ensureAdminUser(client, options);

    expect(create).toHaveBeenCalledWith({
      data: {
        name: "Admin",
        email: "admin@example.com",
        role: "ADMIN",
        passwordHash: hashPassword("secret")
      }
    });
    expect(result).toEqual({ action: "created", user: createdUser });
  });

  it("returns unchanged when admin already exists", async () => {
    const { client, findUnique } = createClient();
    const existingUser = { id: "1", name: "Admin", email: "admin@example.com", role: "ADMIN" as const };
    findUnique.mockResolvedValue(existingUser);

    const result = await ensureAdminUser(client, options);

    expect(result).toEqual({ action: "unchanged", user: existingUser });
  });

  it("updates the user when force update is enabled", async () => {
    const { client, findUnique, update } = createClient();
    const existingUser = { id: "1", name: "Old", email: "admin@example.com", role: "EDITOR" as const };
    const updatedUser = { id: "1", name: "Admin", email: "admin@example.com", role: "ADMIN" as const };
    findUnique.mockResolvedValue(existingUser);
    update.mockResolvedValue(updatedUser);

    const result = await ensureAdminUser(client, { ...options, forceUpdate: true });

    expect(update).toHaveBeenCalledWith({
      where: { email: "admin@example.com" },
      data: {
        name: "Admin",
        role: "ADMIN",
        passwordHash: hashPassword("secret")
      }
    });
    expect(result).toEqual({ action: "updated", user: updatedUser });
  });

  it("rejects promotion without force update", async () => {
    const { client, findUnique } = createClient();
    findUnique.mockResolvedValue({ id: "1", name: "Editor", email: "admin@example.com", role: "EDITOR" });

    await expect(ensureAdminUser(client, options)).rejects.toThrow(
      "A user with this email already exists and is not an admin. Use --force-update to promote it."
    );
  });

  it("runs the cli and disconnects the client after creation", async () => {
    const { client, findUnique, create, disconnect } = createClient();
    const logger = { info: jest.fn() };
    const loadEnv = jest.fn();
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ id: "1", name: "Admin", email: "admin@example.com", role: "ADMIN" });

    const result = await runInitAdminCli([], {
      ADMIN_INIT_EMAIL: "admin@example.com",
      ADMIN_INIT_PASSWORD: "secret"
    }, {
      loadEnv,
      logger,
      createClient: async () => client
    });

    expect(loadEnv).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("Admin created: admin@example.com");
    expect(disconnect).toHaveBeenCalled();
    expect(result.action).toBe("created");
  });

  it("runs the cli and logs update or unchanged states", async () => {
    const updatedClient = createClient();
    updatedClient.findUnique.mockResolvedValue({ id: "1", name: "Editor", email: "admin@example.com", role: "EDITOR" });
    updatedClient.update.mockResolvedValue({ id: "1", name: "Admin", email: "admin@example.com", role: "ADMIN" });
    const updatedLogger = { info: jest.fn() };

    const updatedResult = await runInitAdminCli(
      ["--email", "admin@example.com", "--password", "secret", "--force-update"],
      {},
      {
        loadEnv: jest.fn(),
        logger: updatedLogger,
        createClient: async () => updatedClient.client
      }
    );

    expect(updatedLogger.info).toHaveBeenCalledWith("Admin updated: admin@example.com");
    expect(updatedResult.action).toBe("updated");

    const unchangedClient = createClient();
    unchangedClient.findUnique.mockResolvedValue({ id: "1", name: "Admin", email: "admin@example.com", role: "ADMIN" });
    const unchangedLogger = { info: jest.fn() };

    const unchangedResult = await runInitAdminCli(
      ["--email", "admin@example.com", "--password", "secret"],
      {},
      {
        loadEnv: jest.fn(),
        logger: unchangedLogger,
        createClient: async () => unchangedClient.client
      }
    );

    expect(unchangedLogger.info).toHaveBeenCalledWith("Admin already exists: admin@example.com");
    expect(unchangedResult.action).toBe("unchanged");
  });

  it("disconnects the client when cli fails after client creation", async () => {
    const { client, findUnique, disconnect } = createClient();
    findUnique.mockResolvedValue({ id: "1", name: "Editor", email: "admin@example.com", role: "EDITOR" });

    await expect(
      runInitAdminCli(
        ["--email", "admin@example.com", "--password", "secret"],
        {},
        {
          loadEnv: jest.fn(),
          logger: { info: jest.fn() },
          createClient: async () => client
        }
      )
    ).rejects.toThrow("A user with this email already exists and is not an admin. Use --force-update to promote it.");

    expect(disconnect).toHaveBeenCalled();
  });

  it("runs the cli with default args env and dependencies", async () => {
    const previousArgv = process.argv;
    const previousEmail = process.env.ADMIN_INIT_EMAIL;
    const previousPassword = process.env.ADMIN_INIT_PASSWORD;
    const previousName = process.env.ADMIN_INIT_NAME;
    const previousForce = process.env.ADMIN_INIT_FORCE_UPDATE;
    const dotenvSpy = jest.spyOn(dotenv, "config").mockImplementation(() => ({ parsed: {} }));
    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => undefined);
    const disconnect = jest.fn(async () => undefined);
    const mockClient = {
      user: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async () => ({
          id: "1",
          name: "CLI Admin",
          email: "cli-admin@example.com",
          role: "ADMIN" as const
        })),
        update: jest.fn()
      },
      $disconnect: disconnect
    };

    process.argv = ["node", "script", "--force-update"];
    process.env.ADMIN_INIT_NAME = "CLI Admin";
    process.env.ADMIN_INIT_EMAIL = "cli-admin@example.com";
    process.env.ADMIN_INIT_PASSWORD = "cli-secret";
    process.env.ADMIN_INIT_FORCE_UPDATE = "false";

    const result = await runInitAdminCli(undefined, undefined, {
      createClient: async () => mockClient
    });

    expect(result.action).toBe("created");
    expect(infoSpy).toHaveBeenCalledWith("Admin created: cli-admin@example.com");
    expect(disconnect).toHaveBeenCalled();

    process.argv = previousArgv;
    process.env.ADMIN_INIT_EMAIL = previousEmail;
    process.env.ADMIN_INIT_PASSWORD = previousPassword;
    process.env.ADMIN_INIT_NAME = previousName;
    process.env.ADMIN_INIT_FORCE_UPDATE = previousForce;
    dotenvSpy.mockRestore();
    infoSpy.mockRestore();
  });
});