"use strict";
const $ = selector=>document.querySelector(selector);
const $$ = selector=>[...document.querySelectorAll(selector)];
const state={content:null,leads:[],currentTab:"overview",editingVideo:-1,uploading:false};
const fields=[
  "brand","eyebrow","headline1","headline2","subtitle","storyTitle","storyHighlight","storyParagraph1",
  "storyParagraph2","shiftText","methodTitle","methodHighlight","methodSubtitle","offerHeading",
  "offerHighlight","offerSubtitle","offerName","offerDescription","price","priceNote","cta","checkoutUrl",
  "trustTitle","trustHighlight","trustText","closingTitle","closingLine2","closingHighlight","videoUrl",
  "footerNote","supportEmail","accent"
];
const titles={
  overview:["Overview","Your content, under control.","Edit your message and publish changes instantly to the buyer-facing website."],
  hero:["Page content","Make a memorable first impression.","Lead with a clear message, tell your story and establish why your offer matters."],
  videos:["Video library","Publish more than one video.","Upload videos or add a link, create a collection and choose what buyers can watch."],
  method:["How it works","Show buyers the way forward.","Turn your process into four clear steps customers can understand."],
  offer:["Offer & pricing","Give your offer a clear value.","Edit what's included, the price and your real checkout or booking destination."],
  faq:["FAQs & trust","Help buyers feel confident.","Answer questions accurately and reinforce your message."],
  leads:["Buyer inquiries","A conversation starts here.","View the real inquiries people submitted on your public website."],
  settings:["Brand & settings","Make it yours.","Update your visual identity and secure your admin credentials."]
};
const flash=(message,error=false)=>{
  const box=$("#feedback");box.textContent=message;box.classList.toggle("error",error);box.hidden=false;
  box.scrollIntoView({block:"nearest",behavior:"smooth"});
};
async function request(path,options={}){
  const config={credentials:"same-origin",cache:"no-store",...options};
  if(config.body && !config.headers)config.headers={"Content-Type":"application/json"};
  const response=await fetch(path,config);
  const result=await response.json().catch(()=>({error:"Unexpected server response"}));
  if(!response.ok)throw new Error(result.error||"Request failed");
  return result;
}
function showAuth(mode){
  $("#loadingShell").hidden=true;$("#dashboard").hidden=true;$("#authShell").hidden=false;
  $("#setupPanel").hidden=mode!=="setup";
  $("#loginPanel").hidden=mode!=="login";
}
function showDashboard(username){
  $("#loadingShell").hidden=true;$("#authShell").hidden=true;$("#dashboard").hidden=false;
  $("#loggedUser").textContent=username||"Administrator";
  $(".avatar").textContent=(username||"A")[0].toUpperCase();
}
function prettyDate(date){
  if(!date)return "Not published";
  const d=new Date(date);
  return isNaN(+d)?"—":d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
}
function showTab(tab){
  state.currentTab=tab;
  $("#feedback").hidden=true;
  $$(".sidebar-nav [data-tab]").forEach(el=>el.classList.toggle("active",el.dataset.tab===tab));
  $$(".panel").forEach(el=>el.hidden=el.dataset.panel!==tab);
  const [short,title,subtitle]=titles[tab]||titles.overview;
  $("#breadcrumb").textContent=short;$("#panelTitle").textContent=title;$("#panelSubtitle").textContent=subtitle;
  $("#publishActions").hidden=tab==="leads";
  if(tab==="leads")refreshLeads();
  window.scrollTo({top:0,behavior:"smooth"});
}
function addFaq(question="",answer=""){
  const list=$("#faqEditors");
  if(list.children.length>=12){flash("Maximum of 12 FAQs",true);return;}
  const box=document.createElement("div");
  box.className="faq-editor";
  box.innerHTML='<div class="faq-editor-head"><span class="faq-title">BUYER QUESTION</span><button type="button" class="remove-faq">Remove ×</button></div><label>Question<input class="faq-question" maxlength="250" placeholder="What do customers ask?"></label><label>Answer<textarea class="faq-answer" rows="3" maxlength="1500" placeholder="Write a helpful, honest answer"></textarea></label>';
  box.querySelector(".faq-question").value=question;
  box.querySelector(".faq-answer").value=answer;
  box.querySelector(".remove-faq").addEventListener("click",()=>{box.remove();numberFaqs();});
  list.append(box);numberFaqs();
}
function numberFaqs(){
  $$(".faq-editor").forEach((node,i)=>node.querySelector(".faq-title").textContent="QUESTION "+String(i+1).padStart(2,"0"));
}
function setSteps(items){
  const parent=$("#stepEditors");parent.replaceChildren();
  (items||[]).forEach((step,i)=>{
    const box=document.createElement("div");box.className="step-item";
    box.innerHTML='<div class="step-title">STEP '+String(i+1).padStart(2,"0")+'</div><label>Step title<input maxlength="120" class="step-name"></label><label>Explanation<textarea rows="3" maxlength="350" class="step-desc"></textarea></label>';
    box.querySelector(".step-name").value=step.title||"";
    box.querySelector(".step-desc").value=step.description||"";
    parent.append(box);
  });
}
function fillContent(data){
  state.content=structuredClone(data);
  fields.forEach(key=>{const el=document.querySelector('[data-field="'+key+'"]');if(el)el.value=data[key]|| (key==="accent"?"#db6042":"");});
  $("#offerItemsInput").value=(data.offerItems||[]).join("\n");
  setSteps(data.steps||[]);
  $("#faqEditors").replaceChildren();
  (data.faqs||[]).forEach(item=>addFaq(item.question,item.answer));
  $("#lastPublished").textContent=prettyDate(data.publishedAt);
  if(!Array.isArray(state.content.videos))state.content.videos=[];
  renderVideoList();
}
function collectContent(){
  const content={...state.content};
  fields.forEach(key=>{const el=document.querySelector('[data-field="'+key+'"]');if(el)content[key]=el.value.trim();});
  content.offerItems=$("#offerItemsInput").value.split("\n").map(s=>s.trim()).filter(Boolean).slice(0,10);
  content.steps=$$(".step-item").map(card=>({
    title:card.querySelector(".step-name").value.trim(),
    description:card.querySelector(".step-desc").value.trim()
  }));
  content.faqs=$$(".faq-editor").map(card=>({
    question:card.querySelector(".faq-question").value.trim(),
    answer:card.querySelector(".faq-answer").value.trim()
  })).filter(item=>item.question&&item.answer);
  return content;
}

