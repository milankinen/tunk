import { NodePath } from "@babel/traverse"
import * as t from "@babel/types"

export interface RuntimeImports {
  createElement: t.Identifier
  createTextNode: t.Identifier
  mountPlaceholder: t.Identifier
  appendTo: t.Identifier
}

export function createRuntimeImportsDeclaration(
  program: NodePath<t.Program>,
): [t.ImportDeclaration, RuntimeImports] {
  const imports = {} as any
  const specifiers: t.ImportSpecifier[] = []
  const importNames = ["createElement", "createTextNode", "mountPlaceholder", "appendTo"]
  importNames.forEach(name => {
    imports[name] = program.scope.generateUidIdentifier(name)
    specifiers.push(t.importSpecifier(imports[name], t.identifier(name)))
  })
  const decl = t.importDeclaration(specifiers, t.stringLiteral("@tunk/runtime"))
  return [decl, imports]
}
