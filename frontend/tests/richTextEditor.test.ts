import { mount } from "@vue/test-utils";
import { ref } from "vue";
import { vi } from "vitest";
import RichTextEditor from "../src/components/form/RichTextEditor.vue";
import { uploadImage } from "../src/api/uploads";

const chain = {
  focus: vi.fn().mockReturnThis(),
  setParagraph: vi.fn().mockReturnThis(),
  setHardBreak: vi.fn().mockReturnThis(),
  toggleHeading: vi.fn().mockReturnThis(),
  toggleBold: vi.fn().mockReturnThis(),
  toggleItalic: vi.fn().mockReturnThis(),
  toggleUnderline: vi.fn().mockReturnThis(),
  toggleBulletList: vi.fn().mockReturnThis(),
  toggleOrderedList: vi.fn().mockReturnThis(),
  extendMarkRange: vi.fn().mockReturnThis(),
  setLink: vi.fn().mockReturnThis(),
  unsetLink: vi.fn().mockReturnThis(),
  setImage: vi.fn().mockReturnThis(),
  run: vi.fn()
};

type EditorLike = {
  isActive: (name: string, attributes?: Record<string, unknown>) => boolean;
  chain: () => typeof chain;
  commands: { setContent: (value: string, emit: boolean) => void };
  getHTML: () => string;
  destroy: () => void;
};

const editorInstance: EditorLike = {
  isActive: vi.fn(() => false),
  chain: vi.fn(() => chain),
  commands: { setContent: vi.fn() },
  getHTML: vi.fn(() => "<p>initial</p>"),
  destroy: vi.fn()
};

let onUpdateHandler: ((payload: { editor: EditorLike }) => void) | null = null;
let editorRef = ref<EditorLike | null>(editorInstance);

vi.mock("../src/api/uploads", () => ({
  uploadImage: vi.fn()
}));

vi.mock("@tiptap/vue-3", () => ({
  EditorContent: { name: "EditorContent", template: "<div data-testid='editor-content'></div>" },
  useEditor: (options?: { onUpdate?: (payload: { editor: EditorLike }) => void }) => {
    onUpdateHandler = options?.onUpdate ?? null;
    return editorRef;
  }
}));

