import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/vue";
import { createPinia } from "pinia";
import { vi } from "vitest";
import App from "../src/App.vue";
import { useCategoriesStore } from "../src/stores/categories";
import { createTestRouter } from "./testRouter";

vi.mock("../src/components/EventMap.vue", () => ({
  default: {
    name: "EventMap",
    props: ["events"],
    template: "<div data-testid='event-map'></div>"
  }
}));

describe("App", () => {
  const renderWithRouter = async (path = "/") => {
    const router = createTestRouter(path);
    await router.isReady();
    const pinia = createPinia();
    const categoriesStore = useCategoriesStore(pinia);
    categoriesStore.categories = [
      { id: "music", name: "Musique", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
      { id: "art", name: "Art", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
      { id: "cinema", name: "Cinéma", createdAt: "2026-01-01", updatedAt: "2026-01-01" }
    ];
    categoriesStore.hasLoaded = true;
    categoriesStore.loading = false;
    categoriesStore.error = null;
    render(App, { global: { plugins: [pinia, router] } });
    return router;
  };

  const loginAsRole = async (role: "EDITOR" | "MODERATOR" | "ADMIN") => {
    const router = await renderWithRouter("/login");
    await fireEvent.update(screen.getByLabelText("Rôle"), role);
    await fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    await waitFor(() => expect(router.currentRoute.value.path).toBe("/backoffice"));
    return router;
  };
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the headline", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })));
    await renderWithRouter();
    expect(screen.getByRole("heading", { level: 1, name: "Rene Website" })).toBeInTheDocument();
  });

  it("shows empty state when no events", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })));
    await renderWithRouter();

    expect(await screen.findByText("Aucun événement n'est encore publié.")).toBeInTheDocument();
  });

  it("logs out and hides editor access", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })));
    const router = await loginAsRole("MODERATOR");

    expect(await screen.findByText("Tableau de bord")).toBeInTheDocument();
    await fireEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));

    await waitFor(() => expect(router.currentRoute.value.path).toBe("/login"));
    expect(await screen.findByText("Connexion")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Se déconnecter" })).not.toBeInTheDocument();
  });

  it("returns to home from login page", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })));
    const router = await renderWithRouter("/login");

    await fireEvent.click(screen.getByRole("button", { name: "Retour au site" }));

    await waitFor(() => expect(router.currentRoute.value.path).toBe("/"));
    expect(screen.getByRole("heading", { level: 1, name: "Rene Website" })).toBeInTheDocument();
  });

  it("shows events when available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: "1",
                title: "Concert",
                eventStartAt: "2026-01-15T20:00:00.000Z",
                eventEndAt: "2026-01-15T22:00:00.000Z",
                venueName: "Salle",
                city: "Descartes",
                image: "https://example.com",
                categoryId: "music",
                latitude: 46.97,
                longitude: 0.7,
                status: "PUBLISHED"
              }
            ])
        })
      )
    );
    await renderWithRouter();

    expect((await screen.findAllByText("Concert")).length).toBeGreaterThan(0);
  });

  it("uses placeholder when image is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: "1",
                title: "Concert",
                eventStartAt: "2026-01-15T20:00:00.000Z",
                eventEndAt: "2026-01-15T22:00:00.000Z",
                venueName: "Salle",
                city: "Descartes",
                image: "",
                categoryId: "music",
                latitude: 46.97,
                longitude: 0.7,
                status: "PUBLISHED"
              }
            ])
        })
      )
    );
    await renderWithRouter();

    const image = await screen.findByRole("img", { name: "Concert" });
    expect(image.getAttribute("src")).toContain("event-placeholder");
  });

  it("falls back to placeholder on image error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: "1",
                title: "Concert",
                eventStartAt: "2026-01-15T20:00:00.000Z",
                eventEndAt: "2026-01-15T22:00:00.000Z",
                venueName: "Salle",
                city: "Descartes",
                image: "https://bad-image.test/404.jpg",
                categoryId: "music",
                latitude: 46.97,
                longitude: 0.7,
                status: "PUBLISHED"
              }
            ])
        })
      )
    );
    await renderWithRouter();

    const image = await screen.findByRole("img", { name: "Concert" });
    await fireEvent.error(image);

    expect(image.getAttribute("src")).toContain("event-placeholder");
  });

  it("navigates to detail when clicking a card", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: "1",
                title: "Concert",
                eventStartAt: "2026-01-15T20:00:00.000Z",
                eventEndAt: "2026-01-15T22:00:00.000Z",
                venueName: "Salle",
                city: "Descartes",
                image: "https://example.com",
                categoryId: "music",
                latitude: 46.97,
                longitude: 0.7,
                status: "PUBLISHED"
              }
            ])
        })
      )
    );
    const router = await renderWithRouter();

    const eventCard = await screen.findByTestId("event-card-1");
    await fireEvent.click(eventCard);

    await waitFor(() => expect(router.currentRoute.value.path).toBe("/event/1"));
  });

  it("shows event detail with action links", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: "1",
                title: "Concert",
                content: "Une soirée dédiée au jazz.",
                eventStartAt: "2026-01-15T20:00:00.000Z",
                eventEndAt: "2026-01-15T22:00:00.000Z",
                venueName: "Salle",
                address: "12 rue de la musique",
                postalCode: "37100",
                city: "Descartes",
                image: "https://example.com",
                categoryId: "music",
                latitude: 46.97,
                longitude: 0.7,
                organizerName: "Association Musique",
                organizerUrl: "https://organisateur.test",
                contactEmail: "contact@test.fr",
                contactPhone: "01 02 03 04 05",
                ticketUrl: "https://billetterie.test",
                websiteUrl: "https://evenement.test",
                status: "PUBLISHED"
              }
            ])
        })
      )
    );
    const router = await renderWithRouter();

    await fireEvent.click(await screen.findByTestId("event-card-1"));
    await waitFor(() => expect(router.currentRoute.value.path).toBe("/event/1"));

    expect(await screen.findByTestId("event-detail")).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "Concert" })).toBeInTheDocument();
    expect((await screen.findAllByText("Concert")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Salle/)).length).toBeGreaterThan(0);
    expect(await screen.findByText("Une soirée dédiée au jazz.")).toBeInTheDocument();
    expect(await screen.findByText("Association Musique")).toBeInTheDocument();
    expect(await screen.findByText("12 rue de la musique")).toBeInTheDocument();
    expect(await screen.findByText("37100")).toBeInTheDocument();
    expect(await screen.findByText("contact@test.fr")).toBeInTheDocument();
    expect(await screen.findByText("01 02 03 04 05")).toBeInTheDocument();
    expect(await screen.findByText("https://organisateur.test")).toBeInTheDocument();
    expect(await screen.findByText("https://billetterie.test")).toBeInTheDocument();
    expect(await screen.findByText("https://evenement.test")).toBeInTheDocument();

    const directionsLink = await screen.findByRole("link", { name: "Itinéraire" });
    const calendarLink = await screen.findByRole("link", { name: "Ajouter au calendrier" });

    expect(directionsLink).toHaveAttribute("href", expect.stringContaining("google.com/maps/dir"));
    expect(calendarLink).toHaveAttribute("href", expect.stringContaining("data:text/calendar"));
  });

  it("shows placeholders when optional details are missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: "1",
                title: "Concert",
                eventStartAt: "2026-01-15T20:00:00.000Z",
                eventEndAt: "2026-01-15T22:00:00.000Z",
                venueName: "Salle",
                city: "Descartes",
                image: "https://example.com",
                categoryId: "music",
                latitude: 46.97,
                longitude: 0.7,
                status: "PUBLISHED"
              }
            ])
        })
      )
    );
    const router = await renderWithRouter();

    await fireEvent.click(await screen.findByTestId("event-card-1"));
    await waitFor(() => expect(router.currentRoute.value.path).toBe("/event/1"));

    expect(await screen.findByTestId("event-detail")).toBeInTheDocument();
    expect((await screen.findAllByText("Non renseigné")).length).toBeGreaterThan(0);
  });

  it("shows loading state on detail route", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    await renderWithRouter("/event/1");

    expect(await screen.findByText("Chargement de l'événement…")).toBeInTheDocument();
  });

  it("shows not found when event does not exist", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })));
    await renderWithRouter("/event/404");

    expect(await screen.findByText("Événement introuvable.")).toBeInTheDocument();
  });

  it("clears preset when date range changes", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })));
    await renderWithRouter();

    await fireEvent.update(screen.getByLabelText("Préselection"), "weekend");
    await fireEvent.update(screen.getByLabelText("Du"), "2026-01-10");

    const presetSelect = screen.getByLabelText("Préselection") as HTMLSelectElement;
    expect(presetSelect.value).toBe("");
  });

  it("applies week and month presets", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T10:00:00.000Z"));

    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })));
    await renderWithRouter();

    await fireEvent.update(screen.getByLabelText("Préselection"), "week");
    const startInput = screen.getByLabelText("Du") as HTMLInputElement;
    const endInput = screen.getByLabelText("Au") as HTMLInputElement;
    expect(startInput.value).toBe("2026-01-15");
    expect(endInput.value).toBe("2026-01-21");

    await fireEvent.update(screen.getByLabelText("Préselection"), "month");
    expect(startInput.value).toBe("2026-01-01");
    expect(endInput.value).toBe("2026-01-31");

    vi.useRealTimers();
  });

  it("handles weekend preset on Saturday", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-17T10:00:00.000Z"));

    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })));
    await renderWithRouter();

    await fireEvent.update(screen.getByLabelText("Préselection"), "weekend");

    const startInput = screen.getByLabelText("Du") as HTMLInputElement;
    const endInput = screen.getByLabelText("Au") as HTMLInputElement;
    expect(startInput.value).toBe("2026-01-17");
    expect(endInput.value).toBe("2026-01-18");

    vi.useRealTimers();
  });

  it("keeps date range when preset is cleared", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })));
    await renderWithRouter();

    const startInput = screen.getByLabelText("Du") as HTMLInputElement;
    const endInput = screen.getByLabelText("Au") as HTMLInputElement;
    await fireEvent.update(startInput, "2026-01-10");
    await fireEvent.update(endInput, "2026-01-12");

    await fireEvent.update(screen.getByLabelText("Préselection"), "");

    expect(startInput.value).toBe("2026-01-10");
    expect(endInput.value).toBe("2026-01-12");
  });

  it("filters events by date range (same day)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: "1",
                title: "Concert",
                eventStartAt: "2026-01-15T10:00:00.000Z",
                eventEndAt: "2026-01-15T12:00:00.000Z",
                venueName: "Salle",
                city: "Descartes",
                image: "https://example.com",
                categoryId: "music",
                latitude: 46.97,
                longitude: 0.7,
                status: "PUBLISHED"
              },
              {
                id: "2",
                title: "Expo",
                eventStartAt: "2026-01-18T10:00:00.000Z",
                eventEndAt: "2026-01-18T12:00:00.000Z",
                venueName: "Galerie",
                city: "Tours",
                image: "https://example.com",
                categoryId: "art",
                latitude: 47,
                longitude: 0.69,
                status: "PUBLISHED"
              }
            ])
        })
      )
    );
    await renderWithRouter();

    await fireEvent.update(screen.getByLabelText("Du"), "2026-01-15");
    await fireEvent.update(screen.getByLabelText("Au"), "2026-01-15");

    expect(await screen.findByText("Concert")).toBeInTheDocument();
    expect(screen.queryByText("Expo")).not.toBeInTheDocument();
  });

  it("applies preset selection", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T10:00:00.000Z"));

    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: "1",
                title: "Concert",
                eventStartAt: "2026-01-18T10:00:00.000Z",
                eventEndAt: "2026-01-18T12:00:00.000Z",
                venueName: "Salle",
                city: "Descartes",
                image: "https://example.com",
                categoryId: "music",
                latitude: 46.97,
                longitude: 0.7,
                status: "PUBLISHED"
              },
              {
                id: "2",
                title: "Expo",
                eventStartAt: "2026-01-20T10:00:00.000Z",
                eventEndAt: "2026-01-20T12:00:00.000Z",
                venueName: "Galerie",
                city: "Tours",
                image: "https://example.com",
                categoryId: "art",
                latitude: 47,
                longitude: 0.69,
                status: "PUBLISHED"
              }
            ])
        })
      )
    );
    await renderWithRouter();

    await fireEvent.update(screen.getByLabelText("Préselection"), "weekend");

    expect(await screen.findByText("Concert")).toBeInTheDocument();
    expect(screen.queryByText("Expo")).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("shows empty state when filters exclude events", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: "1",
                title: "Concert",
                eventStartAt: "2026-01-15T20:00:00.000Z",
                eventEndAt: "2026-01-15T22:00:00.000Z",
                venueName: "Salle",
                city: "Descartes",
                image: "https://example.com",
                categoryId: "music",
                latitude: 46.97,
                longitude: 0.7,
                status: "PUBLISHED"
              }
            ])
        })
      )
    );
    await renderWithRouter();

    await screen.findAllByText("Concert");
    const searchInput = screen.getByTestId("home-search");
    await fireEvent.update(searchInput, "Inexistant");

    expect(await screen.findByText("Aucun événement ne correspond aux filtres.")).toBeInTheDocument();
  });

  it("resets filters", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: "1",
                title: "Concert",
                eventStartAt: "2026-01-15T20:00:00.000Z",
                eventEndAt: "2026-01-15T22:00:00.000Z",
                venueName: "Salle",
                city: "Descartes",
                image: "https://example.com",
                categoryId: "music",
                latitude: 46.97,
                longitude: 0.7,
                status: "PUBLISHED"
              }
            ])
        })
      )
    );
    await renderWithRouter();

    await screen.findAllByText("Concert");
    const searchInput = screen.getByTestId("home-search") as HTMLInputElement;
    await fireEvent.update(searchInput, "Concert");
    await fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));

    expect(searchInput.value).toBe("");
  });

  it("filters by city and type checkboxes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: "1",
                title: "Concert",
                eventStartAt: "2026-01-15T20:00:00.000Z",
                eventEndAt: "2026-01-15T22:00:00.000Z",
                venueName: "Salle",
                city: "Descartes",
                image: "https://example.com",
                categoryId: "music",
                latitude: 46.97,
                longitude: 0.7,
                status: "PUBLISHED"
              },
              {
                id: "2",
                title: "Expo",
                eventStartAt: "2026-01-16T10:00:00.000Z",
                eventEndAt: "2026-01-16T12:00:00.000Z",
                venueName: "Galerie",
                city: "Tours",
                image: "https://example.com",
                categoryId: "art",
                latitude: 47,
                longitude: 0.69,
                status: "PUBLISHED"
              }
            ])
        })
      )
    );
    await renderWithRouter();

    await fireEvent.click(await screen.findByTestId("filter-city-Descartes"));
    await fireEvent.click(await screen.findByTestId("filter-type-music"));

    expect(await screen.findByText("Concert")).toBeInTheDocument();
    expect(screen.queryByText("Expo")).not.toBeInTheDocument();

    await fireEvent.click(screen.getByTestId("filter-city-Descartes"));
    await fireEvent.click(screen.getByTestId("filter-type-music"));

    expect(await screen.findByText("Expo")).toBeInTheDocument();
  });

  it("shows moderation pending list and publishes", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          {
            id: "1",
            title: "Concert",
            eventStartAt: "2026-01-15T20:00:00.000Z",
            eventEndAt: "2026-01-15T22:00:00.000Z",
            venueName: "Salle",
            city: "Descartes",
            image: "https://example.com",
            categoryId: "music",
            latitude: 46.97,
            longitude: 0.7,
            status: "PENDING"
          }
        ])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: "1",
          title: "Concert",
          eventStartAt: "2026-01-15T20:00:00.000Z",
          eventEndAt: "2026-01-15T22:00:00.000Z",
          venueName: "Salle",
          city: "Descartes",
          image: "https://example.com",
          categoryId: "music",
          latitude: 46.97,
          longitude: 0.7,
          status: "PUBLISHED"
        })
      });

    vi.stubGlobal("fetch", fetchMock);
    await loginAsRole("MODERATOR");
    expect((await screen.findAllByText("Concert")).length).toBeGreaterThan(0);
    await fireEvent.click(screen.getByRole("button", { name: "Publier" }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows moderation error when publish fails", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          {
            id: "1",
            title: "Concert",
            eventStartAt: "2026-01-15T20:00:00.000Z",
            eventEndAt: "2026-01-15T22:00:00.000Z",
            venueName: "Salle",
            city: "Descartes",
            image: "https://example.com",
            categoryId: "music",
            latitude: 46.97,
            longitude: 0.7,
            status: "PENDING"
          }
        ])
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({})
      });

    vi.stubGlobal("fetch", fetchMock);
    await loginAsRole("MODERATOR");
    expect((await screen.findAllByText("Concert")).length).toBeGreaterThan(0);
    await fireEvent.click(screen.getByRole("button", { name: "Publier" }));

    expect(await screen.findByText("Action de modération impossible")).toBeInTheDocument();
  });

  it("shows moderation error when reject fails", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          {
            id: "1",
            title: "Concert",
            eventStartAt: "2026-01-15T20:00:00.000Z",
            eventEndAt: "2026-01-15T22:00:00.000Z",
            venueName: "Salle",
            city: "Descartes",
            image: "https://example.com",
            categoryId: "music",
            latitude: 46.97,
            longitude: 0.7,
            status: "PENDING"
          }
        ])
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({})
      });

    vi.stubGlobal("fetch", fetchMock);
    await loginAsRole("MODERATOR");
    expect((await screen.findAllByText("Concert")).length).toBeGreaterThan(0);

    await fireEvent.update(screen.getByPlaceholderText("Motif de refus"), "Motif");
    await fireEvent.click(screen.getByRole("button", { name: "Refuser" }));

    expect(await screen.findByText("Action de modération impossible")).toBeInTheDocument();
  });

  it("shows empty moderation state when no pending events", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: "1",
                title: "Concert",
                eventStartAt: "2026-01-15T20:00:00.000Z",
                eventEndAt: "2026-01-15T22:00:00.000Z",
                venueName: "Salle",
                city: "Descartes",
                image: "https://example.com",
                categoryId: "music",
                latitude: 46.97,
                longitude: 0.7,
                status: "PUBLISHED"
              }
            ])
        })
      )
    );
    await loginAsRole("MODERATOR");

    expect(await screen.findByText("Aucun événement en attente de modération.")).toBeInTheDocument();
  });

  it("shows unknown moderation error", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          {
            id: "1",
            title: "Concert",
            eventStartAt: "2026-01-15T20:00:00.000Z",
            eventEndAt: "2026-01-15T22:00:00.000Z",
            venueName: "Salle",
            city: "Descartes",
            image: "https://example.com",
            categoryId: "music",
            latitude: 46.97,
            longitude: 0.7,
            status: "PENDING"
          }
        ])
      })
      .mockRejectedValueOnce("nope");

    vi.stubGlobal("fetch", fetchMock);
    await loginAsRole("MODERATOR");
    expect((await screen.findAllByText("Concert")).length).toBeGreaterThan(0);

    await fireEvent.click(screen.getByRole("button", { name: "Publier" }));
    expect(await screen.findByText("Erreur inconnue")).toBeInTheDocument();
  });

  it("moderator publishes and keeps other pending events", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          {
            id: "1",
            title: "Concert",
            eventStartAt: "2026-01-15T20:00:00.000Z",
            eventEndAt: "2026-01-15T22:00:00.000Z",
            venueName: "Salle",
            city: "Descartes",
            image: "https://example.com",
            categoryId: "music",
            latitude: 46.97,
            longitude: 0.7,
            status: "PENDING"
          },
          {
            id: "2",
            title: "Expo",
            eventStartAt: "2026-01-16T10:00:00.000Z",
            eventEndAt: "2026-01-16T12:00:00.000Z",
            venueName: "Galerie",
            city: "Tours",
            image: "https://example.com",
            categoryId: "art",
            latitude: 47,
            longitude: 0.69,
            status: "PENDING"
          }
        ])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: "1",
          title: "Concert",
          eventStartAt: "2026-01-15T20:00:00.000Z",
          eventEndAt: "2026-01-15T22:00:00.000Z",
          venueName: "Salle",
          city: "Descartes",
          image: "https://example.com",
          categoryId: "music",
          latitude: 46.97,
          longitude: 0.7,
          status: "PUBLISHED"
        })
      });

    vi.stubGlobal("fetch", fetchMock);
    await loginAsRole("MODERATOR");
    expect((await screen.findAllByText("Concert")).length).toBeGreaterThan(0);
    expect(await screen.findByText("Expo")).toBeInTheDocument();

    await fireEvent.click(screen.getAllByRole("button", { name: "Publier" })[0]);

    expect(await screen.findByText("Expo")).toBeInTheDocument();
  });

  it("rejects event and clears reason", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          {
            id: "1",
            title: "Concert",
            eventStartAt: "2026-01-15T20:00:00.000Z",
            eventEndAt: "2026-01-15T22:00:00.000Z",
            venueName: "Salle",
            city: "Descartes",
            image: "https://example.com",
            categoryId: "music",
            latitude: 46.97,
            longitude: 0.7,
            status: "PENDING"
          }
        ])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: "1",
          title: "Concert",
          eventStartAt: "2026-01-15T20:00:00.000Z",
          eventEndAt: "2026-01-15T22:00:00.000Z",
          venueName: "Salle",
          city: "Descartes",
          image: "https://example.com",
          categoryId: "music",
          latitude: 46.97,
          longitude: 0.7,
          status: "REJECTED"
        })
      });

    vi.stubGlobal("fetch", fetchMock);
    await loginAsRole("MODERATOR");
    expect((await screen.findAllByText("Concert")).length).toBeGreaterThan(0);

    const reasonInput = screen.getByPlaceholderText("Motif de refus") as HTMLInputElement;
    await fireEvent.update(reasonInput, "Motif");
    await fireEvent.click(screen.getByRole("button", { name: "Refuser" }));

    expect(await screen.findByText("Aucun événement en attente de modération.")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByPlaceholderText("Motif de refus")).not.toBeInTheDocument()
    );
  });

  it("shows error state on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve([]) }))
    );
    await renderWithRouter();

    expect(await screen.findByText("Impossible de charger les événements")).toBeInTheDocument();
  });

  it("shows fallback error for unknown failures", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject("nope")));
    await renderWithRouter();

    expect(await screen.findByText("Erreur inconnue")).toBeInTheDocument();
  });

  it("allows editor to create a draft", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "draft-1",
            title: "Atelier",
            content: "Desc",
            image: "https://example.com",
            categoryId: "atelier",
            eventStartAt: "2026-01-15T20:00:00.000Z",
            eventEndAt: "2026-01-15T22:00:00.000Z",
            allDay: false,
            venueName: "Salle",
            postalCode: "37100",
            city: "Descartes",
            latitude: 46.97,
            longitude: 0.7,
            organizerName: "Asso",
            status: "DRAFT"
          })
      });

    vi.stubGlobal("fetch", fetchMock);
    await loginAsRole("EDITOR");

    const editorForm = within(screen.getByTestId("editor-form"));
    await fireEvent.update(editorForm.getByLabelText("Titre"), "Atelier");
    await fireEvent.update(editorForm.getByLabelText("Catégorie"), "atelier");
    await fireEvent.update(editorForm.getByLabelText("Image (URL)"), "https://example.com");
    await fireEvent.update(editorForm.getByLabelText("Organisateur"), "Asso");
    await fireEvent.update(editorForm.getByLabelText("Début"), "2026-01-15T20:00");
    await fireEvent.update(editorForm.getByLabelText("Fin"), "2026-01-15T22:00");
    await fireEvent.update(editorForm.getByLabelText("Lieu"), "Salle");
    await fireEvent.update(editorForm.getByLabelText("Code postal"), "37100");
    await fireEvent.update(editorForm.getByLabelText("Ville"), "Descartes");
    await fireEvent.update(editorForm.getByLabelText("Latitude"), "46.97");
    await fireEvent.update(editorForm.getByLabelText("Longitude"), "0.7");
    await fireEvent.update(editorForm.getByLabelText("Description"), "Desc");

    await fireEvent.click(screen.getByRole("button", { name: "Enregistrer le brouillon" }));

    expect(await screen.findByText("Atelier")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("submits a draft to moderation", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: "draft-1",
              title: "Atelier",
              content: "Desc",
              image: "https://example.com",
              categoryId: "atelier",
              eventStartAt: "2026-01-15T20:00:00.000Z",
              eventEndAt: "2026-01-15T22:00:00.000Z",
              allDay: false,
              venueName: "Salle",
              postalCode: "37100",
              city: "Descartes",
              latitude: 46.97,
              longitude: 0.7,
              organizerName: "Asso",
              status: "DRAFT"
            }
          ])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "draft-1",
            title: "Atelier",
            content: "Desc",
            image: "https://example.com",
            categoryId: "atelier",
            eventStartAt: "2026-01-15T20:00:00.000Z",
            eventEndAt: "2026-01-15T22:00:00.000Z",
            allDay: false,
            venueName: "Salle",
            postalCode: "37100",
            city: "Descartes",
            latitude: 46.97,
            longitude: 0.7,
            organizerName: "Asso",
            status: "PENDING"
          })
      });

    vi.stubGlobal("fetch", fetchMock);
    await loginAsRole("EDITOR");

    await fireEvent.click(await screen.findByRole("button", { name: "Soumettre" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows editor submit error", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: "draft-1",
              title: "Atelier",
              content: "Desc",
              image: "https://example.com",
              categoryId: "atelier",
              eventStartAt: "2026-01-15T20:00:00.000Z",
              eventEndAt: "2026-01-15T22:00:00.000Z",
              allDay: false,
              venueName: "Salle",
              postalCode: "37100",
              city: "Descartes",
              latitude: 46.97,
              longitude: 0.7,
              organizerName: "Asso",
              status: "DRAFT"
            }
          ])
      })
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) });

    vi.stubGlobal("fetch", fetchMock);
    await loginAsRole("EDITOR");

    await fireEvent.click(await screen.findByRole("button", { name: "Soumettre" }));
    expect(await screen.findByText("Impossible de soumettre l'événement")).toBeInTheDocument();
  });

  it("enters edit mode and resets draft form", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: "draft-1",
              title: "Atelier",
              content: "Desc",
              image: "https://example.com",
              categoryId: "atelier",
              eventStartAt: "2026-01-15T20:00:00.000Z",
              eventEndAt: "2026-01-15T22:00:00.000Z",
              allDay: false,
              venueName: "Salle",
              postalCode: "37100",
              city: "Descartes",
              latitude: 46.97,
              longitude: 0.7,
              organizerName: "Asso",
              status: "DRAFT"
            }
          ])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "draft-1",
            title: "Atelier mis à jour",
            content: "Desc",
            image: "https://example.com",
            categoryId: "atelier",
            eventStartAt: "2026-01-15T20:00:00.000Z",
            eventEndAt: "2026-01-15T22:00:00.000Z",
            allDay: false,
            venueName: "Salle",
            postalCode: "37100",
            city: "Descartes",
            latitude: 46.97,
            longitude: 0.7,
            organizerName: "Asso",
            status: "DRAFT"
          })
      });

    vi.stubGlobal("fetch", fetchMock);
    await loginAsRole("EDITOR");

    await fireEvent.click(await screen.findByRole("button", { name: "Modifier" }));
    expect(await screen.findByRole("button", { name: "Mettre à jour" })).toBeInTheDocument();

    await fireEvent.click(screen.getByRole("button", { name: "Mettre à jour" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await fireEvent.click(screen.getByRole("button", { name: "Nouveau brouillon" }));
    expect(await screen.findByRole("button", { name: "Enregistrer le brouillon" })).toBeInTheDocument();
  });

  it("shows rejection reason in editor list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: "draft-1",
                title: "Atelier",
                content: "Desc",
                image: "https://example.com",
                categoryId: "atelier",
                eventStartAt: "2026-01-15T20:00:00.000Z",
                eventEndAt: "2026-01-15T22:00:00.000Z",
                allDay: false,
                venueName: "Salle",
                postalCode: "37100",
                city: "Descartes",
                latitude: 46.97,
                longitude: 0.7,
                organizerName: "Asso",
                status: "REJECTED",
                rejectionReason: "Manque une info"
              }
            ])
        })
      )
    );

    await renderWithRouter();
    await loginAsRole("EDITOR");

    expect(await screen.findByText("Motif: Manque une info")).toBeInTheDocument();
  });

  it("shows editor error on failure", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) });

    vi.stubGlobal("fetch", fetchMock);
    await loginAsRole("EDITOR");

    const editorForm = within(screen.getByTestId("editor-form"));
    await fireEvent.update(editorForm.getByLabelText("Titre"), "Atelier");
    await fireEvent.update(editorForm.getByLabelText("Catégorie"), "atelier");
    await fireEvent.update(editorForm.getByLabelText("Image (URL)"), "https://example.com");
    await fireEvent.update(editorForm.getByLabelText("Organisateur"), "Asso");
    await fireEvent.update(editorForm.getByLabelText("Début"), "2026-01-15T20:00");
    await fireEvent.update(editorForm.getByLabelText("Fin"), "2026-01-15T22:00");
    await fireEvent.update(editorForm.getByLabelText("Lieu"), "Salle");
    await fireEvent.update(editorForm.getByLabelText("Code postal"), "37100");
    await fireEvent.update(editorForm.getByLabelText("Ville"), "Descartes");
    await fireEvent.update(editorForm.getByLabelText("Latitude"), "46.97");
    await fireEvent.update(editorForm.getByLabelText("Longitude"), "0.7");
    await fireEvent.update(editorForm.getByLabelText("Description"), "Desc");

    await fireEvent.click(screen.getByRole("button", { name: "Enregistrer le brouillon" }));
    expect(await screen.findByText("Impossible de créer l'événement")).toBeInTheDocument();
  });

  it("loads admin data and saves settings", async () => {
    const fetchMock = vi.fn((input: RequestInfo, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.url;
      if (url === "/api/events") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url === "/api/admin/users") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: "u1", name: "Admin", email: "admin@test", role: "ADMIN" }])
        });
      }
      if (url === "/api/admin/categories") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: "c1", name: "Musique" }]) });
      }
      if (url === "/api/admin/settings" && init?.method === "PUT") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              contactEmail: "contact@rene-website.fr",
              contactPhone: "0102030405",
              homepageIntro: "Intro"
            })
        });
      }
      if (url === "/api/admin/settings") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              contactEmail: "contact@rene-website.fr",
              contactPhone: "0102030405",
              homepageIntro: "Intro"
            })
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve([]) });
    });

    vi.stubGlobal("fetch", fetchMock);
    await loginAsRole("ADMIN");

    expect(await screen.findByText("Admin")).toBeInTheDocument();
    const settingsForm = within(await screen.findByTestId("admin-settings-form"));
    await fireEvent.update(settingsForm.getByLabelText("Intro page d'accueil"), "Intro");
    await fireEvent.click(settingsForm.getByRole("button", { name: "Enregistrer les réglages" }));

    expect(fetchMock).toHaveBeenCalled();
  });

  it("creates and deletes an admin user", async () => {
    const fetchMock = vi.fn((input: RequestInfo, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.url;
      if (url === "/api/events") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url === "/api/admin/users" && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: "u2", name: "Marie", email: "marie@test", role: "EDITOR" })
        });
      }
      if (url === "/api/admin/users") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url === "/api/admin/categories") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url === "/api/admin/settings") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ contactEmail: "c", contactPhone: "p", homepageIntro: "i" })
        });
      }
      if (url === "/api/admin/users/u2" && init?.method === "DELETE") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve([]) });
    });

    vi.stubGlobal("fetch", fetchMock);
    await loginAsRole("ADMIN");

    const userForm = within(await screen.findByTestId("admin-user-form"));
    await fireEvent.update(userForm.getByLabelText("Nom"), "Marie");
    await fireEvent.update(userForm.getByLabelText("Email"), "marie@test");
    await fireEvent.update(userForm.getByLabelText("Rôle"), "EDITOR");
    await fireEvent.click(userForm.getByRole("button", { name: "Créer" }));

    expect(await screen.findByText("Marie")).toBeInTheDocument();

    const userCard = screen.getByText("Marie").closest("li");
    if (!userCard) {
      throw new Error("User card not found");
    }
    await fireEvent.click(within(userCard).getByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(screen.queryByText("Marie")).not.toBeInTheDocument());
  });

  it("creates and updates an admin category", async () => {
    const fetchMock = vi.fn((input: RequestInfo, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.url;
      if (url === "/api/events") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url === "/api/admin/categories" && init?.method === "POST") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: "c2", name: "Lecture" }) });
      }
      if (url === "/api/admin/categories/c2" && init?.method === "PUT") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: "c2", name: "Lecture publique" }) });
      }
      if (url === "/api/admin/users") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url === "/api/admin/categories") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url === "/api/admin/settings") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ contactEmail: "c", contactPhone: "p", homepageIntro: "i" })
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve([]) });
    });

    vi.stubGlobal("fetch", fetchMock);
    await loginAsRole("ADMIN");

    const categoryForm = within(await screen.findByTestId("admin-category-form"));
    await fireEvent.update(categoryForm.getByLabelText("Nom"), "Lecture");
    await fireEvent.click(categoryForm.getByRole("button", { name: "Créer" }));
    expect(await screen.findByText("Lecture")).toBeInTheDocument();

    await fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
    await fireEvent.click(categoryForm.getByRole("button", { name: "Mettre à jour" }));
    expect(await screen.findByText("Lecture publique")).toBeInTheDocument();
  });

  it("shows admin error on load failure", async () => {
    const fetchMock = vi.fn((input: RequestInfo) => {
      const url = typeof input === "string" ? input : input.url;
      if (url === "/api/events") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve([]) });
    });

    vi.stubGlobal("fetch", fetchMock);
    await loginAsRole("ADMIN");

    expect(await screen.findByText("Impossible de charger les utilisateurs")).toBeInTheDocument();
  });
});
