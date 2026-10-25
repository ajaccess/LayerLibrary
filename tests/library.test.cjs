const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('src/app.js','utf8');
function app(){
 const dom=new JSDOM(fs.readFileSync('src/index.html','utf8'),{url:'https://local.test',runScripts:'outside-only'});
 const w=dom.window;w.File=File;w.Blob=Blob;w.TextDecoder=TextDecoder;w.TextEncoder=TextEncoder;
 Object.defineProperty(w,'crypto',{value:require('node:crypto').webcrypto});w.DecompressionStream=DecompressionStream;
 w.URL.createObjectURL=()=>`blob:test-${Math.random()}`;w.URL.revokeObjectURL=()=>{};
 w.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 w.eval(source+"\nwindow.stateEval=(code)=>eval(code);");return w;
}
test('startup, conflict policies, alias preserves original path',()=>{const w=app();try{
 const a=new File(['old'],'part.stl'),b=new File(['new'],'part.stl');
 for(const policy of ['skip','replace','keep']){const p=w.planImport([a],[b],'add',policy);assert.equal(p.conflicts,1);assert.equal(p.files.length,policy==='keep'?2:1);if(policy==='keep'){assert.equal(p.files[1].name,'part (2).stl');assert.equal(p.files[1].originalRelativePath,'part.stl')}else assert.equal(p.files[0],policy==='skip'?a:b)}
 assert.equal(w.planImport([a],[b],'replace','keep').files.length,1);
 assert.equal(w.document.querySelectorAll('.empty').length,1);
 }finally{w.close()}});
test('cancel and unexpected failure preserve committed library',async()=>{const w=app();try{
 await w.loadLocal([new File(['solid a\nendsolid'],'a.stl')]);
 assert.equal(w.stateEval('items[0].file'),'a.stl');
 const pending=w.loadLocal([new File(['solid b'],'b.stl')]);w.cancelImport();assert.equal(await pending,false);assert.equal(w.stateEval('items[0].file'),'a.stl');
 w.stateEval('inspectLocal=async()=>{throw Error("test failure")}');assert.equal(await w.loadLocal([new File(['x'],'c.stl')]),false);assert.equal(w.stateEval('localFiles[0].name'),'a.stl');
 }finally{w.close()}});
test('sort and filtered export span pages; bad archive has visible report',async()=>{const w=app();try{
 const files=Array.from({length:30},(_,i)=>new File(['solid '+i],'part'+i+'.stl'));await w.loadLocal(files);
 assert.equal(w.document.querySelectorAll('.card').length,25);
 w.document.getElementById('export-scope').value='filtered';assert.equal(w.exportProjects().length,30);
 w.document.getElementById('sort').value='name-desc';assert.equal(w.filteredProjects()[0].file,'part29.stl');
 w.document.getElementById('search').value='part29';assert.equal(w.exportProjects().length,1);
 await w.loadLocal([new File(['invalid'],'broken.3mf')]);assert.equal(w.document.getElementById('import-report').hidden,false);assert.match(w.document.getElementById('import-report-body').textContent,/broken.3mf/);
 }finally{w.close()}});
test('export filename and saved records round trip',async()=>{const w=app();try{
 assert.equal(w.exportFileName('CON'),'Library-CON.html');assert.equal(w.exportFileName('My/library.html'),'My-library.html');
 const f=w.fileFromRecord({name:'part (2).stl',path:'Parts/part (2).stl',originalPath:'Parts/part.stl',data:Buffer.from('mesh').toString('base64')});assert.equal(await f.text(),'mesh');assert.equal(f.originalRelativePath,'Parts/part.stl');assert.equal(w.importFilePath(f),'Parts/part (2).stl');
 }finally{w.close()}});
test('page exit releases session references without writing browser storage',async()=>{const w=app();try{
 await w.loadLocal([new File(['solid x'],'x.stl')]);w.dispatchEvent(new w.Event('pagehide'));assert.equal(w.stateEval('items.length'),0);assert.equal(w.stateEval('localFiles.length'),0);assert.equal(w.localStorage.length,0);assert.equal(w.document.cookie,'');
 }finally{w.close()}});
test('public build contains only the original licensed sample and no external scripts',()=>{
 const html=fs.readFileSync('dist/LayerLibrary.html','utf8');const dom=new JSDOM(html);const snapshot=JSON.parse(dom.window.document.getElementById('saved-library').textContent);assert.equal(snapshot.files.length,1);assert.equal(snapshot.files[0].name,'Layer Tower.stl');assert.deepEqual(Buffer.from(snapshot.files[0].data,'base64'),fs.readFileSync('examples/Layer Tower.stl'));assert.equal(dom.window.document.querySelectorAll('script[src]').length,0);assert.match(html,/Copyright \(c\) 2026 LayerLibrary/);dom.window.close();
});

