import { mount } from "@vue/test-utils";
import Search from "../src/components/home/Search.vue";
import DateFilter from "../src/components/home/filters/DateFilter.vue";
import EventTypeFilter from "../src/components/home/filters/EventTypeFilter.vue";
import Header from "../src/components/navigation/Header.vue";
import type { EventFilters } from "../src/events/filterEvents";

const baseFilters = (): EventFilters => ({
  search: "",
  cities: [],
  types: [],
  preset: "",
  dateRange: { start: "2026-01-01", end: "" }
});

describe("home components", () => {
  it("Search emits updates and reset", async () => {
    const wrapper = mount(Search, { props: { modelValue: "" } });
    const input = wrapper.find("input");
    await input.setValue("Concert");

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["Concert"]);

    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("reset")).toBeTruthy();
  });

  it("Search falls back to empty string when target is missing", async () => {
    const wrapper = mount(Search, { props: { modelValue: "" } });
    const input = wrapper.find("input");

    const inputEvent = new Event("input");
    Object.defineProperty(inputEvent, "target", { value: null });
    input.element.dispatchEvent(inputEvent);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([""]);
  });

  it("DateFilter emits range and preset changes", async () => {
    const wrapper = mount(DateFilter, { props: { modelValue: baseFilters() } });
    const inputs = wrapper.findAll("input[type='date']");

    await inputs[0].setValue("2026-02-01");
    let emitted = wrapper.emitted("update:modelValue") as unknown as [EventFilters][];
    expect(emitted[0][0].dateRange.start).toBe("2026-02-01");
    expect(wrapper.emitted("date-range-change")).toBeTruthy();

    await inputs[1].setValue("2026-02-02");
    emitted = wrapper.emitted("update:modelValue") as unknown as [EventFilters][];
    expect(emitted[1][0].dateRange.end).toBe("2026-02-02");

    await wrapper.find("select").setValue("week");
    expect(wrapper.emitted("apply-preset")).toBeTruthy();
  });

  it("DateFilter falls back to empty values on missing targets", async () => {
    const wrapper = mount(DateFilter, { props: { modelValue: baseFilters() } });
    const inputs = wrapper.findAll("input[type='date']");

    const startEvent = new Event("input");
    Object.defineProperty(startEvent, "target", { value: null });
    inputs[0].element.dispatchEvent(startEvent);
    await wrapper.vm.$nextTick();
    let emitted = wrapper.emitted("update:modelValue") as unknown as [EventFilters][];
    expect(emitted[0][0].dateRange.start).toBe("");

    const endEvent = new Event("input");
    Object.defineProperty(endEvent, "target", { value: null });
    inputs[1].element.dispatchEvent(endEvent);
    await wrapper.vm.$nextTick();
    emitted = wrapper.emitted("update:modelValue") as unknown as [EventFilters][];
    expect(emitted[1][0].dateRange.end).toBe("");

    const selectEvent = new Event("change");
    Object.defineProperty(selectEvent, "target", { value: null });
    wrapper.find("select").element.dispatchEvent(selectEvent);
    await wrapper.vm.$nextTick();
    emitted = wrapper.emitted("update:modelValue") as unknown as [EventFilters][];
    expect(emitted[2][0].preset).toBe("");
  });

  it("EventTypeFilter renders empty and toggles types", async () => {
    const emptyWrapper = mount(EventTypeFilter, {
      props: { modelValue: baseFilters(), availableCategories: [] }
    });
    expect(emptyWrapper.text()).toContain("Aucun type disponible.");

    const wrapper = mount(EventTypeFilter, {
      props: {
        modelValue: { ...baseFilters(), types: ["music"] },
        availableCategories: [{ id: "music", name: "Musique", createdAt: "", updatedAt: "" }]
      }
    });

    const checkbox = wrapper.find("input[type='checkbox']");
    expect((checkbox.element as HTMLInputElement).checked).toBe(true);
    await checkbox.trigger("change");
    expect(wrapper.emitted("toggle-type")?.[0]).toEqual(["music"]);
  });

  it("Header emits login", async () => {
    const wrapper = mount(Header, { props: { showLogin: true } });
    const button = wrapper.find("button");
    await button.trigger("click");
    expect(wrapper.emitted("login")).toBeTruthy();
  });
});
