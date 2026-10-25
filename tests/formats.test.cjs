const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
function engine(){const dom=new JSDOM('',{runScripts:'outside-only'});dom.window.ArrayBuffer=ArrayBuffer;dom.window.TextDecoder=TextDecoder;dom.window.TextEncoder=TextEncoder;dom.window.eval(fs.readFileSync('vendor/mesh-viewer.js','utf8'));return dom}
const arrayBuffer=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
const asciiSTL='solid triangle\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid triangle';
const mesh='<mesh><vertices><vertex x="0" y="0" z="0"/><vertex x="1" y="0" z="0"/><vertex x="0" y="1" z="0"/></vertices><triangles><triangle v1="0" v2="1" v3="2"/></triangles></mesh>';
const model=(resources,build)=>`<?xml version="1.0"?><model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06"><resources>${resources}</resources><build>${build}</build></model>`;
test('original sample is closed, consistently wound and nondegenerate',()=>{
 const data=fs.readFileSync('examples/Layer Tower.stl'),count=data.readUInt32LE(80),edges=new Map();let volume=0;
 assert.equal(count,512);assert.equal(data.length,84+count*50);
 for(let i=0;i<count;i++){const start=84+i*50+12;const vs=[0,1,2].map(j=>[0,1,2].map(k=>data.readFloatLE(start+j*12+k*4)));const [a,b,c]=vs;
 const u=b.map((v,k)=>v-a[k]),v=c.map((v,k)=>v-a[k]);const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];assert.ok(cross.some(x=>Math.abs(x)>1e-8));volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
 for(let j=0;j<3;j++){const from=vs[j].join(','),to=vs[(j+1)%3].join(','),key=[from,to].sort().join('|');const edge=edges.get(key)||{count:0,direction:0};edge.count++;edge.direction+=from<to?1:-1;edges.set(key,edge)}}
 for(const edge of edges.values()){assert.equal(edge.count,2);assert.equal(edge.direction,0)}assert.ok(volume>0);
});
test('actual bundled parsers read binary/ASCII STL, OBJ, PLY and AMF geometry',()=>{const dom=engine();try{
 const parse=dom.window.MeshViewer.parseModel;
 const inputs=[['STL',fs.readFileSync('examples/Layer Tower.stl'),512],['STL',Buffer.from(asciiSTL),1],['OBJ',Buffer.from('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n'),1],['PLY',Buffer.from('ply\nformat ascii 1.0\nelement vertex 3\nproperty float x\nproperty float y\nproperty float z\nelement face 1\nproperty list uchar int vertex_indices\nend_header\n0 0 0\n1 0 0\n0 1 0\n3 0 1 2\n'),1],['AMF',Buffer.from('<?xml version="1.0"?><amf unit="millimeter"><object id="0"><mesh><vertices><vertex><coordinates><x>0</x><y>0</y><z>0</z></coordinates></vertex><vertex><coordinates><x>1</x><y>0</y><z>0</z></coordinates></vertex><vertex><coordinates><x>0</x><y>1</y><z>0</z></coordinates></vertex></vertices><volume><triangle><v1>0</v1><v2>1</v2><v3>2</v3></triangle></volume></mesh></object></amf>'),1]];
 for(const [format,data,count] of inputs)assert.equal(parse(arrayBuffer(data),format).userData.triangles,count,format);
 }finally{dom.window.close()}});
test('3MF core, transformed components, and external production parts parse',async()=>{
 const {zipSync,strToU8}=await import('three/addons/libs/fflate.module.js');const dom=engine();try{
 const shapes=[{'3D/3dmodel.model':model('<object id="1">'+mesh+'</object>','<item objectid="1"/>')},
 {'3D/3dmodel.model':model('<object id="1">'+mesh+'</object><object id="2"><components><component objectid="1" transform="1 0 0 0 1 0 0 0 1 10 20 30"/></components></object>','<item objectid="2"/>')},
 {'3D/3dmodel.model':model('<object id="2"><components><component objectid="1" p:path="/3D/Objects/part.model"/></components></object>','<item objectid="2"/>'),'3D/Objects/part.model':model('<object id="1">'+mesh+'</object>','')}];
 for(const shape of shapes){shape['_rels/.rels']='<Relationships><Relationship Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" Target="/3D/3dmodel.model"/></Relationships>';const zipped=zipSync(Object.fromEntries(Object.entries(shape).map(([k,v])=>[k,strToU8(v)])));assert.equal(dom.window.MeshViewer.parseModel(arrayBuffer(zipped),'3MF').userData.triangles,1)}
 }finally{dom.window.close()}});
