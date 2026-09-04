import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/vue";
import { fireEvent } from "@testing-library/vue";
import { describe, expect, it, vi, afterEach } from "vitest";
import ImageCropModal from "../src/components/form/ImageCropModal.vue";

const destroyMock = vi.fn();
const getCroppedCanvasMock = vi.fn();

vi.mock("cropperjs", () => ({
  default: class MockCropper {
    destroy = destroyMock;
    getCroppedCanvas = getCroppedCanvasMock;
    constructor() {
      // no-op: the real constructor wires up DOM/canvas behavior we don't need in tests
    }
  }
}));

const fakeBlob = new Blob(["cropped"], { type: "image/png" });

describe("ImageCropModal", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when no file is provided", () => {
    render(ImageCropModal, { props: { file: null } });

    expect(screen.queryByText("Recadrer l'image")).not.toBeInTheDocument();
  });

  it("shows the crop dialog with the target format once a file is provided", async () => {
    const file = new File(["source"], "photo.png", { type: "image/png" });
    render(ImageCropModal, { props: { file } });

    expect(await screen.findByText("Recadrer l'image")).toBeInTheDocument();
    expect(screen.getByText(/466 × 291/)).toBeInTheDocument();
  });

  it("emits the cropped file at the target size on confirm", async () => {
    getCroppedCanvasMock.mockReturnValue({
      toBlob: (callback: (blob: Blob | null) => void) => callback(fakeBlob)
    });

    const file = new File(["source"], "photo.png", { type: "image/png" });
    const { emitted } = render(ImageCropModal, { props: { file } });
    await screen.findByText("Recadrer l'image");

    await fireEvent.click(screen.getByRole("button", { name: "Valider le recadrage" }));

    expect(getCroppedCanvasMock).toHaveBeenCalledWith({ width: 466, height: 291 });
    const confirmed = emitted().confirm;
    expect(confirmed).toBeTruthy();
    const [croppedFile] = confirmed![0] as [File];
    expect(croppedFile.name).toBe("photo.png");
    expect(croppedFile.type).toBe("image/png");
  });

  it("emits cancel without producing a file", async () => {
    const file = new File(["source"], "photo.png", { type: "image/png" });
    const { emitted } = render(ImageCropModal, { props: { file } });
    await screen.findByText("Recadrer l'image");

    await fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(emitted().cancel).toBeTruthy();
    expect(getCroppedCanvasMock).not.toHaveBeenCalled();
  });

  it("destroys the cropper instance when the file is cleared", async () => {
    const file = new File(["source"], "photo.png", { type: "image/png" });
    const { rerender } = render(ImageCropModal, { props: { file } });
    await screen.findByText("Recadrer l'image");

    await rerender({ file: null });

    expect(destroyMock).toHaveBeenCalled();
  });
});
