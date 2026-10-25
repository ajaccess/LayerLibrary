
const templateNode=document.documentElement.cloneNode(true);templateNode.querySelector("#saved-library").textContent="";const portableTemplate="<!doctype html>\n"+templateNode.outerHTML;
let libraryName='LayerLibrary';
const token=new URLSearchParams(location.search).get('token');let items=[];let selectedFolder=null;let localMode=true;let localFiles=[];let pictureUrls=[];let folderPaths=[];let currentPage=1;let directoryHandle=null;let directoryFolders=[];let libraryBusy=false;let sessionEnded=false;const exportUrls=new Set();
const supportedFile=name=>/\.(3mf|stl|obj|ply|amf)$/i.test(name);
const fileFormat=item=>item.format||item.file.split('.').pop().toUpperCase();
const formatMatches=item=>$('format').value==='all'||($('format').value==='no-stl'?fileFormat(item)!=='STL':fileFormat(item)===$('format').value);
const $=id=>document.getElementById(id);
// Remove only this app's preferences from older versions; never write browser storage.
try{for(const key of ['3mf-theme','3mf-page-size'])localStorage.removeItem(key)}catch{}
function el(tag,text,cls){const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e}
function imageUrl(item,name){if(item.localImages)return item.localImages[name];return '/api/image?'+new URLSearchParams({token,id:item.id,name})}
function picture(item,name){const img=el('img');img.src=imageUrl(item,name);img.alt=item.title;img.loading='lazy';return img}
function render(){const q=$('search').value.toLowerCase();const scoped=items.filter(x=>inFolder(x)&&formatMatches(x));const matches=filteredProjects();const pageSize=Number($('page-size').value);const pages=Math.max(1,Math.ceil(matches.length/pageSize));currentPage=Math.min(Math.max(1,currentPage),pages);const first=(currentPage-1)*pageSize;const shown=matches.slice(first,first+pageSize);$('status').textContent=matches.length?`${first+1}–${first+shown.length} of ${matches.length} projects${q?' matching your search':''}`:'0 projects';renderPagination(pages,matches.length);$('section-title').textContent=selectedFolder===null?'All projects':(selectedFolder||'Main folder');resetCardPreviews();$('grid').replaceChildren();if(!shown.length){$('grid').append(el('div',items.length?'No matching projects.':'No supported model files here. Drop a folder or click Add files to get started.','empty'));return}for(const item of shown){const card=el('button',null,'card');const preview=item.images.length?picture(item,item.images[0]):el('div',item.error?'Could not read file':fileFormat(item)+' · Click for 3D view','placeholder');preview.classList.add('preview');if(item.images.length)preview.onerror=()=>preview.replaceWith(el('div','Preview unavailable','preview placeholder'));card.append(preview);const info=el('div',null,'info');info.append(el('h2',item.title),el('p',item.file));for(const text of [fileFormat(item),item.printer,item.filament])if(text)info.append(el('span',text,'tag'));card.append(info);card.onclick=()=>details(item);$('grid').append(card);if(!item.images.length)observeCardPreview(preview,item)}}
function details(item){
 stopModel();const d=$('details');d.replaceChildren(el('h2',item.title));
 if(item.images.length){const hero=picture(item,item.images[0]);hero.className='project-hero';hero.loading='eager';d.append(hero)}
 const view=el('section');view.append(el('h3','3D model'));const viewport=el('div',null,'model-viewport');const status=el('p','Loading 3D model…','model-status');status.setAttribute('role','status');const tools=el('div',null,'model-tools');const reset=el('button','Reset view');reset.disabled=true;const label=el('label');const wire=el('input');wire.type='checkbox';wire.disabled=true;label.append(wire,el('span','Wireframe'));tools.append(reset,label);view.append(viewport,tools,status,el('p','Drag to rotate 360° · Scroll to zoom · Right-drag to pan','model-status'));d.append(view);
 d.append(el('p',item.file));
 if(item.id){const link=el('a','Download '+fileFormat(item),'download');link.href=item.downloadUrl||'/api/download?'+new URLSearchParams({token,id:item.id});link.download=item.file.split('/').pop();d.append(link)}
 const deleteButton=el('button','Delete original file…','danger');deleteButton.onclick=()=>askDeleteOriginal(item);d.append(deleteButton);
 if(item.description)d.append(el('h3','About this project'),el('p',item.description));
 if(item.error)d.append(el('p','Error: '+item.error));
 const facts=el('dl',null,'facts');
 const fields=[['Creator',item.author],['Printer',item.printer],['Filament',item.filament],['File size',item.size!=null?(item.size/1048576).toFixed(2)+' MB':null],['File modified',item.modified?new Date(item.modified).toLocaleString():null],...Object.entries(item.details||{})];
 for(const [label,value] of fields)if(value){const fact=el('div',null,'fact');fact.append(el('dt',label),el('dd',value));facts.append(fact)}
 d.append(facts);
 if(item.objects?.length)d.append(el('h3','Objects'),el('p',item.objects.join('\n')));
 d.append(el('h3','Project pictures'));const gallery=el('div',null,'gallery');
 for(const name of item.images){const fig=el('figure');fig.append(picture(item,name),el('figcaption',name.split('/').pop()));gallery.append(fig)}
 if(!item.images.length)gallery.append(el('p','This file has no available embedded preview.'));d.append(gallery);$('modal').showModal();startModel(item,viewport,status,reset,wire)
}
function theme(dark){document.documentElement.classList.toggle('dark',dark);$('theme').textContent=dark?'Light background':'Dark background';$('theme').setAttribute('aria-pressed',String(dark))}
theme(window.matchMedia?.('(prefers-color-scheme: dark)').matches||false);$('theme').onclick=()=>theme(!document.documentElement.classList.contains('dark'));
async function request(url,options){const r=await fetch(url,options);const data=await r.json();if(!r.ok||data.error)throw Error(data.error||'Request failed');return data}

