const fs=require('fs'),path=require('path');
const root='/vercel/share/v0-project/mobile';
const parser=require(root+'/node_modules/@babel/parser');
const traverse=require(root+'/node_modules/@babel/traverse').default;
const files=require('child_process').execSync(`cd ${root} && find src App.js -name "*.js"`).toString().trim().split('\n');
const SKIP_ATTR=new Set(['style','name','testID','source','keyboardType','autoCapitalize','autoComplete','textContentType','resizeMode','contentFit','pointerEvents','returnKeyType','behavior','mode','color','tone','icon','variant','id','key','nativeID','importantForAccessibility','accessibilityRole','ellipsizeMode','barStyle','contentFit','presentationStyle','animationType','transition','tint','type','kind','route','screen','size','href','uri']);
const SKIP_KEY=new Set(['id','key','icon','route','screen','name','type','color','uri','url','tone','kind','variant','productId','sku','slug','provider','method','status','mode','gradient','tint','image','video','poster','iconName','tag','modelId','voiceId','code','lang','language_code','Content-Type','Authorization','Accept']);
const out=new Map();
const looksUI=s=>{const t=s.trim(); if(t.length<2) return false; if(!/[A-Za-zÀ-ÿ]/.test(t)) return false;
 if(/^(https?:|\/|\.\/|#|rgba?\(|[a-z0-9_.-]+$)/.test(t) && !/[À-ÿ]/.test(t)) return false;
 if(/^[a-z][a-zA-Z0-9]*$/.test(t)) return false; if(/^[A-Z0-9_]+$/.test(t)&&t.length>4) return false;
 if(/^[a-z0-9-]+(\/[a-z0-9-.]+)+$/.test(t)) return false;
 return /[\sÀ-ÿ’'!?…:.,]/.test(t)||/^[A-ZÀ-Ý]/.test(t);};
const add=(s,f,kind)=>{const t=s.replace(/\s+/g,' ').trim(); if(!looksUI(t)) return; if(!out.has(t)) out.set(t,{f:new Set(),kind}); out.get(t).f.add(path.basename(f));};
for(const f of files){const code=fs.readFileSync(path.join(root,f),'utf8');
 let ast; try{ast=parser.parse(code,{sourceType:'module',plugins:['jsx']});}catch(e){console.error('PARSE',f,e.message);continue;}
 traverse(ast,{
  JSXText(p){add(p.node.value,f,'jsx')},
  StringLiteral(p){const par=p.parent;
   if(par.type==='ImportDeclaration'||par.type==='ExportNamedDeclaration'||par.type==='ExportAllDeclaration') return;
   if(par.type==='CallExpression'&&par.callee.name==='require') return;
   if(par.type==='JSXAttribute'&&SKIP_ATTR.has(par.name.name)) return;
   if(par.type==='ObjectProperty'&&par.key===p.node) return;
   if(par.type==='ObjectProperty'&&par.value===p.node){const k=par.key.name||par.key.value; if(SKIP_KEY.has(k)) return;}
   if(par.type==='MemberExpression') return;
   if(par.type==='BinaryExpression'&&['===','!==','==','!='].includes(par.operator)) return;
   if(par.type==='SwitchCase') return;
   add(p.node.value,f,'str')},
  TemplateLiteral(p){if(p.parent.type==='TaggedTemplateExpression')return; const q=p.node.quasis; if(q.length===1){add(q[0].value.cooked,f,'str');return;}
   let s='';q.forEach((x,i)=>{s+=x.value.cooked; if(i<q.length-1) s+='{'+i+'}';});
   const letters=q.map(x=>x.value.cooked).join(' '); if(!/[A-Za-zÀ-ÿ]{3,}/.test(letters)) return; if(/^(https?:|\/|\{0\}\/)/.test(s)) return; add(s,f,'tpl')}
 });}
const arr=[...out.entries()].map(([k,v])=>({k,f:[...v.f].join(','),kind:v.kind}));
fs.writeFileSync(''+__dirname+'/strings.json',JSON.stringify(arr,null,0));
console.log(arr.length, arr.filter(a=>a.kind==='tpl').length);