const videoDialog=$("#videoEditorDialog"),videoForm=$("#videoForm");
function publicVideoUrl(value) {
  const u=String(value||"").trim();
  if(/^\/media\/[a-f0-9-]{36}\.(mp4|webm)$/i.test(u))return true;
  try {
    const parsed=new URL(u);
    if(parsed.protocol!=="https:")return false;
    const h=parsed.hostname.toLowerCase().replace(/^www\./,"");
    return ["youtube.com","m.youtube.com","youtube-nocookie.com","youtu.be","vimeo.com","player.vimeo.com"].includes(h)||/\.(mp4|webm)$/i.test(parsed.pathname);
  }catch{return false;}
}
function setVideoStats(){
  const videos=state.content?.videos||[],shown=videos.filter(v=>v.visible),featured=videos.find(v=>v.featured&&v.visible);
  $("#countVideos").textContent=String(videos.length);
  $("#countVisible").textContent=String(shown.length);
  $("#countFeatured").textContent=featured?.title||"Auto-select first";
  $("#videoCountSmall").textContent=String(videos.length);
  $("#overviewVideos").textContent=shown.length+" ready to publish / "+videos.length+" total";
}
function renderVideoList(){
  setVideoStats();
  const parent=$("#videoList");parent.replaceChildren();
  const videos=state.content?.videos||[];
  $("#videoEmpty").hidden=videos.length>0;
  videos.forEach((video,index)=>{
    const card=document.createElement("article");card.className="managed-video";
    const thumb=document.createElement("div");thumb.className="managed-thumb";
    const url=String(video.url||"");
    let poster=String(video.poster||"");
    if(!poster){
      try {
        const parsed=new URL(url);
        const h=parsed.hostname.replace(/^www\./,"");
        let id=h==="youtu.be"?parsed.pathname.split("/")[1]:parsed.searchParams.get("v")||(parsed.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)/)||[])[1];
        if(["youtube.com","m.youtube.com","youtube-nocookie.com","youtu.be"].includes(h)&&/^[\w-]{11}$/.test(id))poster="https://i.ytimg.com/vi/"+id+"/mqdefault.jpg";
      }catch{}
    }
    if(poster&&(poster.startsWith("/media/")||/^https:\/\//i.test(poster))){
      const img=document.createElement("img");img.src=poster;img.alt="";img.loading="lazy";img.onerror=()=>img.remove();thumb.append(img);
    }
    const play=document.createElement("span");play.textContent="▶";thumb.append(play);
    const main=document.createElement("div");main.className="managed-main";
    const badges=document.createElement("div");badges.className="managed-badges";
    const status=document.createElement("span");status.className="managed-badge "+(video.visible?"enabled":"disabled");status.textContent=video.visible?"Set to publish":"Hidden from buyers";badges.append(status);
    if(video.featured&&video.visible){const featured=document.createElement("span");featured.className="managed-badge featured";featured.textContent="★ Featured";badges.append(featured);}
    const category=document.createElement("span");category.className="managed-category";category.textContent=video.category||"Presentation";badges.append(category);
    const title=document.createElement("h3");title.textContent=video.title;
    const desc=document.createElement("p");desc.textContent=video.description||"No description yet";
    const urlText=document.createElement("small");urlText.className="managed-source";urlText.textContent=url.startsWith("/media/")?"Uploaded video · Railway storage":url.includes("youtu")?"YouTube video":url.includes("vimeo")?"Vimeo video":"Externally hosted video";
    main.append(badges,title,desc,urlText);
    const actions=document.createElement("div");actions.className="managed-actions";
    const make=(label,action,style="")=>{
      const btn=document.createElement("button");btn.type="button";btn.textContent=label;btn.className=style;
      btn.addEventListener("click",action);actions.append(btn);return btn;
    };
    make("Edit",()=>openVideoEditor(index),"action-solid");
    make(video.visible?"Hide":"Show",()=>{video.visible=!video.visible;if(!video.visible)video.featured=false;renderVideoList();});
    make(video.featured&&video.visible?"★ Hero video":"Set featured",()=>{
      state.content.videos.forEach(v=>v.featured=false);
      video.featured=true;video.visible=true;renderVideoList();
    });
    make("↑",()=>moveVideo(index,-1),"small-action").disabled=index===0;
    make("↓",()=>moveVideo(index,1),"small-action").disabled=index===videos.length-1;
    make("Delete",()=>{
      if(!confirm("Delete “"+video.title+"” from your video library? The change is applied to buyers only when you publish the site."))return;
      state.content.videos.splice(index,1);renderVideoList();
    },"danger-action");
    const bottom=document.createElement("div");bottom.className="managed-footer";
    const number=document.createElement("span");number.textContent="POSITION "+String(index+1).padStart(2,"0");
    bottom.append(number,actions);card.append(thumb,main,bottom);parent.append(card);
  });
}
function moveVideo(index,offset){
  const list=state.content.videos,next=index+offset;
  if(next<0||next>=list.length)return;
  [list[index],list[next]]=[list[next],list[index]];
  renderVideoList();
}
function openVideoEditor(index=-1){
  if(state.content.videos.length>=36&&index===-1){flash("Maximum of 36 videos per website",true);return;}
  state.editingVideo=index;videoForm.reset();$("#videoFormError").textContent="";
  $("#uploadProgress").hidden=true;$("#videoFile").value="";$("#posterFile").value="";
  const data=index>=0?state.content.videos[index]:{title:"",description:"",category:"Presentation",url:"",poster:"",visible:true,featured:state.content.videos.length===0};
  for(const field of ["title","description","category","url","poster"])videoForm.elements.namedItem(field).value=data[field]||"";
  videoForm.elements.namedItem("visible").checked=data.visible;
  videoForm.elements.namedItem("featured").checked=data.featured;
  $("#videoModalTitle").textContent=index>=0?"Edit video":"Add new video";
  videoDialog.showModal();
}
function closeVideoEditor(){
  if(state.uploading)return;
  videoDialog.close();
}
function applyVideoEdits(event){
  event.preventDefault();
  if(state.uploading)return;
  const f=videoForm.elements;
  const video={
    id:state.editingVideo>=0?state.content.videos[state.editingVideo].id:crypto.randomUUID(),
    title:f.namedItem("title").value.trim(),
    description:f.namedItem("description").value.trim(),
    category:f.namedItem("category").value.trim()||"Presentation",
    url:f.namedItem("url").value.trim(),
    poster:f.namedItem("poster").value.trim(),
    visible:f.namedItem("visible").checked,
    featured:f.namedItem("featured").checked
  };
  if(!video.title||!publicVideoUrl(video.url)){
    $("#videoFormError").textContent="Please add a title and a valid YouTube, Vimeo, MP4 or WebM video link.";
    return;
  }
  if(video.poster&&!video.poster.startsWith("/media/")&&!/^https:\/\//i.test(video.poster)){
    $("#videoFormError").textContent="Cover image must be an HTTPS URL or an uploaded image.";
    return;
  }
  if(video.featured){video.visible=true;state.content.videos.forEach(v=>v.featured=false);}
  if(state.editingVideo>=0)state.content.videos[state.editingVideo]=video;
  else state.content.videos.push(video);
  videoDialog.close();renderVideoList();flash("Video added to your working library. Click Save draft or Publish site to store your changes.");
}
function uploadToRailway(file,kind){
  const accepted=kind==="video"?["video/mp4","video/webm"]:["image/png","image/jpeg","image/webp"];
  const limit=kind==="video"?120*1024*1024:8*1024*1024;
  if(!accepted.includes(file.type))return Promise.reject(Error("Unsupported file format. Select an MP4/WebM video or a JPG/PNG/WebP image."));
  if(file.size>limit)return Promise.reject(Error("File exceeds "+(limit/1024/1024)+" MB limit."));
  const progress=$("#uploadProgress"),message=$("#uploadProgressText"),bar=$("#uploadProgressBar");
  progress.hidden=false;bar.style.width="0%";message.textContent="Uploading "+file.name+"…";
  state.uploading=true;$("#saveVideo").disabled=true;
  return new Promise((resolve,reject)=>{
    const request=new XMLHttpRequest();
    request.open("POST","/api/admin/media");
    request.setRequestHeader("Content-Type",file.type);
    request.upload.onprogress=event=>{
      if(event.lengthComputable){const percent=Math.min(100,Math.round(event.loaded/event.total*100));bar.style.width=percent+"%";message.textContent="Uploading "+file.name+" · "+percent+"%";}
    };
    request.onload=()=>{
      state.uploading=false;$("#saveVideo").disabled=false;
      let result;try{result=JSON.parse(request.responseText);}catch{result={};}
      if(request.status>=200&&request.status<300&&result.url){
        message.textContent="Upload complete ✓ "+file.name;bar.style.width="100%";resolve(result.url);
      }else{message.textContent="Upload failed";reject(Error(result.error||"Upload failed. Please retry."));}
    };
    request.onerror=()=>{state.uploading=false;$("#saveVideo").disabled=false;reject(Error("Network connection failed during upload"));};
    request.send(file);
  });
}
async function uploadSelected(event,kind){
  const file=event.target.files?.[0];if(!file)return;
  if(state.uploading)return;
  try{
    const url=await uploadToRailway(file,kind);
    if(kind==="video")$("#videoSourceUrl").value=url;
    else $("#posterSourceUrl").value=url;
    $("#videoFormError").textContent="";
  }catch(error){$("#videoFormError").textContent=error.message;}
  finally{event.target.value="";}
}
$("#addVideo").addEventListener("click",()=>openVideoEditor());
$("#emptyAddVideo").addEventListener("click",()=>openVideoEditor());
$("#closeVideoEditor").addEventListener("click",closeVideoEditor);
$("#cancelVideoEditor").addEventListener("click",closeVideoEditor);
videoForm.addEventListener("submit",applyVideoEdits);
$("#videoFile").addEventListener("change",event=>uploadSelected(event,"video"));
$("#posterFile").addEventListener("change",event=>uploadSelected(event,"poster"));
videoForm.elements.namedItem("featured").addEventListener("change",e=>{if(e.target.checked)videoForm.elements.namedItem("visible").checked=true;});

