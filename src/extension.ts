import * as vscode from 'vscode';
import { convertVsCodeSelectionTo } from './conversion';

export function activate(context: vscode.ExtensionContext) {
	const disposeToHex = vscode.commands.registerCommand('vscode-baseconv.to-hex', () => {
		convertVsCodeSelectionTo(16);
	});
	context.subscriptions.push(disposeToHex);

	const disposeToBinary = vscode.commands.registerCommand('vscode-baseconv.to-binary', () => {
		convertVsCodeSelectionTo(2);
	});
	context.subscriptions.push(disposeToBinary);

	const disposeToDecimal = vscode.commands.registerCommand('vscode-baseconv.to-decimal', () => {
		convertVsCodeSelectionTo(10);
	});
	context.subscriptions.push(disposeToDecimal);

	const disposeToOctal = vscode.commands.registerCommand('vscode-baseconv.to-octal', () => {
		convertVsCodeSelectionTo(8);
	});
	context.subscriptions.push(disposeToOctal);
}

// This method is called when your extension is deactivated
export function deactivate() {}
