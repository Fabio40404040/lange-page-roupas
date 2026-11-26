import assert from 'node:assert/strict';
const memory=new Map();
globalThis.localStorage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
globalThis.window={dispatchEvent(){}};
const {demoSupportRequest: request,demoSupportEvents: events}=await import('../src/lib/support-demo.js');
request('customer','alice@example.com','Alice','','POST',{message:'Gostaria de acompanhar minha compra.'});
let threads=request('admin','','','','GET',{},{}).threads;
assert.equal(threads.length,1); assert.equal(threads[0].unread_count,1);
const id=threads[0].id;
assert.equal(request('customer','bob@example.com','Bob','','GET').thread,null);
assert.equal(events('admin').length,1);
request('admin','','',id,'POST',{message:'Olá, Alice! Podemos ajudar.'});
assert.equal(events('customer','alice@example.com').length,1);
assert.equal(events('customer','bob@example.com').length,0);
const messages=request('customer','alice@example.com','Alice','','GET').messages;
assert.equal(messages.length,2); assert.equal(messages[1].sender_role,'admin');
request('customer','alice@example.com','Alice','','POST',{action:'read',throughId:messages.at(-1).id});
assert.equal(events('customer','alice@example.com').length,0);
request('admin','','',id,'PATCH',{action:'status',status:'resolved'});
assert.equal(request('admin','','','','GET',{}, {status:'resolved'}).threads.length,1);
request('customer','alice@example.com','Alice','','POST',{message:'Mais uma dúvida.'});
assert.equal(request('customer','alice@example.com','Alice','','GET').thread.status,'open');
assert.throws(()=>request('customer','alice@example.com','Alice','','POST',{message:' '}),/Escreva/);
console.log('OK: suporte demonstrativo local conecta cliente/admin, isola e-mails, avisa resposta e resolve/reabre sem chamadas externas.');
// Exercita o formulário e a caixa de entrada reais com DOM mínimo.
const {readFile}=await import('node:fs/promises'); const vm=await import('node:vm');
const source=(await readFile(new URL('../src/lib/support-ui.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
const createUI=(role)=>{
 const nodes=new Map();
 const node=key=>{
  if(!nodes.has(key))nodes.set(key,{innerHTML:'',textContent:'',value:key==='[data-support-filter]'?'all':'',hidden:false,handlers:{},addEventListener(event,handler){this.handlers[event]=handler;},querySelector:node,scrollTop:0,scrollHeight:100});
  return nodes.get(key);
 };
 const mount=node('mount'); mount.closest=()=>({}); mount.elements={};
 node('[data-support-form]').elements={message:{value:''}};
 const context={document:{visibilityState:'visible'},window:{addEventListener(){}},setInterval(){},setTimeout(){},URLSearchParams,console,
  html:value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])),
  demoSupportRequest:request,SUPPORT_DEMO_KEY:'demo',confirm:()=>true};
 vm.createContext(context);vm.runInContext(source,context);
 const ui=context.bindSupport({mount,role,demo:true,email:'alice@example.com',name:'Alice'});
 return {ui,node,mount};
};
const clientUI=createUI('customer'),adminUI=createUI('admin');
await clientUI.ui.refresh();
clientUI.node('[data-support-form]').elements.message.value='<script>alert(1)</script> Qual o prazo?';
await clientUI.node('[data-support-form]').handlers.submit({preventDefault(){}});
assert.equal(clientUI.node('[data-support-form]').elements.message.value,'');
await adminUI.ui.refresh();
assert.match(adminUI.node('[data-support-threads]').innerHTML,/Alice/);
await adminUI.ui.open(id);
assert.match(adminUI.node('[data-support-messages]').innerHTML,/&lt;script&gt;/);
assert.ok(!adminUI.node('[data-support-messages]').innerHTML.includes('<script>'));
adminUI.node('[data-support-form]').elements.message.value='Sua entrega está em preparação.';
await adminUI.node('[data-support-form]').handlers.submit({preventDefault(){}});
await clientUI.ui.refresh();
assert.match(clientUI.node('[data-support-messages]').innerHTML,/Sua entrega está em preparação/);
assert.equal(events('customer','alice@example.com').length,0,'Abrir a conversa marca apenas mensagens já exibidas');
console.log('OK: formulários e caixa de entrada reais enviam/responderem e escapam HTML; leitura ocorre ao abrir conversa visível.');
