import { SingleBar, Presets } from "cli-progress";

describe("Progress Bar Configuration", () => {
  it("should match the snapshot", () => {
    const progressBar = new SingleBar(
      {
        format:
          "Processing files |{bar}| {percentage}% | {value}/{total} Files",
        barCompleteChar: "\u2588",
        barIncompleteChar: "\u2591",
        hideCursor: true,
      },
      Presets.shades_classic,
    );

    expect(progressBar.getTotal()).toMatchSnapshot();
    expect(progressBar.getProgress()).toMatchSnapshot();
    expect(progressBar.getRate()).toMatchSnapshot();
    expect(progressBar.eta).toMatchSnapshot();
  });
});
