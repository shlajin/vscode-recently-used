import path from "path";
import { Status } from "./vendor/git";
import * as vscode from "vscode";
import * as fs from "fs";

const TRANSPARENT = "transparent";
export const knownColorConfigurations = [
  "conflictColor",
  "addedColor",
  "changedColor",
  "untrackedColor",
  "ignoredColor",
  "excludedColor",
  TRANSPARENT,
] as const;

export const knownIconShapes = ["circle", "minus"] as const;
const PLACEHOLDER_SUBSTR = `FILL_PLACEHOLDER` as const;

export const regenerateIcons = () => {
  knownColorConfigurations.forEach((colorConfigName) => {
    const color =
      colorConfigName === TRANSPARENT
        ? "transparent"
        : vscode.workspace
            .getConfiguration("colorful-recently-used")
            .get<string>(colorConfigName) || "#FF0000";

    knownIconShapes.forEach((iconShape) => {
      // console.log(
      //   "Generating",
      //   iconShape,
      //   "with color",
      //   color.length > 0 ? color : "(transparent)",
      //   "for",
      //   colorConfigName
      // );

      const templatePath = path.join(
        __dirname,
        "media",
        `${iconShape}-template.svg`
      );
      // Read the file content
      fs.readFile(templatePath, "utf8", (err, data) => {
        if (err) {
          console.error(`Error reading file: ${err.message}`);
          return;
        }

        // Replace the placeholder
        const modifiedContent = data.replace(
          new RegExp(PLACEHOLDER_SUBSTR, "g"),
          color
        );

        // Define output file path
        const outputFilePath = path.join(
          path.dirname(templatePath),
          `${iconShape}-${colorConfigName}.svg`
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
    });
  });

  return getFullIconsMap();
};

const getIconsUri = (iconType: (typeof knownIconShapes)[number]) => {
  return Object.fromEntries(
    knownColorConfigurations.map((color) => [
      color,
      vscode.Uri.parse(
        path.join(__dirname, "..", "dist", "media", `${iconType}-${color}.svg`)
      ),
    ])
  ) as Record<(typeof knownColorConfigurations)[number], vscode.Uri>;
};

const getGitIconsMap = () => {
  const circles = getIconsUri("circle");

  const iconsMap: Record<Status | -1, vscode.Uri> = {
    [-1]: circles.transparent,
    [Status.INDEX_MODIFIED]: circles.changedColor,
    [Status.INDEX_ADDED]: circles.addedColor,
    [Status.INDEX_DELETED]: circles.excludedColor,
    [Status.INDEX_RENAMED]: circles.changedColor,
    [Status.INDEX_COPIED]: circles.addedColor,
    [Status.MODIFIED]: circles.changedColor,
    [Status.DELETED]: circles.excludedColor,
    [Status.UNTRACKED]: circles.untrackedColor,
    [Status.IGNORED]: circles.excludedColor,
    [Status.INTENT_TO_ADD]: circles.addedColor,
    [Status.INTENT_TO_RENAME]: circles.changedColor,
    [Status.TYPE_CHANGED]: circles.changedColor,
    [Status.ADDED_BY_US]: circles.conflictColor,
    [Status.ADDED_BY_THEM]: circles.conflictColor,
    [Status.DELETED_BY_US]: circles.conflictColor,
    [Status.DELETED_BY_THEM]: circles.conflictColor,
    [Status.BOTH_ADDED]: circles.conflictColor,
    [Status.BOTH_DELETED]: circles.conflictColor,
    [Status.BOTH_MODIFIED]: circles.conflictColor,
  };

  return iconsMap;
};

export const getExcludedIconsMap = () => {
  const minuses = getIconsUri("minus");

  return {
    excluded: minuses.excludedColor,
  };
};

export const getFullIconsMap = () => {
  return {
    git: getGitIconsMap(),
    excluded: getExcludedIconsMap(),
  };
};

export type IIconsMap = ReturnType<typeof getFullIconsMap>;
