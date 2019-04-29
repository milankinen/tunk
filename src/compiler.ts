import { parse } from "@babel/parser"
import traverse, { NodePath } from "@babel/traverse"
import * as t from "@babel/types"
import * as _ from "lodash"
import * as optimizer from "./optimizer"
import { createRuntimeImportsDeclaration } from "./runtimeImports"
import { createTree, VTree } from "./vtree"

export function compile(source: string): t.File {
  const ast = parse(source, { plugins: ["jsx"] })
  transform(ast)
  return ast
}

function transform(file: t.File): void {
  const jsxBlocks: JsxBlock[] = []
  const stack: any[] = []
  const current = () => stack[stack.length - 1]
  const enter = (frame: any) => stack.push(frame)
  const exit = () => stack.pop()
  let program: NodePath<t.Program> = null as any

  traverse(file, {
    Program: {
      enter(path) {
        program = path
        enter(program)
      },
      exit(_) {
        if (jsxBlocks.length > 0) {
          const [runtimeImportDecl, runtimeImports] = createRuntimeImportsDeclaration(program)
          program.get("body")[0].insertBefore(runtimeImportDecl)
          jsxBlocks.forEach(block => {
            const declaration = optimizer.createOptimizedBlockDeclaration(
              block.ident,
              block.vtree,
              runtimeImports,
            )
            const binding = program.scope.getBinding(block.ident.name)
            if (binding === undefined) {
              throw new Error(`Bug: can't find binding for block: ${block.ident.name}`)
            } else {
              const assignDecl = t.assignmentExpression("=", block.ident, declaration)
              binding.path.parentPath.insertAfter(assignDecl)
            }
          })
        }
        program = null as any
        exit()
      },
    },
    JSXElement: {
      enter(path) {
        if (current() instanceof JsxRoot) {
          return
        } else {
          enter(new JsxRoot(path))
        }
      },
      exit(path) {
        const frame = current()
        if (frame instanceof JsxRoot && frame.path === path) {
          const vtree = createTree(path.node)
          const phValues = _.chain(vtree.placeholders)
            .sortBy(ph => ph.index)
            .map(ph => ph.value)
            .valueOf()
          const identForThisBlock = program.scope.generateDeclaredUidIdentifier(
            optimizer.IDENTIFIER,
          )
          path.replaceWith(
            optimizer.createOptimizedBlockInstantiationExpr(identForThisBlock, phValues),
          )
          jsxBlocks.push({
            ident: identForThisBlock,
            vtree,
          })
          exit()
        }
      },
    },
  })
}

class JsxRoot {
  constructor(public path: NodePath<t.JSXElement>) {}
}

interface JsxBlock {
  ident: t.Identifier
  vtree: VTree
}
