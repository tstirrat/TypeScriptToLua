"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const ts = require("typescript");
const CompilerOptions_1 = require("./CompilerOptions");
const diagnosticFactories = require("./diagnostics");
const optionDeclarations = [
    {
        name: "luaLibImport",
        description: "Specifies how js standard features missing in lua are imported.",
        type: "enum",
        choices: Object.values(CompilerOptions_1.LuaLibImportKind),
    },
    {
        name: "luaTarget",
        aliases: ["lt"],
        description: "Specify Lua target version.",
        type: "enum",
        choices: Object.values(CompilerOptions_1.LuaTarget),
    },
    {
        name: "noHeader",
        description: "Specify if a header will be added to compiled files.",
        type: "boolean",
    },
    {
        name: "noHoisting",
        description: "Disables hoisting.",
        type: "boolean",
    },
    {
        name: "sourceMapTraceback",
        description: "Applies the source map to show source TS files and lines in error tracebacks.",
        type: "boolean",
    },
];
exports.version = `Version ${require("../package.json").version}`;
const helpString = `
Syntax:   tstl [options] [files...]

Examples: tstl path/to/file.ts [...]
          tstl -p path/to/tsconfig.json

In addition to the options listed below you can also pass options
for the typescript compiler (For a list of options use tsc -h).
Some tsc options might have no effect.
`.trim();
function getHelpString() {
    let result = helpString + "\n\n";
    result += "Options:\n";
    for (const option of optionDeclarations) {
        const aliasStrings = (option.aliases || []).map(a => "-" + a);
        const optionString = aliasStrings.concat(["--" + option.name]).join("|");
        const valuesHint = option.type === "enum" ? option.choices.join("|") : option.type;
        const spacing = " ".repeat(Math.max(1, 45 - optionString.length - valuesHint.length));
        result += `\n ${optionString} <${valuesHint}>${spacing}${option.description}\n`;
    }
    return result;
}
exports.getHelpString = getHelpString;
function updateParsedConfigFile(parsedConfigFile) {
    let hasRootLevelOptions = false;
    for (const key in parsedConfigFile.raw) {
        const option = optionDeclarations.find(option => option.name === key);
        if (!option)
            continue;
        if (parsedConfigFile.raw.tstl === undefined)
            parsedConfigFile.raw.tstl = {};
        parsedConfigFile.raw.tstl[key] = parsedConfigFile.raw[key];
        hasRootLevelOptions = true;
    }
    if (parsedConfigFile.raw.tstl) {
        if (hasRootLevelOptions) {
            parsedConfigFile.errors.push(diagnosticFactories.tstlOptionsAreMovingToTheTstlObject(parsedConfigFile.raw.tstl));
        }
        for (const key in parsedConfigFile.raw.tstl) {
            const option = optionDeclarations.find(option => option.name === key);
            if (!option) {
                parsedConfigFile.errors.push(diagnosticFactories.unknownCompilerOption(key));
                continue;
            }
            const { error, value } = readValue(option, parsedConfigFile.raw.tstl[key]);
            if (error)
                parsedConfigFile.errors.push(error);
            if (parsedConfigFile.options[key] === undefined)
                parsedConfigFile.options[key] = value;
        }
    }
    return parsedConfigFile;
}
exports.updateParsedConfigFile = updateParsedConfigFile;
function parseCommandLine(args) {
    return updateParsedCommandLine(ts.parseCommandLine(args), args);
}
exports.parseCommandLine = parseCommandLine;
function updateParsedCommandLine(parsedCommandLine, args) {
    for (let i = 0; i < args.length; i++) {
        if (!args[i].startsWith("-"))
            continue;
        const isShorthand = !args[i].startsWith("--");
        const argumentName = args[i].substr(isShorthand ? 1 : 2);
        const option = optionDeclarations.find(option => {
            if (option.name.toLowerCase() === argumentName.toLowerCase())
                return true;
            if (isShorthand && option.aliases) {
                return option.aliases.some(a => a.toLowerCase() === argumentName.toLowerCase());
            }
            return false;
        });
        if (option) {
            // Ignore errors caused by tstl specific compiler options
            const tsInvalidCompilerOptionErrorCode = 5023;
            parsedCommandLine.errors = parsedCommandLine.errors.filter(error => {
                return !(error.code === tsInvalidCompilerOptionErrorCode &&
                    String(error.messageText).endsWith(`'${args[i]}'.`));
            });
            const { error, value, increment } = readCommandLineArgument(option, args[i + 1]);
            if (error)
                parsedCommandLine.errors.push(error);
            parsedCommandLine.options[option.name] = value;
            i += increment;
        }
    }
    return parsedCommandLine;
}
function readCommandLineArgument(option, value) {
    if (option.type === "boolean") {
        if (value === "true" || value === "false") {
            value = value === "true";
        }
        else {
            // Set boolean arguments without supplied value to true
            return { value: true, increment: 0 };
        }
    }
    if (value === undefined) {
        return {
            error: diagnosticFactories.compilerOptionExpectsAnArgument(option.name),
            value: undefined,
            increment: 0,
        };
    }
    return Object.assign({}, readValue(option, value), { increment: 1 });
}
function readValue(option, value) {
    if (value === null)
        return { value };
    switch (option.type) {
        case "boolean": {
            if (typeof value !== "boolean") {
                return {
                    value: undefined,
                    error: diagnosticFactories.compilerOptionRequiresAValueOfType(option.name, "boolean"),
                };
            }
            return { value };
        }
        case "enum": {
            if (typeof value !== "string") {
                return {
                    value: undefined,
                    error: diagnosticFactories.compilerOptionRequiresAValueOfType(option.name, "string"),
                };
            }
            const enumValue = option.choices.find(c => c.toLowerCase() === value.toLowerCase());
            if (enumValue === undefined) {
                const optionChoices = option.choices.join(", ");
                return {
                    value: undefined,
                    error: diagnosticFactories.argumentForOptionMustBe(`--${option.name}`, optionChoices),
                };
            }
            return { value: enumValue };
        }
    }
}
function parseConfigFileWithSystem(configFileName, commandLineOptions, system = ts.sys) {
    const parsedConfigFile = ts.parseJsonSourceFileConfigFileContent(ts.readJsonConfigFile(configFileName, system.readFile), system, path.dirname(configFileName), commandLineOptions, configFileName);
    return updateParsedConfigFile(parsedConfigFile);
}
exports.parseConfigFileWithSystem = parseConfigFileWithSystem;
function createDiagnosticReporter(pretty, system = ts.sys) {
    const reporter = ts.createDiagnosticReporter(system, pretty);
    return diagnostic => {
        if (diagnostic.source === "typescript-to-lua") {
            diagnostic = Object.assign({}, diagnostic, { code: ("TL" + diagnostic.code) });
        }
        reporter(diagnostic);
    };
}
exports.createDiagnosticReporter = createDiagnosticReporter;
//# sourceMappingURL=CommandLineParser.js.map