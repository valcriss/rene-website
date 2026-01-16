import { createRouter, createWebHistory, type RouterHistory } from "vue-router";
import HomePage from "./pages/HomePage.vue";
import LoginPage from "./pages/LoginPage.vue";
import EventDetailPage from "./pages/EventDetailPage.vue";
import BackofficeLayout from "./pages/backoffice/BackofficeLayout.vue";
import BackofficeEventsPage from "./pages/backoffice/BackofficeEventsPage.vue";
import BackofficeEventCreatePage from "./pages/backoffice/BackofficeEventCreatePage.vue";
import BackofficeModerationPage from "./pages/backoffice/BackofficeModerationPage.vue";
import BackofficeModerationViewPage from "./pages/backoffice/BackofficeModerationViewPage.vue";
import BackofficeAdminUsersPage from "./pages/backoffice/BackofficeAdminUsersPage.vue";
import BackofficeAdminCategoriesPage from "./pages/backoffice/BackofficeAdminCategoriesPage.vue";
import BackofficeAdminSettingsPage from "./pages/backoffice/BackofficeAdminSettingsPage.vue";

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
