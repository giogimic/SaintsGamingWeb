import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

function getAllFiles(dir: string, exts: string[]): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file.startsWith('.') || file === 'node_modules' || file === '.next' || file === 'dist') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, exts));
    } else if (exts.some((ext) => file.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = getAllFiles(path.join(process.cwd(), 'src'), ['.tsx', '.ts'])
  .concat(getAllFiles(path.join(process.cwd(), 'app'), ['.tsx', '.ts']))
  .concat(getAllFiles(path.join(process.cwd(), 'components'), ['.tsx', '.ts']));

function isHookName(name: string): boolean {
  return /^use[A-Z0-9]/.test(name);
}

interface Finding {
  file: string;
  line: number;
  character: number;
  type: string;
}

const findings: Finding[] = [];

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);

  function checkFunction(node: ts.Node, functionName: string) {
    let hasEarlyReturn = false;

    function walkStatements(statements: readonly ts.Statement[]) {
      for (const stmt of statements) {
        // Check if statement contains hook call inside conditional or loop
        if (
          ts.isIfStatement(stmt) ||
          ts.isIterationStatement(stmt, false) ||
          ts.isSwitchStatement(stmt) ||
          ts.isTryStatement(stmt)
        ) {
          function checkDescendantHooks(n: ts.Node) {
            if (ts.isCallExpression(n)) {
              let name = '';
              if (ts.isIdentifier(n.expression)) {
                name = n.expression.text;
              } else if (ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.name)) {
                name = n.expression.name.text;
              }
              if (isHookName(name)) {
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(n.getStart());
                findings.push({
                  file,
                  line: line + 1,
                  character: character + 1,
                  type: `Conditional hook call: '${name}' called inside conditional/loop block in function '${functionName}'`,
                });
              }
            }
            if (!ts.isFunctionDeclaration(n) && !ts.isFunctionExpression(n) && !ts.isArrowFunction(n)) {
              ts.forEachChild(n, checkDescendantHooks);
            }
          }
          ts.forEachChild(stmt, checkDescendantHooks);
        }

        // Check if statement is a return statement or if with return
        if (ts.isReturnStatement(stmt)) {
          hasEarlyReturn = true;
        } else if (ts.isIfStatement(stmt)) {
          function containsReturn(n: ts.Node): boolean {
            if (ts.isReturnStatement(n)) return true;
            if (ts.isBlock(n)) {
              return n.statements.some(containsReturn);
            }
            return false;
          }
          if (containsReturn(stmt.thenStatement) || (stmt.elseStatement && containsReturn(stmt.elseStatement))) {
            hasEarlyReturn = true;
          }
        }

        // Check top-level hook calls after early return
        if (hasEarlyReturn) {
          function checkHooksAfterReturn(n: ts.Node) {
            if (ts.isCallExpression(n)) {
              let name = '';
              if (ts.isIdentifier(n.expression)) {
                name = n.expression.text;
              } else if (ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.name)) {
                name = n.expression.name.text;
              }
              if (isHookName(name)) {
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(n.getStart());
                findings.push({
                  file,
                  line: line + 1,
                  character: character + 1,
                  type: `Hook after return: '${name}' called after early return in function '${functionName}'`,
                });
              }
            }
            if (!ts.isFunctionDeclaration(n) && !ts.isFunctionExpression(n) && !ts.isArrowFunction(n)) {
              ts.forEachChild(n, checkHooksAfterReturn);
            }
          }
          if (!ts.isReturnStatement(stmt)) {
            checkHooksAfterReturn(stmt);
          }
        }
      }
    }

    if ('body' in node && node.body && ts.isBlock(node.body as ts.Node)) {
      walkStatements((node.body as ts.Block).statements);
    }
  }

  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node)) {
      checkFunction(node, node.name ? node.name.text : 'anonymous');
    } else if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      let name = 'anonymous';
      if (node.parent && ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
        name = node.parent.name.text;
      }
      checkFunction(node, name);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

if (findings.length > 0) {
  console.error(`\x1b[31m[Hook Validator] FAILED: ${findings.length} React Hook rule violations found:\x1b[0m`);
  for (const f of findings) {
    console.error(`  - \x1b[33m${f.file}:${f.line}:${f.character}\x1b[0m -> ${f.type}`);
  }
  process.exit(1);
} else {
  console.log('\x1b[32m[Hook Validator] PASSED: 0 React Hook rule violations detected across the codebase.\x1b[0m');
  process.exit(0);
}
