"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = __dirname;
const dataDir = process.env.DATA_DIR || path.join(root, ".local-data");
const port = Number(process.env.PORT || 3000);
const sessionSecret = process.env.SESSION_SECRET || "";
const setupToken = process.env.ADMIN_SETUP_TOKEN || "";
if (process.env.NODE_ENV === "production" && (!sessionSecret || !setupToken)) {
  console.error("Missing required SESSION_SECRET or ADMIN_SETUP_TOKEN");
  process.exit(1);
}
fs.mkdirSync(dataDir, {recursive: true});

const files = {
  content:path.join(dataDir,"content.json"),
  admin:path.join(dataDir,"admin.json"),
  leads:path.join(dataDir,"leads.json")
};

const defaults = {
  brand:"GOODFORM",eyebrow:"THE CREATOR LAUNCH SYSTEM",
  headline1:"The idea is there.",headline2:"Now make it happen.",
  subtitle:"A thoughtful, step-by-step way to turn what you know into a digital product worth sharing. Less second-guessing. More meaningful progress.",
  storyTitle:"Good ideas have a way of",storyHighlight:"getting stuck.",
  storyParagraph1:"Another open tab. Another saved tutorial. Another week spent wondering if your idea is ready.",
  storyParagraph2:"The hardest part isn't always finding an idea. It's knowing what to do with it next.",
  shiftText:"You don't need a hundred more ideas. You need a clear path for one.",
  methodTitle:"A little structure.",methodHighlight:"A lot more clarity.",
  methodSubtitle:"Four grounded steps to move from overthinking to something real. No shortcuts. Just a thoughtful way to make progress.",
  steps:[
    {title:"Find your focus.",description:"Choose the idea and the audience you can genuinely serve."},
    {title:"Shape the offer.",description:"Turn what you know into a useful, clearly defined product."},
    {title:"Put it out there.",description:"Build a simple launch plan and share your work with confidence."},
    {title:"Keep getting better.",description:"Listen, learn, refine, and take the next small step forward."}
  ],
  offerHeading:"Everything you need",offerHighlight:"to get moving.",
  offerSubtitle:"Less piecing things together from twenty different places. More room to focus on the work that matters.",
  offerName:"The Creator Launch System",
  offerDescription:"A practical digital playbook for turning one good idea into a real, ready-to-share offer.",
  offerItems:["A straightforward step-by-step roadmap","Practical planning worksheets","Useful templates to get started","A simple launch preparation checklist"],
  price:"Contact for pricing",priceNote:"Flexible options",
  trustTitle:"Clarity comes",trustHighlight:"first.",
  trustText:"Explore what is included and decide whether this approach fits your goals. We believe the right purchase starts with clear, useful information.",
  faqs:[
    {question:"Who is this designed for?",answer:"The content is intended for curious creators ready to organize an idea and put together a practical next step."},
    {question:"What does the offer include?",answer:"See the features and materials listed above. Please contact us if you need clarification before making a purchase."},
    {question:"Is this a digital or physical product?",answer:"The current offer is presented as a digital resource. Confirm delivery details before purchase."},
    {question:"Are any specific results guaranteed?",answer:"No financial, business or other specific outcome is guaranteed. Results depend on your circumstances and effort."}
  ],
  closingTitle:"That thing you've",closingLine2:"been thinking about?",closingHighlight:"Let's start there.",
  cta:"Get in touch",videoUrl:"",checkoutUrl:"",supportEmail:"",
  accent:"#db6042",footerNote:"A good place for great ideas."
};

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file,"utf8")); } catch(e) {
    if(e.code==="ENOENT") return fallback;
    console.error("Persistent data could not be read:",file,e.message);
    throw e;
  }
}
function atomicWrite(file,data) {
  const tmp=file+"."+crypto.randomBytes(8).toString("hex")+".tmp";
  fs.writeFileSync(tmp,JSON.stringify(data,null,2),{mode:0o600});
  fs.renameSync(tmp,file);
}
function initContent() {
  if(!fs.existsSync(files.content)) atomicWrite(files.content,{draft:defaults,published:defaults,version:1,publishedAt:new Date().toISOString(),draftAt:new Date().toISOString()});
  if(!fs.existsSync(files.leads)) atomicWrite(files.leads,[]);
}
initContent();

