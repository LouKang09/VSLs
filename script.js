"use strict";
let siteContent = null;
const by = selector => document.querySelector(selector);
const text = (selector,value) => { const el=by(selector);if(el && typeof value==="string")el.textContent=value; };
const rich = (selector,regular,highlight) => {
  const el=by(selector);if(!el)return;
  el.replaceChildren(document.createTextNode(regular||""), document.createElement("br"));
  const em=document.createElement("em");em.textContent=highlight||"";el.appendChild(em);
};
const safeUrl = value => {
  try {const u=new URL(value);return ["https:","http:"].includes(u.protocol)?u:null;}catch{return null;}
};
function getVideo(value){
  const u=safeUrl(value);if(!u)return null;
  const hostname=u.hostname.toLowerCase().replace(/^www\./,"");
  let id="";
  if(hostname==="youtu.be")id=u.pathname.split("/")[1]||"";
  if(["youtube.com","m.youtube.com","youtube-nocookie.com"].includes(hostname))id=u.searchParams.get("v")||(u.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)/)||[])[1]||"";
  if(/^[A-Za-z0-9_-]{11}$/.test(id))return {type:"iframe",url:"https://www.youtube-nocookie.com/embed/"+id+"?rel=0&autoplay=1"};
  if(["vimeo.com","player.vimeo.com"].includes(hostname)){
    const videoId=u.pathname.split("/").find(s=>/^\d+$/.test(s));
    if(videoId)return {type:"iframe",url:"https://player.vimeo.com/video/"+videoId+"?autoplay=1"};
  }
  if(/\.mp4$/i.test(u.pathname))return {type:"video",url:u.href};
  return null;
}
function renderSteps(items){
  const cards=document.querySelectorAll(".step-card");
  if(!Array.isArray(items))return;
  cards.forEach((card,i)=>{const item=items[i];if(!item)return;
    const title=card.querySelector("h3"),p=card.querySelector("p");
    if(title)title.textContent=item.title||"";if(p)p.textContent=item.description||"";
  });
}
function renderOffer(items){
  const list=by(".offer-includes");if(!list||!Array.isArray(items))return;
  list.replaceChildren();
  for(const item of items){const li=document.createElement("li");
    const tick=document.createElement("span");tick.textContent="✓";
    li.appendChild(tick);li.appendChild(document.createTextNode(" "+item));list.appendChild(li);
  }
}
function renderFaqs(items){
  const list=by(".faq-list");if(!list||!Array.isArray(items))return;
  list.replaceChildren();
  items.forEach((item,index)=>{
    const details=document.createElement("details"),summary=document.createElement("summary"),num=document.createElement("span"),plus=document.createElement("i"),p=document.createElement("p");
    num.textContent=String(index+1).padStart(2,"0");plus.textContent="+";
    summary.append(num,document.createTextNode(" "+item.question+" "),plus);
    p.textContent=item.answer;details.append(summary,p);list.appendChild(details);
  });
}
function render(data){
  siteContent=data;
  document.documentElement.style.setProperty("--accent",/^#[0-9a-fA-F]{6}$/.test(data.accent)?data.accent:"#db6042");
  for(const el of document.querySelectorAll("[data-text]")){
    const key=el.dataset.text;if(typeof data[key]==="string")el.textContent=data[key];
  }
  rich(".story h2",data.storyTitle,data.storyHighlight);
  const paragraphs=document.querySelectorAll(".story-copy > p");
  if(paragraphs[0])paragraphs[0].textContent=data.storyParagraph1||"";
  if(paragraphs[1])paragraphs[1].textContent=data.storyParagraph2||"";
  text(".shift strong",data.shiftText);
  rich(".method h2",data.methodTitle,data.methodHighlight);
  text(".method-heading > p",data.methodSubtitle);
  renderSteps(data.steps);
  rich(".offer-heading h2",data.offerHeading,data.offerHighlight);
  text(".offer-heading > p",data.offerSubtitle);
  renderOffer(data.offerItems);
  rich(".trust h2",data.trustTitle,data.trustHighlight);
  text(".trust-content > p",data.trustText);
  rich(".closing-content h2",data.closingTitle+" "+data.closingLine2,data.closingHighlight);
  renderFaqs(data.faqs);
  text(".footer-top p",data.footerNote);
  text(".price-block small",data.priceNote);
  document.title=data.brand+" | "+data.headline1+" "+data.headline2;
  by('meta[name="description"]').setAttribute("content",data.subtitle||"");
  text("#videoStatus",getVideo(data.videoUrl)?"Watch the complete presentation above":"Presentation video will be available soon");
  if(data.checkoutUrl && safeUrl(data.checkoutUrl)){
    text("#offerSecurityNote","Continue to the secure checkout or booking destination.");
    text(".closing-content > small","Have questions? Please contact us before making a decision.");
  } else {
    text("#offerSecurityNote","No online payment required to send an inquiry.");
  }
}
async function loadPublic(){
  try{
    const response=await fetch("/api/public",{cache:"no-store"});
    if(!response.ok)throw Error("Could not load published page");
    render(await response.json());
  }catch(err){console.error(err);}
}
const playButton=by("#playVideo");
playButton.addEventListener("click",()=>{
  const source=getVideo(siteContent?.videoUrl);
  if(!source){text("#videoStatus","The presentation video hasn't been published yet.");return;}
  let node;
  if(source.type==="iframe"){
    node=document.createElement("iframe");node.title="Video sales presentation";
    node.src=source.url;node.referrerPolicy="strict-origin-when-cross-origin";
    node.allow="autoplay; fullscreen; picture-in-picture; encrypted-media";node.allowFullscreen=true;
  } else {
    node=document.createElement("video");node.src=source.url;node.controls=true;node.autoplay=true;node.playsInline=true;
  }
  const container=by("#videoPlayer");container.replaceChildren(node);container.hidden=false;by("#videoArt").hidden=true;
});
const leadDialog=by("#leadDialog");
by("#closeLead").addEventListener("click",()=>leadDialog.close());
document.querySelectorAll("[data-buy]").forEach(button=>button.addEventListener("click",()=>{
  const url=safeUrl(siteContent?.checkoutUrl);
  if(url)window.open(url.href,"_blank","noopener,noreferrer");else leadDialog.showModal();
}));
by("#leadForm").addEventListener("submit",async event=>{
  event.preventDefault();const form=event.currentTarget;
  const button=by("#submitLead"),message=by("#leadMessage");
  const fd=new FormData(form);
  const payload={name:String(fd.get("name")||""),email:String(fd.get("email")||""),message:String(fd.get("message")||""),website:String(fd.get("website")||""),consent:fd.get("consent")==="on"};
  button.disabled=true;message.textContent="Sending your inquiry…";
  try{
    const result=await fetch("/api/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const body=await result.json();
    if(!result.ok)throw Error(body.error||"Please try again.");
    message.textContent="Thanks! Your inquiry has been received.";message.className="success-text";form.reset();
  }catch(err){message.textContent=err.message;message.className="error-text";}
  finally{button.disabled=false;}
});
const menuToggle=by("#menuToggle"),mobileMenu=by("#mobileMenu");
menuToggle.addEventListener("click",()=>{
  const open=mobileMenu.hidden;mobileMenu.hidden=!open;
  menuToggle.setAttribute("aria-expanded",String(open));
  menuToggle.setAttribute("aria-label",open?"Close navigation":"Open navigation");
  menuToggle.textContent=open?"×":"☰";
});
mobileMenu.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>{
  mobileMenu.hidden=true;menuToggle.setAttribute("aria-expanded","false");menuToggle.textContent="☰";
}));
if("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches){
  const target=[...document.querySelectorAll(".reveal")];
  const observer=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{
    if(isIntersecting){target.classList.add("visible");observer.unobserve(target);}
  }),{threshold:.06,rootMargin:"0px 0px 20px 0px"});
  target.forEach(t=>observer.observe(t));document.body.classList.add("js-reveal");
}
by("#copyrightYear").textContent=String(new Date().getFullYear());
loadPublic();
