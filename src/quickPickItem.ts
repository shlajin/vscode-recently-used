import path from "path";
import { Status } from "./vendor/git";
import * as vscode from "vscode";
import { IIconsMap } from "./generateIcons";

const isFileMarkedAsExcluded = (fullPath: string, excludedRegexp: RegExp) => {
  return excludedRegexp.test(fullPath);
};

export const getQuickPickItemFromFilePath = (
  fullPath: string,
  status: Status | undefined,
  iconsMap: IIconsMap,
  excludedRegexp: RegExp | undefined
): vscode.QuickPickItem => {
  let iconPath: vscode.Uri;

  const workspacePath = vscode.workspace.workspaceFolders![0].uri.path;
  const description = path.dirname(fullPath).slice(workspacePath.length + 1);

  if (excludedRegexp && isFileMarkedAsExcluded(fullPath, excludedRegexp)) {
    iconPath = iconsMap.excluded.excluded;
  } else {
    iconPath = iconsMap.git[status || -1];
  }

  return {
    label: `$(file) ${path.basename(fullPath)}`,
    description: description.length === 0 ? "" : description,
    custom: {
      fullPath,
    },
    iconPath,
  };
};