function parentFolder(item){const i=item.file.lastIndexOf('/');return i<0?'':item.file.slice(0,i)}
function inFolder(item){if(selectedFolder===null)return true;const folder=parentFolder(item);return folder===selectedFolder||($('nested').checked&&(selectedFolder===''||folder.startsWith(selectedFolder+'/')))}
function categories(){
 const paths=new Set(['',...folderPaths]);for(const item of items){const parts=parentFolder(item).split('/').filter(Boolean);for(let i=1;i<=parts.length;i++)paths.add(parts.slice(0,i).join('/'))}
 if(selectedFolder!==null&&!paths.has(selectedFolder))selectedFolder=null;
 const nav=$('categories');nav.replaceChildren();
 for(const path of [null,...[...paths].sort((a,b)=>a.localeCompare(b))]){
  const count=items.filter(formatMatches).filter(x=>path===null||parentFolder(x)===path||($('nested').checked&&(path===''||parentFolder(x).startsWith(path+'/')))).length;
  const button=el('button'),parts=path?path.split('/'):[],label=path===null?'All projects':path?parts[parts.length-1]:'Main folder';
  button.append(el('span',(path?'📁 ':'')+label),el('span',String(count)));
  button.title=path||label;button.setAttribute('aria-label',(path||label)+' · '+count+' projects');
  if(parts.length>1){button.style.paddingLeft=(12+Math.min(parts.length-1,6)*14)+'px';button.classList.add('subfolder')}
  button.setAttribute('aria-pressed',String(selectedFolder===path));button.onclick=()=>{selectedFolder=path;currentPage=1;categories();render()};nav.append(button)
 }
}
async function load(){
 if(localMode){if(localFiles.length)await loadLocal(localFiles);else{categories();render();$('status').textContent='Drop a project folder here, or click Add files.';}return}
 $('save-library').disabled=$('duplicates').disabled=$('choose').disabled=$('refresh').disabled=true;$('status').textContent='Reading 3MF files…';
 try{const data=await request('/api/scan?'+new URLSearchParams({token}));items=data.items;folderPaths=data.folders||[];$('folder').textContent=data.folder;categories();render()}catch(e){$('status').textContent='Unable to load: '+e.message}finally{$('save-library').disabled=$('duplicates').disabled=$('choose').disabled=$('refresh').disabled=false}
}
$('choose').onclick=()=>$('folder-input').click();$('refresh').onclick=()=>load();$('search').oninput=()=>{currentPage=1;render()};$('sort').onchange=()=>{currentPage=1;render()};$('format').onchange=()=>{currentPage=1;categories();render()};$('nested').onchange=()=>{currentPage=1;categories();render()};$('close').onclick=()=>$('modal').close();
$('folder-input').onchange=async event=>{const files=Array.from(event.target.files);if(files.length)await ingestFiles(files,false);event.target.value=''};
// Read only selected files. No uploads; the 3D engine is bundled locally.
class ZipArchive{
 constructor(file,entries){this.file=file;this.entries=entries}
 static async open(file){
  const start=Math.max(0,file.size-65557),tail=new DataView(await file.slice(start).arrayBuffer());let end=-1;
  for(let i=tail.byteLength-22;i>=0;i--)if(tail.getUint32(i,true)===0x06054b50&&i+22+tail.getUint16(i+20,true)===tail.byteLength){end=i;break}
  if(end<0)throw Error('Not a valid 3MF archive');
  const count=tail.getUint16(end+10,true),size=tail.getUint32(end+12,true),offset=tail.getUint32(end+16,true);
  if(count===65535||size===0xffffffff||offset===0xffffffff)throw Error('ZIP64 metadata is not supported in this version; try opening the 3D view.');
  if(tail.getUint16(end+4,true)||tail.getUint16(end+6,true))throw Error('Multipart archives are not supported');
  if(size>32*1024*1024||offset+size>file.size)throw Error('Invalid archive directory');
  const buffer=await file.slice(offset,offset+size).arrayBuffer(),view=new DataView(buffer),entries=new Map(),decoder=new TextDecoder();let pos=0;
  for(let n=0;n<count;n++){
   if(pos+46>view.byteLength||view.getUint32(pos,true)!==0x02014b50)throw Error('Invalid archive entry');
   const nameLength=view.getUint16(pos+28,true),extra=view.getUint16(pos+30,true),comment=view.getUint16(pos+32,true);
   const name=decoder.decode(new Uint8Array(buffer,pos+46,nameLength));
   entries.set(name,{flags:view.getUint16(pos+8,true),method:view.getUint16(pos+10,true),packed:view.getUint32(pos+20,true),size:view.getUint32(pos+24,true),offset:view.getUint32(pos+42,true)});pos+=46+nameLength+extra+comment;
  }
  return new ZipArchive(file,entries)
 }
 async read(name,limit=32*1024*1024){
  const e=this.entries.get(name);if(!e)throw Error('Missing embedded file');if(e.size>limit||e.packed>64*1024*1024)throw Error('Embedded file is too large to preview');if(e.flags&1)throw Error('Encrypted archive');
  const h=new DataView(await this.file.slice(e.offset,e.offset+30).arrayBuffer());if(h.byteLength!==30||h.getUint32(0,true)!==0x04034b50)throw Error('Invalid embedded file');
  const begin=e.offset+30+h.getUint16(26,true)+h.getUint16(28,true);if(begin+e.packed>this.file.size)throw Error('Truncated archive');
  let stream=this.file.slice(begin,begin+e.packed).stream();
  if(e.method===8){try{stream=stream.pipeThrough(new DecompressionStream('deflate-raw'))}catch{throw Error('Use a current browser with deflate-raw decompression support.')}}else if(e.method!==0)throw Error('Unsupported ZIP compression');
  const reader=stream.getReader(),chunks=[];let length=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit)throw Error('Embedded file exceeds preview size limit');chunks.push(value)}}finally{await reader.cancel().catch(()=>{})}
  if(length!==e.size)throw Error('Incomplete embedded file');return new Blob(chunks)
 }
 async text(name){return (await this.read(name)).text()}
}
function xml(text){const d=new DOMParser().parseFromString(text,'application/xml');if(d.getElementsByTagName('parsererror').length)throw Error('Invalid project XML');return d}
function cleanDescription(text){
 // Decode encoded markup in inert documents; never insert it into the live page.
 const parser=new DOMParser();let doc=parser.parseFromString(text,'text/html');let value=doc.body.textContent||'';
 if(/&lt;|<\/?(?:p|div|br|span)\b/i.test(value))value=parser.parseFromString(value,'text/html').body.textContent||'';
 return value.trim()
}
async function inspectLocal(file,path,urls=pictureUrls){
 const item={originalPath:file.originalRelativePath||path,id:path,file:path,title:file.name.replace(/\.[^.]+$/,''),format:file.name.split('.').pop().toUpperCase(),sourceFile:file,images:[],localImages:{},details:{},objects:[],size:file.size,modified:new Date(file.lastModified).toISOString()};
 item.downloadUrl=URL.createObjectURL(file);urls.push(item.downloadUrl);
 if(item.format!=='3MF')return item;
 try{
  const zip=await ZipArchive.open(file),names=[...zip.entries.keys()];let model='3D/3dmodel.model',preferred=[];
  if(zip.entries.has('_rels/.rels'))for(const rel of xml(await zip.text('_rels/.rels')).documentElement.children){const target=(rel.getAttribute('Target')||'').replace(/^\//,'');const kind=rel.getAttribute('Type')||'';if(kind.endsWith('/3dmodel'))model=target;if(kind.endsWith('/thumbnail')&&zip.entries.has(target))preferred.push(target)}
  const cover='Auxiliaries/.thumbnails/thumbnail_3mf.png';if(zip.entries.has(cover))preferred.unshift(cover);
  const candidates=[...new Set([...preferred,...names.filter(n=>/\.(png|jpe?g)$/i.test(n)&&(/thumbnail/i.test(n)||n.startsWith('Metadata/plate_')))])].slice(0,30);
  for(const name of candidates){try{const blob=await zip.read(name,20*1024*1024);const url=URL.createObjectURL(new Blob([blob],{type:/\.png$/i.test(name)?'image/png':'image/jpeg'}));urls.push(url);item.localImages[name]=url;item.images.push(name)}catch{}}
  if(zip.entries.has(model)&&zip.entries.get(model).size<=32*1024*1024){
   const doc=xml(await zip.text(model)),meta={};for(const node of doc.documentElement.children)if(node.localName==='metadata')meta[node.getAttribute('name')]=node.textContent||'';
   item.title=meta.Title||item.title;item.author=meta.Designer||meta.DesignerName||meta.Creator||'';item.description=cleanDescription(meta.Description||'');
   for(const [label,key] of [['Created','CreationDate'],['Application','Application'],['License','License'],['Copyright','Copyright'],['Profile','ProfileTitle']])if(meta[key]&&meta[key]!=='[]')item.details[label]=meta[key];
  }
  if(zip.entries.has('Metadata/project_settings.config')){
   const settings=JSON.parse(await zip.text('Metadata/project_settings.config'));const value=k=>Array.isArray(settings[k])?settings[k].join(', '):String(settings[k]??'');
   item.printer=value('printer_model')||value('printer_settings_id');item.filament=value('filament_type');
   for(const [label,key,suffix] of [['Layer height','layer_height',' mm'],['Nozzle diameter','nozzle_diameter',' mm'],['Infill','sparse_infill_density',''],['Wall loops','wall_loops',''],['Print preset','print_settings_id',''],['Filament colors','filament_colour','']])if(value(key))item.details[label]=value(key)+suffix;
  }
  if(zip.entries.has('Metadata/model_settings.config')){
   const doc=xml(await zip.text('Metadata/model_settings.config'));const objects=[...doc.documentElement.children].filter(n=>n.localName==='object'),plates=[...doc.documentElement.children].filter(n=>n.localName==='plate');
   item.details.Objects=String(objects.length);item.details.Plates=String(plates.length);
   for(const obj of objects){const name=[...obj.children].find(n=>n.getAttribute('key')==='name')?.getAttribute('value');if(name)item.objects.push(name)}
  }
 }catch(e){item.error=e.message}
 return item
}
let importJob=null,pendingImport=null,importProblems=[];
function setBusy(value){libraryBusy=value;for(const id of ['save-library','duplicates','choose','refresh'])$(id).disabled=value}
function importFilePath(file){return file.webkitRelativePath?relativeFile(file):file.name}
function renamedImport(file,path){const renamed=new File([file],path.split('/').pop(),{type:file.type,lastModified:file.lastModified});withLibraryPath(renamed,'Library/'+path);Object.defineProperty(renamed,'originalRelativePath',{value:file.originalRelativePath||importFilePath(file)});return renamed}
function planImport(existing,incoming,mode,policy){
 const merged=new Map(),key=p=>p.normalize('NFC').toLowerCase();let conflicts=0,skipped=0,renamed=0,replaced=0;
 if(mode==='add')for(const file of existing)merged.set(key(importFilePath(file)),file);
 for(const file of incoming){const path=importFilePath(file),k=key(path);if(!merged.has(k)){merged.set(k,file);continue}conflicts++;
  if(policy==='skip'){skipped++;continue}if(policy==='replace'){merged.set(k,file);replaced++;continue}
  const dot=path.lastIndexOf('.'),stem=dot>path.lastIndexOf('/')?path.slice(0,dot):path,ext=dot>path.lastIndexOf('/')?path.slice(dot):'';let n=2,next;
  do{next=stem+' ('+(n++)+')'+ext}while(merged.has(key(next)));merged.set(key(next),renamedImport(file,next));renamed++;
 }
 return {files:[...merged.values()],conflicts,skipped,renamed,replaced}
}
function updateImportPlan(){if(!pendingImport)return;const plan=planImport(localFiles,pendingImport.files,$('import-mode').value,$('conflict-policy').value);$('import-plan').textContent=`${pendingImport.files.length} supported files · ${plan.conflicts} matching paths · ${plan.files.length} projects after import. ${plan.renamed} renamed, ${plan.replaced} replaced, ${plan.skipped} skipped.`}
async function ingestFiles(files,fromFolder){
 if(libraryBusy||pendingImport)return;const accepted=files.filter(f=>supportedFile(f.name)&&!importFilePath(f).split('/').includes(TRASH));
 if(!accepted.length){$('status').textContent='No supported files found. Use 3MF, STL, OBJ, PLY, or AMF.';return}
 pendingImport={files:accepted,ignored:files.length-accepted.length};$('import-mode').value='add';$('conflict-policy').value='keep';$('import-options').hidden=false;$('import-progress-box').hidden=true;$('import-go').hidden=false;$('import-cancel').textContent='Cancel';$('import-kind').textContent=fromFolder?'Folder ready to import':'Files ready to import';updateImportPlan();$('import-dialog').showModal()
}
$('import-mode').onchange=$('conflict-policy').onchange=updateImportPlan;
function cancelImport(){if(importJob){importJob.cancelled=true;$('import-progress-text').textContent='Cancelling after the current file…';return}pendingImport=null;$('import-dialog').close()}
$('import-cancel').onclick=cancelImport;$('import-dialog').addEventListener('cancel',event=>{event.preventDefault();cancelImport()});
$('import-go').onclick=async()=>{if(!pendingImport||importJob)return;const pending=pendingImport,mode=$('import-mode').value,policy=$('conflict-policy').value;const plan=planImport(localFiles,pending.files,mode,policy);await loadLocal(plan.files,{interactive:true,summary:{...plan,ignored:pending.ignored}});pendingImport=null;$('import-dialog').close()};
async function loadLocal(files,options={}){
 if(importJob)return false;const job={cancelled:false};importJob=job;setBusy(true);const freshUrls=[],freshItems=[];
 const projects=files.filter(f=>supportedFile(f.name)).sort((a,b)=>importFilePath(a).localeCompare(importFilePath(b),undefined,{numeric:true}));
 if(options.interactive){$('import-options').hidden=true;$('import-go').hidden=true;$('import-progress-box').hidden=false;$('import-progress').max=projects.length||1;$('import-progress').value=0}
 try{
  for(const [index,file] of projects.entries()){
   if(job.cancelled||sessionEnded)throw new Error('IMPORT_CANCELLED');const text=`Reading ${index+1} of ${projects.length}: ${importFilePath(file)}`;$('status').textContent=text;$('import-progress-text').textContent=text;
   await new Promise(resolve=>setTimeout(resolve,0));if(job.cancelled||sessionEnded)throw new Error('IMPORT_CANCELLED');
   const parsed=await inspectLocal(file,importFilePath(file),freshUrls);freshItems.push(parsed);$('import-progress').value=index+1;
  }
  if(job.cancelled||sessionEnded)throw new Error('IMPORT_CANCELLED');
  stopModel();resetCardPreviews();if($('modal').open)$('modal').close();for(const url of pictureUrls)URL.revokeObjectURL(url);
  pictureUrls=freshUrls;items=freshItems;localFiles=projects;localMode=true;folderPaths=[];directoryFolders=[];directoryHandle=null;writeFolder=null;undoEntries=[];duplicateGroups=[];renderUndo();selectedFolder=null;currentPage=1;
  for(const item of items){const parts=parentFolder(item).split('/').filter(Boolean);for(let n=1;n<=parts.length;n++)folderPaths.push(parts.slice(0,n).join('/'))}
  $('folder').textContent=libraryName+' · '+items.length+' local projects';importProblems=items.filter(x=>x.error).map(x=>({file:x.file,error:x.error}));renderImportReport(options.summary);categories();render();
  $('folder-note').textContent='Library loaded. Save portable library to keep these projects in one HTML. Originals are unchanged.';return true;
 }catch(e){for(const url of freshUrls)URL.revokeObjectURL(url);$('status').textContent=e.message==='IMPORT_CANCELLED'?'Import cancelled. Your previous library is unchanged.':'Import failed; your previous library is unchanged. '+e.message;return false}
 finally{importJob=null;setBusy(false)}
}
function renderImportReport(summary={}){
 const report=$('import-report');report.hidden=!importProblems.length&&!summary?.ignored&&!summary?.conflicts;
 $('import-report-title').textContent=`Import report · ${importProblems.length} files need attention`;
 const body=$('import-report-body');body.replaceChildren();if(summary?.conflicts)body.append(el('p',`${summary.renamed} kept with new names · ${summary.replaced} replaced · ${summary.skipped} skipped.`));if(summary?.ignored)body.append(el('p',`${summary.ignored} unsupported files ignored. Supported model formats: 3MF, STL, OBJ, PLY and AMF. Export proprietary printer projects or sliced files as a supported mesh in their original software.`));
 for(const issue of importProblems)body.append(el('p',issue.file+': '+issue.error));if(importProblems.length)body.append(el('p','These files remain listed and downloadable. Some previews or metadata could not be read.'));
}

let activeModel=null,modelVersion=0;
function stopModel(){modelVersion++;if(activeModel){activeModel.dispose();activeModel=null}}
$('modal').addEventListener('close',stopModel);
// Require the gesture to start and finish on the backdrop, so rotating a model
// or selecting text and releasing outside the dialog does not dismiss it.
let projectBackdropPress=false;
function outsideProjectDialog(event){
 const dialog=$('modal'),bounds=dialog.getBoundingClientRect();
 return event.target===dialog&&(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom);
}
$('modal').addEventListener('pointerdown',event=>{projectBackdropPress=event.button===0&&outsideProjectDialog(event)});
$('modal').addEventListener('pointercancel',()=>{projectBackdropPress=false});
$('modal').addEventListener('click',event=>{const dismiss=projectBackdropPress&&outsideProjectDialog(event);projectBackdropPress=false;if(dismiss)$('modal').close()});
$('modal').addEventListener('close',()=>{projectBackdropPress=false});
async function startModel(item,host,status,reset,wire){
 const version=modelVersion;
 try{
  if(item.size>128*1024*1024)throw Error('This file exceeds the 128 MB interactive preview limit. You can still download it.');
  if(!window.MeshViewer)throw Error('The embedded 3D engine is unavailable. Reopen an intact LayerLibrary HTML file.');
  let buffer;if(item.sourceFile)buffer=await item.sourceFile.arrayBuffer();else{const r=await fetch('/api/download?'+new URLSearchParams({token,id:item.id}));if(!r.ok)throw Error('The file could not be read. Refresh the library and try again.');buffer=await r.arrayBuffer()}
  if(sessionEnded||version!==modelVersion||!$('modal').open)return;
  activeModel=MeshViewer.mount(host,buffer,fileFormat(item));status.textContent=activeModel.triangles.toLocaleString()+' triangles · Geometry preview';reset.disabled=wire.disabled=false;reset.onclick=()=>activeModel?.reset();wire.onchange=()=>activeModel?.wireframe(wire.checked)
 }catch(e){if(version===modelVersion){status.textContent='3D preview unavailable: '+e.message;host.style.display='none'}}
}


function renderPagination(pages,total){
 for(const id of ['pagination-top','pagination-bottom']){const nav=$(id);nav.replaceChildren();if(!total)return;
  const previous=el('button','Previous');previous.disabled=currentPage===1;const next=el('button','Next');next.disabled=currentPage===pages;
  const change=delta=>{currentPage+=delta;render();$('section-title').scrollIntoView({block:'start',behavior:'smooth'})};previous.onclick=()=>change(-1);next.onclick=()=>change(1);
  nav.append(previous,el('span',`Page ${currentPage} of ${pages}`),next)
 }
}
$('page-size').onchange=()=>{currentPage=1;render()};
let duplicateGroups=[],writeFolder=null,undoEntries=[];
const TRASH='.3mf-library-trash';
function post(url,data){return request(url,{method:'POST',headers:{'X-Viewer-Token':token,'Content-Type':'application/json'},body:JSON.stringify(data)})}
async function hashFile(file){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('')}
function relativeFile(file){return (file.webkitRelativePath||'').split('/').slice(1).join('/')||file.name}
async function findDuplicates(){
 $('duplicates-modal').showModal();$('duplicate-results').replaceChildren();$('duplicate-status').textContent='Comparing file contents across all folders…';$('duplicates').disabled=true;
 try{
  if(!localMode){duplicateGroups=(await request('/api/duplicates?'+new URLSearchParams({token}))).groups}
  else{
   const sizes=new Map();for(const file of localFiles){if(!supportedFile(file.name)||relativeFile(file).split('/').includes(TRASH))continue;const list=sizes.get(file.size)||[];list.push(file);sizes.set(file.size,list)}
   duplicateGroups=[];for(const [size,files] of sizes){if(files.length<2)continue;const hashes=new Map();for(const file of files){const hash=await hashFile(file);const ids=hashes.get(hash)||[];ids.push(relativeFile(file));hashes.set(hash,ids)}for(const [hash,ids] of hashes)if(ids.length>1)duplicateGroups.push({hash,ids,size})}
  }
  renderDuplicates()
 }catch(e){$('duplicate-status').textContent='Could not compare files: '+e.message}finally{$('duplicates').disabled=false}
}
function renderDuplicates(){
 duplicateGroups=duplicateGroups.map(g=>({...g,ids:g.ids.filter(id=>items.some(x=>x.id===id))})).filter(g=>g.ids.length>1);
 const count=duplicateGroups.reduce((n,g)=>n+g.ids.length-1,0);$('duplicate-status').textContent=duplicateGroups.length?`${duplicateGroups.length} matching ${duplicateGroups.length===1?'group':'groups'} · ${count} extra ${count===1?'copy':'copies'}. Select the copy to keep, then remove duplicates individually.`:'No identical duplicate files found.';
 const root=$('duplicate-results');root.replaceChildren();
 if(localMode)root.append(el('p','Removing a duplicate only removes it from this portable library. Original files on disk are unchanged. Save portable library to keep your changes.'));

 for(const [index,group] of duplicateGroups.entries()){
  const section=el('section',null,'duplicate-group');section.append(el('h3',`Matching group ${index+1}`),el('p',`${(group.size/1048576).toFixed(2)} MB per file · Identical contents`));let keepId=group.ids[0];const buttons=[];const diskButtons=[];
  for(const id of group.ids){const item=items.find(x=>x.id===id);const row=el('div',null,'duplicate-row');const label=el('label');const radio=el('input');radio.type='radio';radio.name='keep-'+index;radio.checked=id===keepId;radio.setAttribute('aria-label','Keep '+item.file);label.append(radio,el('span',item.file));const button=el('button',id===keepId?'Keeping this copy':localMode?'Remove from library':'Remove duplicate');button.disabled=id===keepId;buttons.push({id,button});radio.onchange=()=>{keepId=id;for(const entry of diskButtons)entry.button.disabled=entry.id===keepId;for(const entry of buttons){entry.button.disabled=entry.id===keepId;entry.button.textContent=entry.id===keepId?'Keeping this copy':localMode?'Remove from library':'Remove duplicate'}};
   button.onclick=async()=>{
    const keep=items.find(x=>x.id===keepId);
    if(!confirm(`Remove “${item.file}” from the library?\n\nKeep: ${keep.file}\n\n${localMode?'Original files on disk will not change. Save the portable library to keep this change.':'The removed copy will be saved in '+TRASH+'.'} You can Undo.`))return;
    for(const b of root.querySelectorAll('button,input'))b.disabled=true;
    try{
     let undo;if(localMode)undo=await removeLocalDuplicate(item,keep,group.hash);else undo=await post('/api/remove-duplicate',{id,keep:keepId,hash:group.hash});
     undoEntries.push({item,undo,local:localMode});items=items.filter(x=>x.id!==id);if(localMode)localFiles=localFiles.filter(f=>relativeFile(f)!==item.file);categories();render();renderDuplicates();renderUndo()
    }catch(e){renderDuplicates();$('duplicate-status').textContent='Nothing removed: '+e.message}
   };
   const disk=el('button','Delete original…','danger');disk.disabled=id===keepId;disk.onclick=()=>{if(id!==keepId)askDeleteOriginal(item)};diskButtons.push({id,button:disk});row.append(label,button,disk);section.append(row)
  }root.append(section)
 }
}
async function removeLocalDuplicate(item,keep,expected){
 if(!item.sourceFile||!keep.sourceFile||await hashFile(item.sourceFile)!==expected||await hashFile(keep.sourceFile)!==expected)throw Error('A file changed. Find duplicates again.');
 return {file:item.sourceFile}
}
function renderUndo(){
 const root=$('undo-list');root.replaceChildren();for(const entry of undoEntries){const row=el('div',null,'duplicate-row');row.append(el('span','Removed: '+entry.item.file));const undo=el('button','Undo');undo.onclick=async()=>{
  undo.disabled=true;try{
   if(entry.local){const remaining=undoEntries.filter(x=>x!==entry);if(!await loadLocal([...localFiles,entry.undo.file]))throw Error('Could not reload the restored file');undoEntries=remaining;
   }else{await post('/api/restore',{undo:entry.undo.undo});await load()}
   undoEntries=undoEntries.filter(x=>x!==entry);renderUndo();$('duplicate-status').textContent='File restored. Run Find duplicates again to update matches.';$('duplicate-results').replaceChildren()
  }catch(e){$('duplicate-status').textContent='Could not restore: '+e.message;undo.disabled=false}
 };row.append(undo);root.append(row)}
}
$('duplicates').onclick=findDuplicates;$('duplicates-close').onclick=()=>$('duplicates-modal').close();

function withLibraryPath(file,path){Object.defineProperty(file,'webkitRelativePath',{value:path,configurable:true});return file}
async function droppedFiles(data){
 const files=[];let hasFolder=false;
 const entries=Array.from(data.items||[]).filter(i=>i.kind==='file').map(i=>({entry:i.webkitGetAsEntry?.(),file:i.getAsFile()}));
 async function walk(entry,path){
  if(entry.name===TRASH)return;
  if(entry.isFile){const file=await new Promise((resolve,reject)=>entry.file(resolve,reject));files.push(withLibraryPath(file,path+entry.name))}
  else if(entry.isDirectory){const reader=entry.createReader();while(true){const batch=await new Promise((resolve,reject)=>reader.readEntries(resolve,reject));if(!batch.length)break;for(const child of batch)await walk(child,path+entry.name+'/')}}
 }
 for(const item of entries){if(item.entry){if(item.entry.isDirectory)hasFolder=true;await walk(item.entry,item.entry.isDirectory?'':'Portable library/')}else if(item.file)files.push(item.file)}
 if(!entries.length)files.push(...Array.from(data.files||[]));return {files,hasFolder}
}
document.addEventListener('dragover',event=>{event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect='copy';$('drop-zone').classList.add('dragging')});
document.addEventListener('dragleave',event=>{if(!event.relatedTarget)$('drop-zone').classList.remove('dragging')});
document.addEventListener('drop',async event=>{
 event.preventDefault();$('drop-zone').classList.remove('dragging');if(libraryBusy)return;
 $('status').textContent='Reading dropped files…';try{const result=await droppedFiles(event.dataTransfer);await ingestFiles(result.files,result.hasFolder)}catch(e){$('status').textContent='Could not read the drop: '+e.message}
});
function base64File(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file)})}
function fileFromRecord(record){
 if(!supportedFile(record.name)||typeof record.data!=='string')throw Error('Invalid saved library entry');
 const raw=atob(record.data),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 const file=withLibraryPath(new File([bytes],record.name,{lastModified:record.modified||Date.now()}),'Saved library/'+record.path);Object.defineProperty(file,'originalRelativePath',{value:record.originalPath||record.path});return file
}
function sortedProjects(list){
 const mode=$('sort').value;return [...list].sort((a,b)=>{let result=0;if(mode==='size-desc')result=(b.size||0)-(a.size||0);else if(mode==='size-asc')result=(a.size||0)-(b.size||0);else if(mode==='newest')result=(Date.parse(b.modified)||0)-(Date.parse(a.modified)||0);else if(mode==='format')result=fileFormat(a).localeCompare(fileFormat(b));else result=(a.title||a.file).localeCompare(b.title||b.file,undefined,{numeric:true,sensitivity:'base'})*(mode==='name-desc'?-1:1);return result||a.file.localeCompare(b.file,undefined,{numeric:true})})
}
function filteredProjects(){const q=$('search').value.trim().toLowerCase();return sortedProjects(items.filter(x=>inFolder(x)&&formatMatches(x)&&[x.title,x.file,x.printer,x.author,x.description,x.filament].join(' ').toLowerCase().includes(q)))}
function exportProjects(){const scope=$('export-scope').value;return scope==='filtered'?filteredProjects():scope==='folder'?sortedProjects(items.filter(inFolder)):sortedProjects(items)}
function exportFileName(name){const base=name.trim().replace(/\.html?$/i,'').replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').replace(/[. ]+$/,'').slice(0,100)||'LayerLibrary';return (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(base)?'Library-'+base:base)+'.html'}
function updateExportEstimate(){const selection=exportProjects();const sourceSize=selection.reduce((n,x)=>n+(x.size||0),0);const estimated=new Blob([portableTemplate]).size+Math.ceil(sourceSize/3)*4+selection.length*300;$('export-estimate').textContent=`${selection.length} projects · approximately ${(estimated/1048576).toFixed(1)} MB HTML. Includes original files. ${sourceSize>256*1024*1024?'Too large: choose a category or filtered view (256 MB source-file limit).':''}`;$('export-go').disabled=!selection.length||sourceSize>256*1024*1024}
function savePortable(){if(libraryBusy||!items.length){$('status').textContent='Add projects before saving.';return}$('export-name').value=libraryName;$('export-scope').value='all';$('export-folder-option').disabled=selectedFolder===null;$('export-folder-option').textContent='Selected folder'+(selectedFolder!==null?': '+(selectedFolder||'Main folder'):' (select a folder first)');updateExportEstimate();$('export-dialog').showModal()}
$('export-scope').onchange=updateExportEstimate;$('export-cancel').onclick=()=>{if(!libraryBusy)$('export-dialog').close()};$('export-dialog').addEventListener('cancel',event=>{if(libraryBusy)event.preventDefault()});
$('export-go').onclick=async()=>{
 if(libraryBusy)return;const selection=exportProjects();if(!selection.length)return;const name=$('export-name').value.trim()||'LayerLibrary';setBusy(true);$('export-go').disabled=$('export-cancel').disabled=true;
 try{
  if(selection.reduce((n,x)=>n+(x.size||0),0)>256*1024*1024)throw Error('Choose a smaller category; the portable save limit is 256 MB of project files.');
  const records=[];for(const [index,item] of selection.entries()){
   $('export-estimate').textContent=`Packing ${index+1} of ${selection.length}…`;await new Promise(resolve=>setTimeout(resolve,0));if(sessionEnded)return;const file=item.sourceFile||new Blob([await modelBytes(item)]);
   records.push({path:item.file,originalPath:item.originalPath||item.file,name:item.file.split('/').pop(),modified:item.sourceFile?.lastModified||Date.parse(item.modified)||Date.now(),data:await base64File(file)})
  }
  const snapshot=JSON.stringify({version:1,name,files:records}).replace(/</g,'\\u003c');const output=portableTemplate.replace(/(<script id="saved-library" type="application\/json">)[\s\S]*?(<\/script>)/,(_,open,close)=>open+snapshot+close);
  const url=URL.createObjectURL(new Blob([output],{type:'text/html'}));exportUrls.add(url);const link=el('a');link.href=url;link.download=exportFileName(name);document.body.append(link);link.click();link.remove();setTimeout(()=>{URL.revokeObjectURL(url);exportUrls.delete(url)},60000);
  $('export-dialog').close();$('folder-note').textContent='Saved '+exportFileName(name)+' with '+selection.length+' projects. Open it next time to load those projects automatically.';
 }catch(e){$('export-estimate').textContent='Could not save: '+e.message}finally{setBusy(false);$('export-go').disabled=$('export-cancel').disabled=false}
};
$('save-library').onclick=savePortable;

async function startPortable(){
 const saved=$('saved-library').textContent.trim();
 if(!saved){await load();return}
 try{const snapshot=JSON.parse(saved);if(snapshot.version!==1||!Array.isArray(snapshot.files))throw Error('Unsupported saved library');libraryName=snapshot.name||'LayerLibrary';$('library-title').textContent=libraryName;document.title=libraryName+' — LayerLibrary';localMode=true;await loadLocal(snapshot.files.map(fileFromRecord));$('folder-note').textContent=snapshot.sample?'A sample model is included. Drop your own folder and choose Add or Replace, then save your portable library.':'Saved library loaded automatically. Drop an updated folder and save again to include new files. Nothing is uploaded.'}
 catch(e){$('status').textContent='Could not open saved library: '+e.message}
}

// Card pictures are generated from mesh data in memory; no preview files are written.
let cardObserver=null,cardQueue=[],cardWorking=false,cardGeneration=0;
function resetCardPreviews(){cardGeneration++;cardQueue=[];cardObserver?.disconnect();cardObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){cardObserver.unobserve(entry.target);cardQueue.push({host:entry.target,item:entry.target.previewItem,generation:cardGeneration})}}void runCardPreviews()},{rootMargin:'80px'})}
function observeCardPreview(host,item){host.previewItem=item;if(item.cardPreview){paintCardPreview(host,item);return}if(item.size>32*1024*1024){host.textContent=fileFormat(item)+' · Open for 3D preview';return}cardObserver.observe(host)}
function paintCardPreview(host,item){host.replaceChildren();const image=el('img');image.src=item.cardPreview;image.alt=item.title+' — model preview';image.className='card-model-image';host.append(image)}
async function modelBytes(item){if(item.sourceFile)return item.sourceFile.arrayBuffer();const response=await fetch('/api/download?'+new URLSearchParams({token,id:item.id}));if(!response.ok)throw Error('File could not be read');return response.arrayBuffer()}
async function runCardPreviews(){
 if(cardWorking)return;cardWorking=true;
 try{while(cardQueue.length){const {host,item,generation}=cardQueue.shift();if(generation!==cardGeneration||!host.isConnected)continue;
  host.textContent='Rendering model preview…';let mount,stage;
  try{const bytes=await modelBytes(item);if(generation!==cardGeneration||!host.isConnected)continue;
   await new Promise(resolve=>setTimeout(resolve,0));if(sessionEnded||generation!==cardGeneration||!host.isConnected)continue;stage=el('div',null,'card-render-stage');document.body.append(stage);mount=MeshViewer.mount(stage,bytes,fileFormat(item));item.cardPreview=mount.snapshot();if(generation===cardGeneration&&host.isConnected)paintCardPreview(host,item)
  }catch(e){if(host.isConnected){host.textContent=fileFormat(item)+' · Open for 3D view';host.title='Card preview unavailable: '+e.message}}
  finally{mount?.dispose();stage?.remove()}
 }}finally{cardWorking=false}
}
let deletion=null,deleteInProgress=false;
$('delete-dialog').addEventListener('cancel',event=>{if(deleteInProgress)event.preventDefault()});
function askDeleteOriginal(item){
 deletion={item,target:null,hash:null};$('delete-file-name').textContent=item.originalPath||item.file;$('delete-check').checked=false;$('delete-now').disabled=true;
 const supported=typeof window.showDirectoryPicker==='function';$('delete-select').disabled=!supported;
 $('delete-status').textContent=supported?'Select the original library root folder containing this relative path. The app will verify that the file contents match before enabling deletion.':'This browser does not support deleting disk files from this app. Use a browser with folder-write support (such as Chrome or Edge), or delete the original in your file manager.';
 $('delete-dialog').showModal()
}
async function locateOriginal(root,path){
 const parts=path.split('/');if(parts.some(p=>!p||p==='.'||p==='..'||p.includes('\\')))throw Error('Invalid relative file path');
 let parent=root;for(const part of parts.slice(0,-1))parent=await parent.getDirectoryHandle(part);
 const name=parts[parts.length-1],handle=await parent.getFileHandle(name);return {parent,name,handle,root}
}
async function verifiedDelete(target,expectedHash){
 const fresh=await target.parent.getFileHandle(target.name);const file=await fresh.getFile();
 if(await hashFile(file)!==expectedHash)throw Error('The file changed since verification. Nothing was deleted. Select the folder again.');
 await target.parent.removeEntry(target.name)
}
$('delete-select').onclick=async()=>{
 const pending=deletion;if(!pending)return;
 try{
  const root=await window.showDirectoryPicker({mode:'readwrite'});if(deletion!==pending)return;
  $('delete-status').textContent='Checking the original file…';pending.target=null;$('delete-now').disabled=true;
  const target=await locateOriginal(root,pending.item.originalPath||pending.item.file);const expected=pending.item.sourceFile||new Blob([await modelBytes(pending.item)]);const hash=await hashFile(expected);
  if(await hashFile(await target.handle.getFile())!==hash)throw Error('The file in this folder does not match the loaded project. Nothing was deleted.');
  if(deletion!==pending)return;pending.target=target;pending.hash=hash;
  $('delete-status').textContent='Verified: '+root.name+'/'+(pending.item.originalPath||pending.item.file)+'. Confirm below to permanently delete this original file.';$('delete-now').disabled=!$('delete-check').checked;
 }catch(e){if(deletion!==pending)return;pending.target=null;$('delete-now').disabled=true;$('delete-status').textContent=e.name==='AbortError'?'Folder selection cancelled. Nothing was deleted.':e.name==='NotAllowedError'?'Write permission was not granted. Nothing was deleted.':e.message}
};
$('delete-check').onchange=()=>$('delete-now').disabled=!deletion?.target||!$('delete-check').checked;
$('delete-cancel').onclick=()=>$('delete-dialog').close();$('delete-dialog').addEventListener('close',()=>{deletion=null});
$('delete-now').onclick=async()=>{
 const pending=deletion;if(!pending?.target||!$('delete-check').checked)return;
 deleteInProgress=true;$('delete-now').disabled=$('delete-select').disabled=$('delete-cancel').disabled=true;
 try{
  // Permission is requested only in response to this explicit delete action.
  if(await pending.target.root.requestPermission({mode:'readwrite'})!=='granted')throw Error('Write permission was not granted. Nothing was deleted.');
  await verifiedDelete(pending.target,pending.hash);
  const item=pending.item;items=items.filter(x=>x!==item);localFiles=localFiles.filter(f=>relativeFile(f)!==item.file);undoEntries=undoEntries.filter(e=>e.item.file!==item.file);renderUndo();
  if($('modal').open)$('modal').close();$('delete-dialog').close();categories();render();if($('duplicates-modal').open)renderDuplicates();
  $('folder-note').textContent='Deleted original file: '+item.file+'. Save portable library to update this HTML copy too. Previously saved HTML copies are unchanged.';
 }catch(e){$('delete-status').textContent=e.message;pending.target=null;$('delete-check').checked=false}
 finally{deleteInProgress=false;$('delete-select').disabled=$('delete-cancel').disabled=false;$('delete-now').disabled=true}
};

