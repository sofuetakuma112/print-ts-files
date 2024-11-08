import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

export function tryResolveImport(basePath: string, moduleSpecifier: string): string | null {
  const possibleExtensions = [".ts", ".tsx", ".js", ".jsx"];
  const possibleIndexFiles = ["index.ts", "index.tsx", "index.js", "index.jsx"];

  const baseImportPath = path.resolve(
    path.dirname(basePath),
    moduleSpecifier,
  );

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

function getAllImports(sourceFile: ts.SourceFile): Array<string | null> {
  const imports: Array<string | null> = [];

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;
      if (!moduleSpecifier.startsWith(".")) return;

      const resolvedPath = tryResolveImport(sourceFile.fileName, moduleSpecifier);
      imports.push(resolvedPath);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}

export function printFileContents(filePath: string, visited: Set<string> = new Set()): void {
  if (visited.has(filePath)) return;
  visited.add(filePath);

  try {
    const content = fs.readFileSync(filePath, "utf-8");

    // console.logを使用して出力
    console.log(`// ${filePath}`);
    console.log(content.trim());
    console.log("");

    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
    );

    const imports = getAllImports(sourceFile);
    for (const importPath of imports) {
      if (importPath) {
        printFileContents(importPath, visited);
      }
    }
  } catch (error) {
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
