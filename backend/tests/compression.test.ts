import request from "supertest";
import { createApp } from "../src/app";
import { authHeader } from "./authTestUtils";

describe("HTTP compression", () => {
  it("compresses a sizable JSON response when the client accepts gzip", async () => {
    const app = createApp();
    const longContent = "Une soirée exceptionnelle en plein air, avec un programme riche. ".repeat(40);

    await request(app)
      .post("/api/events")
      .set("Authorization", authHeader("EDITOR"))
      .send({
        title: "Concert",
        content: longContent,
        image: "https://example.com/image.jpg",
        categoryId: "music",
        audienceId: "all",
        organizerName: "Association",
        occurrences: [
          {
            eventStartAt: "2026-01-15T20:00:00.000Z",
            eventEndAt: "2026-01-15T22:00:00.000Z",
            allDay: false,
            venueName: "Salle des fêtes",
            address: "1 rue du centre",
            postalCode: "37160",
            city: "Descartes"
          }
        ]
      });

    const response = await request(app)
      .get("/api/events")
      .set("Authorization", authHeader("EDITOR"))
      .set("Accept-Encoding", "gzip");

    expect(response.status).toBe(200);
    expect(response.headers["content-encoding"]).toBe("gzip");
  });

  it("does not compress a response below the size threshold", async () => {
    const app = createApp();

    const response = await request(app).get("/api/health").set("Accept-Encoding", "gzip");

    expect(response.status).toBe(200);
    expect(response.headers["content-encoding"]).toBeUndefined();
  });
});
