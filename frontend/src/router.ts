import { createRouter, createWebHistory, type RouterHistory } from "vue-router";

const routes = [
  { path: "/", name: "home", component: { template: "<div></div>" } },
  { path: "/login", name: "login", component: { template: "<div></div>" } },
  { path: "/backoffice", name: "backoffice", component: { template: "<div></div>" } },
  { path: "/event/:id", name: "event-detail", component: { template: "<div></div>" } }
];

export const createAppRouter = (history: RouterHistory = createWebHistory()) =>
  createRouter({
    history,
    routes
  });
