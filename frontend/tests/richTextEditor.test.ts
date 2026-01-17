import { mount } from "@vue/test-utils";
import { ref } from "vue";
import { vi } from "vitest";
import RichTextEditor from "../src/components/form/RichTextEditor.vue";

const chain = {
  focus: vi.fn().mockReturnThis(),
  toggleBold: vi.fn().mockReturnThis(),
  toggleItalic: vi.fn().mockReturnThis(),
  toggleUnderline: vi.fn().mockReturnThis(),
  extendMarkRange: vi.fn().mockReturnThis(),
  setLink: vi.fn().mockReturnThis(),
  unsetLink: vi.fn().mockReturnThis(),
  run: vi.fn()
};

const editorInstance = {
  isActive: vi.fn(() => false),
  chain: vi.fn(() => chain),
  commands: { setContent: vi.fn() },
  getHTML: vi.fn(() => "<p>initial</p>"),
  destroy: vi.fn()
};

let onUpdateHandler: ((payload: { editor: any }) => void) | null = null;
let editorRef = ref<any>(editorInstance);

vi.mock("@tiptap/vue-3", () => ({
  EditorContent: { template: "<div></div>" },
  useEditor: (options?: { onUpdate?: (payload: { editor: any }) => void }) => {
    onUpdateHandler = options?.onUpdate ?? null;
    return editorRef;
  }
}));

describe("RichTextEditor", () => {
  beforeEach(() => {
    onUpdateHandler = null;
    editorRef = ref<any>(editorInstance);
    vi.clearAllMocks();
  });

  it("toggles formatting and links", async () => {
    const wrapper = mount(RichTextEditor, { props: { modelValue: "<p>hello</p>" } });

    await wrapper.find("button[aria-label='Gras']").trigger("click");
    await wrapper.find("button[aria-label='Italique']").trigger("click");
    await wrapper.find("button[aria-label='Souligné']").trigger("click");

    expect(chain.toggleBold).toHaveBeenCalled();
    expect(chain.toggleItalic).toHaveBeenCalled();
    expect(chain.toggleUnderline).toHaveBeenCalled();

    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("example.com");
    await wrapper.find("button[aria-label='Lien']").trigger("click");
    expect(chain.setLink).toHaveBeenCalledWith({ href: "https://example.com" });
    promptSpy.mockRestore();

    await wrapper.find("button[aria-label='Retirer le lien']").trigger("click");
    expect(chain.unsetLink).toHaveBeenCalled();
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
    const setupState = (wrapper.vm as any).$.setupState as { normalizeUrl: (value: string) => string };
    const { normalizeUrl } = setupState;

    expect(normalizeUrl("")).toBe("");
  });

  it("destroys editor on unmount", () => {
    const wrapper = mount(RichTextEditor, { props: { modelValue: "<p>hello</p>" } });
    wrapper.unmount();
    expect(editorInstance.destroy).toHaveBeenCalled();
  });
});
