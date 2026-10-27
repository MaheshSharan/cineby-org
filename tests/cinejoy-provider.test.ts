import { describe, expect, it } from "vitest";
import { cinejoyProvider } from "@/lib/providers/sources/cinejoy";
import { getActiveCinejoyServers } from "@/lib/providers/sources/cinejoy/servers";

describe("cinejoy provider", () => {
  it("defines standard provider properties", () => {
    expect(cinejoyProvider.id).toBe("cinejoy");
    expect(cinejoyProvider.name).toBe("Cinejoy");
    expect(cinejoyProvider.priority).toBe(5);
    expect(typeof cinejoyProvider.fetch).toBe("function");
    expect(typeof cinejoyProvider.fetchSubtitles).toBe("function");
  });

  it("queries active servers with fallback gracefully", async () => {
    const servers = await getActiveCinejoyServers();
    expect(Array.isArray(servers)).toBe(true);
    expect(servers.length).toBeGreaterThan(0);
    const hasNebula = servers.some((s) => s.name.toLowerCase() === "nebula");
    expect(hasNebula).toBe(true);
  });
});
