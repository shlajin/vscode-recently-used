import path from "path";
import fs from "fs";

const substr = `FILL_PLACEHOLDER`;

const generatedMapCircles = {
  red: "#ee3333", // weirdo
  green: "#829260", // added
  blue: "#a8c5f7", // edited
  orange: "#DE8E88", // untracked
  gray: "#888888", // ignored
  transparent: "",
};  


for (const [color, name] of Object.entries(generatedMapCircles)) {
  const templatePath = path.join("media", "circle-template.svg");
  // Read the file content
  fs.readFile(templatePath, "utf8", (err, data) => {
    if (err) {
      console.error(`Error reading file: ${err.message}`);
      return;
    }

    // Replace the placeholder
    const modifiedContent = data.replace(new RegExp(substr, "g"), color);

    // Define output file path
    const outputFilePath = path.join(
      path.dirname(templatePath),
      `circle-${color}.svg`
    );

    // Write the modified content to a new file
    fs.writeFile(outputFilePath, modifiedContent, "utf8", (err) => {
      if (err) {
        console.error(`Error writing file: ${err.message}`);
        return;
      }
      console.log(`File saved successfully to: ${outputFilePath}`);
    });
  });
}
