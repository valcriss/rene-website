import { createMemoryHistory } from "vue-router";
import { createAppRouter } from "../src/router";

export const createTestRouter = (initialPath = "/") => {
  const router = createAppRouter(createMemoryHistory());
  router.push(initialPath);
  return router;
};
