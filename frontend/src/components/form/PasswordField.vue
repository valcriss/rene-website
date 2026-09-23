<template>
  <label class="text-sm text-slate-600">
    {{ label }}
    <div class="relative mt-2">
      <input
        :value="modelValue"
        :type="visible ? 'text' : 'password'"
        :placeholder="placeholder"
        class="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 text-sm"
        @input="emitUpdate"
      />
      <button
        type="button"
        class="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-slate-600"
        :aria-label="visible ? t('common.hidePassword') : t('common.showPassword')"
        :title="visible ? t('common.hidePassword') : t('common.showPassword')"
        @click="visible = !visible"
      >
        <font-awesome-icon class="h-4 w-4" :icon="visible ? faEyeSlash : faEye" />
      </button>
    </div>
  </label>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

defineOptions({
  name: "PasswordField"
});

withDefaults(
  defineProps<{
    modelValue: string;
    label: string;
    placeholder?: string;
  }>(),
  {
    placeholder: "********"
  }
);

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void;
}>();

const { t } = useI18n();
const visible = ref(false);

const emitUpdate = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  emit("update:modelValue", target?.value ?? "");
};
</script>
