import * as vscode from "vscode";
import { knownColorConfigurations, regenerateIcons } from "./generateIcons";
import { activateGit, getFileStatuses } from "./git";
import { getQuickPickItemFromFilePath } from "./quickPickItem";

const WORKSPACE_STATE_KEY = "recently-opened-list";

declare module "vscode" {
  interface QuickPickItem {
    custom: {
      fullPath: string;
    };
  }
}

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

  let iconsMap = regenerateIcons();
  vscode.window.showInformationMessage(
    "Icons for colorful-recently-used generated."
  );

  // Uh oh, this piece does not make sense, as VSCode caches the icons!
  // Once I figure out how to invalidate the cache, this piece can be uncommented and it should
  // update the colors in real-time
  // vscode.workspace.onDidChangeConfiguration((event) => {
  //   if (
  //     knownColorConfigurations.some((x) =>
  //       event.affectsConfiguration(`recently-used.${x}`)
  //     )
  //   ) {
  //     vscode.window.showInformationMessage(
  //       "Icons for colorful-recently-used regenerated based on configuration changes."
  //     );
  //   }
  // });

  const onDidChangeVisible = vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      if (!editor) {
        return;
      }
      registerNewPath(editor.document.uri.path, context);
    }
  );

  context.subscriptions.push(onDidChangeVisible);

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
        getQuickPickItemFromFilePath(
          fullpath,
          fileStatuses.get(fullpath),
          iconsMap
        )
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
            vscode.window.showErrorMessage(
              `Failed to open quickOpen modal: ${error}`
            );
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
