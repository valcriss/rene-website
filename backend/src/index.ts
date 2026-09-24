import path from "path";
import dotenv from "dotenv";
import { createApp } from "./app";
import { assertValidProductionEnvironment } from "./config/environment";

dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const startServer = (port?: number) => {
  assertValidProductionEnvironment();
  const resolvedPort = port ?? Number(process.env.PORT ?? "3000");
  const app = createApp();

  return app.listen(resolvedPort, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on ${resolvedPort}`);
  });
};

export const runIfMain = (isMain: boolean) => {
  if (isMain) {
    startServer();
  }
};

runIfMain(require.main === module);
