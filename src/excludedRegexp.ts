import * as vscode from "vscode";

export const recompileExcludedRegexp = () => {
  const regexpString = vscode.workspace
    .getConfiguration("colorful-recently-used")
    .get<string>("excludedRegexp");

  if (!regexpString || regexpString.trim().length === 0) {
    return undefined;
  }

  return new RegExp(regexpString);
};
