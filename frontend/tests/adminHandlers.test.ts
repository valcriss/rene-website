import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { nextTick } from "vue";
import { vi } from "vitest";
import App from "../src/App.vue";
import { createTestRouter } from "./testRouter";

vi.mock("../src/components/EventMap.vue", () => ({
  default: {
    name: "EventMap",
    props: ["events", "selectedId"],
    template: "<div></div>"
  }
}));

const fetchAdminUsersMock = vi.fn();
const fetchAdminCategoriesMock = vi.fn();
const fetchAdminSettingsMock = vi.fn();
const createAdminUserMock = vi.fn();
const updateAdminUserMock = vi.fn();
const deleteAdminUserMock = vi.fn();
const createAdminCategoryMock = vi.fn();
const updateAdminCategoryMock = vi.fn();
const deleteAdminCategoryMock = vi.fn();
const updateAdminSettingsMock = vi.fn();

vi.mock("../src/api/admin", () => ({
  fetchAdminUsers: (...args: unknown[]) => fetchAdminUsersMock(...args),
  fetchAdminCategories: (...args: unknown[]) => fetchAdminCategoriesMock(...args),
  fetchAdminSettings: (...args: unknown[]) => fetchAdminSettingsMock(...args),
  createAdminUser: (...args: unknown[]) => createAdminUserMock(...args),
  updateAdminUser: (...args: unknown[]) => updateAdminUserMock(...args),
  deleteAdminUser: (...args: unknown[]) => deleteAdminUserMock(...args),
  createAdminCategory: (...args: unknown[]) => createAdminCategoryMock(...args),
  updateAdminCategory: (...args: unknown[]) => updateAdminCategoryMock(...args),
  deleteAdminCategory: (...args: unknown[]) => deleteAdminCategoryMock(...args),
  updateAdminSettings: (...args: unknown[]) => updateAdminSettingsMock(...args)
}));

