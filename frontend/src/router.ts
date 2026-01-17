import { createRouter, createWebHistory, type RouterHistory } from "vue-router";

const HomePage = () => import("./pages/HomePage.vue");
const LoginPage = () => import("./pages/LoginPage.vue");
const EventDetailPage = () => import("./pages/EventDetailPage.vue");
const BackofficeLayout = () => import("./pages/backoffice/BackofficeLayout.vue");
const BackofficeEventsPage = () => import("./pages/backoffice/BackofficeEventsPage.vue");
const BackofficeEventCreatePage = () => import("./pages/backoffice/BackofficeEventCreatePage.vue");
const BackofficeModerationPage = () => import("./pages/backoffice/BackofficeModerationPage.vue");
const BackofficeModerationViewPage = () => import("./pages/backoffice/BackofficeModerationViewPage.vue");
const BackofficeAdminUsersPage = () => import("./pages/backoffice/BackofficeAdminUsersPage.vue");
const BackofficeAdminCategoriesPage = () => import("./pages/backoffice/BackofficeAdminCategoriesPage.vue");
const BackofficeAdminSettingsPage = () => import("./pages/backoffice/BackofficeAdminSettingsPage.vue");

const routes = [
  { path: "/", name: "home", component: HomePage },
  { path: "/login", name: "login", component: LoginPage },
  {
    path: "/backoffice",
    component: BackofficeLayout,
    children: [
      { path: "", redirect: "/backoffice/events" },
      { path: "events", name: "backoffice-events", component: BackofficeEventsPage },
      { path: "events/new", name: "backoffice-events-new", component: BackofficeEventCreatePage },
      { path: "moderation", name: "backoffice-moderation", component: BackofficeModerationPage },
      {
        path: "moderation/view/:id",
        name: "backoffice-moderation-view",
        component: BackofficeModerationViewPage
      },
      { path: "admin", redirect: "/backoffice/admin/users" },
      { path: "admin/users", name: "backoffice-admin-users", component: BackofficeAdminUsersPage },
      { path: "admin/categories", name: "backoffice-admin-categories", component: BackofficeAdminCategoriesPage },
      { path: "admin/settings", name: "backoffice-admin-settings", component: BackofficeAdminSettingsPage }
    ]
  },
  { path: "/event/:id", name: "event-detail", component: EventDetailPage }
];

export const createAppRouter = (history: RouterHistory = createWebHistory()) =>
  createRouter({
    history,
    routes
  });
