import path from "path";
import * as vscode from "vscode";
import { GitExtension, Repository, Status } from "./vendor/git";

const WORKSPACE_STATE_KEY = "recently-opened-list";

const colorsForCircles = [
  "red",
  "green",
  "orange",
  "blue",
  "gray",
  "transparent",
] as const;

const colorCircles = Object.fromEntries(
  colorsForCircles.map((color) => [
    color,
    vscode.Uri.parse(
      path.join(__dirname, "..", "media", `circle-${color}.svg`)
    ),
  ])
) as Record<(typeof colorsForCircles)[number], vscode.Uri>;

const colorsForMinuses = ["red"];
const colorMinuses = Object.fromEntries(
  colorsForMinuses.map((color) => [
    color,
    vscode.Uri.parse(path.join(__dirname, "..", "media", `minus-${color}.svg`)),
  ])
) as Record<(typeof colorsForMinuses)[number], vscode.Uri>;

const iconsMap: Record<Status | -1, vscode.Uri> = {
  [-1]: colorCircles.transparent,
  [Status.INDEX_MODIFIED]: colorCircles.blue,
  [Status.INDEX_ADDED]: colorCircles.green,
  [Status.INDEX_DELETED]: colorCircles.gray,
  [Status.INDEX_RENAMED]: colorCircles.blue,
  [Status.INDEX_COPIED]: colorCircles.green,
  [Status.MODIFIED]: colorCircles.blue,
  [Status.DELETED]: colorCircles.gray,
  [Status.UNTRACKED]: colorCircles.orange,
  [Status.IGNORED]: colorCircles.gray,
  [Status.INTENT_TO_ADD]: colorCircles.transparent,
  [Status.INTENT_TO_RENAME]: colorCircles.transparent,
  [Status.TYPE_CHANGED]: colorCircles.green,
  [Status.ADDED_BY_US]: colorCircles.red,
  [Status.ADDED_BY_THEM]: colorCircles.red,
  [Status.DELETED_BY_US]: colorCircles.red,
  [Status.DELETED_BY_THEM]: colorCircles.red,
  [Status.BOTH_ADDED]: colorCircles.red,
  [Status.BOTH_DELETED]: colorCircles.red,
  [Status.BOTH_MODIFIED]: colorCircles.red,
};

const activateGit = async () => {
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

const getFileStatuses = (repository: Repository) => {
  const map = new Map<string, Status>();
  repository.state.workingTreeChanges.forEach((r) => {
    map.set(r.uri.fsPath, r.status);
  });
  repository.state.indexChanges.forEach((r) => {
    map.set(r.uri.fsPath, r.status);
  });

  return map;
};

const isFileMarkedAsExcluded = (fullPath: string) => {
  return fullPath.includes(path.sep + "node_modules" + path.sep);
};

declare module "vscode" {
  interface QuickPickItem {
    custom: {
      fullPath: string;
    };
  }
}

const getQuickPickItemFromFilePath = (
  fullPath: string,
  status: Status | undefined
): vscode.QuickPickItem => {
  let iconPath: vscode.Uri;

  const workspacePath = vscode.workspace.workspaceFolders![0].uri.path;
  const description = path.dirname(fullPath).slice(workspacePath.length + 1);

  if (isFileMarkedAsExcluded(fullPath)) {
    iconPath = colorMinuses.red;
  } else {
    iconPath = iconsMap[status || -1];
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

const registerNewPath = (path: string, context: vscode.ExtensionContext) => {
  const openedFiles = context.workspaceState.get(
    WORKSPACE_STATE_KEY,
    [] as string[]
  );

  const index = openedFiles.indexOf(path);
  if (index > -1) {
    openedFiles.splice(index, 1);
  }
  openedFiles.unshift(path);

  if (openedFiles.length >= 20) {
    openedFiles.pop();
  }

  context.workspaceState.update(WORKSPACE_STATE_KEY, openedFiles);
};

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  const repository = await activateGit();

  if (!repository) {
    return;
  }

  const onDidChangeVisible = vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      if (!editor) {
        return;
      }
      registerNewPath(editor.document.uri.path, context);
    }
  );

  context.subscriptions.push(onDidChangeVisible);
  // context.subscriptions.push(onDidOpenTextDocument);

  const disposable = vscode.commands.registerCommand(
    "recently-used.list",
    () => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
      if (!workspaceFolder) {
        vscode.window.showInformationMessage(
          `Can't determine workspace folders`
        );
        return;
      }

      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      const openedFiles =
        context.workspaceState.get<string[]>(WORKSPACE_STATE_KEY) || [];

      const fileStatuses = getFileStatuses(repository);
      const recentPicks = openedFiles.map((fullpath, index) =>
        getQuickPickItemFromFilePath(fullpath, fileStatuses.get(fullpath))
      );

      const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem>();
      quickPick.title = "Recent files";

      quickPick.items = recentPicks;

      quickPick.activeItems = [recentPicks[1]];

      quickPick.onDidChangeValue(() => {
        if (quickPick.activeItems.length === 0) {
          quickPick.title = `Hit enter to open Go To File...`;
        } else {
          quickPick.title = `Recent files`;
        }
      });
      quickPick.onDidAccept(async () => {
        quickPick.dispose();
        const selected = quickPick.selectedItems[0];

        if (selected) {
          try {
            vscode.commands.executeCommand(
              "vscode.open",
              vscode.Uri.file(selected.custom.fullPath)
            );
          } catch (error) {
            vscode.window.showErrorMessage(`Failed to open document: ${error}`);
          }
        } else {
          try {
            vscode.commands.executeCommand(
              "workbench.action.quickOpen",
              quickPick.value
            );
          } catch (error) {
            vscode.window.showErrorMessage(`Failed to open quickOpen modal: ${error}`);
          }
        }
      });

      quickPick.onDidHide(() => quickPick.dispose());
      quickPick.show();
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
