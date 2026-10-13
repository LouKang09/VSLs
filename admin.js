"use strict";
const $ = selector=>document.querySelector(selector);
const $$ = selector=>[...document.querySelectorAll(selector)];
const state={content:null,leads:[],currentTab:"overview"};
const fields=[
  "brand","eyebrow","headline1","headline2","subtitle","storyTitle","storyHighlight","storyParagraph1",
  "storyParagraph2","shiftText","methodTitle","methodHighlight","methodSubtitle","offerHeading",
  "offerHighlight","offerSubtitle","offerName","offerDescription","price","priceNote","cta","checkoutUrl",
  "trustTitle","trustHighlight","trustText","closingTitle","closingLine2","closingHighlight","videoUrl",
  "footerNote","supportEmail","accent"
];
const titles={
  overview:["Overview","Your content, under control.","Edit your message and publish changes instantly to the buyer-facing website."],
  hero:["Headline & story","Make a powerful first impression.","Lead with your promise, explain the problem and connect a persuasive sales video."],
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
async function refreshLeads(){
  try{
    const data=await request("/api/admin/leads");
    state.leads=data.leads;
    $("#totalLeads").textContent=String(data.count);
    $("#leadCountSmall").textContent=String(data.count);
    $("#leadsBadge").textContent=String(data.count)+" inquiries";
    const tbody=$("#leadsRows");tbody.replaceChildren();
    if(!data.leads.length){
      const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=4;td.textContent="No inquiries yet. Buyer messages will appear here.";tr.append(td);tbody.append(tr);return;
    }
    for(const row of data.leads){
      const tr=document.createElement("tr");
      for(const value of [prettyDate(row.at),row.name||"—",row.email,row.message||"—"]){
        const td=document.createElement("td");td.textContent=value;tr.append(td);
      }tbody.append(tr);
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
