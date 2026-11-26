import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventItem } from "../src/api/events";
import { useEditorStore } from "../src/stores/editor";

const STORAGE_KEY = "rene-website-reauth-draft";

const buildEvent = (overrides: Partial<EventItem> = {}): EventItem =>
  ({
    id: "event-1",
    title: "Concert",
    content: "<p>Texte</p>",
    image: "/uploads/cover.webp",
    imageAlt: "Affiche",
    categoryId: "music",
    audienceId: "",
    occurrences: [],
    organizerName: "Org",
    status: "PUBLISHED",
    createdByUserId: "user-1",
    pendingRevision: null,
    ...overrides
  }) as EventItem;

describe("editor store reauthentication draft", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the form across a session expiry and restores it for the same user", () => {
    const store = useEditorStore();
    store.startEdit(buildEvent());
    store.editorForm.title = "Concert du samedi";
    store.useManualLocation = [true];
    store.isSavingDraft = true;
    store.editorError = "Erreur";

    store.preserveFormForReauth("user-1");

    expect(store.editorForm.title).toBe("");
    expect(store.editingEventId).toBeNull();
    expect(store.isSavingDraft).toBe(false);
    expect(store.editorError).toBeNull();
    expect(window.sessionStorage.getItem(STORAGE_KEY)).not.toContain("password");

    expect(store.restoreFormAfterReauth("user-1")).toBe(true);
    expect(store.editorForm.title).toBe("Concert du samedi");
    expect(store.editorMode).toBe("edit");
    expect(store.editingEventId).toBe("event-1");
    expect(store.editingPublishedEvent).toBe(true);
    expect(store.useManualLocation).toEqual([true]);
    expect(store.restoredAfterReauth).toEqual({ hadPendingImage: false });
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("flags an image that was chosen but not uploaded yet", () => {
    const store = useEditorStore();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    store.setImageFile(new File(["x"], "cover.png", { type: "image/png" }));

    store.preserveFormForReauth("user-1");

    expect(store.restoreFormAfterReauth("user-1")).toBe(true);
    expect(store.restoredAfterReauth).toEqual({ hadPendingImage: true });
  });

  it("never restores another user's input and discards it", () => {
    const store = useEditorStore();
    store.editorForm.title = "Brouillon privé";
    store.preserveFormForReauth("user-1");

    expect(store.restoreFormAfterReauth("user-2")).toBe(false);
    expect(store.editorForm.title).toBe("");
    expect(store.restoredAfterReauth).toBeNull();
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("does nothing when no input was kept", () => {
    expect(useEditorStore().restoreFormAfterReauth("user-1")).toBe(false);
  });

  it("tolerates unavailable or corrupted storage", () => {
    const store = useEditorStore();
    window.sessionStorage.setItem(STORAGE_KEY, "{not json");
    expect(store.restoreFormAfterReauth("user-1")).toBe(false);

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    store.editorForm.title = "Perdu";
    expect(() => store.preserveFormForReauth("user-1")).not.toThrow();
    expect(store.editorForm.title).toBe("");
  });

  it("clears the restored notice when dismissed, on a new draft or when editing another event", () => {
    const store = useEditorStore();
    const restore = () => {
      store.preserveFormForReauth("user-1");
      store.restoreFormAfterReauth("user-1");
      expect(store.restoredAfterReauth).not.toBeNull();
    };

    restore();
    store.dismissRestoredNotice();
    expect(store.restoredAfterReauth).toBeNull();

    restore();
    store.resetEditorForm();
    expect(store.restoredAfterReauth).toBeNull();

    restore();
    store.startEdit(buildEvent({ id: "event-2" }));
    expect(store.restoredAfterReauth).toBeNull();
  });
});