test('deletion rechecks contents and rejects traversal',async()=>{const w=app();try{
 const original=new File(['original'],'a.stl');const hash=await w.hashFile(original);let removed=0,current=original;
 const target={name:'a.stl',parent:{getFileHandle:async()=>({getFile:async()=>current}),removeEntry:async()=>removed++}};
 await w.verifiedDelete(target,hash);assert.equal(removed,1);current=new File(['changed'],'a.stl');await assert.rejects(w.verifiedDelete(target,hash),/changed/);assert.equal(removed,1);await assert.rejects(w.locateOriginal({},'../a.stl'),/Invalid/);
 }finally{w.close()}});
test('portable export embeds only filtered models and safely escapes names',async()=>{const w=app();try{
 let output;w.URL.createObjectURL=blob=>{if(blob.type==='text/html')output=blob;return 'blob:export'};w.HTMLAnchorElement.prototype.click=function(){};
 w.FileReader=class{readAsDataURL(blob){blob.arrayBuffer().then(bytes=>{this.result='data:application/octet-stream;base64,'+Buffer.from(bytes).toString('base64');this.onload()})}};
 await w.loadLocal([new File(['one'],'one.stl'),new File(['two'],'two.stl')]);w.savePortable();w.document.getElementById('export-name').value='A </script> library';w.document.getElementById('export-scope').value='filtered';w.document.getElementById('search').value='two';await w.document.getElementById('export-go').onclick();
 assert.ok(output);const html=await output.text();const parsed=new JSDOM(html);const snapshot=JSON.parse(parsed.window.document.getElementById('saved-library').textContent);assert.equal(snapshot.files.length,1);assert.equal(snapshot.files[0].path,'two.stl');assert.equal(snapshot.name,'A </script> library');assert.equal(Buffer.from(snapshot.files[0].data,'base64').toString(),'two');parsed.window.close();
 }finally{w.close()}});
test('folder drops read every batch and preserve nested categories through saved records',async()=>{const w=app();try{
 const file=name=>({name,isFile:true,file:ok=>ok(new File(['solid mesh'],name))});
 const dir=(name,batches)=>({name,isDirectory:true,createReader:()=>{let n=0;return {readEntries:ok=>ok(batches[n++]||[])}}});
 const root=dir('Models',[[dir('Tools',[[file('tool.stl')],[dir('Small',[[file('mini.stl')]])]])],[dir('Art',[[file('art.obj')]])]]);
 const dropped=await w.droppedFiles({items:[{kind:'file',webkitGetAsEntry:()=>root,getAsFile:()=>null}]});
 assert.equal(dropped.hasFolder,true);assert.deepEqual(Array.from(dropped.files,w.importFilePath),['Tools/tool.stl','Tools/Small/mini.stl','Art/art.obj']);
 await w.loadLocal(dropped.files);
 const buttons=[...w.document.querySelectorAll('#categories button')];const tools=buttons.find(b=>b.title==='Tools'),small=buttons.find(b=>b.title==='Tools/Small');assert.ok(small);assert.equal(small.style.paddingLeft,'26px');
 tools.click();assert.equal(w.filteredProjects().length,2);w.document.getElementById('nested').checked=false;assert.equal(w.filteredProjects().length,1);small.click();assert.equal(w.filteredProjects()[0].file,'Tools/Small/mini.stl');
 const restored=w.fileFromRecord({name:'mini.stl',path:'Tools/Small/mini.stl',data:Buffer.from('mesh').toString('base64')});await w.loadLocal([restored]);assert.ok([...w.document.querySelectorAll('#categories button')].some(b=>b.title==='Tools/Small'));
 }finally{w.close()}});

test('directory traversal includes unsupported files for the import report',async()=>{const w=app();try{
 const entry=(name)=>({name,isFile:true,file:ok=>ok(new File(['fixture'],name))});let read=false;
 const root={name:'Mixed',isDirectory:true,createReader:()=>({readEntries:ok=>{ok(read?[]:[entry('part.stl'),entry('printer.ctb')]);read=true}})};
 const dropped=await w.droppedFiles({items:[{kind:'file',webkitGetAsEntry:()=>root,getAsFile:()=>null}]});assert.equal(dropped.files.length,2);await w.ingestFiles(dropped.files,true);await w.document.getElementById('import-go').onclick();assert.match(w.document.getElementById('import-report-body').textContent,/1 unsupported files ignored/);assert.equal(w.filteredProjects().length,1);
 }finally{w.close()}});
