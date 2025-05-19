import * as vscode from "vscode";
import { GitExtension, Repository, Status } from "./vendor/git";

export const activateGit = async () => {
  const iconsExtension = vscode.extensions.getExtension(
    "vscode-icons-team.vscode-icons"
  );
  await iconsExtension?.activate();
  iconsExtension?.exports;

  const gitExtension =
    vscode.extensions.getExtension<GitExtension>("vscode.git");

  if (!gitExtension) {
    vscode.window.showInformationMessage(`Can't get git extension`);
    return;
  }
  const gitExports = await gitExtension.activate();
  const gitAPI = gitExports.getAPI(1);

  const currentWorkspace = vscode.workspace.workspaceFolders?.[0];
  if (!currentWorkspace) {
    vscode.window.showInformationMessage(`No workspace directories found`);
    return;
  }

  await gitAPI.openRepository(currentWorkspace.uri);

  if (gitAPI.repositories.length === 0) {
    vscode.window.showInformationMessage(`Couldn't find any git repositories`);
    return;
  }

  const repository = gitAPI.repositories[0];

  return repository;
};

export const getFileStatuses = (repository: Repository) => {
  const map = new Map<string, Status>();
  repository.state.workingTreeChanges.forEach((r) => {
    map.set(r.uri.fsPath, r.status);
  });

  repository.state.indexChanges.forEach((r) => {
    map.set(r.uri.fsPath, r.status);
  });

  return map;
};
