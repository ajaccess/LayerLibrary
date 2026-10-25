import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { AMFLoader } from 'three/addons/loaders/AMFLoader.js';
import { unzipSync, strFromU8 } from 'three/addons/libs/fflate.module.js';

const neutral=()=>new THREE.MeshStandardMaterial({color:0x91b9b1,roughness:0.68,metalness:0.12,side:THREE.DoubleSide});
const children=(node,name)=>Array.from(node.children).filter(n=>n.localName===name);
function parseXML(text){const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw Error('Invalid model XML');return doc.documentElement}
function normalizePath(path,base=''){const parts=(path.startsWith('/')?path:base.slice(0,base.lastIndexOf('/')+1)+path).split('/');const out=[];for(const p of parts){if(p==='..')out.pop();else if(p&&p!=='.')out.push(p)}return out.join('/')}
function transform(text){if(!text)return new THREE.Matrix4();const a=text.trim().split(/\s+/).map(Number);if(a.length!==12||a.some(n=>!Number.isFinite(n)))throw Error('Invalid model transform');return new THREE.Matrix4().set(a[0],a[3],a[6],a[9],a[1],a[4],a[7],a[10],a[2],a[5],a[8],a[11],0,0,0,1)}
function parse3MF(buffer){
 let total=0;const files=unzipSync(new Uint8Array(buffer),{filter:file=>{if(!file.name.endsWith('.model')&&file.name!=='_rels/.rels')return false;total+=file.originalSize;if(total>192*1024*1024)throw Error('Model geometry exceeds the 192 MB preview limit.');return true}});
 let main='3D/3dmodel.model';if(files['_rels/.rels'])for(const r of parseXML(strFromU8(files['_rels/.rels'])).children)if((r.getAttribute('Type')||'').endsWith('/3dmodel'))main=normalizePath(r.getAttribute('Target'));
 const docs=new Map(),cache=new Map(),active=new Set();let triangles=0;
 function document(path){if(!docs.has(path)){if(!files[path])throw Error('Missing model part: '+path);const root=parseXML(strFromU8(files[path]));const resources=children(root,'resources')[0];docs.set(path,{root,objects:new Map((resources?children(resources,'object'):[]).map(x=>[x.getAttribute('id'),x]))})}return docs.get(path)}
 function object(path,id,depth=0){
  const key=path+'#'+id;if(depth>100||active.has(key))throw Error('Cyclic or overly nested 3MF components');if(cache.has(key))return cache.get(key).clone();active.add(key);
  const node=document(path).objects.get(id);if(!node)throw Error('Missing 3MF object '+id);const group=new THREE.Group();group.name=node.getAttribute('name')||'Object '+id;
  const mesh=children(node,'mesh')[0];if(mesh){
   const vs=children(children(mesh,'vertices')[0],'vertex'),ts=children(children(mesh,'triangles')[0],'triangle');triangles+=ts.length;if(triangles>3000000)throw Error('Model exceeds the 3 million triangle preview limit.');
   const positions=new Float32Array(vs.length*3),indices=new Uint32Array(ts.length*3);
   vs.forEach((v,i)=>{for(const [j,k] of ['x','y','z'].entries()){const n=Number(v.getAttribute(k));if(!Number.isFinite(n))throw Error('Invalid mesh vertex');positions[i*3+j]=n}});
   ts.forEach((t,i)=>{for(const [j,k] of ['v1','v2','v3'].entries()){const n=Number(t.getAttribute(k));if(!Number.isInteger(n)||n<0||n>=vs.length)throw Error('Invalid triangle index');indices[i*3+j]=n}});
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setIndex(new THREE.BufferAttribute(indices,1));geometry.computeVertexNormals();group.add(new THREE.Mesh(geometry,neutral()));
  }
  const components=children(node,'components')[0];if(components)for(const c of children(components,'component')){const partPath=Array.from(c.attributes).find(a=>a.localName==='path')?.value;const part=object(partPath?normalizePath(partPath,path):path,c.getAttribute('objectid'),depth+1);part.applyMatrix4(transform(c.getAttribute('transform')));group.add(part)}
  active.delete(key);cache.set(key,group);return group.clone();
 }
 const root=document(main).root,result=new THREE.Group(),build=children(root,'build')[0];if(!build)throw Error('No model build in this 3MF');
 for(const item of children(build,'item')){const path=Array.from(item.attributes).find(a=>a.localName==='path')?.value;const part=object(path?normalizePath(path,main):main,item.getAttribute('objectid'));part.applyMatrix4(transform(item.getAttribute('transform')));result.add(part)}
 result.userData.units=root.getAttribute('unit')||'millimeter';return result;
}
export function parseModel(buffer,format){
 let object;
 if(format==='3MF')object=parse3MF(buffer);
 else if(format==='STL'){const geometry=new STLLoader().parse(buffer);geometry.computeVertexNormals();object=new THREE.Mesh(geometry,neutral())}
 else if(format==='OBJ')object=new OBJLoader().parse(new TextDecoder().decode(buffer));
 else if(format==='PLY'){const geometry=new PLYLoader().parse(buffer);if(!geometry.index)throw Error('This PLY contains points, not a triangle mesh.');geometry.computeVertexNormals();object=new THREE.Mesh(geometry,neutral())}
 else if(format==='AMF')object=new AMFLoader().parse(buffer);
 else throw Error('Unsupported mesh format');
 let count=0;object.traverse(node=>{if(node.isMesh){const g=node.geometry;count+=(g.index?g.index.count:g.attributes.position?.count||0)/3;if(!g.attributes.normal)g.computeVertexNormals();if(format==='OBJ'){const old=node.material;node.material=neutral();(Array.isArray(old)?old:[old]).forEach(m=>m.dispose())}}});
 if(!count)throw Error('No triangle mesh was found in this file.');if(count>3000000)throw Error('Model exceeds the 3 million triangle preview limit.');
 object.userData.triangles=count;return object;
}
function disposeObject(object){const geometries=new Set(),materials=new Set();object?.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>materials.add(m))});geometries.forEach(g=>g.dispose());materials.forEach(m=>{for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose()})}
export function mount(host,buffer,format){
 const model=parseModel(buffer,format);let renderer;
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false})}catch(e){disposeObject(model);throw Error('3D preview needs WebGL 2 enabled in your browser.')}
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x151e24);const camera=new THREE.PerspectiveCamera(40,1,0.01,100);camera.up.set(0,0,1);
 const box=new THREE.Box3().setFromObject(model);if(box.isEmpty()){disposeObject(model);renderer.dispose();throw Error('The mesh has no visible geometry.')}
 const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),span=Math.max(size.x,size.y,size.z);if(!Number.isFinite(span)||span<=0){disposeObject(model);renderer.dispose();throw Error('The mesh bounds are invalid.')}
 const pivot=new THREE.Group();model.position.sub(center);pivot.scale.setScalar(2/span);pivot.add(model);scene.add(pivot);
 scene.add(new THREE.HemisphereLight(0xe3f3ff,0x40505a,2.6));const light=new THREE.DirectionalLight(0xffffff,3.5);light.position.set(4,-5,7);scene.add(light);const fill=new THREE.DirectionalLight(0xaac9ff,1.4);fill.position.set(-4,4,1);scene.add(fill);
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.domElement.setAttribute('aria-label','Interactive 3D model. Drag to rotate; scroll to zoom.');renderer.domElement.tabIndex=0;host.append(renderer.domElement);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minDistance=.4;controls.maxDistance=20;controls.screenSpacePanning=true;
 function draw(){renderer.render(scene,camera)}
 function reset(){camera.position.set(3.2,-4.8,2.6);controls.target.set(0,0,0);controls.update();draw()}
 function resize(){const w=host.clientWidth||640,h=host.clientHeight||360;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();draw()}
 controls.addEventListener('change',draw);const observer=new ResizeObserver(resize);observer.observe(host);reset();resize();host.dataset.triangles=String(model.userData.triangles);host.dataset.loaded='true';
 return {reset,snapshot(){draw();return renderer.domElement.toDataURL('image/png')},wireframe(value){model.traverse(n=>{if(n.material)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>m.wireframe=value)});draw()},triangles:model.userData.triangles,dispose(){observer.disconnect();controls.dispose();disposeObject(model);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove()}};
}
