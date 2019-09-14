"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
var LuaLibFeature;
(function (LuaLibFeature) {
    LuaLibFeature["ArrayConcat"] = "ArrayConcat";
    LuaLibFeature["ArrayEvery"] = "ArrayEvery";
    LuaLibFeature["ArrayFilter"] = "ArrayFilter";
    LuaLibFeature["ArrayForEach"] = "ArrayForEach";
    LuaLibFeature["ArrayFindIndex"] = "ArrayFindIndex";
    LuaLibFeature["ArrayIndexOf"] = "ArrayIndexOf";
    LuaLibFeature["ArrayMap"] = "ArrayMap";
    LuaLibFeature["ArrayPush"] = "ArrayPush";
    LuaLibFeature["ArrayReduce"] = "ArrayReduce";
    LuaLibFeature["ArrayReverse"] = "ArrayReverse";
    LuaLibFeature["ArrayShift"] = "ArrayShift";
    LuaLibFeature["ArrayUnshift"] = "ArrayUnshift";
    LuaLibFeature["ArraySort"] = "ArraySort";
    LuaLibFeature["ArraySlice"] = "ArraySlice";
    LuaLibFeature["ArraySome"] = "ArraySome";
    LuaLibFeature["ArraySplice"] = "ArraySplice";
    LuaLibFeature["ArrayToObject"] = "ArrayToObject";
    LuaLibFeature["ArrayFlat"] = "ArrayFlat";
    LuaLibFeature["ArrayFlatMap"] = "ArrayFlatMap";
    LuaLibFeature["ArraySetLength"] = "ArraySetLength";
    LuaLibFeature["ClassIndex"] = "ClassIndex";
    LuaLibFeature["ClassNewIndex"] = "ClassNewIndex";
    LuaLibFeature["Decorate"] = "Decorate";
    LuaLibFeature["FunctionApply"] = "FunctionApply";
    LuaLibFeature["FunctionBind"] = "FunctionBind";
    LuaLibFeature["FunctionCall"] = "FunctionCall";
    LuaLibFeature["Index"] = "Index";
    LuaLibFeature["InstanceOf"] = "InstanceOf";
    LuaLibFeature["InstanceOfObject"] = "InstanceOfObject";
    LuaLibFeature["Iterator"] = "Iterator";
    LuaLibFeature["Map"] = "Map";
    LuaLibFeature["NewIndex"] = "NewIndex";
    LuaLibFeature["Number"] = "Number";
    LuaLibFeature["NumberIsFinite"] = "NumberIsFinite";
    LuaLibFeature["NumberIsNaN"] = "NumberIsNaN";
    LuaLibFeature["ObjectAssign"] = "ObjectAssign";
    LuaLibFeature["ObjectEntries"] = "ObjectEntries";
    LuaLibFeature["ObjectFromEntries"] = "ObjectFromEntries";
    LuaLibFeature["ObjectKeys"] = "ObjectKeys";
    LuaLibFeature["ObjectRest"] = "ObjectRest";
    LuaLibFeature["ObjectValues"] = "ObjectValues";
    LuaLibFeature["Set"] = "Set";
    LuaLibFeature["WeakMap"] = "WeakMap";
    LuaLibFeature["WeakSet"] = "WeakSet";
    LuaLibFeature["SourceMapTraceBack"] = "SourceMapTraceBack";
    LuaLibFeature["Spread"] = "Spread";
    LuaLibFeature["StringConcat"] = "StringConcat";
    LuaLibFeature["StringEndsWith"] = "StringEndsWith";
    LuaLibFeature["StringPadEnd"] = "StringPadEnd";
    LuaLibFeature["StringPadStart"] = "StringPadStart";
    LuaLibFeature["StringReplace"] = "StringReplace";
    LuaLibFeature["StringSplit"] = "StringSplit";
    LuaLibFeature["StringStartsWith"] = "StringStartsWith";
    LuaLibFeature["Symbol"] = "Symbol";
    LuaLibFeature["SymbolRegistry"] = "SymbolRegistry";
    LuaLibFeature["TypeOf"] = "TypeOf";
})(LuaLibFeature = exports.LuaLibFeature || (exports.LuaLibFeature = {}));
const luaLibDependencies = {
    ArrayFlat: [LuaLibFeature.ArrayConcat],
    ArrayFlatMap: [LuaLibFeature.ArrayConcat],
    InstanceOf: [LuaLibFeature.Symbol],
    Iterator: [LuaLibFeature.Symbol],
    ObjectFromEntries: [LuaLibFeature.Iterator, LuaLibFeature.Symbol],
    Map: [LuaLibFeature.InstanceOf, LuaLibFeature.Iterator, LuaLibFeature.Symbol],
    Set: [LuaLibFeature.InstanceOf, LuaLibFeature.Iterator, LuaLibFeature.Symbol],
    WeakMap: [LuaLibFeature.InstanceOf, LuaLibFeature.Iterator, LuaLibFeature.Symbol],
    WeakSet: [LuaLibFeature.InstanceOf, LuaLibFeature.Iterator, LuaLibFeature.Symbol],
    Spread: [LuaLibFeature.Iterator],
    SymbolRegistry: [LuaLibFeature.Symbol],
};
function loadLuaLibFeatures(features, emitHost) {
    let result = "";
    const loadedFeatures = new Set();
    function load(feature) {
        if (loadedFeatures.has(feature))
            return;
        loadedFeatures.add(feature);
        const dependencies = luaLibDependencies[feature];
        if (dependencies) {
            dependencies.forEach(load);
        }
        const featureFile = path.resolve(__dirname, `../dist/lualib/${feature}.lua`);
        const luaLibFeature = emitHost.readFile(featureFile);
        if (luaLibFeature !== undefined) {
            result += luaLibFeature + "\n";
        }
        else {
            throw new Error(`Could not read lualib feature ../dist/lualib/${feature}.lua`);
        }
    }
    for (const feature of features) {
        load(feature);
    }
    return result;
}
exports.loadLuaLibFeatures = loadLuaLibFeatures;
//# sourceMappingURL=LuaLib.js.map