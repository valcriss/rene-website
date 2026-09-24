import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { createHead } from "@unhead/vue/server";
import { transformHtmlTemplate } from "unhead/server";
import { createMemoryHistory, createRouter } from "vue-router";
import { usePageSeo, type PageSeoOptions } from "../src/composables/usePageSeo";
import { SITE_URL_KEY } from "../src/composables/useSiteUrl";

const BASE_TEMPLATE = "<!doctype html><html><head><title>R3ne</title></head><body></body></html>";

const renderWithSeo = async (options: PageSeoOptions, path = "/") => {
  const TestComponent = defineComponent({
    setup() {
      usePageSeo(options);
      return () => h("div", "content");
    }
  });

  const app = createSSRApp(TestComponent);
  const head = createHead();
  app.use(head);
  app.provide(SITE_URL_KEY, "https://rene.example.org");

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:pathMatch(.*)*", component: TestComponent }]
  });
  app.use(router);
  await router.push(path);
  await router.isReady();

  await renderToString(app);
  return transformHtmlTemplate(head, BASE_TEMPLATE);
};

describe("usePageSeo", () => {
  it("renders a unique title, description, canonical and Open Graph/Twitter tags", async () => {
    const html = await renderWithSeo(
      {
        title: "Concert au parc — R3ne",
        description: "Un concert exceptionnel au kiosque du parc.",
        image: "/uploads/concert.jpg",
        type: "article"
      },
      "/event/1"
    );

    expect(html).toContain("<title>Concert au parc — R3ne</title>");
    expect(html).toContain('<meta name="description" content="Un concert exceptionnel au kiosque du parc.">');
    expect(html).toContain('<link rel="canonical" href="https://rene.example.org/event/1">');
    expect(html).toContain('<meta property="og:title" content="Concert au parc — R3ne">');
    expect(html).toContain('<meta property="og:description" content="Un concert exceptionnel au kiosque du parc.">');
    expect(html).toContain('<meta property="og:url" content="https://rene.example.org/event/1">');
    expect(html).toContain('<meta property="og:image" content="https://rene.example.org/uploads/concert.jpg">');
    expect(html).toContain('<meta property="og:type" content="article">');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
  });

  it("defaults og:type to website when not specified", async () => {
    const html = await renderWithSeo({ title: "Accueil", description: "Bienvenue" }, "/");

    expect(html).toContain('<meta property="og:type" content="website">');
  });

  it("falls back to the default brand image, resolved to an absolute URL, when a page has none", async () => {
    const html = await renderWithSeo({ title: "Contact", description: "Nous contacter" }, "/contact");

    expect(html).toContain('<meta property="og:image" content="https://rene.example.org/logo.svg">');
  });

  it("keeps an already-absolute image URL unchanged", async () => {
    const html = await renderWithSeo(
      { title: "Concert", description: "Description", image: "https://cdn.example.com/photo.jpg" },
      "/event/2"
    );

    expect(html).toContain('<meta property="og:image" content="https://cdn.example.com/photo.jpg">');
  });

  it("uses the title as the image alt text when no explicit alt is given", async () => {
    const html = await renderWithSeo({ title: "Concert au parc", description: "Description" }, "/event/3");

    expect(html).toContain('<meta property="og:image:alt" content="Concert au parc">');
  });

  it("uses an explicit image alt text when provided", async () => {
    const html = await renderWithSeo(
      { title: "Concert", description: "Description", imageAlt: "Affiche du concert" },
      "/event/4"
    );

    expect(html).toContain('<meta property="og:image:alt" content="Affiche du concert">');
  });

  it("escapes special characters so the output HTML stays well-formed", async () => {
    const html = await renderWithSeo(
      { title: 'Théâtre & "Cirque" <du soir>', description: "Textes avec des caractères spéciaux : é, à, ç, & <tags>" },
      "/event/5"
    );

    // <title> is element text content: an unescaped "<" or "&" there could break out of the
    // tag or start a bogus entity, so it must be fully escaped.
    expect(html).toContain("<title>Théâtre &amp; &quot;Cirque&quot; &lt;du soir&gt;</title>");
    // Inside a double-quoted attribute, only '"' is actually dangerous (it would close the
    // attribute early); unhead correctly escapes that everywhere content is quoted.
    expect(html).not.toMatch(/content="[^"]*"[^ >]/);
    expect(html).toContain('og:title" content="Théâtre & &quot;Cirque&quot; <du soir>"');
  });

  it("honors an explicit path override instead of the current route", async () => {
    const html = await renderWithSeo(
      { title: "Aperçu", description: "Description", path: "/event/6" },
      "/backoffice/events/preview"
    );

    expect(html).toContain('<meta property="og:url" content="https://rene.example.org/event/6">');
    expect(html).toContain('<link rel="canonical" href="https://rene.example.org/event/6">');
  });
});
