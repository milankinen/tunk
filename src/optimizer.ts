import template from "@babel/template"
import * as t from "@babel/types"
import { RuntimeImports } from "./runtimeImports"
import { flatten, Placeholder, VNode, VTree } from "./vtree"

export const IDENTIFIER = "___jsx$"

/**
 * Creates an expression that instantates the optimized JSX block
 * node in JavaScript runtime code.
 *
 * @param ident Identifier to the optimized jsx block
 * @param bindings Actual placeholder values to bind to this block instance
 */
export function createOptimizedBlockInstantiationExpr(
  ident: t.Identifier,
  bindings: t.Expression[],
): t.Expression {
  return t.callExpression(ident, bindings)
}

const _jsxBlockBody = template(`
return {
  p: PLACEHOLDERS,
  m: MOUNT
};
`)

/**
 * Creates an optimized JSX block declaration for the given identifier and
 * virtual dom tree that can be used to instantiate blocks in runtime.
 *
 * @param ident Identifier of the optimized block
 * @param vtree Parsed virtual dom tree that is used to create the block
 * @param imports Identifiers to the runtime helper functions
 */
export function createOptimizedBlockDeclaration(
  ident: t.Identifier,
  vtree: VTree,
  imports: RuntimeImports,
): t.FunctionExpression {
  const args = vtree.placeholders.map(placeholderIdent)
  const body = _jsxBlockBody({
    PLACEHOLDERS: args.length === 0 ? t.nullLiteral() : t.arrayExpression(args),
    MOUNT: createMountFunction(ident, vtree, imports),
  })
  return t.functionExpression(ident, args, t.blockStatement([body as any]))
}

export function createMountFunction(
  blockIdent: t.Identifier,
  vtree: VTree,
  imports: RuntimeImports,
): t.Expression {
  const statements: t.Statement[] = []
  const nodeIdents: t.Identifier[] = []
  const nodeToIdent = new Map<VNode | null, t.Identifier>()
  flatten(vtree.root).forEach(({ node, parent }, idx) => {
    const [nodeIdent, nodeCreateExpr] = createNode(node, idx, imports)
    const parentIdent = nodeToIdent.get(parent)
    nodeToIdent.set(node, nodeIdent)
    nodeIdents.push(nodeIdent)
    statements.push(
      t.variableDeclaration("const", [
        t.variableDeclarator(
          nodeIdent,
          parentIdent ? appendTo(parentIdent, nodeCreateExpr, imports) : nodeCreateExpr,
        ),
      ]),
    )
  })
  statements.push(t.returnStatement(t.arrayExpression(nodeIdents)))
  return t.functionExpression(
    t.identifier(blockIdent.name + "$mount"),
    [],
    t.blockStatement(statements),
  )
}

function createNode(
  node: VNode,
  idx: number,
  imports: RuntimeImports,
): [t.Identifier, t.Expression] {
  switch (node.type) {
    case "element":
      return [
        t.identifier(node.tag.toLowerCase() + "_" + idx),
        t.callExpression(imports.createElement, [t.stringLiteral(node.tag.toUpperCase())]),
      ]
    case "text":
      return [
        t.identifier("$t_" + idx),
        t.callExpression(imports.createTextNode, [t.stringLiteral(node.value)]),
      ]
    case "placeholder":
      return [
        t.identifier("$_" + idx),
        t.callExpression(imports.mountPlaceholder, [placeholderIdent(node)]),
      ]
    default:
      throw new Error("Not supported node type")
  }
}

function appendTo(
  parentIdent: t.Identifier,
  nodeCreateExpr: t.Expression,
  imports: RuntimeImports,
): t.Expression {
  return t.callExpression(imports.appendTo, [parentIdent, nodeCreateExpr])
}

function placeholderIdent(placeholder: Placeholder): t.Identifier {
  return t.identifier("placeholder$" + placeholder.index)
}
