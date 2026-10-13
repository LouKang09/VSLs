"use strict";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let page=null,activeCategory="All",playing=null;
const escapeUrl=value=>{
  try{const u=new URL(value,location.origin);return ["https:","http:"].includes(u.protocol)?u:null;}catch{return null;}
};
function parseVideo(raw){
  if(!raw)return null;
  if(/^\/media\/[a-f0-9-]{36}\.(mp4|webm)$/i.test(raw))return {kind:"file",url:raw};
  const url=escapeUrl(raw);if(!url)return null;
  const host=url.hostname.replace(/^www\./,"").toLowerCase();
  let id=null;
  if(host==="youtu.be")id=url.pathname.split("/")[1];
  else if(["youtube.com","m.youtube.com","youtube-nocookie.com"].includes(host))id=url.searchParams.get("v")||(url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)||[])[1];
  if(id&&/^[\w-]{11}$/.test(id))return {kind:"youtube",id,url:"https://www.youtube-nocookie.com/embed/"+id+"?rel=0&autoplay=1"};
  if(["vimeo.com","player.vimeo.com"].includes(host)){
    const id=url.pathname.split("/").find(x=>/^\d+$/.test(x));
    if(id)return {kind:"vimeo",id,url:"https://player.vimeo.com/video/"+id+"?autoplay=1"};
  }
  if(/\.(mp4|webm)$/i.test(url.pathname))return {kind:"file",url:url.href};
  return null;
}
function posterFor(v){
  if(v.poster && (v.poster.startsWith("/media/") || (escapeUrl(v.poster)&&escapeUrl(v.poster).protocol==="https:")))return v.poster;
  const parsed=parseVideo(v.url);
  return parsed?.kind==="youtube"?"https://i.ytimg.com/vi/"+parsed.id+"/hqdefault.jpg":null;
}
function put(selector,value){
  const el=$(selector);if(el&&typeof value==="string")el.textContent=value;
}
function renderFaqs(items){
  const parent=$("#faqList");parent.replaceChildren();
  (items||[]).forEach((item,i)=>{
    const d=document.createElement("details"),s=document.createElement("summary"),number=document.createElement("span"),plus=document.createElement("i"),p=document.createElement("p");
    number.textContent=String(i+1).padStart(2,"0");plus.textContent="+";
    s.append(number,document.createTextNode(item.question),plus);
    p.textContent=item.answer;d.append(s,p);parent.append(d);
  });
}
function renderSteps(items){
  const parent=$("#stepsGrid");parent.replaceChildren();
  (items||[]).forEach((step,i)=>{
    const div=document.createElement("article");div.className="step";
    const n=document.createElement("span");n.textContent="0"+(i+1);
    const line=document.createElement("div");line.className="step-dash";
    const title=document.createElement("h3");title.textContent=step.title;
    const desc=document.createElement("p");desc.textContent=step.description;
    div.append(n,line,title,desc);parent.append(div);
  });
}
function renderOffer(items){
  const parent=$("#offerItems");parent.replaceChildren();
  (items||[]).forEach(item=>{
    const li=document.createElement("li"),mark=document.createElement("span");mark.textContent="✓";
    li.append(mark,document.createTextNode(item));parent.append(li);
  });
}
function showVideo(v){
  const source=parseVideo(v.url);if(!source)return;
  const modal=$("#videoDialog"),mount=$("#playerMount");mount.replaceChildren();
  const video=source.kind==="file"?document.createElement("video"):document.createElement("iframe");
  if(source.kind==="file"){video.src=source.url;video.controls=true;video.autoplay=true;video.playsInline=true;if(v.poster)video.poster=v.poster;}
  else {video.src=source.url;video.allow="autoplay; encrypted-media; fullscreen; picture-in-picture";video.referrerPolicy="strict-origin-when-cross-origin";video.allowFullscreen=true;video.title=v.title;}
  mount.append(video);put("#playingTitle",v.title);put("#playingDescription",v.description);
  playing=v.id;modal.showModal();
}
$("#closeVideo").addEventListener("click",()=>$("#videoDialog").close());
$("#videoDialog").addEventListener("close",()=>{$("#playerMount").replaceChildren();playing=null;});
function featuredVideo(){
  const list=page?.videos||[];return list.find(v=>v.featured)||list[0]||null;
}
function renderHeroVideo(){
  const items=page?.videos||[],v=featuredVideo(),poster=$("#heroVideoPoster"),button=$("#heroPlay");
  put("#heroVideoCount",items.length?("01 / "+String(items.length).padStart(2,"0")):"00 / 00");
  put("#videoStat",items.length===1?"1 VIDEO PRESENTATION":items.length+" VIDEO PRESENTATIONS");
  if(!v){
    poster.hidden=true;put("#heroVideoTitle","Your next chapter starts here");
    put("#heroVideoDescription","Explore the offer below");
    put("#heroVideoBadge","COMING SOON");
    button.setAttribute("aria-label","Explore available presentations");button.disabled=true;
    return;
  }
  const src=posterFor(v);
  if(src){poster.src=src;poster.hidden=false;poster.onerror=()=>{poster.hidden=true;};$("#showcaseCopy").hidden=true;}
  else{poster.hidden=true;$("#showcaseCopy").hidden=false;}
  put("#heroVideoTitle",v.title);put("#heroVideoDescription",v.description||"Watch this presentation");
  put("#heroVideoBadge",v.category||"PRESENTATION");
  button.disabled=false;button.setAttribute("aria-label","Play "+v.title);
  button.onclick=()=>showVideo(v);
}
function renderFilters(){
  const parent=$("#videoFilters");parent.replaceChildren();
  const items=page?.videos||[];
  const categories=["All",...new Set(items.map(v=>v.category||"Presentation"))];
  if(!categories.includes(activeCategory))activeCategory="All";
  for(const cat of categories){
    const b=document.createElement("button");b.type="button";b.textContent=cat;b.className=cat===activeCategory?"active":"";
    b.addEventListener("click",()=>{activeCategory=cat;renderFilters();renderGrid();});
    parent.append(b);
  }
}
function renderGrid(){
  const root=$("#videoGrid");root.replaceChildren();
  const all=page?.videos||[],items=all.filter(v=>activeCategory==="All"||v.category===activeCategory);
  $("#emptyVideos").hidden=items.length>0;
  put("#publicVideoCount",all.length+" PUBLISHED "+(all.length===1?"VIDEO":"VIDEOS"));
  items.forEach((v,i)=>{
    const article=document.createElement("article");article.className="video-card";
    const preview=document.createElement("button");preview.type="button";preview.className="video-thumb";preview.setAttribute("aria-label","Play "+v.title);
    preview.addEventListener("click",()=>showVideo(v));
    const poster=posterFor(v);
    if(poster){
      const img=document.createElement("img");img.src=poster;img.alt="";
      img.loading="lazy";img.onerror=()=>img.remove();preview.append(img);
    }
    const fallback=document.createElement("span");fallback.className="thumb-fallback";fallback.textContent="VSL / "+String(i+1).padStart(2,"0");
    const mark=document.createElement("span");mark.className="thumb-play";mark.textContent="▶";
    const tag=document.createElement("span");tag.className="thumb-tag";tag.textContent=v.featured?"FEATURED":"VIDEO "+String(i+1).padStart(2,"0");
    preview.append(fallback,mark,tag);
    const body=document.createElement("div");body.className="video-body";
    const cat=document.createElement("span");cat.textContent=v.category||"PRESENTATION";
    const title=document.createElement("h3");title.textContent=v.title;
    const desc=document.createElement("p");desc.textContent=v.description||"Explore this presentation.";
    const link=document.createElement("button");link.type="button";link.className="video-card-link";
    link.append(document.createTextNode("Watch presentation"),Object.assign(document.createElement("span"),{textContent:"↗"}));
    link.addEventListener("click",()=>showVideo(v));
    body.append(cat,title,desc,link);article.append(preview,body);root.append(article);
  });
}
function render(data){
  page=data;
  $("#checkoutNavLink").hidden=data.checkoutEnabled!==true;
  $("#checkoutFooterLink").hidden=data.checkoutEnabled!==true;
  document.documentElement.style.setProperty("--accent",/^#[0-9a-f]{6}$/i.test(data.accent)?data.accent:"#6477e6");
  $$("[data-text]").forEach(el=>{const value=data[el.dataset.text];if(typeof value==="string")el.textContent=value;});
  renderSteps(data.steps);renderOffer(data.offerItems);renderFaqs(data.faqs);renderFilters();renderGrid();renderHeroVideo();
  put("#offerReassure",data.checkoutUrl?"You'll be directed to a separate checkout or booking page.":"Questions? Send an inquiry before making a decision.");
  document.title=data.brand+" — "+data.headline1+" "+data.headline2;
  const description=$('meta[name="description"]');if(description)description.content=data.subtitle||"";
}
async function boot(){
  try{
    if(new URLSearchParams(location.search).get("preview")==="draft"){
      const response=await fetch("/api/admin/content",{credentials:"same-origin",cache:"no-store"});
      if(response.ok){
        const data=await response.json(),draft=data.draft;
        draft.videos=(draft.videos||[]).filter(v=>v.visible);
        render(draft);
        const notice=document.createElement("div");notice.className="draft-banner";
        notice.textContent="DRAFT PREVIEW — Unpublished changes are visible only to you.";
        const link=document.createElement("a");link.href="/admin";link.textContent="Return to admin ↗";notice.append(link);
        $(".global-nav").after(notice);return;
      }
    }
    const response=await fetch("/api/public",{cache:"no-store"});
    if(!response.ok)throw Error("Site content unavailable");
    render(await response.json());
  }catch(error){console.error("Content load failed",error);put("#videoStat","PLEASE REFRESH TO LOAD THE LATEST CONTENT");}
}
const nav=$("#mainNav"),menu=$("#menuButton");
menu.addEventListener("click",()=>{const open=!nav.classList.contains("open");nav.classList.toggle("open",open);menu.setAttribute("aria-expanded",String(open));});
nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{nav.classList.remove("open");menu.setAttribute("aria-expanded","false");}));
const lead=$("#leadDialog");
function buy(){
  if(page?.checkoutEnabled===true){location.assign("/checkout");return;}
  const url=escapeUrl(page?.checkoutUrl);
  if(url&&url.protocol==="https:")window.open(url.href,"_blank","noopener,noreferrer");
  else lead.showModal();
}
$$("[data-buy]").forEach(el=>el.addEventListener("click",buy));
$("#closeLead").addEventListener("click",()=>lead.close());
$("#leadForm").addEventListener("submit",async event=>{
  event.preventDefault();const form=event.currentTarget,status=$("#leadStatus"),button=$("#sendLead"),data=new FormData(form);
  button.disabled=true;status.textContent="Sending…";
  try{
    const response=await fetch("/api/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:String(data.get("name")||""),email:String(data.get("email")||""),message:String(data.get("message")||""),website:String(data.get("website")||""),consent:data.get("consent")==="on"})});
    const result=await response.json();if(!response.ok)throw Error(result.error||"Unable to send message");
    status.textContent="Your inquiry has been received. Thank you!";form.reset();
  }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
});
$("#year").textContent=String(new Date().getFullYear());
boot();