async function refreshLeads(){
  try{
    const data=await request("/api/admin/leads");
    state.leads=data.leads;
    $("#totalLeads").textContent=String(data.count);
    $("#leadCountSmall").textContent=String(data.count);
    $("#leadsBadge").textContent=String(data.count)+" inquiries";
    const tbody=$("#leadsRows");tbody.replaceChildren();
    if(!data.leads.length){
      const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=5;td.textContent="No inquiries yet. Buyer messages will appear here.";tr.append(td);tbody.append(tr);return;
    }
    for(const row of data.leads){
      const tr=document.createElement("tr");
      for(const value of [prettyDate(row.at),row.name||"—",row.email,row.message||"—"]){
        const td=document.createElement("td");td.textContent=value;tr.append(td);
      }
      const action=document.createElement("td");
      const deleteButton=document.createElement("button");
      deleteButton.type="button";deleteButton.className="lead-delete";deleteButton.textContent="Delete";
      if(!row.id){deleteButton.disabled=true;deleteButton.title="Older inquiry has no deletion ID";}else deleteButton.addEventListener("click",async()=>{
        if(!confirm("Permanently delete this inquiry?"))return;
        try{await request("/api/admin/leads/delete",{method:"POST",body:JSON.stringify({id:row.id})});await refreshLeads();}
        catch(err){flash("Delete failed: "+err.message,true);}
      });
      action.append(deleteButton);tr.append(action);tbody.append(tr);
    }
  }catch(err){flash("Unable to load inquiries: "+err.message,true);}
}
async function loadEditor(username){
  const data=await request("/api/admin/content");
  fillContent({...data.draft,publishedAt:data.publishedAt});
  showDashboard(username);
  showTab("overview");
  refreshLeads();
}
async function start(){
  try{
    const status=await request("/api/admin/status");
    if(status.setupRequired)return showAuth("setup");
    if(!status.authenticated)return showAuth("login");
    await loadEditor(status.username);
  }catch(err){
    $("#loadingShell").innerHTML="";
    const el=document.createElement("p");el.textContent="Could not connect to the admin API. "+err.message;
    $("#loadingShell").append(el);
  }
}
$("#loginForm").addEventListener("submit",async event=>{
  event.preventDefault();
  const form=event.currentTarget,button=form.querySelector("button");
  $("#loginError").textContent="";button.disabled=true;
  try{
    const data=await request("/api/admin/login",{method:"POST",body:JSON.stringify({
      username:form.elements.username.value,password:form.elements.password.value
    })});
    form.reset();await loadEditor(data.username);
  }catch(err){$("#loginError").textContent=err.message;}
  finally{button.disabled=false;}
});
$("#setupForm").addEventListener("submit",async event=>{
  event.preventDefault();const form=event.currentTarget,button=form.querySelector("button");
  $("#setupError").textContent="";
  if(form.elements.password.value!==form.elements.confirm.value){$("#setupError").textContent="Passwords do not match";return;}
  button.disabled=true;
  try{
    const data=await request("/api/admin/setup",{method:"POST",body:JSON.stringify({
      token:form.elements.token.value,username:form.elements.username.value,password:form.elements.password.value
    })});
    form.reset();await loadEditor(data.username);
  }catch(err){$("#setupError").textContent=err.message;}
  finally{button.disabled=false;}
});
$$(".sidebar-nav [data-tab]").forEach(button=>button.addEventListener("click",()=>showTab(button.dataset.tab)));
$$("[data-go]").forEach(button=>button.addEventListener("click",()=>showTab(button.dataset.go)));
$("#addFaq").addEventListener("click",()=>addFaq());
$("#saveDraft").addEventListener("click",async()=>{
  const button=$("#saveDraft");button.disabled=true;
  try{
    const content=collectContent();
    const result=await request("/api/admin/draft",{method:"POST",body:JSON.stringify({content})});
    state.content=structuredClone(content);flash("Draft saved securely. Buyers are still seeing the previously published version.");
  }catch(err){flash("Could not save: "+err.message,true);}
  finally{button.disabled=false;}
});
$("#publishNow").addEventListener("click",async()=>{
  const button=$("#publishNow");button.disabled=true;
  try{
    const content=collectContent();
    const result=await request("/api/admin/publish",{method:"POST",body:JSON.stringify({content})});
    state.content=structuredClone(content);
    $("#lastPublished").textContent=prettyDate(result.publishedAt);
    flash("Published! Your buyer-facing website has been updated immediately.");
  }catch(err){flash("Could not publish: "+err.message,true);}
  finally{button.disabled=false;}
});
$("#logoutButton").addEventListener("click",async()=>{
  try{await request("/api/admin/logout",{method:"POST",body:"{}"});}catch{}
  location.reload();
});
$("#passwordForm").addEventListener("submit",async event=>{
  event.preventDefault();const form=event.currentTarget;
  const currentPassword=form.elements.currentPassword.value,newPassword=form.elements.newPassword.value,confirm=form.elements.confirmPassword.value;
  if(newPassword!==confirm){flash("The new passwords do not match.",true);return;}
  try{
    await request("/api/admin/password",{method:"POST",body:JSON.stringify({currentPassword,newPassword})});
    form.reset();flash("Admin password updated. Other logged-in sessions have been signed out.");
  }catch(err){flash("Password update failed: "+err.message,true);}
});
start();
