<template>
  <Teleport to="body">
    <div v-if="file" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div class="w-full max-w-2xl rounded-[1.75rem] bg-white p-6 shadow-2xl">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700/70">{{ t("editor.cropEyebrow") }}</p>
        <h3 class="mt-2 text-lg font-semibold text-slate-950">{{ t("editor.cropTitle") }}</h3>
        <p class="mt-2 text-sm text-slate-500">{{ t("editor.cropLead") }}</p>

        <div class="crop-stage mt-4 h-[60vh] overflow-hidden rounded-2xl bg-slate-100">
          <img ref="imageRef" :src="imageUrl" :alt="t('editor.cropTitle')" class="block max-w-full" />
        </div>

        <div class="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            :aria-label="t('editor.cropZoomOut')"
            @click="handleZoomOut"
          >
            −
          </button>
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            :aria-label="t('editor.cropZoomIn')"
            @click="handleZoomIn"
          >
            +
          </button>
        </div>

        <div class="mt-5 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            class="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            @click="handleCancel"
          >
            {{ t("common.cancel") }}
          </button>
          <button
            type="button"
            class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            @click="handleConfirm"
          >
            {{ t("editor.cropConfirm") }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Cropper from "cropperjs";

const TARGET_WIDTH = 466;
const TARGET_HEIGHT = 291;
const TARGET_RATIO = TARGET_WIDTH / TARGET_HEIGHT;

const CROPPER_TEMPLATE = `<cropper-canvas class="h-full w-full">
  <cropper-image rotatable scalable skewable translatable></cropper-image>
  <cropper-shade hidden></cropper-shade>
  <cropper-handle action="select" plain></cropper-handle>
  <cropper-selection aspect-ratio="${TARGET_RATIO}" initial-coverage="1" movable resizable>
    <cropper-grid role="grid" bordered covered></cropper-grid>
    <cropper-crosshair centered></cropper-crosshair>
    <cropper-handle action="move" theme-color="rgba(255, 255, 255, 0.35)"></cropper-handle>
    <cropper-handle action="n-resize"></cropper-handle>
    <cropper-handle action="e-resize"></cropper-handle>
    <cropper-handle action="s-resize"></cropper-handle>
    <cropper-handle action="w-resize"></cropper-handle>
    <cropper-handle action="ne-resize"></cropper-handle>
    <cropper-handle action="nw-resize"></cropper-handle>
    <cropper-handle action="se-resize"></cropper-handle>
    <cropper-handle action="sw-resize"></cropper-handle>
  </cropper-selection>
</cropper-canvas>`;

const props = defineProps<{ file: File | null }>();
const emit = defineEmits<{
  (event: "confirm", file: File): void;
  (event: "cancel"): void;
}>();

const { t } = useI18n();

const imageRef = ref<HTMLImageElement | null>(null);
const imageUrl = ref("");
let cropper: Cropper | null = null;

const destroyCropper = () => {
  cropper?.destroy();
  cropper = null;
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value);
    imageUrl.value = "";
  }
};

watch(
  () => props.file,
  async (file) => {
    destroyCropper();
    if (!file) {
      return;
    }
    imageUrl.value = URL.createObjectURL(file);
    await nextTick();
    if (imageRef.value) {
      cropper = new Cropper(imageRef.value, { template: CROPPER_TEMPLATE });
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  destroyCropper();
});

const handleCancel = () => {
  emit("cancel");
};

const handleZoomIn = () => {
  cropper?.getCropperImage()?.$zoom(0.1);
};

const handleZoomOut = () => {
  cropper?.getCropperImage()?.$zoom(-0.1);
};

const handleConfirm = async () => {
  const selection = cropper?.getCropperSelection();
  if (!selection || !props.file) {
    return;
  }

  const canvas = await selection.$toCanvas({ width: TARGET_WIDTH, height: TARGET_HEIGHT });
  const sourceType = props.file.type || "image/jpeg";
  canvas.toBlob(
    (blob) => {
      if (!blob) {
        return;
      }
      emit("confirm", new File([blob], props.file!.name, { type: sourceType }));
    },
    sourceType,
    0.92
  );
};
</script>
