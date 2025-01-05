import path from "path";
import { Status } from "./vendor/git";
import * as vscode from "vscode";
import { IIconsMap } from "./generateIcons";

const isFileMarkedAsExcluded = (fullPath: string) => {
  return fullPath.includes(path.sep + "node_modules" + path.sep);
};

export const getQuickPickItemFromFilePath = (
  fullPath: string,
  status: Status | undefined,
  iconsMap: IIconsMap
): vscode.QuickPickItem => {
  let iconPath: vscode.Uri;

  const workspacePath = vscode.workspace.workspaceFolders![0].uri.path;
  const description = path.dirname(fullPath).slice(workspacePath.length + 1);

  if (isFileMarkedAsExcluded(fullPath)) {
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