function clearSession(){
 sessionEnded=true;if(importJob)importJob.cancelled=true;pendingImport=null;for(const url of exportUrls)URL.revokeObjectURL(url);exportUrls.clear();stopModel();cardGeneration++;cardObserver?.disconnect();cardObserver=null;cardQueue=[];
 for(const url of pictureUrls)URL.revokeObjectURL(url);pictureUrls=[];
 for(const item of items){delete item.cardPreview;delete item.sourceFile;delete item.localImages;delete item.downloadUrl}
 items=[];localFiles=[];folderPaths=[];directoryFolders=[];directoryHandle=null;writeFolder=null;undoEntries=[];duplicateGroups=[];deletion=null;
 for(const id of ['modal','duplicates-modal','delete-dialog','import-dialog','export-dialog']){const dialog=$(id);if(dialog?.open)dialog.close()}
 for(const id of ['grid','details','categories','duplicate-results','undo-list','pagination-top','pagination-bottom','saved-library'])$(id)?.replaceChildren();
 for(const id of ['search','folder-input']){const field=$(id);if(field)field.value=''}
}
window.addEventListener('pagehide',clearSession);
// A back/forward-cache restoration starts a fresh session, not a stale cleared view.
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload()});

$('about').onclick=()=>$('about-dialog').showModal();$('about-close').onclick=()=>$('about-dialog').close();
startPortable();
