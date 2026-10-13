"use strict";
const KEY = "vsls-demo-settings-v1";
const defaults = Object.freeze({
  brand:"GOODFORM", eyebrow:"THE CREATOR LAUNCH SYSTEM",
  headline1:"The idea is there.", headline2:"Now make it happen.",
  subtitle:"A thoughtful, step-by-step way to turn what you know into a digital product worth sharing. Less second-guessing. More meaningful progress.",
  offerName:"The Creator Launch System",
  offerDescription:"A practical digital playbook for turning one good idea into a real, ready-to-share offer.",
  price:"₱1,490", cta:"Get the playbook",
  videoUrl:"",checkoutUrl:"",accent:"#db6042"
});
function loadSettings(){
  try{
    const raw=JSON.parse(localStorage.getItem(KEY));
    if(!raw || typeof raw!=="object")return {...defaults};
    const out={};
    for(const key of Object.keys(defaults))out[key]=typeof raw[key]==="string"?raw[key]:defaults[key];
    return out;
  }catch{return {...defaults};}
}
let settings=loadSettings();
const site=document.querySelector(".site");
const editorDialog=document.getElementById("editorDialog");
const checkoutDialog=document.getElementById("checkoutDialog");
const editorForm=document.getElementById("editorForm");
const videoPlayer=document.getElementById("videoPlayer");
const videoArt=document.getElementById("videoArt");
function safeHttpUrl(text){
  if(!text || !text.trim())return null;
  try{
    const url=new URL(text.trim());
    return url.protocol==="https:"||url.protocol==="http:"?url:null;
  }catch{return null;}
}
function getVideoSource(value){
  const u=safeHttpUrl(value);
  if(!u)return null;
  const host=u.hostname.toLowerCase().replace(/^www\./,"");
  let id="";
  if(host==="youtu.be")id=u.pathname.split("/")[1]||"";
  if(["youtube.com","m.youtube.com","youtube-nocookie.com"].includes(host))id=u.searchParams.get("v")||(u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)||[])[1]||"";
  if(/^[A-Za-z0-9_-]{11}$/.test(id))return {type:"iframe",url:"https://www.youtube-nocookie.com/embed/"+id+"?rel=0&autoplay=1"};
  if(host==="vimeo.com"||host==="player.vimeo.com"){
    const v=u.pathname.split("/").find(seg=>/^\d+$/.test(seg));
    if(v)return {type:"iframe",url:"https://player.vimeo.com/video/"+v+"?autoplay=1"};
  }
  if(/\.mp4$/i.test(u.pathname))return {type:"video",url:u.href};
  return null;
}
function resetVideo(){videoPlayer.replaceChildren();videoPlayer.hidden=true;videoArt.hidden=false;}
function renderSettings(){
  document.querySelectorAll("[data-text]").forEach(node=>{
    const key=node.getAttribute("data-text");
    if(Object.prototype.hasOwnProperty.call(settings,key))node.textContent=settings[key];
  });
  const accent=/^#[0-9a-fA-F]{6}$/.test(settings.accent)?settings.accent:defaults.accent;
  document.documentElement.style.setProperty("--accent",accent);
  if(site)site.style.setProperty("--accent",accent);
  document.title=settings.brand+" | "+settings.headline1+" "+settings.headline2;
  document.querySelector('meta[name="description"]').setAttribute("content",settings.subtitle);
  resetVideo();
}
function openEditor(){
  for(const [key,value] of Object.entries(settings)){
    const field=editorForm.elements.namedItem(key);
    if(field && "value" in field)field.value=value;
  }
  if(checkoutDialog.open)checkoutDialog.close();
  if(!editorDialog.open)editorDialog.showModal();
}
document.querySelectorAll("[data-open-editor]").forEach(node=>node.addEventListener("click",openEditor));
document.getElementById("closeEditor").addEventListener("click",()=>editorDialog.close());
document.getElementById("closeCheckout").addEventListener("click",()=>checkoutDialog.close());
document.getElementById("configureCheckout").addEventListener("click",openEditor);
editorForm.addEventListener("submit",event=>{
  event.preventDefault();
  const updated={}, data=new FormData(editorForm);
  for(const [key,fallback] of Object.entries(defaults)){
    const v=data.get(key);
    updated[key]=typeof v==="string"?v.trim().slice(0,key==="subtitle"?450:300):fallback;
  }
  if(!updated.brand)updated.brand=defaults.brand;
  if(!updated.offerName)updated.offerName=defaults.offerName;
  if(!/^#[0-9a-fA-F]{6}$/.test(updated.accent))updated.accent=defaults.accent;
  if(updated.videoUrl && !getVideoSource(updated.videoUrl)){
    alert("Please provide a valid YouTube, Vimeo or direct MP4 URL.");return;
  }
  if(updated.checkoutUrl && !safeHttpUrl(updated.checkoutUrl)){
    alert("Please provide a valid checkout URL beginning with https:// or http://.");return;
  }
  settings=updated;
  try{localStorage.setItem(KEY,JSON.stringify(settings));}catch{}
  renderSettings();editorDialog.close();
});
document.getElementById("resetDemo").addEventListener("click",()=>{
  settings={...defaults};
  try{localStorage.removeItem(KEY);}catch{}
  renderSettings();editorDialog.close();
});
document.getElementById("playVideo").addEventListener("click",()=>{
  const source=getVideoSource(settings.videoUrl);
  if(!source){openEditor();return;}
  let player;
  if(source.type==="iframe"){
    player=document.createElement("iframe");player.title="Video Sales Letter presentation";
    player.src=source.url;player.referrerPolicy="strict-origin-when-cross-origin";
    player.allow="autoplay; fullscreen; encrypted-media; picture-in-picture";player.allowFullscreen=true;
  }else{
    player=document.createElement("video");player.src=source.url;player.controls=true;
    player.autoplay=true;player.playsInline=true;
  }
  videoPlayer.replaceChildren(player);videoArt.hidden=true;videoPlayer.hidden=false;
});
document.querySelectorAll("[data-buy]").forEach(node=>node.addEventListener("click",()=>{
  const url=safeHttpUrl(settings.checkoutUrl);
  if(url)window.open(url.href,"_blank","noopener,noreferrer");
  else checkoutDialog.showModal();
}));
const menuToggle=document.getElementById("menuToggle");
const mobileMenu=document.getElementById("mobileMenu");
menuToggle.addEventListener("click",()=>{
  const open=mobileMenu.hidden;mobileMenu.hidden=!open;
  menuToggle.setAttribute("aria-expanded",String(open));
  menuToggle.setAttribute("aria-label",open?"Close navigation":"Open navigation");
  menuToggle.textContent=open?"×":"☰";
});
mobileMenu.querySelectorAll("a,button").forEach(el=>el.addEventListener("click",()=>{
  mobileMenu.hidden=true;menuToggle.setAttribute("aria-expanded","false");
  menuToggle.setAttribute("aria-label","Open navigation");menuToggle.textContent="☰";
}));
if("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches){
  const targets=[...document.querySelectorAll(".reveal")];
  const observer=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{
    if(isIntersecting){target.classList.add("visible");observer.unobserve(target);}
  }),{threshold:.06,rootMargin:"0px 0px 20px 0px"});
  targets.forEach(node=>observer.observe(node));
  document.body.classList.add("js-reveal");
}
document.getElementById("copyrightYear").textContent=String(new Date().getFullYear());
renderSettings();
