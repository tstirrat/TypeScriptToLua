"use strict";
// Simplified Lua AST based roughly on http://lua-users.org/wiki/MetaLuaAbstractSyntaxTree,
// https://www.lua.org/manual/5.3/manual.html (9 – The Complete Syntax of Lua) and the TS AST implementation
Object.defineProperty(exports, "__esModule", { value: true });
// We can elide a lot of nodes especially tokens and keywords
// because we dont create the AST from text
const ts = require("typescript");
var SyntaxKind;
(function (SyntaxKind) {
    SyntaxKind[SyntaxKind["Block"] = 0] = "Block";
    // Statements
    SyntaxKind[SyntaxKind["DoStatement"] = 1] = "DoStatement";
    SyntaxKind[SyntaxKind["VariableDeclarationStatement"] = 2] = "VariableDeclarationStatement";
    SyntaxKind[SyntaxKind["AssignmentStatement"] = 3] = "AssignmentStatement";
    SyntaxKind[SyntaxKind["IfStatement"] = 4] = "IfStatement";
    SyntaxKind[SyntaxKind["WhileStatement"] = 5] = "WhileStatement";
    SyntaxKind[SyntaxKind["RepeatStatement"] = 6] = "RepeatStatement";
    SyntaxKind[SyntaxKind["ForStatement"] = 7] = "ForStatement";
    SyntaxKind[SyntaxKind["ForInStatement"] = 8] = "ForInStatement";
    SyntaxKind[SyntaxKind["GotoStatement"] = 9] = "GotoStatement";
    SyntaxKind[SyntaxKind["LabelStatement"] = 10] = "LabelStatement";
    SyntaxKind[SyntaxKind["ReturnStatement"] = 11] = "ReturnStatement";
    SyntaxKind[SyntaxKind["BreakStatement"] = 12] = "BreakStatement";
    SyntaxKind[SyntaxKind["ExpressionStatement"] = 13] = "ExpressionStatement";
    // Expression
    SyntaxKind[SyntaxKind["StringLiteral"] = 14] = "StringLiteral";
    SyntaxKind[SyntaxKind["NumericLiteral"] = 15] = "NumericLiteral";
    SyntaxKind[SyntaxKind["NilKeyword"] = 16] = "NilKeyword";
    SyntaxKind[SyntaxKind["DotsKeyword"] = 17] = "DotsKeyword";
    SyntaxKind[SyntaxKind["TrueKeyword"] = 18] = "TrueKeyword";
    SyntaxKind[SyntaxKind["FalseKeyword"] = 19] = "FalseKeyword";
    SyntaxKind[SyntaxKind["FunctionExpression"] = 20] = "FunctionExpression";
    SyntaxKind[SyntaxKind["TableFieldExpression"] = 21] = "TableFieldExpression";
    SyntaxKind[SyntaxKind["TableExpression"] = 22] = "TableExpression";
    SyntaxKind[SyntaxKind["UnaryExpression"] = 23] = "UnaryExpression";
    SyntaxKind[SyntaxKind["BinaryExpression"] = 24] = "BinaryExpression";
    SyntaxKind[SyntaxKind["ParenthesizedExpression"] = 25] = "ParenthesizedExpression";
    SyntaxKind[SyntaxKind["CallExpression"] = 26] = "CallExpression";
    SyntaxKind[SyntaxKind["MethodCallExpression"] = 27] = "MethodCallExpression";
    SyntaxKind[SyntaxKind["Identifier"] = 28] = "Identifier";
    SyntaxKind[SyntaxKind["TableIndexExpression"] = 29] = "TableIndexExpression";
    // Operators
    // Arithmetic
    SyntaxKind[SyntaxKind["AdditionOperator"] = 30] = "AdditionOperator";
    SyntaxKind[SyntaxKind["SubtractionOperator"] = 31] = "SubtractionOperator";
    SyntaxKind[SyntaxKind["MultiplicationOperator"] = 32] = "MultiplicationOperator";
    SyntaxKind[SyntaxKind["DivisionOperator"] = 33] = "DivisionOperator";
    SyntaxKind[SyntaxKind["FloorDivisionOperator"] = 34] = "FloorDivisionOperator";
    SyntaxKind[SyntaxKind["ModuloOperator"] = 35] = "ModuloOperator";
    SyntaxKind[SyntaxKind["PowerOperator"] = 36] = "PowerOperator";
    SyntaxKind[SyntaxKind["NegationOperator"] = 37] = "NegationOperator";
    // Concat
    SyntaxKind[SyntaxKind["ConcatOperator"] = 38] = "ConcatOperator";
    // Length
    SyntaxKind[SyntaxKind["LengthOperator"] = 39] = "LengthOperator";
    // Relational Ops
    SyntaxKind[SyntaxKind["EqualityOperator"] = 40] = "EqualityOperator";
    SyntaxKind[SyntaxKind["InequalityOperator"] = 41] = "InequalityOperator";
    SyntaxKind[SyntaxKind["LessThanOperator"] = 42] = "LessThanOperator";
    SyntaxKind[SyntaxKind["LessEqualOperator"] = 43] = "LessEqualOperator";
    // Syntax Sugar `x > y` <=> `not (y <= x)`
    // but we should probably use them to make the output code more readable
    SyntaxKind[SyntaxKind["GreaterThanOperator"] = 44] = "GreaterThanOperator";
    SyntaxKind[SyntaxKind["GreaterEqualOperator"] = 45] = "GreaterEqualOperator";
    // Logical
    SyntaxKind[SyntaxKind["AndOperator"] = 46] = "AndOperator";
    SyntaxKind[SyntaxKind["OrOperator"] = 47] = "OrOperator";
    SyntaxKind[SyntaxKind["NotOperator"] = 48] = "NotOperator";
    // Bitwise
    SyntaxKind[SyntaxKind["BitwiseAndOperator"] = 49] = "BitwiseAndOperator";
    SyntaxKind[SyntaxKind["BitwiseOrOperator"] = 50] = "BitwiseOrOperator";
    SyntaxKind[SyntaxKind["BitwiseExclusiveOrOperator"] = 51] = "BitwiseExclusiveOrOperator";
    SyntaxKind[SyntaxKind["BitwiseRightShiftOperator"] = 52] = "BitwiseRightShiftOperator";
    SyntaxKind[SyntaxKind["BitwiseLeftShiftOperator"] = 53] = "BitwiseLeftShiftOperator";
    SyntaxKind[SyntaxKind["BitwiseNotOperator"] = 54] = "BitwiseNotOperator";
})(SyntaxKind = exports.SyntaxKind || (exports.SyntaxKind = {}));
function createNode(kind, tsOriginal, parent) {
    if (tsOriginal === undefined) {
        return { kind, parent };
    }
    const sourcePosition = getSourcePosition(tsOriginal);
    if (sourcePosition) {
        return { kind, parent, line: sourcePosition.line, column: sourcePosition.column };
    }
    else {
        return { kind, parent };
    }
}
exports.createNode = createNode;
function cloneNode(node) {
    return Object.assign({}, node);
}
exports.cloneNode = cloneNode;
function setNodePosition(node, position) {
    node.line = position.line;
    node.column = position.column;
    return node;
}
exports.setNodePosition = setNodePosition;
function setNodeOriginal(node, tsOriginal) {
    if (node === undefined) {
        return undefined;
    }
    const sourcePosition = getSourcePosition(tsOriginal);
    if (sourcePosition) {
        setNodePosition(node, sourcePosition);
    }
    return node;
}
exports.setNodeOriginal = setNodeOriginal;
function setParent(node, parent) {
    if (!node) {
        return;
    }
    if (Array.isArray(node)) {
        node.forEach(n => {
            n.parent = parent;
        });
    }
    else {
        node.parent = parent;
    }
}
exports.setParent = setParent;
function getSourcePosition(sourceNode) {
    if (sourceNode !== undefined && sourceNode.getSourceFile() !== undefined && sourceNode.pos >= 0) {
        const { line, character } = ts.getLineAndCharacterOfPosition(sourceNode.getSourceFile(), sourceNode.pos + sourceNode.getLeadingTriviaWidth());
        return { line, column: character };
    }
}
function getOriginalPos(node) {
    return { line: node.line, column: node.column };
}
exports.getOriginalPos = getOriginalPos;
function isBlock(node) {
    return node.kind === SyntaxKind.Block;
}
exports.isBlock = isBlock;
function createBlock(statements, tsOriginal, parent) {
    const block = createNode(SyntaxKind.Block, tsOriginal, parent);
    setParent(statements, block);
    block.statements = statements;
    return block;
}
exports.createBlock = createBlock;
function isDoStatement(node) {
    return node.kind === SyntaxKind.DoStatement;
}
exports.isDoStatement = isDoStatement;
function createDoStatement(statements, tsOriginal, parent) {
    const statement = createNode(SyntaxKind.DoStatement, tsOriginal, parent);
    setParent(statements, statement);
    statement.statements = statements;
    return statement;
}
exports.createDoStatement = createDoStatement;
function isVariableDeclarationStatement(node) {
    return node.kind === SyntaxKind.VariableDeclarationStatement;
}
exports.isVariableDeclarationStatement = isVariableDeclarationStatement;
function createVariableDeclarationStatement(left, right, tsOriginal, parent) {
    const statement = createNode(SyntaxKind.VariableDeclarationStatement, tsOriginal, parent);
    setParent(left, statement);
    if (Array.isArray(left)) {
        statement.left = left;
    }
    else {
        statement.left = [left];
    }
    setParent(right, statement);
    if (Array.isArray(right)) {
        statement.right = right;
    }
    else if (right) {
        statement.right = [right];
    }
    return statement;
}
exports.createVariableDeclarationStatement = createVariableDeclarationStatement;
function isAssignmentStatement(node) {
    return node.kind === SyntaxKind.AssignmentStatement;
}
exports.isAssignmentStatement = isAssignmentStatement;
function createAssignmentStatement(left, right, tsOriginal, parent) {
    const statement = createNode(SyntaxKind.AssignmentStatement, tsOriginal, parent);
    setParent(left, statement);
    if (Array.isArray(left)) {
        statement.left = left;
    }
    else {
        statement.left = [left];
    }
    setParent(right, statement);
    if (Array.isArray(right)) {
        statement.right = right;
    }
    else {
        statement.right = right ? [right] : [];
    }
    return statement;
}
exports.createAssignmentStatement = createAssignmentStatement;
function isIfStatement(node) {
    return node.kind === SyntaxKind.IfStatement;
}
exports.isIfStatement = isIfStatement;
function createIfStatement(condition, ifBlock, elseBlock, tsOriginal, parent) {
    const statement = createNode(SyntaxKind.IfStatement, tsOriginal, parent);
    setParent(condition, statement);
    statement.condition = condition;
    setParent(ifBlock, statement);
    statement.ifBlock = ifBlock;
    setParent(elseBlock, statement);
    statement.elseBlock = elseBlock;
    return statement;
}
exports.createIfStatement = createIfStatement;
function isIterationStatement(node) {
    return (node.kind === SyntaxKind.WhileStatement ||
        node.kind === SyntaxKind.RepeatStatement ||
        node.kind === SyntaxKind.ForStatement ||
        node.kind === SyntaxKind.ForInStatement);
}
exports.isIterationStatement = isIterationStatement;
function isWhileStatement(node) {
    return node.kind === SyntaxKind.WhileStatement;
}
exports.isWhileStatement = isWhileStatement;
function createWhileStatement(body, condition, tsOriginal, parent) {
    const statement = createNode(SyntaxKind.WhileStatement, tsOriginal, parent);
    setParent(body, statement);
    statement.body = body;
    setParent(condition, statement);
    statement.condition = condition;
    return statement;
}
exports.createWhileStatement = createWhileStatement;
function isRepeatStatement(node) {
    return node.kind === SyntaxKind.RepeatStatement;
}
exports.isRepeatStatement = isRepeatStatement;
function createRepeatStatement(body, condition, tsOriginal, parent) {
    const statement = createNode(SyntaxKind.RepeatStatement, tsOriginal, parent);
    setParent(body, statement);
    statement.body = body;
    setParent(condition, statement);
    statement.condition = condition;
    return statement;
}
exports.createRepeatStatement = createRepeatStatement;
function isForStatement(node) {
    return node.kind === SyntaxKind.ForStatement;
}
exports.isForStatement = isForStatement;
function createForStatement(body, controlVariable, controlVariableInitializer, limitExpression, stepExpression, tsOriginal, parent) {
    const statement = createNode(SyntaxKind.ForStatement, tsOriginal, parent);
    setParent(body, statement);
    statement.body = body;
    setParent(controlVariable, statement);
    statement.controlVariable = controlVariable;
    setParent(controlVariableInitializer, statement);
    statement.controlVariableInitializer = controlVariableInitializer;
    setParent(limitExpression, statement);
    statement.limitExpression = limitExpression;
    setParent(stepExpression, statement);
    statement.stepExpression = stepExpression;
    return statement;
}
exports.createForStatement = createForStatement;
function isForInStatement(node) {
    return node.kind === SyntaxKind.ForInStatement;
}
exports.isForInStatement = isForInStatement;
function createForInStatement(body, names, expressions, tsOriginal, parent) {
    const statement = createNode(SyntaxKind.ForInStatement, tsOriginal, parent);
    setParent(body, statement);
    statement.body = body;
    setParent(names, statement);
    statement.names = names;
    setParent(expressions, statement);
    statement.expressions = expressions;
    return statement;
}
exports.createForInStatement = createForInStatement;
function isGotoStatement(node) {
    return node.kind === SyntaxKind.GotoStatement;
}
exports.isGotoStatement = isGotoStatement;
function createGotoStatement(label, tsOriginal, parent) {
    const statement = createNode(SyntaxKind.GotoStatement, tsOriginal, parent);
    statement.label = label;
    return statement;
}
exports.createGotoStatement = createGotoStatement;
function isLabelStatement(node) {
    return node.kind === SyntaxKind.LabelStatement;
}
exports.isLabelStatement = isLabelStatement;
function createLabelStatement(name, tsOriginal, parent) {
    const statement = createNode(SyntaxKind.LabelStatement, tsOriginal, parent);
    statement.name = name;
    return statement;
}
exports.createLabelStatement = createLabelStatement;
function isReturnStatement(node) {
    return node.kind === SyntaxKind.ReturnStatement;
}
exports.isReturnStatement = isReturnStatement;
function createReturnStatement(expressions, tsOriginal, parent) {
    const statement = createNode(SyntaxKind.ReturnStatement, tsOriginal, parent);
    setParent(expressions, statement);
    statement.expressions = expressions;
    return statement;
}
exports.createReturnStatement = createReturnStatement;
function isBreakStatement(node) {
    return node.kind === SyntaxKind.BreakStatement;
}
exports.isBreakStatement = isBreakStatement;
function createBreakStatement(tsOriginal, parent) {
    return createNode(SyntaxKind.BreakStatement, tsOriginal, parent);
}
exports.createBreakStatement = createBreakStatement;
function isExpressionStatement(node) {
    return node.kind === SyntaxKind.ExpressionStatement;
}
exports.isExpressionStatement = isExpressionStatement;
function createExpressionStatement(expressions, tsOriginal, parent) {
    const statement = createNode(SyntaxKind.ExpressionStatement, tsOriginal, parent);
    setParent(expressions, statement);
    statement.expression = expressions;
    return statement;
}
exports.createExpressionStatement = createExpressionStatement;
function isNilLiteral(node) {
    return node.kind === SyntaxKind.NilKeyword;
}
exports.isNilLiteral = isNilLiteral;
function createNilLiteral(tsOriginal, parent) {
    return createNode(SyntaxKind.NilKeyword, tsOriginal, parent);
}
exports.createNilLiteral = createNilLiteral;
function isBooleanLiteral(node) {
    return node.kind === SyntaxKind.TrueKeyword || node.kind === SyntaxKind.FalseKeyword;
}
exports.isBooleanLiteral = isBooleanLiteral;
function createBooleanLiteral(value, tsOriginal, parent) {
    if (value) {
        return createNode(SyntaxKind.TrueKeyword, tsOriginal, parent);
    }
    else {
        return createNode(SyntaxKind.FalseKeyword, tsOriginal, parent);
    }
}
exports.createBooleanLiteral = createBooleanLiteral;
function isDotsLiteral(node) {
    return node.kind === SyntaxKind.DotsKeyword;
}
exports.isDotsLiteral = isDotsLiteral;
function createDotsLiteral(tsOriginal, parent) {
    return createNode(SyntaxKind.DotsKeyword, tsOriginal, parent);
}
exports.createDotsLiteral = createDotsLiteral;
function isNumericLiteral(node) {
    return node.kind === SyntaxKind.NumericLiteral;
}
exports.isNumericLiteral = isNumericLiteral;
function createNumericLiteral(value, tsOriginal, parent) {
    const expression = createNode(SyntaxKind.NumericLiteral, tsOriginal, parent);
    expression.value = value;
    return expression;
}
exports.createNumericLiteral = createNumericLiteral;
function isStringLiteral(node) {
    return node.kind === SyntaxKind.StringLiteral;
}
exports.isStringLiteral = isStringLiteral;
function createStringLiteral(value, tsOriginal, parent) {
    const expression = createNode(SyntaxKind.StringLiteral, tsOriginal, parent);
    expression.value = value;
    return expression;
}
exports.createStringLiteral = createStringLiteral;
var FunctionExpressionFlags;
(function (FunctionExpressionFlags) {
    FunctionExpressionFlags[FunctionExpressionFlags["None"] = 0] = "None";
    FunctionExpressionFlags[FunctionExpressionFlags["Inline"] = 1] = "Inline";
    FunctionExpressionFlags[FunctionExpressionFlags["Declaration"] = 2] = "Declaration";
})(FunctionExpressionFlags = exports.FunctionExpressionFlags || (exports.FunctionExpressionFlags = {}));
function isFunctionExpression(node) {
    return node.kind === SyntaxKind.FunctionExpression;
}
exports.isFunctionExpression = isFunctionExpression;
function createFunctionExpression(body, params, dots, restParamName, flags = FunctionExpressionFlags.None, tsOriginal, parent) {
    const expression = createNode(SyntaxKind.FunctionExpression, tsOriginal, parent);
    setParent(body, expression);
    expression.body = body;
    setParent(params, expression);
    expression.params = params;
    setParent(dots, expression);
    expression.dots = dots;
    setParent(restParamName, expression);
    expression.restParamName = restParamName;
    expression.flags = flags;
    return expression;
}
exports.createFunctionExpression = createFunctionExpression;
function isTableFieldExpression(node) {
    return node.kind === SyntaxKind.TableFieldExpression;
}
exports.isTableFieldExpression = isTableFieldExpression;
function createTableFieldExpression(value, key, tsOriginal, parent) {
    const expression = createNode(SyntaxKind.TableFieldExpression, tsOriginal, parent);
    setParent(value, expression);
    expression.value = value;
    setParent(key, expression);
    expression.key = key;
    return expression;
}
exports.createTableFieldExpression = createTableFieldExpression;
function isTableExpression(node) {
    return node.kind === SyntaxKind.TableExpression;
}
exports.isTableExpression = isTableExpression;
function createTableExpression(fields = [], tsOriginal, parent) {
    const expression = createNode(SyntaxKind.TableExpression, tsOriginal, parent);
    setParent(fields, expression);
    expression.fields = fields;
    return expression;
}
exports.createTableExpression = createTableExpression;
function isUnaryExpression(node) {
    return node.kind === SyntaxKind.UnaryExpression;
}
exports.isUnaryExpression = isUnaryExpression;
function createUnaryExpression(operand, operator, tsOriginal, parent) {
    const expression = createNode(SyntaxKind.UnaryExpression, tsOriginal, parent);
    setParent(operand, expression);
    expression.operand = operand;
    expression.operator = operator;
    return expression;
}
exports.createUnaryExpression = createUnaryExpression;
function isBinaryExpression(node) {
    return node.kind === SyntaxKind.BinaryExpression;
}
exports.isBinaryExpression = isBinaryExpression;
function createBinaryExpression(left, right, operator, tsOriginal, parent) {
    const expression = createNode(SyntaxKind.BinaryExpression, tsOriginal, parent);
    setParent(left, expression);
    expression.left = left;
    setParent(right, expression);
    expression.right = right;
    expression.operator = operator;
    return expression;
}
exports.createBinaryExpression = createBinaryExpression;
function isParenthesizedExpression(node) {
    return node.kind === SyntaxKind.ParenthesizedExpression;
}
exports.isParenthesizedExpression = isParenthesizedExpression;
function createParenthesizedExpression(innerExpression, tsOriginal, parent) {
    const expression = createNode(SyntaxKind.ParenthesizedExpression, tsOriginal, parent);
    setParent(innerExpression, expression);
    expression.innerExpression = innerExpression;
    return expression;
}
exports.createParenthesizedExpression = createParenthesizedExpression;
function isCallExpression(node) {
    return node.kind === SyntaxKind.CallExpression;
}
exports.isCallExpression = isCallExpression;
function createCallExpression(expression, params, tsOriginal, parent) {
    const callExpression = createNode(SyntaxKind.CallExpression, tsOriginal, parent);
    setParent(expression, callExpression);
    callExpression.expression = expression;
    setParent(params, expression);
    callExpression.params = params;
    return callExpression;
}
exports.createCallExpression = createCallExpression;
function isMethodCallExpression(node) {
    return node.kind === SyntaxKind.MethodCallExpression;
}
exports.isMethodCallExpression = isMethodCallExpression;
function createMethodCallExpression(prefixExpression, name, params, tsOriginal, parent) {
    const callExpression = createNode(SyntaxKind.MethodCallExpression, tsOriginal, parent);
    setParent(prefixExpression, callExpression);
    callExpression.prefixExpression = prefixExpression;
    setParent(name, callExpression);
    callExpression.name = name;
    setParent(params, callExpression);
    callExpression.params = params;
    return callExpression;
}
exports.createMethodCallExpression = createMethodCallExpression;
function isIdentifier(node) {
    return node.kind === SyntaxKind.Identifier;
}
exports.isIdentifier = isIdentifier;
function createIdentifier(text, tsOriginal, symbolId, originalName, parent) {
    const expression = createNode(SyntaxKind.Identifier, tsOriginal, parent);
    expression.text = text;
    expression.symbolId = symbolId;
    expression.originalName = originalName;
    return expression;
}
exports.createIdentifier = createIdentifier;
function cloneIdentifier(identifier, tsOriginal) {
    return createIdentifier(identifier.text, tsOriginal, identifier.symbolId, identifier.originalName);
}
exports.cloneIdentifier = cloneIdentifier;
function createAnonymousIdentifier(tsOriginal, parent) {
    const expression = createNode(SyntaxKind.Identifier, tsOriginal, parent);
    expression.text = "____";
    return expression;
}
exports.createAnonymousIdentifier = createAnonymousIdentifier;
function isTableIndexExpression(node) {
    return node.kind === SyntaxKind.TableIndexExpression;
}
exports.isTableIndexExpression = isTableIndexExpression;
function createTableIndexExpression(table, index, tsOriginal, parent) {
    const expression = createNode(SyntaxKind.TableIndexExpression, tsOriginal, parent);
    setParent(table, expression);
    expression.table = table;
    setParent(index, expression);
    expression.index = index;
    return expression;
}
exports.createTableIndexExpression = createTableIndexExpression;
function isAssignmentLeftHandSideExpression(node) {
    return isIdentifier(node) || isTableIndexExpression(node);
}
exports.isAssignmentLeftHandSideExpression = isAssignmentLeftHandSideExpression;
function isFunctionDefinition(statement) {
    return (statement.left.length === 1 &&
        statement.right !== undefined &&
        statement.right.length === 1 &&
        isFunctionExpression(statement.right[0]));
}
exports.isFunctionDefinition = isFunctionDefinition;
function isInlineFunctionExpression(expression) {
    return (expression.body.statements !== undefined &&
        expression.body.statements.length === 1 &&
        isReturnStatement(expression.body.statements[0]) &&
        expression.body.statements[0].expressions !== undefined &&
        (expression.flags & FunctionExpressionFlags.Inline) !== 0);
}
exports.isInlineFunctionExpression = isInlineFunctionExpression;
//# sourceMappingURL=LuaAST.js.map