"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const path = require("path");
const Decorator_1 = require("./Decorator");
const tstl = require("./LuaAST");
const TSTLErrors = require("./TSTLErrors");
var ContextType;
(function (ContextType) {
    ContextType[ContextType["None"] = 0] = "None";
    ContextType[ContextType["Void"] = 1] = "Void";
    ContextType[ContextType["NonVoid"] = 2] = "NonVoid";
    ContextType[ContextType["Mixed"] = 3] = "Mixed";
})(ContextType = exports.ContextType || (exports.ContextType = {}));
const defaultArrayCallMethodNames = new Set([
    "concat",
    "push",
    "reverse",
    "shift",
    "unshift",
    "sort",
    "pop",
    "forEach",
    "indexOf",
    "map",
    "filter",
    "some",
    "every",
    "slice",
    "splice",
    "join",
    "flat",
    "flatMap",
]);
function getExtendedTypeNode(node, checker) {
    if (node && node.heritageClauses) {
        for (const clause of node.heritageClauses) {
            if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
                const superType = checker.getTypeAtLocation(clause.types[0]);
                const decorators = getCustomDecorators(superType, checker);
                if (!decorators.has(Decorator_1.DecoratorKind.PureAbstract)) {
                    return clause.types[0];
                }
            }
        }
    }
    return undefined;
}
exports.getExtendedTypeNode = getExtendedTypeNode;
function getExtendedType(node, checker) {
    const extendedTypeNode = getExtendedTypeNode(node, checker);
    return extendedTypeNode && checker.getTypeAtLocation(extendedTypeNode);
}
exports.getExtendedType = getExtendedType;
function isAssignmentPattern(node) {
    return ts.isObjectLiteralExpression(node) || ts.isArrayLiteralExpression(node);
}
exports.isAssignmentPattern = isAssignmentPattern;
function isDestructuringAssignment(node) {
    return (ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        isAssignmentPattern(node.left));
}
exports.isDestructuringAssignment = isDestructuringAssignment;
function getExportable(exportSpecifiers, resolver) {
    return exportSpecifiers.elements.filter(exportSpecifier => resolver.isValueAliasDeclaration(exportSpecifier));
}
exports.getExportable = getExportable;
function isDefaultExportSpecifier(node) {
    return ((node.name !== undefined && node.name.originalKeywordKind === ts.SyntaxKind.DefaultKeyword) ||
        (node.propertyName !== undefined && node.propertyName.originalKeywordKind === ts.SyntaxKind.DefaultKeyword));
}
exports.isDefaultExportSpecifier = isDefaultExportSpecifier;
function hasDefaultExportModifier(modifiers) {
    return modifiers ? modifiers.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword) : false;
}
exports.hasDefaultExportModifier = hasDefaultExportModifier;
function shouldResolveModulePath(moduleSpecifier, checker) {
    const moduleOwnerSymbol = checker.getSymbolAtLocation(moduleSpecifier);
    if (moduleOwnerSymbol) {
        const decorators = new Map();
        collectCustomDecorators(moduleOwnerSymbol, checker, decorators);
        if (decorators.has(Decorator_1.DecoratorKind.NoResolution)) {
            return false;
        }
    }
    return true;
}
exports.shouldResolveModulePath = shouldResolveModulePath;
function shouldBeImported(importNode, checker, resolver) {
    const decorators = getCustomDecorators(checker.getTypeAtLocation(importNode), checker);
    return (resolver.isReferencedAliasDeclaration(importNode) &&
        !decorators.has(Decorator_1.DecoratorKind.Extension) &&
        !decorators.has(Decorator_1.DecoratorKind.MetaExtension));
}
exports.shouldBeImported = shouldBeImported;
function isFileModule(sourceFile) {
    return sourceFile.statements.some(isStatementExported);
}
exports.isFileModule = isFileModule;
function isStatementExported(statement) {
    if (ts.isExportAssignment(statement) || ts.isExportDeclaration(statement)) {
        return true;
    }
    if (ts.isVariableStatement(statement)) {
        return statement.declarationList.declarations.some(declaration => (ts.getCombinedModifierFlags(declaration) & ts.ModifierFlags.Export) !== 0);
    }
    return isDeclaration(statement) && (ts.getCombinedModifierFlags(statement) & ts.ModifierFlags.Export) !== 0;
}
exports.isStatementExported = isStatementExported;
function getExportedSymbolDeclaration(symbol) {
    const declarations = symbol.getDeclarations();
    if (declarations) {
        return declarations.find(d => (ts.getCombinedModifierFlags(d) & ts.ModifierFlags.Export) !== 0);
    }
    return undefined;
}
exports.getExportedSymbolDeclaration = getExportedSymbolDeclaration;
function isDeclaration(node) {
    return (ts.isEnumDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isExportDeclaration(node) ||
        ts.isImportDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isModuleDeclaration(node) ||
        ts.isFunctionDeclaration(node) ||
        ts.isVariableDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isNamespaceExportDeclaration(node));
}
exports.isDeclaration = isDeclaration;
function isInDestructingAssignment(node) {
    return (node.parent &&
        ((ts.isVariableDeclaration(node.parent) && ts.isArrayBindingPattern(node.parent.name)) ||
            (ts.isBinaryExpression(node.parent) && ts.isArrayLiteralExpression(node.parent.left))));
}
exports.isInDestructingAssignment = isInDestructingAssignment;
// iterate over a type and its bases until the callback returns true.
function forTypeOrAnySupertype(type, checker, predicate) {
    if (predicate(type)) {
        return true;
    }
    if (!type.isClassOrInterface() && type.symbol) {
        type = checker.getDeclaredTypeOfSymbol(type.symbol);
    }
    const superTypes = type.getBaseTypes();
    if (superTypes) {
        for (const superType of superTypes) {
            if (forTypeOrAnySupertype(superType, checker, predicate)) {
                return true;
            }
        }
    }
    return false;
}
exports.forTypeOrAnySupertype = forTypeOrAnySupertype;
function isAmbientNode(node) {
    return !((ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Ambient) === 0);
}
exports.isAmbientNode = isAmbientNode;
function isStaticNode(node) {
    return node.modifiers !== undefined && node.modifiers.some(m => m.kind === ts.SyntaxKind.StaticKeyword);
}
exports.isStaticNode = isStaticNode;
function isTypeWithFlags(type, flags, checker, program) {
    if (type.symbol) {
        const baseConstraint = checker.getBaseConstraintOfType(type);
        if (baseConstraint && baseConstraint !== type) {
            return isTypeWithFlags(baseConstraint, flags, checker, program);
        }
    }
    if (type.isUnion()) {
        return type.types.every(t => isTypeWithFlags(t, flags, checker, program));
    }
    if (type.isIntersection()) {
        return type.types.some(t => isTypeWithFlags(t, flags, checker, program));
    }
    return (type.flags & flags) !== 0;
}
exports.isTypeWithFlags = isTypeWithFlags;
function isStringType(type, checker, program) {
    return isTypeWithFlags(type, ts.TypeFlags.String | ts.TypeFlags.StringLike | ts.TypeFlags.StringLiteral, checker, program);
}
exports.isStringType = isStringType;
function isNumberType(type, checker, program) {
    return isTypeWithFlags(type, ts.TypeFlags.Number | ts.TypeFlags.NumberLike | ts.TypeFlags.NumberLiteral, checker, program);
}
exports.isNumberType = isNumberType;
function isExplicitArrayType(type, checker, program) {
    if (type.symbol) {
        const baseConstraint = checker.getBaseConstraintOfType(type);
        if (baseConstraint && baseConstraint !== type) {
            return isExplicitArrayType(baseConstraint, checker, program);
        }
    }
    if (type.isUnionOrIntersection()) {
        return type.types.some(t => isExplicitArrayType(t, checker, program));
    }
    const flags = ts.NodeBuilderFlags.InTypeAlias | ts.NodeBuilderFlags.AllowEmptyTuple;
    let typeNode = checker.typeToTypeNode(type, undefined, flags);
    if (typeNode && ts.isTypeOperatorNode(typeNode) && typeNode.operator === ts.SyntaxKind.ReadonlyKeyword) {
        typeNode = typeNode.type;
    }
    return typeNode !== undefined && (ts.isArrayTypeNode(typeNode) || ts.isTupleTypeNode(typeNode));
}
exports.isExplicitArrayType = isExplicitArrayType;
function isFunctionType(type, checker) {
    const typeNode = checker.typeToTypeNode(type, undefined, ts.NodeBuilderFlags.InTypeAlias);
    return typeNode !== undefined && ts.isFunctionTypeNode(typeNode);
}
exports.isFunctionType = isFunctionType;
function isFunctionTypeAtLocation(node, checker) {
    const type = checker.getTypeAtLocation(node);
    return isFunctionType(type, checker);
}
exports.isFunctionTypeAtLocation = isFunctionTypeAtLocation;
function isArrayType(type, checker, program) {
    return forTypeOrAnySupertype(type, checker, t => isExplicitArrayType(t, checker, program));
}
exports.isArrayType = isArrayType;
function isLuaIteratorType(node, checker) {
    const type = checker.getTypeAtLocation(node);
    return getCustomDecorators(type, checker).has(Decorator_1.DecoratorKind.LuaIterator);
}
exports.isLuaIteratorType = isLuaIteratorType;
function isRestParameter(node, checker) {
    const symbol = checker.getSymbolAtLocation(node);
    if (!symbol) {
        return false;
    }
    const declarations = symbol.getDeclarations();
    if (!declarations) {
        return false;
    }
    return declarations.some(d => ts.isParameter(d) && d.dotDotDotToken !== undefined);
}
exports.isRestParameter = isRestParameter;
function isVarArgType(node, checker) {
    const type = checker.getTypeAtLocation(node);
    return type !== undefined && getCustomDecorators(type, checker).has(Decorator_1.DecoratorKind.Vararg);
}
exports.isVarArgType = isVarArgType;
function isForRangeType(node, checker) {
    const type = checker.getTypeAtLocation(node);
    return getCustomDecorators(type, checker).has(Decorator_1.DecoratorKind.ForRange);
}
exports.isForRangeType = isForRangeType;
function isTupleReturnCall(node, checker) {
    if (ts.isCallExpression(node)) {
        const signature = checker.getResolvedSignature(node);
        if (signature) {
            if (getCustomSignatureDirectives(signature, checker).has(Decorator_1.DecoratorKind.TupleReturn)) {
                return true;
            }
            // Only check function type for directive if it is declared as an interface or type alias
            const declaration = signature.getDeclaration();
            const isInterfaceOrAlias = declaration &&
                declaration.parent &&
                ((ts.isInterfaceDeclaration(declaration.parent) && ts.isCallSignatureDeclaration(declaration)) ||
                    ts.isTypeAliasDeclaration(declaration.parent));
            if (!isInterfaceOrAlias) {
                return false;
            }
        }
        const type = checker.getTypeAtLocation(node.expression);
        return getCustomDecorators(type, checker).has(Decorator_1.DecoratorKind.TupleReturn);
    }
    else {
        return false;
    }
}
exports.isTupleReturnCall = isTupleReturnCall;
function isInTupleReturnFunction(node, checker) {
    const declaration = findFirstNodeAbove(node, ts.isFunctionLike);
    if (declaration) {
        let functionType;
        if (ts.isFunctionExpression(declaration) || ts.isArrowFunction(declaration)) {
            functionType = inferAssignedType(declaration, checker);
        }
        else if (ts.isMethodDeclaration(declaration) && ts.isObjectLiteralExpression(declaration.parent)) {
            // Manually lookup type for object literal properties declared with method syntax
            const interfaceType = inferAssignedType(declaration.parent, checker);
            const propertySymbol = interfaceType.getProperty(declaration.name.getText());
            if (propertySymbol) {
                functionType = checker.getTypeOfSymbolAtLocation(propertySymbol, declaration);
            }
        }
        if (functionType === undefined) {
            functionType = checker.getTypeAtLocation(declaration);
        }
        // Check all overloads for directive
        const signatures = functionType.getCallSignatures();
        if (signatures &&
            signatures.some(s => getCustomSignatureDirectives(s, checker).has(Decorator_1.DecoratorKind.TupleReturn))) {
            return true;
        }
        const decorators = getCustomDecorators(functionType, checker);
        return decorators.has(Decorator_1.DecoratorKind.TupleReturn);
    }
    else {
        return false;
    }
}
exports.isInTupleReturnFunction = isInTupleReturnFunction;
function getContainingFunctionReturnType(node, checker) {
    const declaration = findFirstNodeAbove(node, ts.isFunctionLike);
    if (declaration) {
        const signature = checker.getSignatureFromDeclaration(declaration);
        return signature === undefined ? undefined : checker.getReturnTypeOfSignature(signature);
    }
    return undefined;
}
exports.getContainingFunctionReturnType = getContainingFunctionReturnType;
function collectCustomDecorators(source, checker, decMap) {
    const comments = source.getDocumentationComment(checker);
    const decorators = comments
        .filter(comment => comment.kind === "text")
        .map(comment => comment.text.split("\n"))
        .reduce((a, b) => a.concat(b), [])
        .map(line => line.trim())
        .filter(comment => comment[0] === "!");
    decorators.forEach(decStr => {
        const [decoratorName, ...decoratorArguments] = decStr.split(" ");
        if (Decorator_1.Decorator.isValid(decoratorName.substr(1))) {
            const dec = new Decorator_1.Decorator(decoratorName.substr(1), decoratorArguments);
            decMap.set(dec.kind, dec);
            console.warn(`[Deprecated] Decorators with ! are being deprecated, ` + `use @${decStr.substr(1)} instead`);
        }
        else {
            console.warn(`Encountered unknown decorator ${decStr}.`);
        }
    });
    source.getJsDocTags().forEach(tag => {
        if (Decorator_1.Decorator.isValid(tag.name)) {
            const dec = new Decorator_1.Decorator(tag.name, tag.text ? tag.text.split(" ") : []);
            decMap.set(dec.kind, dec);
        }
    });
}
exports.collectCustomDecorators = collectCustomDecorators;
function getCustomDecorators(type, checker) {
    const decMap = new Map();
    if (type.symbol) {
        collectCustomDecorators(type.symbol, checker, decMap);
    }
    if (type.aliasSymbol) {
        collectCustomDecorators(type.aliasSymbol, checker, decMap);
    }
    return decMap;
}
exports.getCustomDecorators = getCustomDecorators;
function getCustomNodeDirectives(node) {
    const directivesMap = new Map();
    ts.getJSDocTags(node).forEach(tag => {
        const tagName = tag.tagName.text;
        if (Decorator_1.Decorator.isValid(tagName)) {
            const dec = new Decorator_1.Decorator(tagName, tag.comment ? tag.comment.split(" ") : []);
            directivesMap.set(dec.kind, dec);
        }
    });
    return directivesMap;
}
exports.getCustomNodeDirectives = getCustomNodeDirectives;
function getCustomFileDirectives(file) {
    if (file.statements.length > 0) {
        return getCustomNodeDirectives(file.statements[0]);
    }
    return new Map();
}
exports.getCustomFileDirectives = getCustomFileDirectives;
function getCustomSignatureDirectives(signature, checker) {
    const directivesMap = new Map();
    collectCustomDecorators(signature, checker, directivesMap);
    // Function properties on interfaces have the JSDoc tags on the parent PropertySignature
    const declaration = signature.getDeclaration();
    if (declaration && declaration.parent && ts.isPropertySignature(declaration.parent)) {
        const symbol = checker.getSymbolAtLocation(declaration.parent.name);
        if (symbol) {
            collectCustomDecorators(symbol, checker, directivesMap);
        }
    }
    return directivesMap;
}
exports.getCustomSignatureDirectives = getCustomSignatureDirectives;
// Search up until finding a node satisfying the callback
function findFirstNodeAbove(node, callback) {
    let current = node;
    while (current.parent) {
        if (callback(current.parent)) {
            return current.parent;
        }
        else {
            current = current.parent;
        }
    }
    return undefined;
}
exports.findFirstNodeAbove = findFirstNodeAbove;
function isBinaryAssignmentToken(token) {
    switch (token) {
        case ts.SyntaxKind.BarEqualsToken:
            return [true, ts.SyntaxKind.BarToken];
        case ts.SyntaxKind.PlusEqualsToken:
            return [true, ts.SyntaxKind.PlusToken];
        case ts.SyntaxKind.CaretEqualsToken:
            return [true, ts.SyntaxKind.CaretToken];
        case ts.SyntaxKind.MinusEqualsToken:
            return [true, ts.SyntaxKind.MinusToken];
        case ts.SyntaxKind.SlashEqualsToken:
            return [true, ts.SyntaxKind.SlashToken];
        case ts.SyntaxKind.PercentEqualsToken:
            return [true, ts.SyntaxKind.PercentToken];
        case ts.SyntaxKind.AsteriskEqualsToken:
            return [true, ts.SyntaxKind.AsteriskToken];
        case ts.SyntaxKind.AmpersandEqualsToken:
            return [true, ts.SyntaxKind.AmpersandToken];
        case ts.SyntaxKind.AsteriskAsteriskEqualsToken:
            return [true, ts.SyntaxKind.AsteriskAsteriskToken];
        case ts.SyntaxKind.LessThanLessThanEqualsToken:
            return [true, ts.SyntaxKind.LessThanLessThanToken];
        case ts.SyntaxKind.GreaterThanGreaterThanEqualsToken:
            return [true, ts.SyntaxKind.GreaterThanGreaterThanToken];
        case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
            return [true, ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken];
    }
    return [false, undefined];
}
exports.isBinaryAssignmentToken = isBinaryAssignmentToken;
// Returns true for expressions that may have effects when evaluated
function isExpressionWithEvaluationEffect(node) {
    return !(ts.isLiteralExpression(node) || ts.isIdentifier(node) || node.kind === ts.SyntaxKind.ThisKeyword);
}
exports.isExpressionWithEvaluationEffect = isExpressionWithEvaluationEffect;
// If expression is property/element access with possible effects from being evaluated, returns true along with the
// separated object and index expressions.
function isAccessExpressionWithEvaluationEffects(node, checker, program) {
    if (ts.isElementAccessExpression(node) &&
        (isExpressionWithEvaluationEffect(node.expression) || isExpressionWithEvaluationEffect(node.argumentExpression))) {
        const type = checker.getTypeAtLocation(node.expression);
        if (isArrayType(type, checker, program)) {
            // Offset arrays by one
            const oneLit = ts.createNumericLiteral("1");
            const exp = ts.createParen(node.argumentExpression);
            const addExp = ts.createBinary(exp, ts.SyntaxKind.PlusToken, oneLit);
            return [true, node.expression, addExp];
        }
        else {
            return [true, node.expression, node.argumentExpression];
        }
    }
    else if (ts.isPropertyAccessExpression(node) && isExpressionWithEvaluationEffect(node.expression)) {
        return [true, node.expression, ts.createStringLiteral(node.name.text)];
    }
    return [false, undefined, undefined];
}
exports.isAccessExpressionWithEvaluationEffects = isAccessExpressionWithEvaluationEffects;
function isDefaultArrayCallMethodName(methodName) {
    return defaultArrayCallMethodNames.has(methodName);
}
exports.isDefaultArrayCallMethodName = isDefaultArrayCallMethodName;
function getExplicitThisParameter(signatureDeclaration) {
    return signatureDeclaration.parameters.find(param => ts.isIdentifier(param.name) && param.name.originalKeywordKind === ts.SyntaxKind.ThisKeyword);
}
exports.getExplicitThisParameter = getExplicitThisParameter;
function findInClassOrAncestor(classDeclaration, callback, checker) {
    if (callback(classDeclaration)) {
        return classDeclaration;
    }
    const extendsType = getExtendedType(classDeclaration, checker);
    if (!extendsType) {
        return undefined;
    }
    const symbol = extendsType.getSymbol();
    if (symbol === undefined) {
        return undefined;
    }
    const symbolDeclarations = symbol.getDeclarations();
    if (symbolDeclarations === undefined) {
        return undefined;
    }
    const declaration = symbolDeclarations.find(ts.isClassLike);
    if (!declaration) {
        return undefined;
    }
    return findInClassOrAncestor(declaration, callback, checker);
}
exports.findInClassOrAncestor = findInClassOrAncestor;
function hasSetAccessorInClassOrAncestor(classDeclaration, isStatic, checker) {
    return (findInClassOrAncestor(classDeclaration, c => c.members.some(m => ts.isSetAccessor(m) && isStaticNode(m) === isStatic), checker) !== undefined);
}
exports.hasSetAccessorInClassOrAncestor = hasSetAccessorInClassOrAncestor;
function hasGetAccessorInClassOrAncestor(classDeclaration, isStatic, checker) {
    return (findInClassOrAncestor(classDeclaration, c => c.members.some(m => ts.isGetAccessor(m) && isStaticNode(m) === isStatic), checker) !== undefined);
}
exports.hasGetAccessorInClassOrAncestor = hasGetAccessorInClassOrAncestor;
function getPropertyName(propertyName) {
    if (ts.isIdentifier(propertyName) || ts.isStringLiteral(propertyName) || ts.isNumericLiteral(propertyName)) {
        return propertyName.text;
    }
    else {
        return undefined; // TODO: how to handle computed property names?
    }
}
exports.getPropertyName = getPropertyName;
function isSamePropertyName(a, b) {
    const aName = getPropertyName(a);
    const bName = getPropertyName(b);
    return aName !== undefined && aName === bName;
}
exports.isSamePropertyName = isSamePropertyName;
function isGetAccessorOverride(element, classDeclaration, checker) {
    if (!ts.isGetAccessor(element) || isStaticNode(element)) {
        return false;
    }
    const hasInitializedField = (e) => ts.isPropertyDeclaration(e) && e.initializer !== undefined && isSamePropertyName(e.name, element.name);
    return findInClassOrAncestor(classDeclaration, c => c.members.some(hasInitializedField), checker) !== undefined;
}
exports.isGetAccessorOverride = isGetAccessorOverride;
function inferAssignedType(expression, checker) {
    return checker.getContextualType(expression) || checker.getTypeAtLocation(expression);
}
exports.inferAssignedType = inferAssignedType;
function getAllCallSignatures(type) {
    if (type.isUnion()) {
        return type.types.map(t => getAllCallSignatures(t)).reduce((a, b) => a.concat(b));
    }
    return type.getCallSignatures();
}
exports.getAllCallSignatures = getAllCallSignatures;
function getSignatureDeclarations(signatures, checker) {
    const signatureDeclarations = [];
    for (const signature of signatures) {
        const signatureDeclaration = signature.getDeclaration();
        if ((ts.isFunctionExpression(signatureDeclaration) || ts.isArrowFunction(signatureDeclaration)) &&
            !getExplicitThisParameter(signatureDeclaration)) {
            // Infer type of function expressions/arrow functions
            const inferredType = inferAssignedType(signatureDeclaration, checker);
            if (inferredType) {
                const inferredSignatures = getAllCallSignatures(inferredType);
                if (inferredSignatures.length > 0) {
                    signatureDeclarations.push(...inferredSignatures.map(s => s.getDeclaration()));
                    continue;
                }
            }
        }
        signatureDeclarations.push(signatureDeclaration);
    }
    return signatureDeclarations;
}
exports.getSignatureDeclarations = getSignatureDeclarations;
function hasNoSelfAncestor(declaration, checker) {
    const scopeDeclaration = findFirstNodeAbove(declaration, (n) => ts.isSourceFile(n) || ts.isModuleDeclaration(n));
    if (!scopeDeclaration) {
        return false;
    }
    if (ts.isSourceFile(scopeDeclaration)) {
        return getCustomFileDirectives(scopeDeclaration).has(Decorator_1.DecoratorKind.NoSelfInFile);
    }
    if (getCustomNodeDirectives(scopeDeclaration).has(Decorator_1.DecoratorKind.NoSelf)) {
        return true;
    }
    return hasNoSelfAncestor(scopeDeclaration, checker);
}
exports.hasNoSelfAncestor = hasNoSelfAncestor;
function getDeclarationContextType(signatureDeclaration, checker) {
    const thisParameter = getExplicitThisParameter(signatureDeclaration);
    if (thisParameter) {
        // Explicit 'this'
        return thisParameter.type && thisParameter.type.kind === ts.SyntaxKind.VoidKeyword
            ? ContextType.Void
            : ContextType.NonVoid;
    }
    if (ts.isMethodSignature(signatureDeclaration) ||
        ts.isMethodDeclaration(signatureDeclaration) ||
        ts.isConstructSignatureDeclaration(signatureDeclaration) ||
        ts.isConstructorDeclaration(signatureDeclaration) ||
        (signatureDeclaration.parent && ts.isPropertyDeclaration(signatureDeclaration.parent)) ||
        (signatureDeclaration.parent && ts.isPropertySignature(signatureDeclaration.parent))) {
        // Class/interface methods only respect @noSelf on their parent
        const scopeDeclaration = findFirstNodeAbove(signatureDeclaration, (n) => ts.isClassDeclaration(n) || ts.isClassExpression(n) || ts.isInterfaceDeclaration(n));
        if (scopeDeclaration === undefined) {
            return ContextType.NonVoid;
        }
        if (getCustomNodeDirectives(scopeDeclaration).has(Decorator_1.DecoratorKind.NoSelf)) {
            return ContextType.Void;
        }
        return ContextType.NonVoid;
    }
    // Walk up to find @noSelf or @noSelfOnFile
    if (hasNoSelfAncestor(signatureDeclaration, checker)) {
        return ContextType.Void;
    }
    return ContextType.NonVoid;
}
exports.getDeclarationContextType = getDeclarationContextType;
function reduceContextTypes(contexts) {
    const reducer = (a, b) => {
        if (a === ContextType.None) {
            return b;
        }
        else if (b === ContextType.None) {
            return a;
        }
        else if (a !== b) {
            return ContextType.Mixed;
        }
        else {
            return a;
        }
    };
    return contexts.reduce(reducer, ContextType.None);
}
exports.reduceContextTypes = reduceContextTypes;
function getFunctionContextType(type, checker) {
    if (type.isTypeParameter()) {
        type = type.getConstraint() || type;
    }
    if (type.isUnion()) {
        return reduceContextTypes(type.types.map(t => getFunctionContextType(t, checker)));
    }
    const signatures = checker.getSignaturesOfType(type, ts.SignatureKind.Call);
    if (signatures.length === 0) {
        return ContextType.None;
    }
    const signatureDeclarations = getSignatureDeclarations(signatures, checker);
    return reduceContextTypes(signatureDeclarations.map(s => getDeclarationContextType(s, checker)));
}
exports.getFunctionContextType = getFunctionContextType;
function escapeString(text) {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String
    const escapeSequences = [
        [/[\\]/g, "\\\\"],
        [/[\']/g, "\\'"],
        [/[\"]/g, '\\"'],
        [/[\n]/g, "\\n"],
        [/[\r]/g, "\\r"],
        [/[\v]/g, "\\v"],
        [/[\t]/g, "\\t"],
        [/[\b]/g, "\\b"],
        [/[\f]/g, "\\f"],
        [/[\0]/g, "\\0"],
    ];
    if (text.length > 0) {
        for (const [regex, replacement] of escapeSequences) {
            text = text.replace(regex, replacement);
        }
    }
    return text;
}
exports.escapeString = escapeString;
function isValidLuaIdentifier(str) {
    const match = str.match(/[a-zA-Z_][a-zA-Z0-9_]*/);
    return match !== undefined && match !== null && match[0] === str;
}
exports.isValidLuaIdentifier = isValidLuaIdentifier;
function fixInvalidLuaIdentifier(name) {
    return name.replace(/[^a-zA-Z0-9_]/g, c => `_${c
        .charCodeAt(0)
        .toString(16)
        .toUpperCase()}`);
}
exports.fixInvalidLuaIdentifier = fixInvalidLuaIdentifier;
// Checks that a name is valid for use in lua function declaration syntax:
// 'foo.bar' => passes ('function foo.bar()' is valid)
// 'getFoo().bar' => fails ('function getFoo().bar()' would be illegal)
function isValidLuaFunctionDeclarationName(str) {
    const match = str.match(/[a-zA-Z0-9_\.]+/);
    return match !== undefined && match !== null && match[0] === str;
}
exports.isValidLuaFunctionDeclarationName = isValidLuaFunctionDeclarationName;
function isFalsible(type, strictNullChecks) {
    const falsibleFlags = ts.TypeFlags.Boolean |
        ts.TypeFlags.BooleanLiteral |
        ts.TypeFlags.Undefined |
        ts.TypeFlags.Null |
        ts.TypeFlags.Never |
        ts.TypeFlags.Void |
        ts.TypeFlags.Any;
    if (type.flags & falsibleFlags) {
        return true;
    }
    else if (!strictNullChecks && !type.isLiteral()) {
        return true;
    }
    else if (type.isUnion()) {
        for (const subType of type.types) {
            if (isFalsible(subType, strictNullChecks)) {
                return true;
            }
        }
    }
    return false;
}
exports.isFalsible = isFalsible;
function getFirstDeclaration(symbol, sourceFile) {
    let declarations = symbol.getDeclarations();
    if (!declarations) {
        return undefined;
    }
    declarations = declarations.filter(d => findFirstNodeAbove(d, ts.isSourceFile) === sourceFile);
    return declarations.length > 0 ? declarations.reduce((p, c) => (p.pos < c.pos ? p : c)) : undefined;
}
exports.getFirstDeclaration = getFirstDeclaration;
function getRawLiteral(node) {
    let text = node.getText();
    const isLast = node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral || node.kind === ts.SyntaxKind.TemplateTail;
    text = text.substring(1, text.length - (isLast ? 1 : 2));
    text = text.replace(/\r\n?/g, "\n").replace(/\\/g, "\\\\");
    return text;
}
exports.getRawLiteral = getRawLiteral;
function isFirstDeclaration(node, checker, sourceFile) {
    const symbol = checker.getSymbolAtLocation(node.name);
    if (!symbol) {
        return false;
    }
    const firstDeclaration = getFirstDeclaration(symbol, sourceFile);
    return firstDeclaration === node;
}
exports.isFirstDeclaration = isFirstDeclaration;
function isStandardLibraryDeclaration(declaration, program) {
    const source = declaration.getSourceFile();
    if (!source) {
        return false;
    }
    return program.isSourceFileDefaultLibrary(source);
}
exports.isStandardLibraryDeclaration = isStandardLibraryDeclaration;
function isStandardLibraryType(type, name, program) {
    const symbol = type.getSymbol();
    if (!symbol || (name ? symbol.escapedName !== name : symbol.escapedName === "__type")) {
        return false;
    }
    const declaration = symbol.valueDeclaration;
    if (!declaration) {
        return true;
    }
    // assume to be lib function if no valueDeclaration exists
    return isStandardLibraryDeclaration(declaration, program);
}
exports.isStandardLibraryType = isStandardLibraryType;
function isWithinLiteralAssignmentStatement(node) {
    if (!node.parent) {
        return false;
    }
    if (ts.isArrayLiteralExpression(node.parent) ||
        ts.isArrayBindingPattern(node.parent) ||
        ts.isObjectLiteralExpression(node.parent)) {
        return isWithinLiteralAssignmentStatement(node.parent);
    }
    else if (isInDestructingAssignment(node)) {
        return true;
    }
    else if (ts.isBinaryExpression(node.parent) && node.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        return true;
    }
    else {
        return false;
    }
}
exports.isWithinLiteralAssignmentStatement = isWithinLiteralAssignmentStatement;
function moduleHasEmittedBody(statement) {
    if (statement.body) {
        if (ts.isModuleBlock(statement.body)) {
            // Ignore if body has no emitted statements
            return (statement.body.statements.findIndex(s => !ts.isInterfaceDeclaration(s) && !ts.isTypeAliasDeclaration(s)) !== -1);
        }
        else if (ts.isModuleDeclaration(statement.body)) {
            return true;
        }
    }
    return false;
}
exports.moduleHasEmittedBody = moduleHasEmittedBody;
function isArrayLength(expression, checker, program) {
    if (!ts.isPropertyAccessExpression(expression) && !ts.isElementAccessExpression(expression)) {
        return false;
    }
    const type = checker.getTypeAtLocation(expression.expression);
    if (!isArrayType(type, checker, program)) {
        return false;
    }
    const name = ts.isPropertyAccessExpression(expression)
        ? expression.name.text
        : ts.isStringLiteral(expression.argumentExpression)
            ? expression.argumentExpression.text
            : undefined;
    return name === "length";
}
exports.isArrayLength = isArrayLength;
// Returns true if expression contains no function calls
function isSimpleExpression(expression) {
    switch (expression.kind) {
        case tstl.SyntaxKind.CallExpression:
        case tstl.SyntaxKind.MethodCallExpression:
        case tstl.SyntaxKind.FunctionExpression:
            return false;
        case tstl.SyntaxKind.TableExpression:
            const tableExpression = expression;
            return tableExpression.fields.every(e => isSimpleExpression(e));
        case tstl.SyntaxKind.TableFieldExpression:
            const fieldExpression = expression;
            return ((!fieldExpression.key || isSimpleExpression(fieldExpression.key)) &&
                isSimpleExpression(fieldExpression.value));
        case tstl.SyntaxKind.TableIndexExpression:
            const indexExpression = expression;
            return isSimpleExpression(indexExpression.table) && isSimpleExpression(indexExpression.index);
        case tstl.SyntaxKind.UnaryExpression:
            return isSimpleExpression(expression.operand);
        case tstl.SyntaxKind.BinaryExpression:
            const binaryExpression = expression;
            return isSimpleExpression(binaryExpression.left) && isSimpleExpression(binaryExpression.right);
        case tstl.SyntaxKind.ParenthesizedExpression:
            return isSimpleExpression(expression.innerExpression);
    }
    return true;
}
exports.isSimpleExpression = isSimpleExpression;
function getAbsoluteImportPath(relativePath, directoryPath, options) {
    if (relativePath.charAt(0) !== "." && options.baseUrl) {
        return path.resolve(options.baseUrl, relativePath);
    }
    return path.resolve(directoryPath, relativePath);
}
exports.getAbsoluteImportPath = getAbsoluteImportPath;
function getImportPath(fileName, relativePath, node, options) {
    const rootDir = options.rootDir ? path.resolve(options.rootDir) : path.resolve(".");
    const absoluteImportPath = path.format(path.parse(getAbsoluteImportPath(relativePath, path.dirname(fileName), options)));
    const absoluteRootDirPath = path.format(path.parse(rootDir));
    if (absoluteImportPath.includes(absoluteRootDirPath)) {
        return formatPathToLuaPath(absoluteImportPath.replace(absoluteRootDirPath, "").slice(1));
    }
    else {
        throw TSTLErrors.UnresolvableRequirePath(node, `Cannot create require path. Module does not exist within --rootDir`, relativePath);
    }
}
exports.getImportPath = getImportPath;
function getExportPath(fileName, options) {
    const rootDir = options.rootDir ? path.resolve(options.rootDir) : path.resolve(".");
    const absolutePath = path.resolve(fileName.replace(/.ts$/, ""));
    const absoluteRootDirPath = path.format(path.parse(rootDir));
    return formatPathToLuaPath(absolutePath.replace(absoluteRootDirPath, "").slice(1));
}
exports.getExportPath = getExportPath;
function formatPathToLuaPath(filePath) {
    filePath = filePath.replace(/\.json$/, "");
    if (process.platform === "win32") {
        // Windows can use backslashes
        filePath = filePath.replace(/\.\\/g, "").replace(/\\/g, ".");
    }
    return filePath.replace(/\.\//g, "").replace(/\//g, ".");
}
exports.formatPathToLuaPath = formatPathToLuaPath;
//# sourceMappingURL=TSHelper.js.map