import { mount } from "@vue/test-utils";
import PasswordField from "../src/components/form/PasswordField.vue";

describe("PasswordField", () => {
  it("renders as a password input by default and emits updates", async () => {
    const wrapper = mount(PasswordField, {
      props: { modelValue: "", label: "Mot de passe" }
    });

    const input = wrapper.get("input");
    expect(input.attributes("type")).toBe("password");
    expect(input.attributes("placeholder")).toBe("********");

    await input.setValue("secret");

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["secret"]);
  });

  it("toggles visibility when the eye button is clicked", async () => {
    const wrapper = mount(PasswordField, {
      props: { modelValue: "secret", label: "Mot de passe" }
    });

    const toggle = wrapper.get("button");
    expect(wrapper.get("input").attributes("type")).toBe("password");
    expect(toggle.attributes("aria-label")).toBe("Afficher le mot de passe");

    await toggle.trigger("click");

    expect(wrapper.get("input").attributes("type")).toBe("text");
    expect(toggle.attributes("aria-label")).toBe("Masquer le mot de passe");

    await toggle.trigger("click");

    expect(wrapper.get("input").attributes("type")).toBe("password");
  });

  it("falls back to an empty string when the input target is missing", async () => {
    const wrapper = mount(PasswordField, {
      props: { modelValue: "", label: "Mot de passe" }
    });

    const inputEvent = new Event("input");
    Object.defineProperty(inputEvent, "target", { value: null });
    wrapper.get("input").element.dispatchEvent(inputEvent);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([""]);
  });

  it("accepts a custom placeholder", () => {
    const wrapper = mount(PasswordField, {
      props: { modelValue: "", label: "Mot de passe", placeholder: "Votre mot de passe" }
    });

    expect(wrapper.get("input").attributes("placeholder")).toBe("Votre mot de passe");
  });
});
