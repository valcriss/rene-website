<template>
  <div
    class="mt-8 rounded-[1.5rem] border border-emerald-200 bg-emerald-50/60 p-5"
    data-testid="detail-share-event"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700/80">
          {{ t("detail.shareTitle") }}
        </p>
        <p class="mt-2 text-sm text-slate-500">{{ t("detail.shareLead") }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <button
          v-if="canNativeShare"
          type="button"
          class="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          data-testid="share-native-button"
          @click="shareNatively"
        >
          <font-awesome-icon class="h-4 w-4" :icon="faShareNodes" />
          {{ t("detail.shareNative") }}
        </button>
        <button
          type="button"
          class="inline-flex h-11 w-11 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
          :aria-label="t('detail.copyLink')"
          :title="t('detail.copyLink')"
          data-testid="share-copy-button"
          @click="copyLink"
        >
          <font-awesome-icon class="h-4 w-4" :icon="faLink" />
        </button>
        <a
          v-for="link in shareLinks"
          :key="link.type"
          class="inline-flex h-11 w-11 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
          :href="link.href"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="link.label"
          :title="link.label"
        >
          <font-awesome-icon class="h-4 w-4" :icon="link.icon" />
        </a>
      </div>
    </div>
    <p
      v-if="copyState !== 'idle'"
      class="mt-3 text-sm font-medium"
      :class="copyState === 'copied' ? 'text-emerald-700' : 'text-red-600'"
      role="status"
      aria-live="polite"
      data-testid="share-copy-status"
    >
      {{ copyState === "copied" ? t("detail.copyLinkSuccess") : t("detail.copyLinkError") }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faFacebook, faLinkedin, faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { faLink, faShareNodes } from "@fortawesome/free-solid-svg-icons";
import { buildFacebookShareUrl, buildLinkedInShareUrl, buildXShareUrl } from "../../utils/shareLinks"; // gitleaks:allow

const props = defineProps<{ url: string; title: string }>();

const { t } = useI18n();

type ShareLinkViewModel = {
  type: "FACEBOOK" | "LINKEDIN" | "X";
  href: string;
  label: string;
  icon: IconDefinition;
};

const shareLinks = computed<ShareLinkViewModel[]>(() => [
  {
    type: "FACEBOOK",
    href: buildFacebookShareUrl(props.url),
    label: t("detail.shareOnFacebook"),
    icon: faFacebook
  },
  {
    type: "LINKEDIN",
    href: buildLinkedInShareUrl(props.url),
    label: t("detail.shareOnLinkedIn"),
    icon: faLinkedin
  },
  {
    type: "X",
    href: buildXShareUrl(props.url, props.title),
    label: t("detail.shareOnX"),
    icon: faXTwitter
  }
]);

// Web Share API availability can only be checked client-side; evaluating it during setup would
// render differently on the server (no navigator) vs. the client's first hydration pass and
// trigger a hydration mismatch. onMounted never runs during SSR, so both renders start aligned.
const canNativeShare = ref(false);
onMounted(() => {
  canNativeShare.value = typeof navigator !== "undefined" && typeof navigator.share === "function";
});

const shareNatively = async () => {
  try {
    await navigator.share({ title: props.title, url: props.url });
  } catch {
    // The visitor cancelled the native share sheet, or the browser rejected the request —
    // there is nothing to recover from or report here.
  }
};

type CopyState = "idle" | "copied" | "error";
const copyState = ref<CopyState>("idle");
let copyResetTimer: ReturnType<typeof setTimeout> | undefined;

const scheduleCopyStateReset = () => {
  if (copyResetTimer) {
    clearTimeout(copyResetTimer);
  }
  copyResetTimer = setTimeout(() => {
    copyState.value = "idle";
  }, 2500);
};

// Legacy fallback for browsers without the async Clipboard API (or when it's blocked, e.g. an
// insecure context): a temporary off-screen textarea plus the deprecated but still broadly
// supported execCommand("copy").
const copyLinkViaFallback = (url: string): boolean => {
  if (typeof document === "undefined") {
    return false;
  }
  const textarea = document.createElement("textarea");
  textarea.value = url;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let succeeded: boolean;
  try {
    succeeded = document.execCommand("copy");
  } catch {
    succeeded = false;
  }
  document.body.removeChild(textarea);
  return succeeded;
};

const copyLink = async () => {
  const url = props.url;
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      copyState.value = "copied";
    } else {
      copyState.value = copyLinkViaFallback(url) ? "copied" : "error";
    }
  } catch {
    copyState.value = copyLinkViaFallback(url) ? "copied" : "error";
  }
  scheduleCopyStateReset();
};

onBeforeUnmount(() => {
  if (copyResetTimer) {
    clearTimeout(copyResetTimer);
  }
});
</script>