function json(res,status,body,extra={}) {
  const output=JSON.stringify(body);
  res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...extra});
  res.end(output);
}
function fail(res,status,message){json(res,status,{error:message});}
function clean(value,max=300){return typeof value==="string"?value.trim().slice(0,max):"";}
function validUrl(value) {
  if(!value)return true;
  try { const u=new URL(value);return ["https:","http:"].includes(u.protocol)&&!!u.hostname; } catch{return false;}
}
const shortFields = [
  "brand","eyebrow","headline1","headline2","storyTitle","storyHighlight",
  "shiftText","methodTitle","methodHighlight","offerHeading","offerHighlight",
  "offerName","price","priceNote","trustTitle","trustHighlight",
  "closingTitle","closingLine2","closingHighlight","cta","footerNote"
];
const longFields = [
  "subtitle","storyParagraph1","storyParagraph2","methodSubtitle",
  "offerSubtitle","offerDescription","trustText"
];
function validateContent(input) {
  if(!input || typeof input!=="object" || Array.isArray(input))throw Error("Invalid content");
  const output={};
  for(const key of shortFields)output[key]=clean(input[key],140);
  for(const key of longFields)output[key]=clean(input[key],800);
  for(const key of ["videoUrl","checkoutUrl"]) {
    output[key]=clean(input[key],1500);
    if(!validUrl(output[key]) || (key==="checkoutUrl" && output[key] && !output[key].startsWith("https://")))throw Error("Invalid "+key+" URL. Use https://");
  }
  output.supportEmail=clean(input.supportEmail,254).toLowerCase();
  if(output.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(output.supportEmail))throw Error("Invalid support email");
  output.accent=/^#[0-9a-fA-F]{6}$/.test(input.accent)?input.accent:"#db6042";
  if(!output.brand || !output.headline1 || !output.offerName)throw Error("Brand, headline and offer name are required");
  if(!Array.isArray(input.steps)||input.steps.length!==4)throw Error("Exactly four steps required");
  output.steps=input.steps.map(s=>({title:clean(s?.title,120),description:clean(s?.description,350)}));
  if(!Array.isArray(input.offerItems)||input.offerItems.length>10)throw Error("Offer list supports up to 10 items");
  output.offerItems=input.offerItems.map(s=>clean(s,200)).filter(Boolean);
  if(!Array.isArray(input.faqs)||input.faqs.length>12)throw Error("FAQs support up to 12 items");
  output.faqs=input.faqs.map(item=>({question:clean(item?.question,250),answer:clean(item?.answer,1500)})).filter(item=>item.question&&item.answer);
  return output;
}
function clientIp(req){return String(req.headers["x-forwarded-for"]||req.socket.remoteAddress||"unknown").split(",")[0].trim().slice(0,80);}
const attempts=new Map();
function throttle(key,limit=6,windowMs=15*60*1000){
  const now=Date.now();
  if(attempts.size>2500)for(const [k,v] of attempts)if(now-v.start>windowMs)attempts.delete(k);
  let rec=attempts.get(key);
  if(!rec||now-rec.start>windowMs){rec={start:now,count:0};attempts.set(key,rec);}
  rec.count++;
  return rec.count>limit;
}
function tokenEqual(a,b){
  const x=Buffer.from(String(a));const y=Buffer.from(String(b));
  return x.length===y.length&&crypto.timingSafeEqual(x,y);
}
function hashPassword(password,salt=crypto.randomBytes(24).toString("hex")){
  return {salt,hash:crypto.scryptSync(password,salt,64).toString("hex")};
}
function passwordMatches(p,record) {
  const hash=crypto.scryptSync(p,record.salt,64).toString("hex");
  return tokenEqual(hash,record.hash);
}
function createSession(admin){
  const payload=Buffer.from(JSON.stringify({user:admin.username,v:admin.sessionVersion,exp:Date.now()+7*86400000})).toString("base64url");
  const sig=crypto.createHmac("sha256",sessionSecret).update(payload).digest("base64url");
  return payload+"."+sig;
}
function verifySession(req){
  const match=String(req.headers.cookie||"").match(/(?:^|;\s*)vsl_admin=([^;]+)/);
  if(!match)return false;
  const [payload,sig]=decodeURIComponent(match[1]).split(".");
  if(!payload||!sig)return false;
  const expected=crypto.createHmac("sha256",sessionSecret).update(payload).digest("base64url");
  if(!tokenEqual(sig,expected))return false;
  let parsed;try{parsed=JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));}catch{return false;}
  const admin=readJSON(files.admin,null);
  return !!admin && parsed.user===admin.username&&parsed.v===admin.sessionVersion&&Number(parsed.exp)>Date.now();
}
function sendSession(res,admin) {
  const cookie="vsl_admin="+createSession(admin)+"; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800";
  json(res,200,{ok:true,username:admin.username},{"Set-Cookie":cookie});
}
function clearSession(res){json(res,200,{ok:true},{"Set-Cookie":"vsl_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0"});}
function originAllowed(req){
  const origin=req.headers.origin;
  if(!origin)return false;
  try{
    const actual=new URL(origin), host=String(req.headers["x-forwarded-host"]||req.headers.host||"").split(",")[0].trim();
    return (actual.protocol==="https:"||actual.protocol==="http:") && actual.host===host;
  }catch{return false;}
}
function readBody(req,max=60000){
  return new Promise((resolve,reject)=>{
    let data="",length=0;
    req.on("data",chunk=>{length+=chunk.length;if(length>max){reject(new Error("Request too large"));req.destroy();return;}data+=chunk;});
    req.on("end",()=>{try{resolve(JSON.parse(data||"{}"));}catch{reject(new Error("Invalid JSON"));}});
    req.on("error",reject);
  });
}
const staticFiles={"/":"index.html","/index.html":"index.html","/styles.css":"styles.css","/script.js":"script.js","/admin":"admin.html","/admin.html":"admin.html","/admin.js":"admin.js","/admin.css":"admin.css","/favicon.svg":"favicon.svg","/robots.txt":"robots.txt","/privacy": "privacy.html","/privacy.html":"privacy.html"};
const mimes={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"application/javascript; charset=utf-8",".svg":"image/svg+xml",".txt":"text/plain; charset=utf-8"};
function serveStatic(req,res,pathname){
  const name=staticFiles[pathname];
  if(!name)return fail(res,404,"Not found");
  fs.readFile(path.join(root,name),(err,content)=>{
    if(err)return fail(res,404,"Not found");
    if(name==="index.html"){
      const published=readJSON(files.content,null).published;
      const escaped=value=>String(value||"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
      const title=escaped(published.brand+" | "+published.headline1+" "+published.headline2);
      const desc=escaped(published.subtitle);
      let output=content.toString("utf8").replace(/<title>[\s\S]*?<\/title>/,"<title>"+title+"</title>");
      output=output.replace(/(<meta name="description" content=")[^"]*(">)/,(_,a,b)=>a+desc+b);
      output=output.replace(/(<meta property="og:title" content=")[^"]*(">)/,(_,a,b)=>a+title+b);
      output=output.replace(/(<meta property="og:description" content=")[^"]*(">)/,(_,a,b)=>a+desc+b);
      content=Buffer.from(output,"utf8");
    }
    const isHtml=name.endsWith(".html");
    res.writeHead(200,{"Content-Type":mimes[path.extname(name)]||"application/octet-stream","Cache-Control":isHtml?"no-store":"public,max-age=120","X-Content-Type-Options":"nosniff"});
    res.end(req.method==="HEAD"?undefined:content);
  });
}
function csvField(x){
  let value=String(x??"");
  if(/^[=+@\-\t\r]/.test(value))value="'"+value;
  return '"'+value.replace(/"/g,'""')+'"';
}
async function handleApi(req,res,pathname){
  if(req.method==="GET"&&pathname==="/api/public"){
    const content=readJSON(files.content,null);
    return json(res,200,{...content.published,publishedAt:content.publishedAt});
  }
  if(req.method==="GET"&&pathname==="/api/admin/status"){
    const admin=readJSON(files.admin,null);
    return json(res,200,{setupRequired:!admin,authenticated:verifySession(req),username:verifySession(req)?admin?.username:null});
  }
  if(pathname.startsWith("/api/admin/") && !["/api/admin/login","/api/admin/setup"].includes(pathname) && !verifySession(req))return fail(res,401,"Sign in to continue");
  if(req.method==="GET"&&pathname==="/api/admin/content")return json(res,200,readJSON(files.content,null));
  if(req.method==="GET"&&pathname==="/api/admin/leads"){
    const leads=readJSON(files.leads,[]);
    return json(res,200,{leads:leads.slice(-500).reverse(),count:leads.length});
  }
  if(req.method==="GET"&&pathname==="/api/admin/leads.csv"){
    const leads=readJSON(files.leads,[]);
    const csv=["Date,Email,Name,Message,Consent",...leads.map(l=>[l.at,l.email,l.name,l.message,l.consent].map(csvField).join(","))].join("\r\n");
    res.writeHead(200,{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=vsl-leads.csv","Cache-Control":"no-store"});
    return res.end(csv);
  }
  if(req.method!=="POST")return fail(res,405,"Method not allowed");
  if(!originAllowed(req))return fail(res,403,"Origin check failed");
  let body;
  try{body=await readBody(req);}catch(err){return fail(res,400,err.message);}
  if(pathname==="/api/admin/setup"){
    if(throttle("setup:"+clientIp(req),6))return fail(res,429,"Too many attempts. Try again later.");
    if(readJSON(files.admin,null))return fail(res,409,"Admin account already configured");
    if(!setupToken||!tokenEqual(body.token,setupToken))return fail(res,403,"Invalid setup token");
    const username=clean(body.username,70).toLowerCase();
    const password=String(body.password||"");
    if(!/^[a-z0-9_.-]{3,70}$/.test(username)||password.length<12||password.length>128)return fail(res,400,"Username must have 3+ characters; password must have 12–128 characters");
    const admin={username,...hashPassword(password),sessionVersion:1,createdAt:new Date().toISOString()};
    atomicWrite(files.admin,admin);
    return sendSession(res,admin);
  }
  if(pathname==="/api/admin/login"){
    const ip=clientIp(req);
    if(throttle("login:"+ip,8))return fail(res,429,"Too many sign-in attempts. Try again in 15 minutes.");
    const admin=readJSON(files.admin,null);
    const pwd=String(body.password||"");
    if(!admin || clean(body.username,70).toLowerCase()!==admin.username||pwd.length>128||!passwordMatches(pwd,admin))return fail(res,401,"Invalid username or password");
    attempts.delete("login:"+ip);
    return sendSession(res,admin);
  }
  if(pathname==="/api/leads"){
    if(throttle("leads:"+clientIp(req),5,3600000))return fail(res,429,"Too many submissions, please try later");
    if(body.website)return json(res,200,{ok:true});
    const email=clean(body.email,254).toLowerCase(), name=clean(body.name,120),message=clean(body.message,1200);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||body.consent!==true)return fail(res,400,"Valid email and consent required");
    const leads=readJSON(files.leads,[]);
    if(leads.length>=50000)return fail(res,503,"Submission capacity reached");
    leads.push({id:crypto.randomUUID(),at:new Date().toISOString(),email,name,message,consent:true});
    atomicWrite(files.leads,leads);
    return json(res,201,{ok:true,message:"Thanks. Your message was received."});
  }
  if(!verifySession(req))return fail(res,401,"Sign in to continue");
  if(pathname==="/api/admin/leads/delete"){
    const id=clean(body.id,80);
    const existing=readJSON(files.leads,[]);
    const filtered=existing.filter(l=>l.id!==id);
    if(filtered.length===existing.length)return fail(res,404,"Inquiry not found");
    atomicWrite(files.leads,filtered);
    return json(res,200,{ok:true,deleted:1});
  }
  if(pathname==="/api/admin/logout")return clearSession(res);
  if(pathname==="/api/admin/password"){
    const admin=readJSON(files.admin,null);
    const current=String(body.currentPassword||""),next=String(body.newPassword||"");
    if(!passwordMatches(current,admin))return fail(res,403,"Current password is incorrect");
    if(next.length<12||next.length>128)return fail(res,400,"New password must be 12–128 characters");
    Object.assign(admin,hashPassword(next));admin.sessionVersion+=1;
    atomicWrite(files.admin,admin);return sendSession(res,admin);
  }
  if(pathname==="/api/admin/draft"){
    let next;try{next=validateContent(body.content);}catch(err){return fail(res,400,err.message);}
    const state=readJSON(files.content,null);
    state.draft=next;state.draftAt=new Date().toISOString();
    atomicWrite(files.content,state);
    return json(res,200,{ok:true,draftAt:state.draftAt});
  }
  if(pathname==="/api/admin/publish"){
    let next;try{next=validateContent(body.content);}catch(err){return fail(res,400,err.message);}
    const state=readJSON(files.content,null);
    state.draft=next;state.published=structuredClone(next);state.version=(state.version||0)+1;
    state.draftAt=state.publishedAt=new Date().toISOString();
    atomicWrite(files.content,state);
    return json(res,200,{ok:true,publishedAt:state.publishedAt,version:state.version});
  }
  return fail(res,404,"Not found");
}
const server=http.createServer(async(req,res)=>{
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("X-Frame-Options","DENY");
  res.setHeader("Referrer-Policy","strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy","camera=(), microphone=(), geolocation=()");
  if(req.headers["x-forwarded-proto"]==="https")res.setHeader("Strict-Transport-Security","max-age=31536000; includeSubDomains");
  let pathname;try{pathname=new URL(req.url,"http://localhost").pathname;}catch{return fail(res,400,"Bad URL");}
  if(pathname==="/health")return json(res,200,{status:"ok",data:"persistent"});
  if(pathname.startsWith("/api/")) {
    try{return await handleApi(req,res,pathname);}catch(err){console.error("API error",pathname,err);return fail(res,500,"Internal server error");}
  }
  if(req.method!=="GET"&&req.method!=="HEAD")return fail(res,405,"Method not allowed");
  return serveStatic(req,res,pathname);
});
server.listen(port,"0.0.0.0",()=>console.log("VSLs ready on port "+port+" with "+dataDir));
