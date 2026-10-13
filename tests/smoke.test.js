"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {spawn}=require("node:child_process");
const {mkdtempSync,rmSync}=require("node:fs");
const {tmpdir}=require("node:os");
const path=require("node:path");
const net=require("node:net");
const {setTimeout:pause}=require("node:timers/promises");

async function unusedPort(){
 return await new Promise((resolve,reject)=>{
  const server=net.createServer();
  server.on("error",reject);
  server.listen(0,"127.0.0.1",()=>{const port=server.address().port;server.close(()=>resolve(port));});
 });
}
test("VSL CMS protects drafts, publishes selected videos, and persists uploads", {timeout:30000},async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),"vsl-smoke-")),port=await unusedPort();
 const origin="http://127.0.0.1:"+port;
 const child=spawn(process.execPath,["server.js"],{cwd:path.join(__dirname,".."),env:{...process.env,PORT:String(port),NODE_ENV:"test",DATA_DIR:dir,SESSION_SECRET:"test-0123456789-not-production",ADMIN_SETUP_TOKEN:"test-bootstrap"},stdio:["ignore","pipe","pipe"]});
 let output="";child.stderr.on("data",c=>output+=String(c));
 const api=async(route,options={})=>{
   const response=await fetch(origin+route,options);
   let data;try{data=await response.json();}catch{data=null;}
   return {status:response.status,data,cookie:response.headers.get("set-cookie"),headers:response.headers};
 };
 const post=(route,payload,cookie)=>api(route,{method:"POST",headers:{"Origin":origin,"Content-Type":"application/json",...(cookie?{"Cookie":cookie}:{})},body:JSON.stringify(payload)});
 try{
  let healthy=false;
  for(let i=0;i<70;i++){
   if(child.exitCode!==null)throw Error("Server exited: "+output);
   try{const r=await api("/health");if(r.status===200){healthy=true;break;}}catch{}
   await pause(90);
  }
  assert.equal(healthy,true,"Server must become healthy");
  const publicInitial=await api("/api/public");
  assert.equal(publicInitial.status,200);
  assert.deepEqual(publicInitial.data.videos,[]);
  assert.equal((await api("/api/admin/content")).status,401);
  assert.equal((await post("/api/admin/setup",{token:"invalid",username:"admin",password:"long-secure-password"})).status,403);
  const created=await post("/api/admin/setup",{token:"test-bootstrap",username:"owner",password:"long-secure-password"});
  assert.equal(created.status,200,JSON.stringify(created.data));
  const cookie=created.cookie.split(";")[0];
  assert.equal((await api("/api/admin/content",{headers:{"Cookie":cookie}})).status,200);
  const data=(await api("/api/admin/content",{headers:{"Cookie":cookie}})).data;
  const content=data.draft;
  content.videos=[
    {id:"video-first",title:"Product introduction",description:"A first video",category:"Introduction",url:"https://youtu.be/dQw4w9WgXcQ",poster:"",visible:true,featured:true},
    {id:"video-second",title:"More details",description:"A second published video",category:"Deep dive",url:"https://vimeo.com/12345678",poster:"",visible:true,featured:false},
    {id:"video-third",title:"Private launch preview",description:"A draft-only video",category:"Drafts",url:"https://youtu.be/dQw4w9WgXcQ",poster:"",visible:false,featured:false}
  ];
  const saved=await post("/api/admin/draft",{content},cookie);
  assert.equal(saved.status,200,JSON.stringify(saved.data));
  assert.equal((await api("/api/public")).data.videos.length,0,"Draft videos must remain private");
  const publish=await post("/api/admin/publish",{content},cookie);
  assert.equal(publish.status,200,JSON.stringify(publish.data));
  const publicAfter=(await api("/api/public")).data;
  assert.equal(publicAfter.videos.length,2,"Multiple visible videos must be published, while hidden videos stay private");
  assert.equal(publicAfter.videos[0].title,"Product introduction");
  const adminContent=(await api("/api/admin/content",{headers:{"Cookie":cookie}})).data;
  assert.equal(adminContent.draft.videos.length,3,"Admin must retain visible and hidden videos");
  const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/fXsAAAAASUVORK5CYII=","base64");
  const upload=await api("/api/admin/media",{method:"POST",headers:{"Origin":origin,"Cookie":cookie,"Content-Type":"image/png"},body:png});
  assert.equal(upload.status,201,JSON.stringify(upload.data));
  assert.match(upload.data.url,/^\/media\/[a-f0-9-]{36}\.png$/);
  // Verify uploaded MP4 bytes and HTTP range streaming, not only image covers.
  const mp4=Buffer.from([0,0,0,24,102,116,121,112,105,115,111,109,0,0,2,0,105,115,111,109,109,112,52,50]);
  const videoUpload=await api("/api/admin/media",{method:"POST",headers:{"Origin":origin,"Cookie":cookie,"Content-Type":"video/mp4"},body:mp4});
  assert.equal(videoUpload.status,201,JSON.stringify(videoUpload.data));
  assert.match(videoUpload.data.url,/^\/media\/[a-f0-9-]{36}\.mp4$/);
  const videoResponse=await fetch(origin+videoUpload.data.url,{headers:{Range:"bytes=4-11"}});
  assert.equal(videoResponse.status,206);
  assert.equal(videoResponse.headers.get("content-type"),"video/mp4");
  assert.equal(Buffer.from(await videoResponse.arrayBuffer()).toString("ascii"),"ftypisom");
  const media=await fetch(origin+upload.data.url);
  assert.equal(media.status,200);
  assert.equal(media.headers.get("content-type"),"image/png");
  assert.equal(Buffer.compare(Buffer.from(await media.arrayBuffer()),png),0);
  const partial=await fetch(origin+upload.data.url,{headers:{Range:"bytes=0-7"}});
  assert.equal(partial.status,206);
  assert.equal((await partial.arrayBuffer()).byteLength,8);
  assert.equal((await api("/api/admin/media",{method:"POST",headers:{"Origin":origin,"Content-Type":"image/png"},body:png})).status,401);
  assert.equal((await api("/api/admin/draft",{method:"POST",headers:{"Origin":"https://attacker.example","Cookie":cookie,"Content-Type":"application/json"},body:JSON.stringify({content})})).status,403);
  assert.equal((await post("/api/admin/logout",{},cookie)).status,200);
  assert.equal((await api("/api/admin/content",{headers:{"Cookie":cookie}})).status,401,"Logout must revoke the session token");
 }finally{
  child.kill("SIGTERM");
  await pause(180);
  rmSync(dir,{recursive:true,force:true});
 }
});
