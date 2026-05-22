<template>
  <div class="grid gap-3">
    <div class="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-3">
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-sky-200 hover:text-slate-900"
          :class="{ 'bg-slate-900 text-white': isParagraphActive }"
          :aria-label="t('richText.paragraph')"
          :title="t('richText.paragraph')"
          @click="setParagraph"
        >
          P
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-sky-200 hover:text-slate-900"
          :class="{ 'bg-slate-900 text-white': isHeadingLevelTwoActive }"
          :aria-label="t('richText.heading2')"
          :title="t('richText.heading2')"
          @click="toggleHeading(2)"
        >
          H2
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-sky-200 hover:text-slate-900"
          :class="{ 'bg-slate-900 text-white': isHeadingLevelThreeActive }"
          :aria-label="t('richText.heading3')"
          :title="t('richText.heading3')"
          @click="toggleHeading(3)"
        >
          H3
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-sky-200 hover:text-slate-900"
          :class="{ 'bg-slate-900 text-white': isBoldActive }"
          :aria-label="t('richText.bold')"
          :title="t('richText.bold')"
          @click="toggleBold"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
            <path d="M7 4h7a4 4 0 0 1 0 8H7V4zm0 10h8a4 4 0 1 1 0 8H7v-8z" />
          </svg>
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-sky-200 hover:text-slate-900"
          :class="{ 'bg-slate-900 text-white': isItalicActive }"
          :aria-label="t('richText.italic')"
          :title="t('richText.italic')"
          @click="toggleItalic"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
            <path d="M10 4h10v2h-4.2l-4.4 12H16v2H6v-2h4.2l4.4-12H10V4z" />
          </svg>
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-sky-200 hover:text-slate-900"
          :class="{ 'bg-slate-900 text-white': isUnderlineActive }"
          :aria-label="t('richText.underline')"
          :title="t('richText.underline')"
          @click="toggleUnderline"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
            <path d="M6 3h2v7a4 4 0 0 0 8 0V3h2v7a6 6 0 0 1-12 0V3zM5 20h14v2H5v-2z" />
          </svg>
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-sky-200 hover:text-slate-900"
          :class="{ 'bg-slate-900 text-white': isBulletListActive }"
          :aria-label="t('richText.bulletList')"
          :title="t('richText.bulletList')"
          @click="toggleBulletList"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
            <path d="M4 6.5A1.5 1.5 0 1 1 4 9.5 1.5 1.5 0 0 1 4 6.5zm4 0h12v2H8v-2zm-4 7A1.5 1.5 0 1 1 4 16.5 1.5 1.5 0 0 1 4 13.5zm4 0h12v2H8v-2z" />
          </svg>
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-sky-200 hover:text-slate-900"
          :class="{ 'bg-slate-900 text-white': isOrderedListActive }"
          :aria-label="t('richText.orderedList')"
          :title="t('richText.orderedList')"
          @click="toggleOrderedList"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
            <path d="M4 7h1v3h1v1H3V10h1V8H3V7h1zm4-.5h12v2H8v-2zm-4 7h2.2A1.8 1.8 0 0 1 8 15.3c0 .6-.3 1.1-.8 1.5L6 17.7V18h2v1H4v-1.2l2.4-1.9c.3-.2.6-.5.6-.9 0-.4-.3-.7-.8-.7H4v-1zM8 13.5h12v2H8v-2z" />
          </svg>
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-sky-200 hover:text-slate-900"
          :aria-label="t('richText.link')"
          :title="t('richText.link')"
          @click="setLink"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
            <path d="M10.6 13.4a1 1 0 0 1 0-1.4l3.4-3.4a3 3 0 1 1 4.2 4.2l-2.1 2.1a3 3 0 0 1-4.2 0 1 1 0 1 1 1.4-1.4 1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 1 0-1.4-1.4l-3.4 3.4a1 1 0 0 1-1.4 0z" />
            <path d="M13.4 10.6a1 1 0 0 1 0 1.4l-3.4 3.4a3 3 0 1 1-4.2-4.2l2.1-2.1a3 3 0 0 1 4.2 0 1 1 0 1 1-1.4 1.4 1 1 0 0 0-1.4 0L7.2 11.6a1 1 0 1 0 1.4 1.4l3.4-3.4a1 1 0 0 1 1.4 0z" />
          </svg>
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-sky-200 hover:text-slate-900"
          :aria-label="t('richText.removeLink')"
          :title="t('richText.removeLink')"
          @click="unsetLink"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
            <path d="M3 4.3 4.3 3 21 19.7 19.7 21l-3.4-3.4-1.1 1.1a4.5 4.5 0 0 1-6.4 0 4.5 4.5 0 0 1 0-6.4l1.6-1.6-3.1-3.1-1.9 1.9a4.5 4.5 0 0 0 0 6.4 1 1 0 1 1-1.4 1.4 6.5 6.5 0 0 1 0-9.2l2.6-2.6L3 4.3zm11.9 11.9 1.6-1.6-3.1-3.1-1.6 1.6a2.5 2.5 0 1 0 3.5 3.5z" />
          </svg>
        </button>
        <button
          v-if="allowImages"
          type="button"
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-sky-200 hover:text-slate-900"
          :aria-label="t('richText.image')"
          :title="t('richText.image')"
          @click="openImagePicker"
        >
          {{ t("richText.image") }}
        </button>
      </div>
      <div class="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <p>{{ t("richText.help") }}</p>
        <p v-if="allowImages">{{ t("richText.imageHelp") }}</p>
      </div>
    </div>

    <input v-if="allowImages" ref="imageInput" type="file" accept="image/*" class="hidden" @change="handleImageUpload" />

    <div v-if="uploadError" class="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {{ uploadError }}
    </div>

    <EditorContent
      class="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 text-base leading-7 text-slate-700 shadow-[0_16px_42px_-34px_rgba(15,23,42,0.35)]"
      :class="compact ? 'min-h-[180px] text-sm leading-6' : 'min-h-[360px]'"
      :editor="editor"
      :aria-label="ariaLabel || t('common.description')"
      @keydown="handleEditorKeydown"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { type Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { useI18n } from "vue-i18n";
import BulletList from "@tiptap/extension-bullet-list";
import Bold from "@tiptap/extension-bold";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import Heading from "@tiptap/extension-heading";
import Image from "@tiptap/extension-image";
import Italic from "@tiptap/extension-italic";
import Link from "@tiptap/extension-link";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Underline from "@tiptap/extension-underline";
import { uploadImage } from "../../api/uploads";

const props = withDefaults(defineProps<{
  modelValue: string;
  allowImages?: boolean;
  compact?: boolean;
  ariaLabel?: string;
}>(), {
  allowImages: true,
  compact: false,
  ariaLabel: ""
});
const emit = defineEmits<{ (event: "update:modelValue", value: string): void }>();
const { t } = useI18n();
const imageInput = ref<HTMLInputElement | null>(null);
const uploadError = ref("");
const allowImages = computed(() => props.allowImages);
const compact = computed(() => props.compact);

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    BulletList,
    Bold,
    Document,
    HardBreak,
    Heading.configure({ levels: [2, 3] }),
    Image,
    Italic,
    Link.configure({
      openOnClick: false,
      autolink: false,
      linkOnPaste: false
    }),
    ListItem,
    OrderedList,
    Paragraph,
    Text,
    Underline
  ],
  onUpdate: ({ editor: editorInstance }: { editor: Editor }) => {
    emit("update:modelValue", editorInstance.getHTML());
  }
});

