"use strict";
const $=s=>document.querySelector(s);
let config=null,session=null;
const currency=cent=>new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP",minimumFractionDigits:2}).format(Number(cent||0)/100);
const methodLabels={gcash:"GCash transfer",bank:"Bank transfer",arrange:"Pay after seller confirmation"};
const paymentLabels={unpaid:"Not yet verified",submitted:"Reference submitted",verified:"Payment verified"};
const orderLabels={new:"Awaiting processing",fulfilled:"Fulfilled",cancelled:"Cancelled"};
const request=async(route,options={})=>{
  const response=await fetch(route,{cache:"no-store",...options});
  let data;try{data=await response.json();}catch{data={error:"Unable to read server response"};}
  if(!response.ok)throw Error(data.error||"Request failed");
  return data;
};
function showNotice(message,failed=false){
  const box=$("#pageNotice");box.textContent=message;box.hidden=!message;box.classList.toggle("error",failed);
}
function buildMethods(){
  const box=$("#paymentMethods");box.replaceChildren();
  const options=[
    ["gcash","▣","GCash transfer","Send payment to the merchant’s GCash account"],
    ["bank","▤","Bank transfer","Transfer to the merchant’s bank account"],
    ["arrange","◎","Arrange payment","The seller will confirm how you can pay"]
  ];
  let first=true;
  for(const [id,icon,title,subtitle] of options){
    if(!config.options[id])continue;
    const label=document.createElement("label");label.className="method-choice";
    const radio=document.createElement("input");radio.type="radio";radio.name="method";radio.value=id;radio.required=true;radio.checked=first;first=false;
    const symbol=document.createElement("span");symbol.className="method-icon";symbol.textContent=icon;
    const wrap=document.createElement("span");wrap.className="method-copy";
    const strong=document.createElement("strong");strong.textContent=title;
    const small=document.createElement("small");small.textContent=subtitle;
    wrap.append(strong,small);
    const arrow=document.createElement("span");arrow.className="method-chevron";arrow.textContent="›";
    label.append(radio,symbol,wrap,arrow);box.append(label);
  }
}
function renderCheckout(){
  $("#navBrand").textContent=config.brand||"VSLs";$("#footerBrand").textContent=config.brand||"VSLs";
  document.title=(config.brand||"VSLs")+" | Checkout";
  $("#checkoutLoading").hidden=true;
  $("#checkoutUnavailable").hidden=!!config.enabled;
  $("#checkoutView").hidden=!config.enabled;
  if(!config.enabled)return;
  $("#productName").textContent=config.product;
  $("#productDescription").textContent=config.description;
  $("#summarySubtotal").textContent=currency(config.amountCents);
  $("#summaryTotal").textContent=currency(config.amountCents);
  buildMethods();
}
function savePrivateOrder(ref,key){
  const url=new URL(location.href);
  url.search="";url.searchParams.set("ref",ref);url.searchParams.set("key",key);
  history.replaceState(null,"",url.pathname+url.search);
}
function appendDetail(container,key,value){
  const p=document.createElement("div"),bold=document.createElement("strong");
  bold.textContent=key+": ";
  p.append(bold,document.createTextNode(value));container.append(p);
}
function renderNextSteps(o){
  const box=$("#paymentNextSteps");box.replaceChildren();
  const title=document.createElement("h3");title.textContent=o.fulfillmentStatus==="cancelled"?"Order cancelled":"What happens next?";
  box.append(title);
  const message=document.createElement("p");
  if(o.fulfillmentStatus==="cancelled")message.textContent="The seller has cancelled this order. Contact the seller for further information.";
  else if(o.paymentStatus==="verified")message.textContent=o.fulfillmentStatus==="fulfilled"?"Payment verified and order fulfilled. Thank you!":"Your payment has been marked verified by the seller. Fulfillment will be handled separately.";
  else if(o.method==="gcash"){
    message.textContent="Send the exact amount to the GCash account below, then enter the transaction reference. A submitted reference does not automatically verify payment.";
    box.append(message);
    if(config?.gcash){appendDetail(box,"Recipient",config.gcash.name);appendDetail(box,"GCash number",config.gcash.number);}
  }else if(o.method==="bank"){
    message.textContent="Transfer the exact amount to this account, then enter your transaction reference. The seller will verify it manually.";
    box.append(message);
    if(config?.bank){appendDetail(box,"Bank",config.bank.bank);appendDetail(box,"Account name",config.bank.name);appendDetail(box,"Account number",config.bank.number);}
  }else message.textContent="The seller will contact you about payment and order fulfillment. This order has not been charged.";
  if(!box.contains(message))box.append(message);
  if(config?.instructions&&o.paymentStatus!=="verified"){
    const note=document.createElement("p");note.textContent=config.instructions;box.append(note);
  }
  $("#paymentRefForm").hidden=o.fulfillmentStatus==="cancelled"||o.paymentStatus==="verified"||!["gcash","bank"].includes(o.method);
  if(o.paymentReference)$("#paymentRefForm").elements.namedItem("paymentReference").value=o.paymentReference;
}
function renderReceipt(order){
  $("#checkoutLoading").hidden=true;$("#checkoutUnavailable").hidden=true;$("#checkoutView").hidden=true;$("#checkoutSuccess").hidden=false;
  $("#receiptReference").textContent=order.ref;
  $("#receiptProduct").textContent=order.product;
  $("#receiptAmount").textContent=currency(order.amountCents);
  $("#receiptMethod").textContent=methodLabels[order.method]||"Seller confirmation";
  const payment=$("#receiptPaymentStatus");
  payment.textContent=paymentLabels[order.paymentStatus]||order.paymentStatus;
  payment.className="status-pill "+(order.paymentStatus==="verified"?"verified":order.paymentStatus==="submitted"?"submitted":"");
  $("#receiptFulfillmentStatus").textContent=orderLabels[order.fulfillmentStatus]||"Pending";
  $("#successTitle").textContent=order.fulfillmentStatus==="fulfilled"?"Order completed.":order.fulfillmentStatus==="cancelled"?"Order cancelled.":"Your order is in.";
  renderNextSteps(order);
}
async function loadOrder(ref,key){
  const result=await request("/api/orders/status?"+new URLSearchParams({ref,key}));
  session={ref,key};
  renderReceipt(result.order);
}
$("#checkoutForm").addEventListener("submit",async event=>{
  event.preventDefault();const form=event.currentTarget,button=$("#placeOrderButton"),status=$("#formStatus");
  const formData=new FormData(form);
  const payload={
    name:String(formData.get("name")||""),email:String(formData.get("email")||""),
    phone:String(formData.get("phone")||""),notes:String(formData.get("notes")||""),
    method:String(formData.get("method")||""),accepted:formData.get("accepted")==="on",website:String(formData.get("website")||"")
  };
  if(!payload.method){status.textContent="Please choose a payment method.";return;}
  if(!form.reportValidity())return;
  button.disabled=true;status.textContent="Creating your pending order…";
  try{
    const data=await request("/api/orders/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    session={ref:data.ref,key:data.key};savePrivateOrder(data.ref,data.key);
    renderReceipt(data.order);showNotice("Order created. Save your private order-status link for later.");
    scrollTo({top:0,behavior:"smooth"});
  }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
});
$("#paymentRefForm").addEventListener("submit",async event=>{
  event.preventDefault();if(!session)return;
  const form=event.currentTarget,button=$("#sendReference"),status=$("#refMessage");
  const value=String(new FormData(form).get("paymentReference")||"").trim();
  if(value.length<5){status.textContent="Enter a valid transaction reference.";return;}
  button.disabled=true;status.textContent="Saving your reference…";
  try{
    const result=await request("/api/orders/reference",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ref:session.ref,key:session.key,paymentReference:value})});
    renderReceipt(result.order);status.textContent="Reference received. The seller must manually verify the payment.";
  }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
});
$("#refreshStatus").addEventListener("click",async()=>{
  if(!session)return;
  try{await loadOrder(session.ref,session.key);showNotice("Order status refreshed.");}catch(error){showNotice(error.message,true);}
});
$("#copyReference").addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText($("#receiptReference").textContent);$("#copyReference").textContent="Copied ✓";}
  catch{$("#copyReference").textContent="Select and copy";} 
});
$("#copyright").textContent=String(new Date().getFullYear());
async function initialize(){
  try{
    config=await request("/api/checkout/config");
    renderCheckout();
    const query=new URLSearchParams(location.search),ref=query.get("ref"),key=query.get("key");
    if(ref&&key)await loadOrder(ref,key);
  }catch(error){
    $("#checkoutLoading").hidden=true;$("#checkoutUnavailable").hidden=false;
    showNotice("Unable to load checkout or order details: "+error.message,true);
  }
}
initialize();
