"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const CompilerOptions_1 = require("./CompilerOptions");
const TranspileError_1 = require("./TranspileError");
const getLuaTargetName = (version) => (version === CompilerOptions_1.LuaTarget.LuaJIT ? "LuaJIT" : `Lua ${version}`);
exports.CouldNotCast = (castName) => new Error(`Failed to cast all elements to expected type using ${castName}.`);
exports.ForbiddenForIn = (node) => new TranspileError_1.TranspileError(`Iterating over arrays with 'for ... in' is not allowed.`, node);
exports.ForbiddenLuaTableNonDeclaration = (node) => new TranspileError_1.TranspileError(`Classes with the '@luaTable' decorator must be declared.`, node);
exports.InvalidExtendsLuaTable = (node) => new TranspileError_1.TranspileError(`Cannot extend classes with the decorator '@luaTable'.`, node);
exports.InvalidInstanceOfLuaTable = (node) => new TranspileError_1.TranspileError(`The instanceof operator cannot be used with a '@luaTable' class.`, node);
exports.ForbiddenLuaTableUseException = (description, node) => new TranspileError_1.TranspileError(`Invalid @luaTable usage: ${description}`, node);
exports.InvalidDecoratorArgumentNumber = (name, got, expected, node) => new TranspileError_1.TranspileError(`${name} expects ${expected} argument(s) but got ${got}.`, node);
exports.InvalidDecoratorContext = (node) => new TranspileError_1.TranspileError(`Decorator function cannot have 'this: void'.`, node);
exports.InvalidExtensionMetaExtension = (node) => new TranspileError_1.TranspileError(`Cannot use both '@extension' and '@metaExtension' decorators on the same class.`, node);
exports.InvalidNewExpressionOnExtension = (node) => new TranspileError_1.TranspileError(`Cannot construct classes with decorator '@extension' or '@metaExtension'.`, node);
exports.InvalidExportDeclaration = (declaration) => new TranspileError_1.TranspileError("Encountered invalid export declaration without exports and without module.", declaration);
exports.InvalidExtendsExtension = (node) => new TranspileError_1.TranspileError(`Cannot extend classes with decorator '@extension' or '@metaExtension'.`, node);
exports.InvalidExportsExtension = (node) => new TranspileError_1.TranspileError(`Cannot export classes with decorator '@extension' or '@metaExtension'.`, node);
exports.InvalidInstanceOfExtension = (node) => new TranspileError_1.TranspileError(`Cannot use instanceof on classes with decorator '@extension' or '@metaExtension'.`, node);
exports.InvalidJsonFileContent = (node) => new TranspileError_1.TranspileError("Invalid JSON file content", node);
exports.InvalidPropertyCall = (node) => new TranspileError_1.TranspileError(`Tried to transpile a non-property call as property call.`, node);
exports.InvalidElementCall = (node) => new TranspileError_1.TranspileError(`Tried to transpile a non-element call as an element call.`, node);
exports.InvalidThrowExpression = (node) => new TranspileError_1.TranspileError(`Invalid throw expression, only strings can be thrown.`, node);
exports.ForbiddenStaticClassPropertyName = (node, name) => new TranspileError_1.TranspileError(`Cannot use "${name}" as a static class property or method name.`, node);
exports.MissingClassName = (node) => new TranspileError_1.TranspileError(`Class declarations must have a name.`, node);
exports.MissingForOfVariables = (node) => new TranspileError_1.TranspileError("Transpiled ForOf variable declaration list contains no declarations.", node);
exports.MissingFunctionName = (declaration) => new TranspileError_1.TranspileError("Unsupported function declaration without name.", declaration);
exports.MissingMetaExtension = (node) => new TranspileError_1.TranspileError(`@metaExtension requires the extension of the metatable class.`, node);
exports.NonFlattenableDestructure = (node) => new TranspileError_1.TranspileError(`This node cannot be destructured using a standard Lua assignment statement.`, node);
exports.UndefinedFunctionDefinition = (functionSymbolId) => new Error(`Function definition for function symbol ${functionSymbolId} is undefined.`);
exports.UnsupportedForInVariable = (initializer) => new TranspileError_1.TranspileError(`Unsuppored for-in variable kind.`, initializer);
exports.UndefinedScope = () => new Error("Expected to pop a scope, but found undefined.");
exports.UndefinedTypeNode = (node) => new TranspileError_1.TranspileError("Failed to resolve required type node.", node);
exports.UnknownSuperType = (node) => new TranspileError_1.TranspileError("Unable to resolve type of super expression.", node);
exports.UnsupportedImportType = (node) => new TranspileError_1.TranspileError(`Unsupported import type.`, node);
exports.UnsupportedKind = (description, kind, node) => new TranspileError_1.TranspileError(`Unsupported ${description} kind: ${ts.SyntaxKind[kind]}`, node);
exports.UnsupportedProperty = (parentName, property, node) => new TranspileError_1.TranspileError(`Unsupported property on ${parentName}: ${property}`, node);
exports.UnsupportedForTarget = (functionality, version, node) => new TranspileError_1.TranspileError(`${functionality} is/are not supported for target ${getLuaTargetName(version)}.`, node);
exports.UnsupportedFunctionWithoutBody = (node) => new TranspileError_1.TranspileError("Functions with undefined bodies are not supported.", node);
exports.UnsupportedNoSelfFunctionConversion = (node, name) => {
    if (name) {
        return new TranspileError_1.TranspileError(`Unable to convert function with a 'this' parameter to function "${name}" with no 'this'. ` +
            `To fix, wrap in an arrow function, or declare with 'this: void'.`, node);
    }
    else {
        return new TranspileError_1.TranspileError(`Unable to convert function with a 'this' parameter to function with no 'this'. ` +
            `To fix, wrap in an arrow function, or declare with 'this: void'.`, node);
    }
};
exports.UnsupportedSelfFunctionConversion = (node, name) => {
    if (name) {
        return new TranspileError_1.TranspileError(`Unable to convert function with no 'this' parameter to function "${name}" with 'this'. ` +
            `To fix, wrap in an arrow function or declare with 'this: any'.`, node);
    }
    else {
        return new TranspileError_1.TranspileError(`Unable to convert function with no 'this' parameter to function with 'this'. ` +
            `To fix, wrap in an arrow function or declare with 'this: any'.`, node);
    }
};
exports.UnsupportedOverloadAssignment = (node, name) => {
    if (name) {
        return new TranspileError_1.TranspileError(`Unsupported assignment of function with different overloaded types for 'this' to "${name}". ` +
            `Overloads should all have the same type for 'this'.`, node);
    }
    else {
        return new TranspileError_1.TranspileError(`Unsupported assignment of function with different overloaded types for 'this'. ` +
            `Overloads should all have the same type for 'this'.`, node);
    }
};
exports.UnsupportedNonDestructuringLuaIterator = (node) => {
    return new TranspileError_1.TranspileError("Unsupported use of lua iterator with TupleReturn decorator in for...of statement. " +
        "You must use a destructuring statement to catch results from a lua iterator with " +
        "the TupleReturn decorator.", node);
};
exports.UnresolvableRequirePath = (node, reason, path) => {
    return new TranspileError_1.TranspileError(`${reason}. ` + `TypeScript path: ${path}.`, node);
};
exports.ReferencedBeforeDeclaration = (node) => {
    return new TranspileError_1.TranspileError(`Identifier "${node.text}" was referenced before it was declared. The declaration ` +
        "must be moved before the identifier's use, or hoisting must be enabled.", node);
};
exports.UnsupportedObjectDestructuringInForOf = (node) => {
    return new TranspileError_1.TranspileError(`Unsupported object destructuring in for...of statement.`, node);
};
exports.InvalidAmbientIdentifierName = (node) => {
    return new TranspileError_1.TranspileError(`Invalid ambient identifier name "${node.text}". Ambient identifiers must be valid lua identifiers.`, node);
};
exports.InvalidForRangeCall = (node, message) => {
    return new TranspileError_1.TranspileError(`Invalid @forRange call: ${message}`, node);
};
//# sourceMappingURL=TSTLErrors.js.map