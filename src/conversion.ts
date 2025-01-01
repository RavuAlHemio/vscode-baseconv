import * as vscode from 'vscode';

type MatcherFunc = (numberString: string) => number|null;
interface LanguageDefinition {
    matchers: MatcherFunc[],
    baseOutput: (numberValue: number, base: number) => string|null,
}

function assertBaseIsInteger(base: number) {
    if (!Number.isInteger(base)) {
        throw new RangeError("base must be an integer");
    }
}

function makeMatcher(stripSpacers: string[], digitsRegex: RegExp, base: number): MatcherFunc {
    assertBaseIsInteger(base);
    return (numberString: string) => {
        for (const stripSpacer of stripSpacers) {
            numberString = numberString.replaceAll(stripSpacer, "");
        }
        const digitsMatch = digitsRegex.exec(numberString);
        if (digitsMatch === null) {
            return null;
        }
        const digitsSubstring = digitsMatch[1];
        const parsed = Number.parseInt(digitsSubstring, base);
        if (Number.isNaN(parsed)) {
            return null;
        }
        return parsed;
    };
}

const SupportedLanguages: { [language: string]: LanguageDefinition } = {
    python: {
        matchers: [
            makeMatcher(["_"], /^([0-9]+)$/, 10),
            makeMatcher(["_"], /^0x([0-9a-fA-F]+)$/, 16),
            makeMatcher(["_"], /^0b([01]+)$/, 2),
            makeMatcher(["_"], /^0o([0-7]+)$/, 8),
        ],
        baseOutput(numberValue, base) {
            switch (base) {
                case 2: return "0b" + numberValue.toString(2);
                case 8: return "0o" + numberValue.toString(8);
                case 10: return numberValue.toString(10);
                case 16: return "0x" + numberValue.toString(16);
                default: return null;
            }
        },
    },
    cpp: {
        matchers: [
            makeMatcher(["'"], /^([1-9][0-9]*)$/, 10),
            makeMatcher(["'"], /^0[xX]([0-9a-fA-F]+)$/, 16),
            makeMatcher(["'"], /^0[bB]([01]+)$/, 2),
            makeMatcher(["'"], /^(0[0-7]*)$/, 8),
        ],
        baseOutput(numberValue, base) {
            switch (base) {
                case 2: return "0b" + numberValue.toString(2);
                case 8: return (numberValue !== 0) ? "0" + numberValue.toString(8) : "0";
                case 10: return numberValue.toString(10);
                case 16: return "0x" + numberValue.toString(16);
                default: return null;
            }
        },
    },
    csharp: {
        matchers: [
            makeMatcher(["_"], /^([0-9]+)$/, 10),
            makeMatcher(["_"], /^0[xX]([0-9a-fA-F]+)$/, 16),
            makeMatcher(["_"], /^0[bB]([01]+)$/, 2),
        ],
        baseOutput(numberValue, base) {
            switch (base) {
                case 2: return "0b" + numberValue.toString(2);
                case 10: return numberValue.toString(10);
                case 16: return "0x" + numberValue.toString(16);
                default: return null;
            }
        },
    },
};
const EquivalentLanguages: { [language: string]: string } = {
    "c": "cpp",
};

export async function convertVsCodeSelectionTo(targetBase: number) {
    // where are we right now?
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
        return;
    }

    // pick the correct language
    // Python is our fallback
    let editorLanguage = editor.document.languageId;
    let language = "python";

    // process equivalences first
    if (Object.keys(EquivalentLanguages).includes(editorLanguage)) {
        editorLanguage = EquivalentLanguages[editorLanguage];
    }

    // check if we support the (possibly equivalent) language
    if (Object.keys(SupportedLanguages).includes(editorLanguage)) {
        language = editorLanguage;
    }

    // support multiple selections
    for (const selection of editor.selections) {
        // always replace the whole word
        const wordSelection = editor.document.getWordRangeAtPosition(selection.start);
        if (wordSelection === undefined) {
            continue;
        }

        // get the text in the selection and try to convert it
        const selectionText = editor.document.getText(wordSelection);
        const converted = convertTo(selectionText, language, targetBase);
        if (converted === null) {
            continue;
        }

        // dump the conversion into the document
        await editor.edit(editBuilder => {
            editBuilder.replace(wordSelection, converted);
        });
    }
}

function convertTo(numberString: string, language: string, targetBase: number): string|null {
    assertBaseIsInteger(targetBase);
    const languageDef = SupportedLanguages[language];
    if (languageDef === undefined) {
        throw new RangeError("language is not known");
    }

    for (const matcher of languageDef.matchers) {
        const numberValue = matcher(numberString);
        if (numberValue === null) {
            continue;
        }
        // if the base output function returns null, the language doesn't support that base
        // it doesn't make sense trying the other matchers
        return languageDef.baseOutput(numberValue, targetBase);
    }
    return null;
}
