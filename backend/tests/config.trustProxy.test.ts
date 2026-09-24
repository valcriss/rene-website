import { getTrustedProxyHops } from "../src/config/trustProxy";

describe("trusted proxy configuration", () => {
  it.each([
    [undefined, 0],
    ["", 0],
    ["not-a-number", 0],
    ["-1", 0],
    ["4", 0],
    ["1", 1],
    ["3", 3]
  ])("returns %i trusted hops for %p", (value, expected) => {
    expect(getTrustedProxyHops(value)).toBe(expected);
  });
});
