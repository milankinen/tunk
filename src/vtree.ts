import * as t from "@babel/types"

/**
 * Creates an internal virtual dom tree representation from the
 * given JSXElement that can be used to generate optimized blocks
 * for the given element.
 *
 * @param rootElement Root element of the JSX block
 *
 */
export function createTree(rootElement: t.JSXElement): VTree {
  const placeholders: Placeholder[] = []
  const root = (function createRecur(elem: t.JSXElement): VNode {
    const tag =
      elem.openingElement.name.type === "JSXIdentifier" ? elem.openingElement.name.name : "TODO"
    const props = {}
    const children: VNode[] = elem.children
      .map(child => {
        switch (child.type) {
          case "JSXElement":
            return createRecur(child)
          case "JSXText":
            return {
              type: "text",
              value: child.value,
            } as TextNode
          case "JSXExpressionContainer":
            if (child.expression.type === "JSXEmptyExpression") {
              return {
                type: "todo",
                case: "JSXEmptyExpression",
              } as Todo
            } else {
              const placeholder = {
                type: "placeholder",
                value: child.expression,
                index: placeholders.length,
              } as Placeholder
              placeholders.push(placeholder)
              return placeholder
            }
          default:
            return {
              type: "todo",
              case: "default",
            } as Todo
        }
      })
      .filter(node => node.type !== "text" || /\S+/.test(node.value))
    return {
      type: "element",
      tag,
      props,
      children,
    }
  })(rootElement)
  return { root, placeholders }
}

/**
 * Flattens the given tree into list of vnodes.
 *
 * @param rootNode Root node of the flattened tree.
 */
export function flatten(rootNode: VNode): FlattenedVNode[] {
  return (function f(parent: VNode | null, node: VNode): FlattenedVNode[] {
    return [
      { node, parent },
      ...(node.type === "element"
        ? node.children.map(c => f(node, c)).reduce((s, a) => s.concat(a), [])
        : []),
    ]
  })(null, rootNode)
}

export interface FlattenedVNode {
  node: VNode
  parent: VNode | null
}

export type VNode = Element | TextNode | Placeholder | Todo

export interface VTree {
  root: VNode
  placeholders: Placeholder[]
}

export interface Element {
  type: "element"
  tag: string
  props: any
  children: VNode[]
}

export interface TextNode {
  type: "text"
  value: string
}

export interface Placeholder {
  type: "placeholder"
  value: t.Expression
  index: number
}

interface Todo {
  type: "todo"
  case: string
}