describe("admin handlers", () => {
  const mountWithRouter = async (path = "/login") => {
    const router = createTestRouter(path);
    await router.isReady();
    const wrapper = mount(App, { global: { plugins: [createPinia(), router] } });
    return { wrapper, router };
  };
  const goToAdminUsers = async (router: ReturnType<typeof createTestRouter>) => {
    await router.replace("/backoffice/admin/users");
    await nextTick();
  };
  const goToAdminCategories = async (router: ReturnType<typeof createTestRouter>) => {
    await router.replace("/backoffice/admin/categories");
    await nextTick();
  };
  const goToAdminSettings = async (router: ReturnType<typeof createTestRouter>) => {
    await router.replace("/backoffice/admin/settings");
    await nextTick();
  };
  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));
  const waitForAdminLoad = async (wrapper: ReturnType<typeof mount>) => {
    for (let i = 0; i < 4; i += 1) {
      await flushPromises();
      await nextTick();
      if (
        fetchAdminUsersMock.mock.calls.length > 0 &&
        !wrapper.text().includes("Chargement de l'administration")
      ) {
        break;
      }
    }
  };
  type Exposed = {
    setRole: (value: "VISITOR" | "EDITOR" | "MODERATOR" | "ADMIN") => void;
    startAdminUserEdit: (user: { id: string; name: string; email: string; role: "EDITOR" | "MODERATOR" | "ADMIN" }) => void;
    startAdminCategoryEdit: (category: { id: string; name: string }) => void;
    handleSaveAdminUser: () => Promise<void>;
    handleDeleteAdminUser: (id: string) => Promise<void>;
    handleSaveAdminCategory: () => Promise<void>;
    handleDeleteAdminCategory: (id: string) => Promise<void>;
    handleSaveAdminSettings: () => Promise<void>;
    getAdminError: () => string | null;
  };

  beforeEach(() => {
    window.localStorage.clear();
    fetchAdminUsersMock.mockResolvedValue([{ id: "u1", name: "Admin", email: "admin@test", role: "ADMIN" }]);
    fetchAdminCategoriesMock.mockResolvedValue([{ id: "c1", name: "Musique" }]);
    fetchAdminSettingsMock.mockResolvedValue({ contactEmail: "c", contactPhone: "p", homepageIntro: "i" });
    createAdminUserMock.mockReset();
    updateAdminUserMock.mockReset();
    deleteAdminUserMock.mockReset();
    createAdminCategoryMock.mockReset();
    updateAdminCategoryMock.mockReset();
    deleteAdminCategoryMock.mockReset();
    updateAdminSettingsMock.mockReset();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resets admin user form from edit mode", async () => {
    const { wrapper, router } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("ADMIN");
    await nextTick();
    await goToAdminUsers(router);
    await waitForAdminLoad(wrapper);

    vm.startAdminUserEdit({ id: "u1", name: "Admin", email: "admin@test", role: "ADMIN" });
    await nextTick();

    const userForm = wrapper.get("[data-testid='admin-user-form']");
    const resetButton = userForm.findAll("button").find((button) => button.text() === "Nouveau");
    if (!resetButton) {
      throw new Error("Reset button not found");
    }
    await resetButton.trigger("click");

    const nameInput = userForm.find("input");
    expect((nameInput.element as HTMLInputElement).value).toBe("");
  });

  it("shows admin loading state while fetching", async () => {
    fetchAdminUsersMock.mockImplementation(() => new Promise(() => {}));
    fetchAdminCategoriesMock.mockImplementation(() => new Promise(() => {}));
    fetchAdminSettingsMock.mockImplementation(() => new Promise(() => {}));

    const { wrapper, router } = await mountWithRouter("/login");
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("ADMIN");
    await nextTick();
    await goToAdminUsers(router);

    expect(wrapper.text()).toContain("Chargement de l'administration");
  });

  it("updates admin user and handles errors", async () => {
    updateAdminUserMock.mockResolvedValue({ id: "u1", name: "Admin", email: "admin@test", role: "ADMIN" });
    const { wrapper, router } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("ADMIN");
    await nextTick();
    await goToAdminUsers(router);
    await waitForAdminLoad(wrapper);

    expect(wrapper.text()).toContain("Admin");
    vm.startAdminUserEdit({ id: "u1", name: "Admin", email: "admin@test", role: "ADMIN" });
    await nextTick();
    await vm.handleSaveAdminUser();
    expect(updateAdminUserMock).toHaveBeenCalled();

    vm.startAdminUserEdit({ id: "u1", name: "Admin", email: "admin@test", role: "ADMIN" });
    await nextTick();
    await vm.handleSaveAdminUser();

    updateAdminUserMock.mockRejectedValue("nope");
    vm.startAdminUserEdit({ id: "u1", name: "Admin", email: "admin@test", role: "ADMIN" });
    await nextTick();
    await vm.handleSaveAdminUser();
    expect(vm.getAdminError()).toBe("Erreur inconnue");
  });

  it("uses error message when admin user update fails with Error", async () => {
    updateAdminUserMock.mockRejectedValue(new Error("Oups"));
    const { wrapper, router } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("ADMIN");
    await nextTick();
    await goToAdminUsers(router);
    await waitForAdminLoad(wrapper);

    vm.startAdminUserEdit({ id: "u1", name: "Admin", email: "admin@test", role: "ADMIN" });
    await nextTick();
    await vm.handleSaveAdminUser();

    expect(vm.getAdminError()).toBe("Oups");
  });


  it("deletes admin user and resets edit state", async () => {
    deleteAdminUserMock.mockResolvedValue(undefined);
    const { wrapper, router } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("ADMIN");
    await nextTick();
    await goToAdminUsers(router);
    await waitForAdminLoad(wrapper);

    vm.startAdminUserEdit({ id: "u1", name: "Admin", email: "admin@test", role: "ADMIN" });
    await nextTick();
    await vm.handleDeleteAdminUser("u1");

    const nameInput = wrapper.get("[data-testid='admin-user-form'] input");
    expect((nameInput.element as HTMLInputElement).value).toBe("");
  });

  it("handles delete admin user error", async () => {
    deleteAdminUserMock.mockRejectedValue(new Error("Boom"));
    const { wrapper, router } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("ADMIN");
    await nextTick();
    await goToAdminUsers(router);
    await waitForAdminLoad(wrapper);

    await vm.handleDeleteAdminUser("u1");
    expect(vm.getAdminError()).toBe("Boom");
  });

  it("handles delete admin user error with string", async () => {
    deleteAdminUserMock.mockRejectedValue("nope");
    const { wrapper, router } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("ADMIN");
    await nextTick();
    await goToAdminUsers(router);
    await waitForAdminLoad(wrapper);

    await vm.handleDeleteAdminUser("u1");
    expect(vm.getAdminError()).toBe("Erreur inconnue");
  });

  it("handles category delete and errors", async () => {
    deleteAdminCategoryMock.mockResolvedValue(undefined);
    createAdminCategoryMock.mockRejectedValue("nope");

    const { wrapper, router } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("ADMIN");
    await nextTick();
    await goToAdminCategories(router);
    await waitForAdminLoad(wrapper);

    vm.startAdminCategoryEdit({ id: "c1", name: "Musique" });
    await nextTick();
    await vm.handleDeleteAdminCategory("c1");
    expect(wrapper.get("[data-testid='admin-category-form'] input").element).toHaveProperty("value", "");

    await vm.handleSaveAdminCategory();
    expect(vm.getAdminError()).toBe("Erreur inconnue");
  });

  it("resets admin category form from edit mode", async () => {
    const { wrapper, router } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("ADMIN");
    await nextTick();
    await goToAdminCategories(router);
    await waitForAdminLoad(wrapper);

    vm.startAdminCategoryEdit({ id: "c1", name: "Musique" });
    await nextTick();

    const categoryForm = wrapper.get("[data-testid='admin-category-form']");
    const resetButton = categoryForm.findAll("button").find((button) => button.text() === "Nouveau");
    if (!resetButton) {
      throw new Error("Reset button not found");
    }
    await resetButton.trigger("click");

    const nameInput = categoryForm.find("input");
    expect((nameInput.element as HTMLInputElement).value).toBe("");
  });

  it("uses error message when admin category save fails with Error", async () => {
    createAdminCategoryMock.mockRejectedValue(new Error("Oups"));
    const { wrapper, router } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("ADMIN");
    await nextTick();
    await goToAdminCategories(router);
    await waitForAdminLoad(wrapper);

    await vm.handleSaveAdminCategory();
    expect(vm.getAdminError()).toBe("Oups");
  });

  it("starts admin user edit from list button", async () => {
    const { wrapper, router } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("ADMIN");
    await nextTick();
    await goToAdminUsers(router);
    await waitForAdminLoad(wrapper);

    const userList = wrapper.get("[data-testid='admin-user-list']");
    const editButton = userList.findAll("button").find((button) => button.text() === "Modifier");
    if (!editButton) {
      throw new Error("Edit button not found");
    }

    await editButton.trigger("click");
    await nextTick();

    const userForm = wrapper.get("[data-testid='admin-user-form']");
    const inputs = userForm.findAll("input");
    expect((inputs[0].element as HTMLInputElement).value).toBe("Admin");
    expect((inputs[1].element as HTMLInputElement).value).toBe("admin@test");
    const roleSelect = userForm.find("select");
    expect((roleSelect.element as HTMLSelectElement).value).toBe("ADMIN");
  });

  it("deletes admin category from list button", async () => {
    deleteAdminCategoryMock.mockResolvedValue(undefined);
    const { wrapper, router } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("ADMIN");
    await nextTick();
    await goToAdminCategories(router);
    await waitForAdminLoad(wrapper);

    const categoryList = wrapper.get("[data-testid='admin-category-list']");
    const deleteButton = categoryList.findAll("button").find((button) => button.text() === "Supprimer");
    if (!deleteButton) {
      throw new Error("Delete button not found");
    }

    await deleteButton.trigger("click");
    await flushPromises();
    await nextTick();

    expect(deleteAdminCategoryMock).toHaveBeenCalledWith("ADMIN", "c1");
    expect(categoryList.findAll("li")).toHaveLength(0);
  });


  it("handles delete admin category error", async () => {
    deleteAdminCategoryMock.mockRejectedValue(new Error("Erreur"));
    const { wrapper, router } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("ADMIN");
    await nextTick();
    await goToAdminCategories(router);
    await waitForAdminLoad(wrapper);

    await vm.handleDeleteAdminCategory("c1");
    expect(vm.getAdminError()).toBe("Erreur");
  });

  it("handles delete admin category error with string", async () => {
    deleteAdminCategoryMock.mockRejectedValue("nope");
    const { wrapper, router } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("ADMIN");
    await nextTick();
    await goToAdminCategories(router);
    await waitForAdminLoad(wrapper);

    await vm.handleDeleteAdminCategory("c1");
    expect(vm.getAdminError()).toBe("Erreur inconnue");
  });

  it("handles settings error", async () => {
    updateAdminSettingsMock.mockRejectedValue(new Error("Oups"));
    const { wrapper, router } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("ADMIN");
    await nextTick();
    await goToAdminSettings(router);
    await waitForAdminLoad(wrapper);

    await vm.handleSaveAdminSettings();
    expect(vm.getAdminError()).toBe("Oups");
  });

  it("handles settings error with string", async () => {
    updateAdminSettingsMock.mockRejectedValue("nope");
    const { wrapper, router } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("ADMIN");
    await nextTick();
    await goToAdminSettings(router);
    await flushPromises();
    await nextTick();

    await vm.handleSaveAdminSettings();
    expect(vm.getAdminError()).toBe("Erreur inconnue");
  });

  it("prevents admin actions when role is not admin", async () => {
    const { wrapper } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("VISITOR");
    await nextTick();

    await vm.handleSaveAdminUser();
    await vm.handleDeleteAdminUser("u1");
    await vm.handleSaveAdminCategory();
    await vm.handleDeleteAdminCategory("c1");
    await vm.handleSaveAdminSettings();

    expect(updateAdminUserMock).not.toHaveBeenCalled();
    expect(deleteAdminUserMock).not.toHaveBeenCalled();
    expect(createAdminCategoryMock).not.toHaveBeenCalled();
    expect(deleteAdminCategoryMock).not.toHaveBeenCalled();
    expect(updateAdminSettingsMock).not.toHaveBeenCalled();
  });

  it("sets unknown error when admin load fails with string", async () => {
    fetchAdminUsersMock.mockRejectedValueOnce("nope");
    const { wrapper } = await mountWithRouter();
    await nextTick();

    const vm = wrapper.vm as unknown as Exposed;
    vm.setRole("ADMIN");
    await nextTick();
    await flushPromises();
    await nextTick();

    expect(vm.getAdminError()).toBe("Erreur inconnue");
  });
});