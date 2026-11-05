import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { isTier1Country } from "@/lib/geo";

describe("Geo Detection and Tier 1 Filtering", () => {
  let store: Record<string, string> = {};
  let cookieVal = "";

  beforeEach(() => {
    store = {};
    cookieVal = "";
    vi.restoreAllMocks();

    const mockLocalStorage = {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, val: string) => {
        store[key] = String(val);
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };

    const mockDocument = {
      get cookie() {
        return cookieVal;
      },
      set cookie(val: string) {
        cookieVal = val;
      },
    };

    vi.stubGlobal("window", {
      localStorage: mockLocalStorage,
    });
    vi.stubGlobal("localStorage", mockLocalStorage);
    vi.stubGlobal("document", mockDocument);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("identifies Tier 1 countries correctly", () => {
    expect(isTier1Country("US")).toBe(true);
    expect(isTier1Country("GB")).toBe(true);
    expect(isTier1Country("CA")).toBe(true);
    expect(isTier1Country("AU")).toBe(true);
    expect(isTier1Country("NL")).toBe(true);
    expect(isTier1Country("DE")).toBe(true);
  });

  it("rejects Tier 2 and Tier 3 countries from Tier 1 classification", () => {
    expect(isTier1Country("IN")).toBe(false);
    expect(isTier1Country("PH")).toBe(false);
    expect(isTier1Country("PK")).toBe(false);
    expect(isTier1Country("BD")).toBe(false);
    expect(isTier1Country("NG")).toBe(false);
  });

  it("reads country from cineby_geo cookie", () => {
    cookieVal = "cineby_geo=US; Path=/";
    expect(isTier1Country()).toBe(true);

    cookieVal = "cineby_geo=IN; Path=/";
    expect(isTier1Country()).toBe(false);
  });

  it("reads country from localStorage fallback", () => {
    store["cineby_country_code"] = "GB";
    expect(isTier1Country()).toBe(true);

    store["cineby_country_code"] = "PH";
    expect(isTier1Country()).toBe(false);
  });

  it("defaults to false when country is unknown", () => {
    expect(isTier1Country(null)).toBe(false);
    expect(isTier1Country("")).toBe(false);
  });
});