describe("RichTextEditor", () => {
  beforeEach(() => {
    onUpdateHandler = null;
    editorRef = ref<EditorLike | null>(editorInstance);
    vi.clearAllMocks();
  });

  it("toggles formatting, structure, and links", async () => {
    const wrapper = mount(RichTextEditor, { props: { modelValue: "<p>hello</p>" } });

    await wrapper.find("button[aria-label='Paragraphe']").trigger("click");
    await wrapper.find("button[aria-label='Titre de section']").trigger("click");
    await wrapper.find("button[aria-label='Sous-titre']").trigger("click");
    await wrapper.find("button[aria-label='Gras']").trigger("click");
    await wrapper.find("button[aria-label='Italique']").trigger("click");
    await wrapper.find("button[aria-label='Souligné']").trigger("click");
    await wrapper.find("button[aria-label='Liste à puces']").trigger("click");
    await wrapper.find("button[aria-label='Liste numérotée']").trigger("click");

    expect(chain.setParagraph).toHaveBeenCalled();
    expect(chain.toggleHeading).toHaveBeenCalledWith({ level: 2 });
    expect(chain.toggleHeading).toHaveBeenCalledWith({ level: 3 });
    expect(chain.toggleBold).toHaveBeenCalled();
    expect(chain.toggleItalic).toHaveBeenCalled();
    expect(chain.toggleUnderline).toHaveBeenCalled();
    expect(chain.toggleBulletList).toHaveBeenCalled();
    expect(chain.toggleOrderedList).toHaveBeenCalled();

    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("example.com");
    await wrapper.find("button[aria-label='Lien']").trigger("click");
    expect(chain.setLink).toHaveBeenCalledWith({ href: "https://example.com" });
    promptSpy.mockRestore();

    await wrapper.find("button[aria-label='Retirer le lien']").trigger("click");
    expect(chain.unsetLink).toHaveBeenCalled();
  });

  it("uploads and inserts an image", async () => {
    vi.mocked(uploadImage).mockResolvedValue("/uploads/inline.png");
    const wrapper = mount(RichTextEditor, { props: { modelValue: "<p>hello</p>" } });
    const input = wrapper.get("input[type='file']");
    const file = new File(["image"], "inline.png", { type: "image/png" });

    Object.defineProperty(input.element, "files", { value: [file], configurable: true });
    await input.trigger("change");

    expect(uploadImage).toHaveBeenCalledWith(file);
    expect(chain.setImage).toHaveBeenCalledWith({ src: "/uploads/inline.png", alt: "inline.png" });
  });

  it("shows image upload errors", async () => {
    vi.mocked(uploadImage).mockRejectedValue(new Error("Upload impossible"));
    const wrapper = mount(RichTextEditor, { props: { modelValue: "<p>hello</p>" } });
    const input = wrapper.get("input[type='file']");
    const file = new File(["image"], "inline.png", { type: "image/png" });

    Object.defineProperty(input.element, "files", { value: [file], configurable: true });
    await input.trigger("change");

    expect(wrapper.text()).toContain("Upload impossible");
  });

  it("ignores empty image selections", async () => {
    const wrapper = mount(RichTextEditor, { props: { modelValue: "<p>hello</p>" } });
    const input = wrapper.get("input[type='file']");

    Object.defineProperty(input.element, "files", { value: [], configurable: true });
    await input.trigger("change");

    expect(uploadImage).not.toHaveBeenCalled();
    expect(chain.setImage).not.toHaveBeenCalled();
  });

  it("opens the image picker from the toolbar", async () => {
    const wrapper = mount(RichTextEditor, { props: { modelValue: "<p>hello</p>" } });
    const input = wrapper.get("input[type='file']");
    const clickSpy = vi.spyOn(input.element as HTMLInputElement, "click");

    await wrapper.find("button[aria-label='Image']").trigger("click");
    expect(clickSpy).toHaveBeenCalled();
  });

  it("can disable image controls for compact rich text usage", () => {
    const wrapper = mount(RichTextEditor, {
      props: { modelValue: "<p>hello</p>", allowImages: false, compact: true, ariaLabel: "Information sur le tarif" }
    });

    expect(wrapper.find("button[aria-label='Image']").exists()).toBe(false);
    expect(wrapper.find("input[type='file']").exists()).toBe(false);
    expect(wrapper.html()).toContain("min-h-[180px]");
  });

  it("skips link when prompt is empty", async () => {
    const wrapper = mount(RichTextEditor, { props: { modelValue: "<p>hello</p>" } });
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("");

    await wrapper.find("button[aria-label='Lien']").trigger("click");
    expect(chain.setLink).not.toHaveBeenCalled();

    promptSpy.mockRestore();
  });

  it("normalizes http and mailto links", async () => {
    const wrapper = mount(RichTextEditor, { props: { modelValue: "<p>hello</p>" } });

    const httpSpy = vi.spyOn(window, "prompt").mockReturnValue("http://example.com");
    await wrapper.find("button[aria-label='Lien']").trigger("click");
    expect(chain.setLink).toHaveBeenCalledWith({ href: "http://example.com" });
    httpSpy.mockRestore();

    const mailtoSpy = vi.spyOn(window, "prompt").mockReturnValue("mailto:test@example.com");
    await wrapper.find("button[aria-label='Lien']").trigger("click");
    expect(chain.setLink).toHaveBeenCalledWith({ href: "mailto:test@example.com" });
    mailtoSpy.mockRestore();
  });

  it("updates content when modelValue changes", async () => {
    const wrapper = mount(RichTextEditor, { props: { modelValue: "<p>hello</p>" } });
    editorInstance.getHTML = vi.fn(() => "<p>old</p>");

    await wrapper.setProps({ modelValue: "<p>new</p>" });
    expect(editorInstance.commands.setContent).toHaveBeenCalledWith("<p>new</p>", false);
  });

  it("updates content with empty value", async () => {
    const wrapper = mount(RichTextEditor, { props: { modelValue: "<p>hello</p>" } });
    editorInstance.getHTML = vi.fn(() => "<p>old</p>");

    await wrapper.setProps({ modelValue: "" });
    expect(editorInstance.commands.setContent).toHaveBeenCalledWith("", false);
  });

  it("does not update when editor is missing", async () => {
    const wrapper = mount(RichTextEditor, { props: { modelValue: "<p>hello</p>" } });
    editorRef.value = null;

    await wrapper.setProps({ modelValue: "<p>other</p>" });
    expect(editorInstance.commands.setContent).not.toHaveBeenCalled();
  });

  it("skips updates when HTML matches", async () => {
    const wrapper = mount(RichTextEditor, { props: { modelValue: "<p>hello</p>" } });
    editorInstance.getHTML = vi.fn(() => "<p>same</p>");

    await wrapper.setProps({ modelValue: "<p>same</p>" });
    expect(editorInstance.commands.setContent).not.toHaveBeenCalled();
  });

  it("emits updates on editor change", () => {
    const wrapper = mount(RichTextEditor, { props: { modelValue: "<p>hello</p>" } });
    onUpdateHandler?.({ editor: editorInstance });
    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
  });

  it("skips link when prompt is cancelled", async () => {
    const wrapper = mount(RichTextEditor, { props: { modelValue: "<p>hello</p>" } });
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue(null);

    await wrapper.find("button[aria-label='Lien']").trigger("click");
    expect(chain.setLink).not.toHaveBeenCalled();

    promptSpy.mockRestore();
  });

  it("normalizes empty URLs", () => {
    const wrapper = mount(RichTextEditor, { props: { modelValue: "<p>hello</p>" } });
    const setupState = (wrapper.vm as unknown as {
      $: { setupState: { normalizeUrl: (value: string) => string } };
    }).$.setupState;
    const { normalizeUrl } = setupState;

    expect(normalizeUrl("")).toBe("");
  });

  it("destroys editor on unmount", () => {
    const wrapper = mount(RichTextEditor, { props: { modelValue: "<p>hello</p>" } });
    wrapper.unmount();
    expect(editorInstance.destroy).toHaveBeenCalled();
  });

  it("inserts a simple line break on ctrl enter", async () => {
    const wrapper = mount(RichTextEditor, { props: { modelValue: "<p>hello</p>" } });

    await wrapper.get("[data-testid='editor-content']").trigger("keydown", { key: "Enter", ctrlKey: true });

    expect(chain.setHardBreak).toHaveBeenCalled();
  });

  it("does not replace normal enter behavior", async () => {
    const wrapper = mount(RichTextEditor, { props: { modelValue: "<p>hello</p>" } });

    await wrapper.get("[data-testid='editor-content']").trigger("keydown", { key: "Enter" });

    expect(chain.setHardBreak).not.toHaveBeenCalled();
  });
});
