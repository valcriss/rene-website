import { mount } from "@vue/test-utils";
import SeoPreviewCard from "../src/components/form/SeoPreviewCard.vue";

const baseProps = {
  title: "Concert de jazz au kiosque",
  content: "<p>Une soirée jazz exceptionnelle au cœur du parc municipal.</p>",
  image: "https://example.com/image.jpg",
  imageAlt: "Musiciens sur scène",
  seoTitleOverride: null,
  seoDescriptionOverride: null,
  occurrences: [
    { city: "Descartes", eventStartAt: "2026-01-15T20:00:00.000Z", eventEndAt: "2026-01-15T22:00:00.000Z" }
  ],
  siteName: "R3ne"
};

describe("SeoPreviewCard", () => {
  it("renders the computed title, description and image by default", () => {
    const wrapper = mount(SeoPreviewCard, { props: baseProps });

    expect(wrapper.find("[data-testid='seo-preview-title']").text()).toBe("Concert de jazz au kiosque");
    expect(wrapper.find("[data-testid='seo-preview-description']").text()).toBe(
      "Une soirée jazz exceptionnelle au cœur du parc municipal."
    );
    expect(wrapper.find("[data-testid='seo-preview-image']").attributes("src")).toBe(
      "https://example.com/image.jpg"
    );
    expect(wrapper.find("[data-testid='seo-preview-image']").attributes("alt")).toBe("Musiciens sur scène");
  });

  // Regression test: the breadcrumb-style domain used to be guessed from the site name plus a
  // hardcoded ".fr" TLD ("r3ne.fr"), which was simply wrong for this site (r3ne.art) and would
  // be wrong again for any future site name/domain mismatch. It must reflect the real origin.
  it("shows the real site origin in the search/social preview domain, not a guessed TLD", () => {
    const wrapper = mount(SeoPreviewCard, { props: baseProps });

    const domain = wrapper.find("[data-testid='seo-preview-domain']").text();
    expect(domain).toBe(`${window.location.origin.replace(/^https?:\/\//, "")} › evenements › ...`);
    expect(domain).not.toContain(".fr");
  });

  it("prefers the overrides when set", () => {
    const wrapper = mount(SeoPreviewCard, {
      props: { ...baseProps, seoTitleOverride: "Titre perso", seoDescriptionOverride: "Description perso" }
    });

    expect(wrapper.find("[data-testid='seo-preview-title']").text()).toBe("Titre perso");
    expect(wrapper.find("[data-testid='seo-preview-description']").text()).toBe("Description perso");
  });

  it("falls back to the default OG image when no image is set", () => {
    const wrapper = mount(SeoPreviewCard, { props: { ...baseProps, image: null } });

    expect(wrapper.find("[data-testid='seo-preview-image']").attributes("src")).toBe("/logo.svg");
  });

  it("renders no alerts for a complete, coherent event", () => {
    const wrapper = mount(SeoPreviewCard, { props: baseProps });

    expect(wrapper.find("[data-testid='seo-alerts']").exists()).toBe(false);
  });

  it("renders an alert chip for each detected issue", () => {
    const wrapper = mount(SeoPreviewCard, {
      props: { ...baseProps, title: "Concert", image: null, occurrences: [] }
    });

    expect(wrapper.find("[data-testid='seo-alert-genericTitle']").exists()).toBe(true);
    expect(wrapper.find("[data-testid='seo-alert-missingImage']").exists()).toBe(true);
    expect(wrapper.find("[data-testid='seo-alert-missingLocation']").exists()).toBe(true);
  });
});
