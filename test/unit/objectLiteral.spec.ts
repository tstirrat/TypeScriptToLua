import * as util from "../util";

test.each([
    { inp: `{a:3,b:"4"}`, out: '{a = 3, b = "4"}' },
    { inp: `{"a":3,b:"4"}`, out: '{a = 3, b = "4"}' },
    { inp: `{["a"]:3,b:"4"}`, out: '{a = 3, b = "4"}' },
    { inp: `{["a"+123]:3,b:"4"}`, out: '{["a" .. 123] = 3, b = "4"}' },
    { inp: `{[myFunc()]:3,b:"4"}`, out: '{\n    [myFunc(_G)] = 3,\n    b = "4"\n}' },
    { inp: `{x}`, out: `{x = x}` },
])("Object Literal (%p)", ({ inp, out }) => {
    const lua = util.transpileString(`const myvar = ${inp};`);
    expect(lua).toBe(`local myvar = ${out}`);
});

describe("property shorthand", () => {
    test("should support property shorthand", () => {
        const result = util.transpileAndExecute(`
            const x = 1;
            const o = { x };
            return o.x;
        `);

        expect(result).toBe(1);
    });

    test.each([NaN, Infinity])("should support %p shorthand", identifier => {
        const result = util.transpileAndExecute(`return ({ ${identifier} }).${identifier}`);

        expect(result).toBe(identifier);
    });

    test("should support _G shorthand", () => {
        const result = util.transpileAndExecute(
            `return ({ _G })._G.foobar;`,
            undefined,
            `foobar = "foobar"`,
            "declare const _G: any;"
        );

        expect(result).toBe("foobar");
    });

    test("should support export property shorthand", () => {
        const code = `
            export const x = 1;
            const o = { x };
            export const y = o.x;
        `;
        expect(util.transpileExecuteAndReturnExport(code, "y")).toBe(1);
    });
});

test("undefined as object key", () => {
    const code = `const foo = {undefined: "foo"};
        return foo.undefined;`;
    expect(util.transpileAndExecute(code)).toBe("foo");
});

test.each([`({x: "foobar"}.x)`, `({x: "foobar"}["x"])`, `({x: () => "foobar"}.x())`, `({x: () => "foobar"}["x"]())`])(
    "object literal property access (%p)",
    expression => {
        const code = `return ${expression}`;
        const expectResult = eval(expression);
        expect(util.transpileAndExecute(code)).toBe(expectResult);
    }
);
