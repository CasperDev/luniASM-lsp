/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	DocumentDiagnosticReportKind,
	type DocumentDiagnosticReport,
	integer,
	Position
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

/// <reference path="./Interpreter.d.ts" />
import { Compiler } from "./Interpreter";
import { Opcodes } from './Interpreter';

const compiler = new Compiler();
const opcodes = Opcodes;
//my.hello("Stack Overflow");


// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true
			},
			diagnosticProvider: {
				interFileDependencies: false,
				workspaceDiagnostics: false
			}
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The example settings
interface LspSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: LspSettings = { maxNumberOfProblems: 1000 };
let globalSettings: LspSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<LspSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <LspSettings>(
			(change.settings.languageServerLuniASM || defaultSettings)
		);
	}
	// Refresh the diagnostics since the `maxNumberOfProblems` could have changed.
	// We could optimize things here and re-fetch the setting first can compare it
	// to the existing setting, but this is out of scope for this example.
	connection.languages.diagnostics.refresh();
});

function getDocumentSettings(resource: string): Thenable<LspSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'languageServerLuniASM'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});


connection.languages.diagnostics.on(async (params) => {
	const document = documents.get(params.textDocument.uri);
	if (document !== undefined) {
		return {
			kind: DocumentDiagnosticReportKind.Full,
			items: await validateTextDocument(document)
		} satisfies DocumentDiagnosticReport;
	} else {
		// We don't know the document. We can either try to read it from disk
		// or we don't report problems for it.
		return {
			kind: DocumentDiagnosticReportKind.Full,
			items: []
		} satisfies DocumentDiagnosticReport;
	}
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<Diagnostic[]> {
	// In this simple example we get the settings for every validate run.
	const settings = await getDocumentSettings(textDocument.uri);

	// The validator creates diagnostics for all uppercase words length 2 and more
	const text = textDocument.getText();
	//const pattern = /\b[A-Z]{2,}\b/g;
	//let m: RegExpExecArray | null;
	
	let problems = 0;
	const diagnostics: Diagnostic[] = [];
	var handler = {
		error: (msg: string) => {
			problems++;
			const regexp = /\s+(line)\s+(\d+)/;
			const match = msg.match(regexp);
			
			if (match) {
				const line: number = +match[2];
				const pos = Position.create(line,0);
				const nextlinepos =  Position.create(line+1,0);
				const diagnostic: Diagnostic = {
					severity: DiagnosticSeverity.Error,
					range: {
						start: pos,
						end: nextlinepos
					},
					message: msg,
					source: 'ex'
				};
				if (hasDiagnosticRelatedInformationCapability) {
					diagnostic.relatedInformation = [
						{
							location: {
								uri: textDocument.uri,
								range: Object.assign({}, diagnostic.range)
							},
							message: msg
						},
					]
				}
				diagnostics.push(diagnostic);
			}
		}
	};
	let code = compiler.compile(text, handler, true);
	return diagnostics;
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received a file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		// The pass parameter contains the position of the text document in
		// which code complete got requested. 
		let items : CompletionItem[] = [];
		for(const key in Object.keys(Opcodes)) {
			let label = Object.values(Opcodes)[key].toString();
			items.push({
				label: label,
				kind: CompletionItemKind.Keyword,
				data: label
			})
		}
		return items;
	}
);

// This handler resolves additional information for the item selected in
// the completion list.

/*


load
	loads value from memory mem[st(0)] to stack. removes 1 address from stack. pushes 1 value to stack

	//loads value from memory address 0x1000 checks if its 69 if yes jumps to nice. 
	//stack is clean afterwards
	push 0x1000
	load
	push 69
	push nice
	je

pushb
	pushes 1 value or label address to stack. 8 bit	(size coding)
pushw
	pushes 1 value or label address to stack. 16 bit (size coding)
clone
	clones the top value on stack. 
loads
	loads value from stack with offset and pushes it to the top of the stack (extension)

	//copy value from stack index 1 (after removing the 1 from the stack)
	push 69
	push 42
	push 1
	loads
	pop //69
	pop //42
	pop //69

stors
	stores a value st(1) to the stack with offset st(st(0)) (extension)

	//overwrite 0 with the value 69 on the stack
	push 0
	push 42
	push 69
	push 1
	stors
	pop //42
	pop //69

swap
	swaps the two top stack values

jmp
	jumps to address st(0). address is removed from stack
jz
	jumps to address st(0) if s(1) is zero. 2 values are removed from stack

	//jumps to label zero. stack is cleared
	push 0
	push zero
	jz

jnz
	jumps to address st(0) if s(1) is not zero. 2 values are removed from stack
jg
	jumps to address st(0) if s(2) > st(1). 3 values are removed from stack

	//copares 2 > 1 and then jumps to label. stack is cleared
	push 2
	push 1
	push yeah2isGreaterThan1
	jg

jge
	jumps to address st(0) if s(2) >= st(1). 3 values are removed from stack
je
	jumps to address st(0) if s(2) == st(1). 3 values are removed from stack
jne
	jumps to address st(0) if s(2) != st(1). 3 values are removed from stack
and
	st(1) & st(0). 2 values popped result pushed
or
	st(1) & st(0). 2 values popped result pushed
xor
	st(1) ^ st(0). 2 values popped result pushed
not
	~st(0). 2 values popped result pushed

	//invert the top of the stack
	push 0x00000000
	neg
	pop //0xffffffff

inc
	st(0)++
dec
	st(1)--
add
	st(1) + st(0). 2 values popped result pushed

	//adds 2 and 3
	push 2
	push 3
	add
	pop //5

sub
	st(1) - st(0). 2 values popped result pushed
shl
	st(1) << st(0). 2 values popped result pushed
shr
	st(1) >> st(0). 2 values popped result pushed
mul
	st(1) * st(0). 2 values popped result pushed
div
	st(1) / st(0). 2 values popped result pushed (1 cycle execution might not be possible)
mod
	st(1) % st(0). 2 values popped result pushed (1 cycle execution might not be possible)
neg
	-st(0)
abs
	|st(0)|
*/

connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data === 'push') {
			item.detail = "push", 
			item.documentation = "pushes 1 value or label address to stack. 32 bit" 
		} else if(item.data === 'pop') {
			item.detail = 'pop',
			item.documentation =  "removes 1 value from stack"
		} else if(item.data === "stor") {
			item.detail = 'stor',
			item.documentation = "stores st(1) to mem[st(0)]. removes 2 values from stack\n"+
			 						"//write 69 to memory address 0x1000 and clear the stack\n"+
			 					"push 69\n"+
								"push 0x1000\n"+
								"stor"
		}
		return item;
	}
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
