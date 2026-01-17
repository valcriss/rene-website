<template>
  <div class="grid gap-2">
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-lg border border-slate-200 p-2 text-slate-600"
        :class="{ 'bg-slate-900 text-white': isBoldActive }"
        aria-label="Gras"
        title="Gras"
        @click="toggleBold"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
          <path d="M7 4h7a4 4 0 0 1 0 8H7V4zm0 10h8a4 4 0 1 1 0 8H7v-8z" />
        </svg>
      </button>
      <button
        type="button"
        class="rounded-lg border border-slate-200 p-2 text-slate-600"
        :class="{ 'bg-slate-900 text-white': isItalicActive }"
        aria-label="Italique"
        title="Italique"
        @click="toggleItalic"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
          <path d="M10 4h10v2h-4.2l-4.4 12H16v2H6v-2h4.2l4.4-12H10V4z" />
        </svg>
      </button>
      <button
        type="button"
        class="rounded-lg border border-slate-200 p-2 text-slate-600"
        :class="{ 'bg-slate-900 text-white': isUnderlineActive }"
        aria-label="Souligné"
        title="Souligné"
        @click="toggleUnderline"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
          <path d="M6 3h2v7a4 4 0 0 0 8 0V3h2v7a6 6 0 0 1-12 0V3zM5 20h14v2H5v-2z" />
        </svg>
      </button>
      <button
        type="button"
        class="rounded-lg border border-slate-200 p-2 text-slate-600"
        aria-label="Lien"
        title="Lien"
        @click="setLink"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
          <path d="M10.6 13.4a1 1 0 0 1 0-1.4l3.4-3.4a3 3 0 1 1 4.2 4.2l-2.1 2.1a3 3 0 0 1-4.2 0 1 1 0 1 1 1.4-1.4 1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 1 0-1.4-1.4l-3.4 3.4a1 1 0 0 1-1.4 0z" />
          <path d="M13.4 10.6a1 1 0 0 1 0 1.4l-3.4 3.4a3 3 0 1 1-4.2-4.2l2.1-2.1a3 3 0 0 1 4.2 0 1 1 0 1 1-1.4 1.4 1 1 0 0 0-1.4 0L7.2 11.6a1 1 0 1 0 1.4 1.4l3.4-3.4a1 1 0 0 1 1.4 0z" />
        </svg>
      </button>
      <button
        type="button"
        class="rounded-lg border border-slate-200 p-2 text-slate-600"
        aria-label="Retirer le lien"
        title="Retirer le lien"
        @click="unsetLink"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
          <path d="M3 4.3 4.3 3 21 19.7 19.7 21l-3.4-3.4-1.1 1.1a4.5 4.5 0 0 1-6.4 0 4.5 4.5 0 0 1 0-6.4l1.6-1.6-3.1-3.1-1.9 1.9a4.5 4.5 0 0 0 0 6.4 1 1 0 1 1-1.4 1.4 6.5 6.5 0 0 1 0-9.2l2.6-2.6L3 4.3zm11.9 11.9 1.6-1.6-3.1-3.1-1.6 1.6a2.5 2.5 0 1 0 3.5 3.5z" />
        </svg>
      </button>
    </div>

    <EditorContent
      class="min-h-[120px] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
      :editor="editor"
      aria-label="Description"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from "vue";
import { type Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ (event: "update:modelValue", value: string): void }>();

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    Document,
    Paragraph,
    Text,
    Bold,
    Italic,
    Underline,
    Link.configure({
      openOnClick: false,
      autolink: false,
      linkOnPaste: false
    })
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
const isItalicActive = computed(() => Boolean(editor.value?.isActive("italic")));
const isUnderlineActive = computed(() => Boolean(editor.value?.isActive("underline")));

const toggleBold = () => editor.value?.chain().focus().toggleBold().run();
const toggleItalic = () => editor.value?.chain().focus().toggleItalic().run();
const toggleUnderline = () => editor.value?.chain().focus().toggleUnderline().run();

const normalizeUrl = (value: string) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("mailto:") || value.startsWith("tel:")) return value;
  return `https://${value}`;
};

const setLink = () => {
  const url = window.prompt("URL du lien", "https://") ?? "";
  if (!url) {
    return;
  }
  editor.value?.chain().focus().extendMarkRange("link").setLink({ href: normalizeUrl(url) }).run();
};

const unsetLink = () => {
  editor.value?.chain().focus().unsetLink().run();
};

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<style scoped>
:deep(.ProseMirror) {
  outline: none;
}

:deep(.ProseMirror-focused) {
  outline: none;
  box-shadow: none;
}
</style>
