// Swaps react-native Text/TextInput imports for the translating wrappers in src/i18n/Text.js.
const fs = require('fs'), path = require('path')
const root = path.join(__dirname, '../..')
const parser = require(root + '/node_modules/@babel/parser')
const files = require('child_process').execSync(`cd ${root} && find src App.js -name "*.js"`).toString().trim().split('\n').filter((f) => !f.startsWith('src/i18n/'))
let changed = 0
for (const f of files) {
  const file = path.join(root, f); let code = fs.readFileSync(file, 'utf8')
  const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] })
  const decl = ast.program.body.find((n) => n.type === 'ImportDeclaration' && n.source.value === 'react-native')
  if (!decl) continue
  const moved = decl.specifiers.filter((s) => s.type === 'ImportSpecifier' && ['Text', 'TextInput'].includes(s.imported.name) && s.local.name === s.imported.name).map((s) => s.local.name)
  if (!moved.length) continue
  const rest = decl.specifiers.filter((s) => !moved.includes(s.local.name) || s.type !== 'ImportSpecifier')
  let rel = path.relative(path.dirname(file), path.join(root, 'src/i18n/Text')); if (!rel.startsWith('.')) rel = './' + rel
  const restText = rest.map((s) => code.slice(s.start, s.end)).join(', ')
  const replacement = (rest.length ? `import { ${restText} } from 'react-native'\n` : '') + `import { ${moved.join(', ')} } from '${rel}'`
  code = code.slice(0, decl.start) + replacement + code.slice(decl.end)
  fs.writeFileSync(file, code); changed++
}
console.log('files changed', changed)
