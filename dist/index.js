#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tryResolveImport = tryResolveImport;
exports.printFileContents = printFileContents;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ts = __importStar(require("typescript"));
function tryResolveImport(basePath, moduleSpecifier) {
    const possibleExtensions = [".ts", ".tsx", ".js", ".jsx"];
    const possibleIndexFiles = ["index.ts", "index.tsx", "index.js", "index.jsx"];
    const baseImportPath = path.resolve(path.dirname(basePath), moduleSpecifier);
    for (const ext of possibleExtensions) {
        const fullPath = baseImportPath + ext;
        if (fs.existsSync(fullPath)) {
            return fullPath;
        }
    }
    if (fs.existsSync(baseImportPath) && fs.statSync(baseImportPath).isDirectory()) {
        for (const indexFile of possibleIndexFiles) {
            const fullPath = path.join(baseImportPath, indexFile);
            if (fs.existsSync(fullPath)) {
                return fullPath;
            }
        }
    }
    return null;
}
function getAllImports(sourceFile) {
    const imports = [];
    function visit(node) {
        if (ts.isImportDeclaration(node)) {
            const moduleSpecifier = node.moduleSpecifier.text;
            if (!moduleSpecifier.startsWith("."))
                return;
            const resolvedPath = tryResolveImport(sourceFile.fileName, moduleSpecifier);
            imports.push(resolvedPath);
        }
        ts.forEachChild(node, visit);
    }
    visit(sourceFile);
    return imports;
}
function printFileContents(filePath, visited = new Set()) {
    if (visited.has(filePath))
        return;
    visited.add(filePath);
    try {
        const content = fs.readFileSync(filePath, "utf-8");
        // console.logを使用して出力
        console.log(`// ${filePath}`);
        console.log(content.trim());
        console.log("");
        const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
        const imports = getAllImports(sourceFile);
        for (const importPath of imports) {
            if (importPath) {
                printFileContents(importPath, visited);
            }
        }
    }
    catch (error) {
        console.error(`Error reading file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
}
// CLI として実行された場合のエントリーポイント
if (require.main === module) {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error("Please provide a TypeScript file path");
        process.exit(1);
    }
    printFileContents(path.resolve(filePath));
}
