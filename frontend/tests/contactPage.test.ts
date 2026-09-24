import "@testing-library/jest-dom";
import { render, fireEvent, screen } from "@testing-library/vue";
import { createPinia } from "pinia";
import { vi } from "vitest";
import ContactPage from "../src/pages/ContactPage.vue";
import { createTestRouter } from "./testRouter";
import { useContactStore } from "../src/stores/contact";

describe("ContactPage", () => {
  const setup = async () => {
    const router = createTestRouter("/contact");
    await router.isReady();
    const pinia = createPinia();
    render(ContactPage, { global: { plugins: [pinia, router] } });
    return { router, pinia };
  };

  it("shows error on submission failure", async () => {
    const { pinia } = await setup();
    const contactStore = useContactStore(pinia);
    vi.spyOn(contactStore, "submitContactMessage").mockRejectedValue(new Error("Bad"));

    await fireEvent.update(screen.getByLabelText("Nom"), "Marie");
    await fireEvent.update(screen.getByLabelText("Email"), "marie@test.fr");
    await fireEvent.update(screen.getByLabelText("Message"), "Bonjour");
    await fireEvent.click(screen.getByRole("button", { name: "Envoyer le message" }));

    expect(await screen.findByText("Bad")).toBeInTheDocument();
  });

  it("shows the fallback error when submission rejects without an Error", async () => {
    const { pinia } = await setup();
    const contactStore = useContactStore(pinia);
    vi.spyOn(contactStore, "submitContactMessage").mockRejectedValue("boom");

    await fireEvent.click(screen.getByRole("button", { name: "Envoyer le message" }));

    expect(await screen.findByText("Envoi du message impossible")).toBeInTheDocument();
  });

  it("shows success after submission", async () => {
    const { pinia } = await setup();
    const contactStore = useContactStore(pinia);
    vi.spyOn(contactStore, "submitContactMessage").mockImplementation(async () => {
      contactStore.contactSent = true;
    });

    await fireEvent.click(screen.getByRole("button", { name: "Envoyer le message" }));

    expect(await screen.findByText("Votre message a bien été envoyé.")).toBeInTheDocument();
  });

  it("navigates to home", async () => {
    const { router } = await setup();
    const pushSpy = vi.spyOn(router, "push");

    await fireEvent.click(screen.getByRole("button", { name: "Retour à l'accueil" }));

    expect(pushSpy).toHaveBeenCalledWith("/");
  });
});
