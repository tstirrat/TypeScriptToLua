"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const tstl = require(".");
const LuaTransformer_1 = require("./LuaTransformer");
class CustomTransformer extends LuaTransformer_1.LuaTransformer {
    transformExpression(expression) {
        if (ts.isJsxSelfClosingElement(expression)) {
            return this.transformJsxElement(expression);
        }
        if (ts.isJsxElement(expression)) {
            return this.transformJsxElement(expression);
        }
        if (ts.isJsxExpression(expression)) {
            if (!expression.expression) {
                throw new Error('JsxExpression has no .expression');
            }
            return this.transformExpression(expression.expression);
        }
        return super.transformExpression(expression);
    }
    transformJsxElement(expression) {
        if (ts.isJsxSelfClosingElement(expression)) {
            return this.transformJsxOpeningElement(expression);
        }
        return this.transformJsxOpeningElement(expression.openingElement, expression.children);
    }
    transformJsxOpeningElement(expression, children) {
        // <Something a="b" />
        // React.createElement(Something, {a = 'b'})
        const [library, create] = this.options.jsxFactory ?
            this.options.jsxFactory.split('.') :
            ['React', 'createElement'];
        const createElement = tstl.createTableIndexExpression(tstl.createIdentifier(library), tstl.createStringLiteral(create));
        const tagName = expression.tagName.getText();
        const tag = tagName.toLowerCase() === tagName ?
            tstl.createStringLiteral(tagName) :
            tstl.createIdentifier(tagName);
        const props = this.transformJsxAttributesExpression(expression.attributes);
        if (children) {
            const childrenOrStringLiterals = children
                .filter(child => !ts.isJsxText(child) || child.text.trim() !== '')
                .map(child => ts.isJsxText(child) ?
                ts.createStringLiteral(child.text.trim()) :
                child);
            const arrayLiteral = ts.createArrayLiteral(childrenOrStringLiterals, true);
            return tstl.createCallExpression(createElement, [tag, props, this.transformArrayLiteral(arrayLiteral)], expression);
        }
        return tstl.createCallExpression(createElement, [tag, props], expression);
    }
    transformJsxAttributesExpression(expression) {
        if (expression.properties.find(element => element.kind === ts.SyntaxKind.JsxSpreadAttribute)) {
            throw new Error('Unsupported: JsxSpreadAttribute');
        }
        const properties = expression.properties
            .filter((element) => element.kind !== ts.SyntaxKind.JsxSpreadAttribute)
            .map(element => {
            const valueOrExpression = element.initializer ?
                element.initializer :
                ts.createLiteral(true);
            return ts.createPropertyAssignment(element.name, valueOrExpression);
        });
        return this.transformObjectLiteral(ts.createObjectLiteral(properties));
    }
    // ------------ Module wrapping
    transformSourceFile(sourceFile) {
        const block = super.transformSourceFile(sourceFile);
        if (this.isModule) {
            const moduleFunction = tstl.createFunctionExpression(block, undefined, undefined, undefined, tstl.FunctionExpressionFlags.None);
            const cwd = this.program.getCurrentDirectory();
            const moduleName = this.currentSourceFile.fileName.replace(cwd, '')
                .replace(/^\//, '') // remove leading slash
                .replace(/^\w*/, '') // remove first folder (root folder)
                .replace(/^\//, '') // remove leading slash
                .replace(/\.tsx?$/, '')
                .replace(/\//g, '.');
            // console.log(moduleName);
            // tstl_register_module("module/name", function() ... end)
            const moduleCallExpression = tstl.createCallExpression(tstl.createIdentifier('tstl_register_module'), [tstl.createStringLiteral(moduleName), moduleFunction]);
            return tstl.createBlock([tstl.createExpressionStatement(moduleCallExpression)]);
        }
        return block;
    }
}
exports.CustomTransformer = CustomTransformer;
//# sourceMappingURL=WowCustomTransformer.js.map