watch(
  () => props.modelValue,
  (value) => {
    if (!editor.value) return;
    if (editor.value.getHTML() === value) return;
    editor.value.commands.setContent(value || "", false);
  }
);

const isBoldActive = computed(() => Boolean(editor.value?.isActive("bold")));
const isBulletListActive = computed(() => Boolean(editor.value?.isActive("bulletList")));
const isHeadingLevelTwoActive = computed(() => Boolean(editor.value?.isActive("heading", { level: 2 })));
const isHeadingLevelThreeActive = computed(() => Boolean(editor.value?.isActive("heading", { level: 3 })));
const isItalicActive = computed(() => Boolean(editor.value?.isActive("italic")));
const isOrderedListActive = computed(() => Boolean(editor.value?.isActive("orderedList")));
const isParagraphActive = computed(() => Boolean(editor.value?.isActive("paragraph")));
const isUnderlineActive = computed(() => Boolean(editor.value?.isActive("underline")));

const toggleBold = () => editor.value?.chain().focus().toggleBold().run();
const toggleBulletList = () => editor.value?.chain().focus().toggleBulletList().run();
const toggleHeading = (level: 2 | 3) => editor.value?.chain().focus().toggleHeading({ level }).run();
const toggleItalic = () => editor.value?.chain().focus().toggleItalic().run();
const toggleOrderedList = () => editor.value?.chain().focus().toggleOrderedList().run();
const toggleUnderline = () => editor.value?.chain().focus().toggleUnderline().run();
const setParagraph = () => editor.value?.chain().focus().setParagraph().run();

const handleEditorKeydown = (event: KeyboardEvent) => {
  if (event.key !== "Enter" || !event.ctrlKey) {
    return;
  }

  event.preventDefault();
  editor.value?.chain().focus().setHardBreak().run();
};

const normalizeUrl = (value: string) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("mailto:") || value.startsWith("tel:")) return value;
  return `https://${value}`;
};

const setLink = () => {
  const url = window.prompt(t("richText.linkPrompt"), "https://") ?? "";
  if (!url) {
    return;
  }
  editor.value?.chain().focus().extendMarkRange("link").setLink({ href: normalizeUrl(url) }).run();
};

const unsetLink = () => {
  editor.value?.chain().focus().unsetLink().run();
};

const openImagePicker = () => {
  if (!allowImages.value) {
    return;
  }
  imageInput.value?.click();
};

const handleImageUpload = async (event: Event) => {
  if (!allowImages.value) {
    return;
  }
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0] ?? null;
  if (!file) {
    return;
  }

  uploadError.value = "";

  try {
    const imageUrl = await uploadImage(file);
    editor.value?.chain().focus().setImage({ src: imageUrl, alt: file.name }).run();
  } catch (error) {
    uploadError.value = error instanceof Error ? error.message : t("richText.imageUploadError");
  } finally {
    if (target) {
      target.value = "";
    }
  }
};

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<style scoped>
:deep(.ProseMirror) {
  min-height: 320px;
  outline: none;
}

:deep(.ProseMirror-focused) {
  outline: none;
  box-shadow: none;
}

:deep(.ProseMirror h2) {
  margin: 1rem 0 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.3;
  color: rgb(15 23 42);
}

:deep(.ProseMirror h3) {
  margin: 0.875rem 0 0.5rem;
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.35;
  color: rgb(30 41 59);
}

:deep(.ProseMirror p) {
  margin: 0.75rem 0;
}

:deep(.ProseMirror ul),
:deep(.ProseMirror ol) {
  margin: 0.75rem 0 0.75rem 1.5rem;
}

:deep(.ProseMirror img) {
  margin: 1rem 0;
  max-width: 100%;
  border-radius: 1rem;
}
</style>
