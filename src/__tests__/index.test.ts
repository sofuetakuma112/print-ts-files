import { vol } from "memfs";

import { printFileContents, tryResolveImport } from "../index";

// memfsのモックを設定
jest.mock("fs", () => {
  const actualFs = jest.requireActual("fs");
  return {
    ...actualFs,
    existsSync: (path: string) => vol.existsSync(path),
    readFileSync: (path: string, options: any) => vol.readFileSync(path, options),
    statSync: (path: string) => vol.statSync(path),
  };
});

// console.logのモック
let consoleOutput: string[] = [];
const originalLog = console.log;

describe("print-ts-files", () => {
  beforeEach(() => {
    consoleOutput = [];
    console.log = jest.fn().mockImplementation((output: string) => {
      if (output === "") {
        consoleOutput.push("");
      } else {
        consoleOutput.push(output.trim());
      }
    });
    vol.reset();
  });

  afterEach(() => {
    console.log = originalLog;
  });

  describe("tryResolveImport", () => {
    const mockFileSystem = {
      "/project/src/index.ts": "",
      "/project/src/components/Button.tsx": "",
      "/project/src/utils/helper/index.ts": "",
      "/project/src/types.d.ts": "",
    };

    beforeEach(() => {
      vol.fromJSON({
        "/project/src/index.ts": "content",
        "/project/src/components/Button.tsx": "content",
        "/project/src/utils/helper/index.ts": "content",
        "/project/src/types.d.ts": "content",
      });
    });

    test("resolves direct .ts file", () => {
      const result = tryResolveImport(
        "/project/src/components/Button.tsx",
        "../index",
      );
      expect(result).toBe("/project/src/index.ts");
    });

    test("resolves .tsx file", () => {
      const result = tryResolveImport(
        "/project/src/index.ts",
        "./components/Button",
      );
      expect(result).toBe("/project/src/components/Button.tsx");
    });

    test("resolves index file in directory", () => {
      const result = tryResolveImport(
        "/project/src/index.ts",
        "./utils/helper",
      );
      expect(result).toBe("/project/src/utils/helper/index.ts");
    });

    test("returns null for non-existent file", () => {
      const result = tryResolveImport(
        "/project/src/index.ts",
        "./non-existent",
      );
      expect(result).toBeNull();
    });
  });

  describe("printFileContents", () => {
    const mockFileSystem = {
      "/project/src/index.ts": [
        "import { Button } from \"./components/Button\";",
        "import { helper } from \"./utils/helper\";",
        "",
        "export const App = () => {",
        "  return <Button />;",
        "};",
      ].join("\n"),
      "/project/src/components/Button.tsx": [
        "import { helper } from \"../utils/helper\";",
        "",
        "export const Button = () => {",
        "  return <button onClick={helper}>Click me</button>;",
        "};",
      ].join("\n"),
      "/project/src/utils/helper/index.ts": [
        "export const helper = () => {",
        "  console.log(\"Helper function called\");",
        "};",
      ].join("\n"),
    };

    beforeEach(() => {
      vol.fromJSON(mockFileSystem);
    });

    test("prints main file and its imports", () => {
      printFileContents("/project/src/index.ts");

      expect(consoleOutput).toEqual([
        "// /project/src/index.ts",
        mockFileSystem["/project/src/index.ts"],
        "",
        "// /project/src/components/Button.tsx",
        mockFileSystem["/project/src/components/Button.tsx"],
        "",
        "// /project/src/utils/helper/index.ts",
        mockFileSystem["/project/src/utils/helper/index.ts"],
        "",
      ]);
    });

    test("handles circular dependencies", () => {
      const circularFileSystem = {
        "/project/src/circular1.ts": "import \"./circular2\";",
        "/project/src/circular2.ts": "import \"./circular1\";",
      };
      vol.fromJSON(circularFileSystem);

      printFileContents("/project/src/circular1.ts");

      const circular1Count = consoleOutput.filter(
        line => typeof line === "string" && line.includes("circular1.ts"),
      ).length;
      const circular2Count = consoleOutput.filter(
        line => typeof line === "string" && line.includes("circular2.ts"),
      ).length;

      expect(circular1Count).toBe(1);
      expect(circular2Count).toBe(1);
    });

    test("handles non-existent imports gracefully", () => {
      const fileWithBadImport = {
        "/project/src/bad-import.ts": "import { something } from \"./non-existent\";",
      };
      vol.fromJSON(fileWithBadImport);

      printFileContents("/project/src/bad-import.ts");

      expect(consoleOutput).toContain("// /project/src/bad-import.ts");
      expect(consoleOutput).toContain(fileWithBadImport["/project/src/bad-import.ts"]);
    });
  });
});
