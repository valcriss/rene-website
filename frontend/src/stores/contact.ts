import { ref } from "vue";
import { defineStore } from "pinia";
import { sendContactMessage } from "../api/contact";

export const useContactStore = defineStore("contact", () => {
  const contactName = ref("");
  const contactEmail = ref("");
  const contactMessage = ref("");
  const contactHoneypot = ref("");
  const contactError = ref<string | null>(null);
  const contactSent = ref(false);

  const submitContactMessage = async () => {
    contactError.value = null;
    contactSent.value = false;
    await sendContactMessage({
      name: contactName.value,
      email: contactEmail.value,
      message: contactMessage.value,
      website: contactHoneypot.value
    });
    contactSent.value = true;
    contactName.value = "";
    contactEmail.value = "";
    contactMessage.value = "";
    contactHoneypot.value = "";
  };

  return {
    contactName,
    contactEmail,
    contactMessage,
    contactHoneypot,
    contactError,
    contactSent,
    submitContactMessage
  };
});
