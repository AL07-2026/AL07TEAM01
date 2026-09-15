"use strict";
const S=require('../engine/schema');
const {validate}=require('../engine/assessment');
const {run}=require('../engine/reports');
const {samples}=require('../engine/samples');
const UI=require('./ui');
const esc=UI.esc;
const root=document.getElementById('content');
let audience='applicant',positionIndex=0;
const states={applicant:{},employer:{}};
const resultRequested={applicant:false,employer:false};
let formAudience='applicant',latest=null;
const sampleCases=samples();
const isForm=document.body.dataset.page==='questionnaire';
const opts=(xs,value)=>`<option value="">선택해주세요</option>${xs.map(x=>`<option value="${esc(x)}" ${x===value?'selected':''}>${esc(x)}</option>`).join('')}`;
const inputAttrs=(id,key='')=>`data-id="${esc(id)}" ${key?`data-key="${esc(key)}"`:''}`;
function choiceInputs(id,values,labels,selected,multi=false,key=''){
 return `<div class="choices">${values.map((v,n)=>`<label><input type="${multi?'checkbox':'radio'}" name="${esc(id+'__'+key)}" value="${esc(v)}" ${inputAttrs(id,key)} ${(multi?Array.isArray(selected)&&selected.includes(v):selected===v)?'checked':''}><span>${esc(labels[n])}</span></label>`).join('')}</div>`;
}
function renderGroup(i,r){
 const v=r[i.id]||{};
 return `<div class="group-fields">${i.fields.map(f=>{
 const attrs=inputAttrs(i.id,f.key),uid=`${formAudience}-${i.id}-${f.key}`;
 if(f.type==='multi')return `<fieldset class="subfield"><legend>${esc(f.label)}${f.optional?' · 선택':''}</legend>${choiceInputs(i.id,f.options,f.options,v[f.key],true,f.key)}</fieldset>`;
 if(f.type==='select')return `<div class="subfield"><label for="${uid}">${esc(f.label)}</label><select id="${uid}" ${attrs}>${opts(f.options,v[f.key])}</select></div>`;
 if(f.type==='text')return `<div class="subfield"><label for="${uid}">${esc(f.label)}${f.optional?' · 선택':''}</label><input type="text" id="${uid}" ${attrs} maxlength="600" value="${esc(v[f.key]||'')}"></div>`;
 return `<div class="subfield"><label for="${uid}">${esc(f.label)}</label><input type="${f.type}" id="${uid}" ${attrs} ${f.type==='number'?`min="${f.min}" max="${f.max}" step="any"`:''} value="${esc(v[f.key]??'')}">${f.help?`<small>${esc(f.help)}</small>`:''}</div>`;
 }).join('')}</div>`;
}
function renderItem(i,n,r){
 let body='',v=r[i.id];
 if(i.type==='group')body=renderGroup(i,r);
 else if(i.type==='choice'){
  const values=i.values||i.options;
  body=choiceInputs(i.id,values,i.options,v,i.select!=='single');
  if(i.select==='ranked')body+=`<p class="rank-order">선택한 순서: ${esc((v||[]).map((x,k)=>`${k+1}순위 ${x}`).join(' · ')||'아직 고르지 않았어요')}</p>`;
 }else if(i.type==='likert_1_5'||i.type.startsWith('bipolar')){
  const max=i.type==='likert_1_5'?5:7;
  if(max===7)body+=`<div class="poles"><span>1 · ${esc(i.left)}</span><span>7 · ${esc(i.right)}</span></div>`;
  body+=`<div class="ratings">${Array.from({length:max},(_,k)=>k+1).concat('U').map(x=>`<label><input type="radio" name="${i.id}" ${inputAttrs(i.id)} data-numeric="true" value="${x}" ${v===x?'checked':''}><span>${x==='U'?'? 판단 어려움':x}</span></label>`).join('')}</div>`;
  if(v===4&&max===7)body+=`<fieldset class="followup"><legend>가운데를 고른 이유가 무엇인가요?</legend>${choiceInputs(i.id+'__neutral_reason',S.neutralOptions,S.neutralOptions,r[i.id+'__neutral_reason'])}</fieldset>`;
 }else if(i.type==='sjt'||i.type==='norm_check'){
  body=`<p class="scenario-text">${esc(i.scenario)}</p>`+choiceInputs(i.id,i.options.map(o=>o.key).concat('U'),i.options.map(o=>o.text).concat('아직 판단하기 어려워요'),v);
 }else if(i.type==='priority'){
  const candidates=S.priorityCandidates(r),max=S.priorityMax(candidates.length);
  body=`<p>${esc(i.help.replace('○',max))}</p><p class="muted">현재 ${candidates.length}개 조건 · 최대 ${max}개 선택</p>`+choiceInputs(i.id,candidates.map(c=>c.id),candidates.map(c=>c.label),v,true)+`<label class="empty-confirm"><input type="checkbox" data-id="${i.id}" data-empty="true" ${Array.isArray(v)&&v.length===0?'checked':''}> 꼭 맞아야 할 조건을 따로 지정하지 않겠습니다.</label>`;
 }else if(i.type==='norm_status')body=choiceInputs(i.id,i.status_options||i.options,i.status_options||i.options,v)+`<label>규정 내용 · 선택<textarea ${inputAttrs(i.id+'__policy')} maxlength="600">${esc(r[i.id+'__policy']||'')}</textarea></label>`;
 else if(i.type==='checklist')body=choiceInputs(i.id,i.options,i.options,v,true);
 else body=`<textarea ${inputAttrs(i.id)} aria-label="${esc(i.text)}" rows="3" maxlength="600">${esc(v||'')}</textarea>`;
 if((i.evidence||i.type==='sjt')&&v!==undefined&&v!=='U')body+=`<fieldset class="followup"><legend>이 답의 바탕은 무엇인가요?</legend>${choiceInputs(i.id+'__evidence',['A','B','C'],['직접 경험','비슷한 경험','경험 없이 예상'],r[i.id+'__evidence'])}</fieldset>`;
 if(i.type==='sjt'&&v!==undefined&&v!=='U')body+=`<fieldset class="followup"><legend>가장 중요하게 고려한 이유 · 최대 2개</legend>${choiceInputs(i.id+'__reason_tags',S.tags,S.tags,r[i.id+'__reason_tags'],true)}</fieldset><label>선택 이유를 조금 더 설명해주셔도 좋아요 · 선택<textarea ${inputAttrs(i.id+'__free_text')} maxlength="600" rows="2">${esc(r[i.id+'__free_text']||'')}</textarea></label>`;
 if(i.type==='norm_check')body+=`<fieldset class="followup"><legend>이런 상황의 기관 규정을 확인해본 적이 있나요?</legend>${choiceInputs(i.id+'__norm_checked',['예','아니오','잘 모르겠다'],['예','아니오','잘 모르겠다'],r[i.id+'__norm_checked'])}</fieldset>`;
 return `<fieldset class="question" id="q-${i.id}"><legend><span class="qnum">${String(n).padStart(2,'0')}</span>${esc(i.text||i.title||'더 편한 쪽을 골라주세요')}${i.required===false?'<small>선택 문항</small>':''}</legend>${i.help&&i.type!=='priority'?`<p class="muted">${esc(i.help)}</p>`:''}${body}<small class="qid">${esc(i.id)} · 문항판 ${esc(i.revision)}</small></fieldset>`;
}
function renderForm(){
 const r=states[formAudience],mods=formAudience==='applicant'?S.applicant:S.employer;
 const active=S.activeItems(r,formAudience),activeSet=new Set(active.map(i=>i.id));
 let n=0;
 document.getElementById('form-count').textContent=`현재 표시 ${active.length}개 묶음 · 세부 입력과 조건부 추가 질문은 별도`;
 root.innerHTML=mods.map(m=>{
  const xs=m.items.filter(i=>activeSet.has(i.id));if(!xs.length)return '';
  return `<section class="module" id="module-${m.code}"><div class="module-heading"><h2>${esc(m.display_title)}</h2><p>${esc(m.intro)}</p></div>${xs.map(i=>renderItem(i,++n,r)).join('')}</section>`;
 }).join('');
 document.getElementById('module-links').innerHTML=mods.filter(m=>m.items.some(i=>activeSet.has(i.id))).map(m=>`<a href="#module-${m.code}">${esc(m.display_title)}</a>`).join('');
 document.getElementById('load-sample').textContent=`${formAudience==='applicant'?'지원자':'채용처'} 가상 응답 채워 검토하기`;
 document.getElementById('reset').textContent=`${formAudience==='applicant'?'지원자':'채용처'} 입력 비우기`;
}
function hideFormResults(){
 latest=null;
 document.getElementById('result-area').hidden=true;
 document.getElementById('live-result').innerHTML='';
 document.getElementById('validation-summary').textContent='';
}
function capture(target){
 const id=target.dataset.id;if(!id)return;
 hideFormResults();
 const r=states[formAudience],key=target.dataset.key;
 const owner=key?(r[id]&&typeof r[id]==='object'&&!Array.isArray(r[id])?r[id]:(r[id]={})):r;
 const prop=key||id;
 if(target.dataset.empty){if(target.checked)r[id]=[];else delete r[id];return;}
 if(target.type==='checkbox'){
  const xs=Array.isArray(owner[prop])?owner[prop].slice():[];
  if(target.checked&&!xs.includes(target.value))xs.push(target.value);
  if(!target.checked&&xs.includes(target.value))xs.splice(xs.indexOf(target.value),1);
  owner[prop]=xs;
 }else if(target.dataset.numeric)owner[prop]=target.value==='U'?'U':Number(target.value);
 else if(target.type==='number')owner[prop]=target.value===''?null:Number(target.value);
 else owner[prop]=target.value;
}
function renderResults(){
 if(!latest)return;
 const container=isForm?document.getElementById('live-result'):root;
 const positionSelect=document.getElementById('position-select');
 const ps=latest.reports.edupin.positions;
 if(positionIndex>=ps.length)positionIndex=0;
 positionSelect.innerHTML=ps.map((p,i)=>`<option value="${i}" ${i===positionIndex?'selected':''}>${esc(p.label)}</option>`).join('')||'<option>대조 직무 없음</option>';
 const employerOnly=isForm&&audience==='employer'&&latest.profile.validation.answered===0;
 positionSelect.parentElement.hidden=audience!=='employer'||employerOnly;
 container.innerHTML=employerOnly?UI.employerQuestionnaireReport(ps[0]?.validation.valid||{}):UI.reports(latest,audience,positionIndex);
 document.querySelectorAll('[data-audience]').forEach(b=>{
  b.setAttribute('aria-pressed',String(b.dataset.audience===audience));
  if(isForm)b.hidden=b.dataset.audience==='employer'?formAudience!=='employer'&&!Object.keys(states.employer).length:formAudience!=='applicant'&&!Object.keys(states.applicant).length;
 });
 if(isForm){
  const v=audience==='employer'?(ps[positionIndex]?.validation||validate({},'employer')):latest.profile.validation;
  document.getElementById('validation-summary').textContent=`${audience==='employer'?'채용처':'지원자'} · 필수 미응답 ${v.missing.length}개 · 추가 확인 ${v.secondaryMissing.length}개 · 입력 오류 ${v.errors.length}개. 미응답을 임의로 채우지 않았습니다.`;
 }
}
function calculateFormResults(scroll=true){
 const now=new Date().toISOString().slice(0,10),er=states.employer;
 latest=run({version:S.version,responses:states.applicant,positions:Object.keys(er).length?[{version:S.version,position_id:'LOCAL-DRAFT',responses:er}]:[],assessed_at:now,conditions_updated_at:now,now});
 audience=formAudience;positionIndex=0;resultRequested[formAudience]=true;
 document.getElementById('result-area').hidden=false;
 renderResults();
 if(scroll)document.getElementById('result-area').scrollIntoView({behavior:'smooth'});
}
document.querySelectorAll('[data-audience]').forEach(button=>button.addEventListener('click',()=>{audience=button.dataset.audience;renderResults();}));
document.getElementById('position-select').addEventListener('change',e=>{positionIndex=Number(e.target.value);renderResults();});
if(isForm){
 document.querySelectorAll('[data-form]').forEach(button=>button.addEventListener('click',()=>{
  formAudience=button.dataset.form;document.querySelectorAll('[data-form]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderForm();
  if(resultRequested[formAudience])calculateFormResults(false);else hideFormResults();
 }));
 root.addEventListener('input',e=>{if(['text','number','date','textarea'].includes(e.target.type))capture(e.target);});
 root.addEventListener('change',e=>{
  const t=e.target;if(!t.dataset.id)return;
  if(!['text','number','date','textarea'].includes(t.type))capture(t);
  const id=t.dataset.id;
  const needsRender=['F3-7','F3-10','HF-05','HF-06','HP-01','X3-D05'].includes(id)||id.startsWith('S3-')&&!id.includes('__')||id.startsWith('D3-')&&!id.includes('__')||t.dataset.numeric||id.startsWith('HJ-')||id.startsWith('HE-');
  if(needsRender){const scroll=window.scrollY;renderForm();window.scrollTo(0,scroll);}
 });
 document.getElementById('calculate').addEventListener('click',()=>calculateFormResults());
 document.getElementById('load-sample').addEventListener('click',()=>{
  const label=formAudience==='applicant'?'지원자':'채용처';
  if(Object.keys(states[formAudience]).length&&!window.confirm(`${label} 질문지의 현재 입력을 가상 응답으로 바꿀까요? 다른 질문지의 입력은 유지됩니다.`))return;
  states[formAudience]=JSON.parse(JSON.stringify(formAudience==='applicant'?sampleCases[0].input.responses:sampleCases[0].input.positions[0].responses));
  renderForm();calculateFormResults();
 });
 document.getElementById('reset').addEventListener('click',()=>{
  const label=formAudience==='applicant'?'지원자':'채용처';
  if(!window.confirm(`${label} 질문지의 입력만 비울까요? 다른 질문지의 입력은 유지됩니다.`))return;
  states[formAudience]={};resultRequested[formAudience]=false;hideFormResults();renderForm();
 });
 renderForm();
}else{
 const selector=document.getElementById('sample-select');
 selector.innerHTML=sampleCases.map(c=>`<option value="${c.id}">${esc(c.label)}</option>`).join('');
 const update=()=>{latest=run(sampleCases.find(c=>c.id===selector.value).input);positionIndex=0;renderResults();};
 selector.addEventListener('change',update);update();
}
