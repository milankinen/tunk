import generate from "@babel/generator"
import { compile } from "./compiler"

const code = `
function Example(name) {
  return (
    <div>
      <h1>Tsers!</h1>
      <p>Nice to meet u {name}</p>
    </div>
  )
}

function Second() {
  return <div>lolbal..</div>
}
`

const ast = compile(code)
console.log(generate(ast).code)
