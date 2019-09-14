#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const ts = require("typescript");
const tstl = require(".");
const CommandLineParser = require("./CommandLineParser");
const diagnosticFactories = require("./diagnostics");
const WowCustomTransformer_1 = require("./WowCustomTransformer");
function createWatchStatusReporter(options) {
    return ts.createWatchStatusReporter(ts.sys, shouldBePretty(options));
}
function shouldBePretty(options) {
    return !options || options.pretty === undefined
        ? ts.sys.writeOutputIsTTY !== undefined && ts.sys.writeOutputIsTTY()
        : Boolean(options.pretty);
}
let reportDiagnostic = tstl.createDiagnosticReporter(false);
function updateReportDiagnostic(options) {
    reportDiagnostic = tstl.createDiagnosticReporter(shouldBePretty(options));
}
function locateConfigFile(commandLine) {
    const { project } = commandLine.options;
    if (!project) {
        if (commandLine.fileNames.length === 0) {
            const searchPath = path.posix.normalize(ts.sys.getCurrentDirectory());
            return ts.findConfigFile(searchPath, ts.sys.fileExists);
        }
        return;
    }
    if (commandLine.fileNames.length !== 0) {
        reportDiagnostic(diagnosticFactories.optionProjectCannotBeMixedWithSourceFilesOnACommandLine());
        ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
        return;
    }
    let fileOrDirectory = path.posix.normalize(project);
    if (!path.isAbsolute(fileOrDirectory)) {
        fileOrDirectory = path.posix.join(ts.sys.getCurrentDirectory(), fileOrDirectory);
    }
    if (!fileOrDirectory || ts.sys.directoryExists(fileOrDirectory)) {
        const configFileName = path.posix.join(fileOrDirectory, "tsconfig.json");
        if (ts.sys.fileExists(configFileName)) {
            return configFileName;
        }
        else {
            reportDiagnostic(diagnosticFactories.cannotFindATsconfigJsonAtTheSpecifiedDirectory(project));
            ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
        }
    }
    else {
        if (ts.sys.fileExists(fileOrDirectory)) {
            return fileOrDirectory;
        }
        else {
            reportDiagnostic(diagnosticFactories.theSpecifiedPathDoesNotExist(project));
            ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
        }
    }
}
function executeCommandLine(args) {
    if (args.length > 0 && args[0].startsWith("-")) {
        const firstOption = args[0].slice(args[0].startsWith("--") ? 2 : 1).toLowerCase();
        if (firstOption === "build" || firstOption === "b") {
            return performBuild(args.slice(1));
        }
    }
    const commandLine = CommandLineParser.parseCommandLine(args);
    if (commandLine.options.build) {
        reportDiagnostic(diagnosticFactories.optionBuildMustBeFirstCommandLineArgument());
        return ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
    }
    // TODO: ParsedCommandLine.errors isn't meant to contain warnings. Once root-level options
    // support would be dropped it should be changed to `commandLine.errors.length > 0`.
    if (commandLine.errors.some(e => e.category === ts.DiagnosticCategory.Error)) {
        commandLine.errors.forEach(reportDiagnostic);
        return ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
    }
    if (commandLine.options.version) {
        console.log(CommandLineParser.version);
        return ts.sys.exit(ts.ExitStatus.Success);
    }
    if (commandLine.options.help) {
        console.log(CommandLineParser.version);
        console.log(CommandLineParser.getHelpString());
        return ts.sys.exit(ts.ExitStatus.Success);
    }
    const configFileName = locateConfigFile(commandLine);
    const commandLineOptions = commandLine.options;
    if (configFileName) {
        const configParseResult = CommandLineParser.parseConfigFileWithSystem(configFileName, commandLineOptions);
        updateReportDiagnostic(configParseResult.options);
        if (configParseResult.options.watch) {
            createWatchOfConfigFile(configFileName, commandLineOptions);
        }
        else {
            performCompilation(configParseResult.fileNames, configParseResult.projectReferences, configParseResult.options, ts.getConfigFileParsingDiagnostics(configParseResult));
        }
    }
    else {
        updateReportDiagnostic(commandLineOptions);
        if (commandLineOptions.watch) {
            createWatchOfFilesAndCompilerOptions(commandLine.fileNames, commandLineOptions);
        }
        else {
            performCompilation(commandLine.fileNames, commandLine.projectReferences, commandLineOptions);
        }
    }
}
function performBuild(_args) {
    console.log("Option '--build' is not supported.");
    return ts.sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
}
function performCompilation(rootNames, projectReferences, options, configFileParsingDiagnostics) {
    const program = ts.createProgram({
        rootNames,
        options,
        projectReferences,
        configFileParsingDiagnostics,
    });
    const transformer = new WowCustomTransformer_1.CustomTransformer(program);
    const { transpiledFiles, diagnostics: transpileDiagnostics } = tstl.transpile({ program, transformer });
    const diagnostics = ts.sortAndDeduplicateDiagnostics([
        ...ts.getPreEmitDiagnostics(program),
        ...transpileDiagnostics,
    ]);
    const emitResult = tstl.emitTranspiledFiles(options, transpiledFiles);
    emitResult.forEach(({ name, text }) => ts.sys.writeFile(name, text));
    diagnostics.forEach(reportDiagnostic);
    const exitCode = diagnostics.length === 0
        ? ts.ExitStatus.Success
        : transpiledFiles.length === 0
            ? ts.ExitStatus.DiagnosticsPresent_OutputsSkipped
            : ts.ExitStatus.DiagnosticsPresent_OutputsGenerated;
    return ts.sys.exit(exitCode);
}
function createWatchOfConfigFile(configFileName, optionsToExtend) {
    const watchCompilerHost = ts.createWatchCompilerHost(configFileName, optionsToExtend, ts.sys, ts.createSemanticDiagnosticsBuilderProgram, undefined, createWatchStatusReporter(optionsToExtend));
    updateWatchCompilationHost(watchCompilerHost, optionsToExtend);
    ts.createWatchProgram(watchCompilerHost);
}
function createWatchOfFilesAndCompilerOptions(rootFiles, options) {
    const watchCompilerHost = ts.createWatchCompilerHost(rootFiles, options, ts.sys, ts.createSemanticDiagnosticsBuilderProgram, undefined, createWatchStatusReporter(options));
    updateWatchCompilationHost(watchCompilerHost, options);
    ts.createWatchProgram(watchCompilerHost);
}
function updateWatchCompilationHost(host, optionsToExtend) {
    let fullRecompile = true;
    const configFileMap = new WeakMap();
    host.afterProgramCreate = builderProgram => {
        const program = builderProgram.getProgram();
        const options = builderProgram.getCompilerOptions();
        let configFileParsingDiagnostics = [];
        const configFile = options.configFile;
        const configFilePath = options.configFilePath;
        if (configFile && configFilePath) {
            if (!configFileMap.has(configFile)) {
                const parsedConfigFile = CommandLineParser.updateParsedConfigFile(ts.parseJsonSourceFileConfigFileContent(configFile, ts.sys, path.dirname(configFilePath), optionsToExtend, configFilePath));
                configFileMap.set(configFile, parsedConfigFile);
            }
            const parsedConfigFile = configFileMap.get(configFile);
            Object.assign(options, parsedConfigFile.options);
            configFileParsingDiagnostics = parsedConfigFile.errors;
        }
        let sourceFiles;
        if (!fullRecompile) {
            sourceFiles = [];
            while (true) {
                const currentFile = builderProgram.getSemanticDiagnosticsOfNextAffectedFile();
                if (!currentFile)
                    break;
                if ("fileName" in currentFile.affected) {
                    sourceFiles.push(currentFile.affected);
                }
                else {
                    sourceFiles.push(...currentFile.affected.getSourceFiles());
                }
            }
        }
        const transformer = new WowCustomTransformer_1.CustomTransformer(program);
        const { diagnostics: emitDiagnostics, transpiledFiles } = tstl.transpile({ program, transformer, sourceFiles });
        const emitResult = tstl.emitTranspiledFiles(options, transpiledFiles);
        emitResult.forEach(({ name, text }) => ts.sys.writeFile(name, text));
        const diagnostics = ts.sortAndDeduplicateDiagnostics([
            ...configFileParsingDiagnostics,
            ...program.getOptionsDiagnostics(),
            ...program.getSyntacticDiagnostics(),
            ...program.getGlobalDiagnostics(),
            ...program.getSemanticDiagnostics(),
            ...emitDiagnostics,
        ]);
        diagnostics.forEach(reportDiagnostic);
        const errors = diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error);
        // do a full recompile after an error
        fullRecompile = errors.length > 0;
        host.onWatchStatusChange(diagnosticFactories.watchErrorSummary(errors.length), host.getNewLine(), options);
    };
}
if (ts.sys.setBlocking)
    ts.sys.setBlocking();
executeCommandLine(ts.sys.args);
//# sourceMappingURL=tstl.js.map