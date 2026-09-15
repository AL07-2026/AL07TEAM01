(function(){'use strict';const modules={"tools/browser.js":function(require,module,exports){
"use strict";
const S=require("engine/schema.js");
const {validate}=require("engine/assessment.js");
const {run}=require("engine/reports.js");
const {samples}=require("engine/samples.js");
const UI=require("tools/ui.js");
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

},"engine/schema.js":function(require,module,exports){
"use strict";
// Canonical v3 definitions. The v2 banks are frozen migration references, not active instructions.
const oldA = require("reference/applicant-bank.v2.json");
const oldE = require("reference/employer-bank.v2.json");
const oldS = require("reference/scoring-spec.v2.json");
const clone = x => JSON.parse(JSON.stringify(x));
// Display numbers refer to v3.0; stable IDs are never renumbered.
const retiredInterest = [
 {id:'R3-09',previousNumber:29,reason:'23번의 새 표현 구상·41번의 미적 구성과 가까움. 재료를 조합하는 표현 활동의 세부 선호는 덜 확인합니다.'},
 {id:'R3-14',previousNumber:34,reason:'27번과 제작 방법을 시험한다는 표현이 가까움. 탐구 영역의 원인 분석·맥락 조사·패턴 발견·원리 학습은 유지하되 실험 비교 흥미는 덜 확인합니다.'},
 {id:'R3-25',previousNumber:45,reason:'직접 제작하는 흥미와 타인에게 시범을 보이는 흥미가 섞임. 도구·재료·공간·현장 문제 해결 문항을 남깁니다.'},
 {id:'R3-28',previousNumber:48,reason:'24번의 이해하기 쉬운 설명과 가까움. 작품 해설에 대한 구체적인 흥미는 덜 확인합니다.'},
 {id:'R3-29',previousNumber:49,reason:'25번의 가치 제안·31번의 관심과 참여 유도와 가까움. 고객·협력자 확보 활동의 선호는 덜 확인합니다.'},
 {id:'R3-30',previousNumber:50,reason:'26번의 파일·자료 관리와 겹침. 기록·보관 자체에 대한 선호는 덜 구분합니다.'}
];
const retiredInterestIds=retiredInterest.map(i=>i.id);
const retired = ['X3-U03','X3-U04','X3-D01','X3-D02','X3-D03','X3-D04',...retiredInterestIds];
const branches = clone(oldA.branches).map(b=>({code:b.code,label:b.label}));
branches.splice(1,0,{code:'ADULT',label:'성인 미술교육·워크숍'});
const labels = Object.fromEntries(branches.map(b=>[b.code,b.label]));
const choice = (id,text,options,multi=false,extra={}) => ({id,text,type:'choice',options,select:multi?'multi':'single',...extra});
const text = (id,label,extra={}) => ({id,text:label,type:'text',maxLength:600,...extra});
const field = (key,label,type='text',extra={}) => ({key,label,type,...extra});
const select = (key,label,options,extra={}) => field(key,label,'select',{options,...extra});
const multi = (key,label,options,extra={}) => field(key,label,'multi',{options,...extra});
const number = (key,label,max,extra={}) => field(key,label,'number',{min:0,max,...extra});
const group = (id,label,fields,extra={}) => ({id,text:label,type:'group',fields,...extra});
const UNKNOWN='아직 정하지 못했어요';
const days=['월','화','수','목','금','토','일'];
const times=['오전','오후','저녁'];
const contracts=['정규직','기간제','시간제','프리랜서·프로젝트'];
const units=['시급','월급','회당','프로젝트당'];
const conditions=['보수','요일·시간','계약 형태','이동 범위','개인 활동 시간'];
const addUnknown=xs=>xs.concat(UNKNOWN);
const numericUnknown={help:'숫자를 정하지 못했다면 비워두세요. 빈칸을 0으로 읽지 않습니다.'};
const applicant = clone(oldA.modules).filter(m=>m.code!=='B3');
for(const m of applicant) {
  m.items=m.items.filter(i=>!retired.includes(i.id));
  for(const i of m.items) {
    i.required=true; i.revision='2.0';
    if(i.type==='likert_1_5') i.allowUnknown=true;
    if(i.type==='bipolar_1_7') { i.allowUnknown=true; i.neutralFollowup=true; }
    if(i.type==='sjt') { i.freeTextOptional=true; i.evidenceFollowup=true; }
    if(m.code==='N3') { delete i.branch; i.when='child_contact'; }
  }
}
const itemsA=()=>applicant.flatMap(m=>m.items);
const a=id=>itemsA().find(i=>i.id===id);
a('F3-7').options=branches.map(b=>b.label); a('F3-7').values=branches.map(b=>b.code);
a('F3-6').help='관심 있는 분야를 세 개까지 골라주세요. 다음 질문에서 더 자세히 살펴볼 분야 하나를 정해요.';
a('F3-7').help='먼저 살펴볼 분야 하나를 골라주세요. 그 분야의 추가 질문이 나와요. 결과에서는 다른 분야도 함께 살펴봅니다.';
applicant[0].items.push(choice('F3-10','경험했거나 살펴보고 싶은 일에서 아동·청소년을 직접 만나나요?',['예','아니오','아직 모르겠어요'],false,{required:true,revision:'3.0'}));
// Semantic changes have explicit revision metadata; old responses must not silently migrate.
const revisedAxes={
  'E3-03':['시간이 제한되면 정한 결과물의 완성을 먼저 챙김','시간이 제한되면 시도·탐색할 기회를 먼저 챙김'],
  'E3-07':['내가 막혔을 때 담당자가 일찍 방향을 알려줌','내가 시도할 시간을 가진 뒤 담당자와 상의함'],
  'E3-11':['문제가 생겼을 때 팀이 원인과 해결안부터 정리함','문제가 생겼을 때 팀이 관계자의 상태와 입장부터 확인함'],
  'J3-05':['하나의 결과를 몇 달 이상 꾸준히 발전시킴','하나의 결과를 짧은 주기로 마무리함']
};
for(const [id,poles] of Object.entries(revisedAxes)) Object.assign(a(id),{left:poles[0],right:poles[1],revision:'3.0',requiresReanswer:true});
const adultAxes=[
 ['처음 배우는 사람의 기초를 안내','경험 있는 사람의 개별 작업을 코칭'],
 ['한 번 만나는 체험·입문 모임','같은 참여자와 여러 회차를 이어감'],
 ['예시와 순서를 중심으로 진행','참여자가 정한 주제와 속도를 중심으로 진행'],
 ['작품 완성이나 기술 습득을 우선','표현과 교류의 경험을 우선'],
 ['작업 시간에 개인별로 도움','전체 앞에서 설명과 시연을 자주 함'],
 ['준비된 재료·공간 안에서 진행','재료 구성과 공간 준비도 직접 담당'],
 ['정해진 커리큘럼을 활용','모임에 맞게 내용을 직접 설계'],
 ['수업과 피드백에 집중','신청·홍보·정산도 함께 맡음'],
 ['개인의 작업에 대한 피드백','참여자 사이 교류와 대화를 진행'],
 ['고정된 장소·요일에 운영','요청에 따라 장소·시간을 바꾸어 운영']
];
const dmod=applicant.find(m=>m.code==='D3');
adultAxes.forEach(([left,right],n)=>dmod.items.push({id:`D3-ADULT${String(n+1).padStart(2,'0')}`,type:'bipolar_1_7',left,right,branch:'ADULT',module:'D3',revision:'3.0',required:true,allowUnknown:true,neutralFollowup:true,evidence:['A','B','C']}));
const adultScenarios=[
 ['참여자마다 다른 속도','성인 입문 모임에서 한 사람은 빠르게 마쳤고 다른 사람은 시작을 어려워합니다. 모두 안전하게 작업 중이고 20분이 남았습니다.', ['전체에 다음 선택지를 설명한 뒤 어려워하는 사람의 상황을 듣는다.','각자 이어갈 과제를 제안하고 필요한 사람부터 개별로 돕는다.','잠깐 함께 과정을 나누고 다시 작업할 시간을 정한다.','진행 속도를 먼저 확인하고 오늘 마칠 범위를 함께 조정한다.']],
 ['예시와 다른 작품','성인 참여자가 안내한 예시와 다른 작품을 만들고 싶어 합니다. 재료와 안전에는 문제가 없고 완성 방법은 아직 정해지지 않았습니다.', ['어떤 결과를 원하는지 듣고 가능한 방법을 함께 찾는다.','오늘 배울 기술을 설명한 뒤 적용할 수 있는 범위를 제안한다.','작게 시험해본 뒤 계속할 방법을 정하자고 제안한다.','개별 시도와 전체 진행 시간을 나누어 합의한다.']],
 ['남은 시간과 마무리','성인 워크숍 종료까지 10분이 남았고, 다음 예약 때문에 정시에 정리해야 합니다. 몇 사람은 작업을 더 하고 싶어 합니다.', ['종료 시간을 알리고 지금 마칠 부분과 이어 할 부분을 나눈다.','보관이나 가져갈 방법을 확인하고 안전한 정리를 먼저 안내한다.','남은 시간에 할 수 있는 마무리 방법을 짧게 시연한다.','참여자에게 현재 상태를 묻고 각자 마무리 순서를 정한다.']],
 ['서로 다른 피드백','작품을 나누는 시간에 한 성인 참여자가 다른 사람의 작품을 단정적으로 평가했습니다. 상대가 불편하다고 말했고 발언은 멈춘 상태입니다.', ['불편했던 점을 듣고 이후 피드백 방식을 함께 정한다.','사람에 대한 평가와 작품에서 본 내용을 구분해 안내한다.','잠시 쉬었다가 당사자의 의사를 확인하고 나눔을 이어간다.','각자가 원하는 피드백 범위를 먼저 말하도록 순서를 바꾼다.']]
];
const smod=applicant.find(m=>m.code==='S3');
adultScenarios.forEach(([title,scenario,opts],n)=>smod.items.push({id:`S3-ADULT${String(n+1).padStart(2,'0')}`,type:'sjt',title,scenario,options:opts.map((t,i)=>({key:'ABCD'[i],text:t})),branch:'ADULT',required:true,reason_tags_max:2,freeTextOptional:true,evidenceFollowup:true,revision:'3.0'}));
const kItems=[
 group('K3-01','보수는 어떤 기준으로 살펴볼까요?',[
   select('unit','보수 기준',addUnknown(units)),number('minimum','이보다 낮으면 선택하기 어려운 금액 (원)',100000000,numericUnknown),number('desired','희망 금액 (원)',100000000,numericUnknown)
 ]),
 group('K3-02','일할 수 있는 요일과 시간을 알려주세요.',[
   multi('days','가능한 요일',addUnknown(days)),multi('times','가능한 시간대',addUnknown(times)),number('weekly_max','일주일에 가능한 최대 시간',168,numericUnknown),field('start','시작 가능한 날짜','date'),field('note','고정 일정이나 추가로 설명할 점','text',{optional:true})
 ]),
 group('K3-03','어떤 계약 형태를 살펴보고 싶으세요?',[multi('types','계약 형태',addUnknown(contracts))]),
 group('K3-04','이동할 수 있는 조건을 조금 더 알려주세요.',[
   number('minutes','편도 통근에 쓸 수 있는 최대 시간 (분)',600,numericUnknown),select('support','먼 지역의 일을 검토하려면 숙소·이동비 지원이 필요한가요?',['필요해요','필요하지 않아요',UNKNOWN])
 ]),
 text('K3-05','창작·학업 등 함께 이어가기 위해 지키고 싶은 시간이 있나요?',{help:'예: 화·목 저녁에는 개인 작업을 이어가고 싶어요. 없다면 “없음”, 아직 모르겠다면 “미정”이라고 적어주세요.'}),
 group('K3-06','새로운 분야의 일도 제안받고 싶으세요?',[
   select('openness','제안 범위',['지금 고른 분야만','관심 있다고 고른 분야까지','조건이 맞으면 새로운 분야도','지금은 결과만 보고 싶어요']),
   multi('hesitations','새 분야에서 먼저 확인하고 싶은 점',['업무 경험 부족','개인 작업과 병행','보수·수입 안정성','실제 업무와 책임','교육·적응 지원','그 분야 자체에 관심이 있는지','특별히 없음'],{optional:true})
 ]),
 text('K3-08','최근 “이런 일은 다시 하고 싶다”고 느낀 순간은 언제였나요?',{required:false,help:'어떤 일을 했고 무엇이 좋았는지 한두 문장으로 적어주세요. 작업·과제·아르바이트 경험도 괜찮아요.'}),
 text('K3-09','일 자체는 괜찮았지만 계속하기 어려웠던 경험이 있나요?',{required:false,help:'어떤 조건이 힘들었는지 적어주세요. 개인 이름이나 민감한 정보는 적지 않아도 됩니다.'}),
 group('K3-10','선호와 꼭 지켜야 하는 조건을 구분해볼까요?',[
   multi('must','맞지 않으면 선택하기 어려운 조건',conditions.concat('아직 없음')),
   field('avoid','피하고 싶은 업무·환경','text',{optional:true}),field('negotiable','설명을 듣고 협의할 수 있는 부분','text',{optional:true})
 ],{help:'선택하지 않은 조건을 모두 협의 가능하다고 단정하지 않아요. 구체적인 조건이 비어 있으면 다시 확인합니다.'})
];
kItems.forEach(i=>{i.module='K3';i.revision='3.0';if(i.required===undefined)i.required=true;});
applicant.splice(1,0,{code:'K3',display_title:'지금 찾는 일의 조건',items:kItems});
const intros={
 F3:'지금의 경험과 관심을 알려주세요. 고른 분야가 추천의 범위를 제한하지는 않습니다.',
 K3:'현재의 선택 기준을 기록해요. 미정인 조건을 불리하게 해석하지 않고, 실제 자리를 살펴볼 때 다시 확인합니다.',
 R3:'얼마나 잘하는지가 아니라 얼마나 해보고 싶은지 답해주세요. 1 전혀 하고 싶지 않다 · 3 중간 · 5 매우 하고 싶다 · ? 판단하기 어렵다',
 W3:'최근 6개월 또는 가장 최근의 작업·과제·협업을 떠올려주세요. 1 거의 하지 않았다 · 3 가끔 했다 · 5 자주 했다 · ? 그런 상황을 경험하지 않았다',
 P3:'최근 6개월 또는 가장 최근의 협업 경험을 떠올려주세요. 1 거의 하지 않았다 · 3 가끔 했다 · 5 자주 했다 · ? 그런 상황을 경험하지 않았다',
 E3:'내가 일할 환경을 떠올려주세요. 1 왼쪽에 가까움 · 4 양쪽이 비슷함 · 7 오른쪽에 가까움 · ? 판단하기 어려움',
 J3:'내가 맡고 싶은 일의 모습을 골라주세요. 1 왼쪽에 가까움 · 4 양쪽이 비슷함 · 7 오른쪽에 가까움 · ? 판단하기 어려움',
 X3:'불확실할 때의 방식과 일을 고르는 기준을 살펴봐요. 숫자 질문: 1 전혀 그렇지 않다 · 3 중간 · 5 매우 그렇다 · ? 판단하기 어렵다',
 D3:'선택한 분야의 실제 조건을 살펴봐요. 1 왼쪽 · 4 양쪽이 비슷함 · 7 오른쪽 · ? 아직 판단하기 어려움. 답의 바탕은 직접 경험 / 비슷한 경험 / 예상으로 나눠주세요.',
 S3:'가장 먼저 할 행동과 중요한 이유를 골라주세요. 행동 하나로 성격이나 능력을 판단하지 않습니다. 추가 설명은 선택이에요. 안전·권리와 관련된 선택은 별도 확인이 필요합니다.',
 N3:'아동·청소년을 직접 만나는 일에서 먼저 안내받아야 할 기준을 확인해요. 성격·도덕성 점수로 만들지 않고, 기관의 규정과 기본 안전 절차를 사람이 확인합니다.'
};
for(const m of applicant){m.intro=intros[m.code];m.items.forEach(i=>i.module=m.code);}

const employer=clone(oldE.modules);
for(const m of employer) {
  if(m.code==='HD')m.items=m.branches.flatMap(b=>b.items.map(i=>({...i,branch:b.branch})));
  for(const i of m.items||[]){i.module=m.code;i.revision='3.0';i.required=m.code!=='HD';}
}
const itemsE=()=>employer.flatMap(m=>m.items||[]);
const e=id=>itemsE().find(i=>i.id===id);
e('HF-05').options=branches.map(b=>b.label);e('HF-05').values=branches.map(b=>b.code);
for(const m of employer.filter(m=>['HJ','HE'].includes(m.code)))for(const i of m.items){
 i.text=m.code==='HJ'?'이 직무의 실제 업무와 더 가까운 쪽을 골라주세요':'우리 조직의 실제 운영과 더 가까운 쪽을 골라주세요';
 const mirror=a(i.mirrors);i.left=mirror.left;i.right=mirror.right;i.allowUnknown=true;i.neutralFollowup=true;
}
const hp=e('HP-01');delete hp.personas;hp.type='priority';hp.help='앞에서 뚜렷하게 답하신 조건을 모았어요. 이 중에서도 특히 “다르면 힘들고 꼭 맞아야 하는 조건”을 최대 ○개 골라주세요. 꼭 맞아야 할 조건이 없다면 선택하지 않아도 됩니다. 선택하지 않은 조건의 조정 가능성은 별도로 확인합니다.';
e('HP-02').required=false;e('HP-04').help='예: 처음 한 달은 함께 수업하고, 세 달 뒤에는 준비부터 정리까지 한 회차를 운영할 수 있으면 좋겠습니다.';
employer.find(m=>m.code==='HD').items.push(...adultAxes.map(([left,right],n)=>({id:`HD-ADULT${String(n+1).padStart(2,'0')}`,type:'bipolar_1_7_or_undefined',left,right,branch:'ADULT',mirrors:`D3-ADULT${String(n+1).padStart(2,'0')}`,module:'HD',allowUnknown:true,required:false,revision:'3.0'})));
for(const i of employer.find(m=>m.code==='HN').items)i.when='child_contact';
const hk=[
 group('HK-01','실제로 제안할 수 있는 보수를 알려주세요.',[select('unit','보수 기준',addUnknown(units)),number('minimum','제안 범위 하한 (원)',100000000,numericUnknown),number('maximum','제안 범위 상한 (원)',100000000,numericUnknown),select('prep_paid','준비·정리시간의 보수 처리',['별도 지급','제시 보수에 포함','해당 없음',UNKNOWN])]),
 group('HK-02','실제 근무 일정은 어떻게 되나요?',[multi('days','근무 요일',addUnknown(days)),multi('times','근무 시간대',addUnknown(times)),number('weekly_hours','주당 시간',168,numericUnknown),field('start','희망 시작일','date'),select('flexible','일정 조정 가능성',['협의 가능','정해져 있음',UNKNOWN])]),
 group('HK-03','계약과 이동 조건을 알려주세요.',[select('type','계약 형태',addUnknown(contracts)),select('travel_support','먼 지역 지원자의 숙소·이동비 지원',['지원 가능','지원 없음',UNKNOWN]),field('location_note','근무지·이동 조건 설명','text',{optional:true})]),
 group('HK-04','주요 업무에 쓰는 시간 비중은 어느 정도인가요?',[select('status','확인 상태',['입력했어요',UNKNOWN]),number('making','직접 제작·수업 (%)',100),number('coordination','사람·일정 조율 (%)',100),number('admin','기록·행정·판매 등 (%)',100)],{help:'합계 100으로 적어주세요. 아직 모르면 미정을 고르고 숫자는 비워두세요. 직무명만으로 업무 비중을 추정하지 않습니다.'}),
 group('HK-05','새 분야에서 시작하는 사람에게 어떤 지원이 가능한가요?',[
   select('entry','관련 업계 경험이 없는 사람도 검토 가능한가요?',['가능','경험자만 검토',UNKNOWN]),
   multi('supports','실제로 제공 가능한 지원',['초기 동행·보조','기본 커리큘럼·예시','정기 피드백','안전·운영 교육','별도 지원 없음',UNKNOWN]),
   field('detail','기간·담당자·범위 등 확인된 내용','text',{optional:true})
 ]),
 text('HK-06','이 일을 하며 자주 부딪히는 어려움은 무엇인가요?',{required:false,help:'최근의 실제 장면을 적어주세요. 특정 직원의 이름이나 개인 사정은 적지 않습니다.'}),
 group('HK-07','운영 조건 중 실제로 조정할 수 있는 것은 무엇인가요?',[multi('flexible_axes','조정 가능한 조건',['업무 비중','보고 주기','진행 방법','초기 교육 기간','아직 확인 필요']),field('detail','조정 범위·협의 담당자','text',{optional:true})])
];
hk.forEach(i=>{i.module='HK';i.revision='3.0';if(i.required===undefined)i.required=true;});
employer.splice(1,0,{code:'HK',display_title:'보수·일정·업무·적응 지원',items:hk});
for(const m of employer)m.intro=['HJ','HE','HD'].includes(m.code)?'이상적인 인재상이 아니라 실제 운영을 답해주세요. 1 왼쪽 · 4 양쪽이 비슷함 · 7 오른쪽 · ? 미정. 아직 없는 직무는 확정된 계획만 답해주세요.':'직무 단위로 기록합니다. 아직 정해지지 않은 조건은 미정으로 남겨주세요.';
const renamed={
 'relationship.emotional_empathy':'상대의 상태를 먼저 확인하기',
 'relationship.perspective_taking':'상대의 이유와 의도를 살피기',
 'relationship.gentle_expression':'이유와 대안을 덧붙여 말하기',
 'relationship.nonjudgmental_respect':'판단을 서두르지 않고 듣기',
 'relationship.observational_sensitivity':'반응과 합의 내용을 살피기',
 'relationship.imaginative_openness':'다른 방법과 관점을 찾아보기',
 'relationship.emotion_regulation_patience':'반응하기 전에 잠시 멈추기',
 'relationship.relational_warmth':'관심과 기여를 다음 만남에 잇기',
 'work.self_attribution':'내가 바꿀 수 있는 부분 찾기',
 'work.rules_safety':'기준·위험을 확인한 최근 행동',
 'meaning.learner_growth':'다른 사람에게 도움이 되는 보람',
 'career.uncertainty_action_resources':'불확실할 때 작은 시작점 찾기'
};
const scales=clone(oldS.scales).map(s=>{
 const shortened=s.id.startsWith('riasec.');
 const items=shortened?s.items.filter(id=>!retiredInterestIds.includes(id)):s.items;
 return {...s,items,label:renamed[s.id]||s.label,active:items.length>0&&items.every(id=>!!a(id)),
  minimum_answered:items.length<=2?items.length:Math.ceil(items.length*.8),
  ...(shortened?{revision:'3.1',previous_item_count:5,removed_items:s.items.filter(id=>retiredInterestIds.includes(id)),
   note:'v3.1 · 4문항 단축 구성. 네 답이 모두 숫자일 때 평균을 표시합니다. 구판과 측정 동등성은 검증 전입니다.'}:{})};
});
const allItems=aud=>aud==='employer'?itemsE():itemsA();
function branchOf(res,audience='applicant'){const key=audience==='employer'?'HF-05':'F3-7';const v=res[key];return branches.find(b=>b.code===v||b.label===v)?.code||null;}
function childContact(res,audience='applicant'){
 if(audience==='employer')return ['정기적으로 만난다','가끔 만난다 (단체 관람, 행사 등)'].includes(res['HF-06']);
 return res['F3-10']==='예'||branchOf(res)==='EDU';
}
function activeItems(res,audience='applicant'){
 const branch=branchOf(res,audience);
 return allItems(audience).filter(i=>(!i.branch||i.branch===branch)&&(!i.when||childContact(res,audience)));
}
function priorityCandidates(res){
 return itemsE().filter(i=>['HJ','HE'].includes(i.module)&&Number.isInteger(res[i.id])&&res[i.id]>=1&&res[i.id]<=7&&Math.abs(res[i.id]-4)>=2)
 .sort((x,y)=>Math.abs(res[y.id]-4)-Math.abs(res[x.id]-4)||x.id.localeCompare(y.id)).slice(0,12)
 .map(i=>({id:i.mirrors,label:res[i.id]<4?i.left:i.right}));
}
const priorityMax=n=>n?Math.max(1,Math.min(4,Math.round(n/3))):0;
module.exports={version:'3.1',applicant,employer,branches,labels,scales,retired,retiredInterest,allItems,activeItems,branchOf,childContact,priorityCandidates,priorityMax,UNKNOWN,days,times,conditions,tags:oldA.sjt_reason_tags,neutralOptions:['두 방식 모두 괜찮아요','상황에 따라 달라요','두 방식 모두 원하지 않아요','경험이 부족해서 판단하기 어려워요']};

},"reference/applicant-bank.v2.json":function(require,module,exports){
module.exports={
  "meta": {
    "questionnaire_id": "edupin-career-assessment",
    "version": "2.0",
    "language": "ko-KR",
    "status": "pilot",
    "audience": "applicant",
    "source_document": "docs/01-applicant-questionnaire.md",
    "note": "이 파일은 마크다운 질문지에서 생성된 파생물이다. 문항 수정은 마크다운에서 하고 tools/build-json.js를 다시 돌린다."
  },
  "branches": [
    {
      "code": "EDU",
      "label": "아동·청소년 미술교육",
      "norm_module": true
    },
    {
      "code": "GAME",
      "label": "게임·애니메이션·디지털 제작",
      "norm_module": false
    },
    {
      "code": "FILM",
      "label": "영화·공연·무대·현장 제작",
      "norm_module": false
    },
    {
      "code": "MAKE",
      "label": "패션·공예·제품·공방",
      "norm_module": false
    },
    {
      "code": "INDEP",
      "label": "작가·프리랜서·독립 스튜디오",
      "norm_module": false
    },
    {
      "code": "CULTURE",
      "label": "미술관·갤러리·전시·공공문화",
      "norm_module": true
    },
    {
      "code": "DESIGN",
      "label": "디자인·브랜드·콘텐츠 회사",
      "norm_module": false
    },
    {
      "code": "GENERAL",
      "label": "아직 분야를 정하지 않은 탐색",
      "norm_module": false
    }
  ],
  "routing": {
    "field_item": "F3-7",
    "controls": [
      "D3",
      "S3",
      "N3"
    ],
    "norm_branches": [
      "EDU",
      "CULTURE"
    ]
  },
  "location": {
    "residence_item": "F3-8",
    "commute_item": "F3-9",
    "note": "좌표 24축에 들어가지 않는다. 별도 필터로 다룬다. 상세 주소는 수집하지 않는다."
  },
  "sjt_reason_tags": [
    "상대의 감정과 상태",
    "선택권과 자율성",
    "안전과 존중",
    "전체 진행과 흐름",
    "남은 시간",
    "기관 기준과 역할범위",
    "신뢰와 관계 유지",
    "실행 가능한 해결책",
    "기록과 후속조치",
    "공정성과 일관성"
  ],
  "scales_note": "척도 정의는 scoring-spec.v1.json에 있다.",
  "modules": [
    {
      "code": "F3",
      "label": "배경·경험·희망분야",
      "display_title": "먼저, 나에 대해",
      "group": 1,
      "scored": false,
      "branching": false,
      "response_scale": null,
      "items": [
        {
          "id": "F3-1",
          "type": "choice",
          "select": "multi",
          "max": null,
          "text": "전공 또는 주로 공부한 분야",
          "options": [
            "회화·순수미술",
            "조소·입체",
            "공예",
            "시각·그래픽 디자인",
            "산업·제품 디자인",
            "패션·텍스타일",
            "일러스트·웹툰",
            "애니메이션·영상",
            "게임·디지털 아트",
            "사진",
            "건축·공간·무대",
            "미술교육",
            "미술사·이론·큐레이션",
            "문화예술행정",
            "기타 분야"
          ],
          "module": "F3"
        },
        {
          "id": "F3-2",
          "type": "choice",
          "select": "single",
          "max": 1,
          "text": "현재 상태",
          "options": [
            "재학 중",
            "졸업 후 미술·창작 관련 활동 중",
            "졸업 후 다른 분야에서 활동 중",
            "이직·전환을 준비 중",
            "휴식 중",
            "기타 상태"
          ],
          "module": "F3"
        },
        {
          "id": "F3-3",
          "type": "choice",
          "select": "multi",
          "max": null,
          "text": "지금까지 경험한 활동",
          "options": [
            "개인 창작·작품 제작",
            "팀 기반 창작·제작 프로젝트",
            "디자인·브랜드·콘텐츠 실무",
            "게임·애니메이션·영상 제작",
            "영화·공연·전시 현장 제작",
            "패션·공예·제품 제작",
            "교육·워크숍·멘토링",
            "전시·큐레이션·문화기획",
            "고객·의뢰인 대상 작업",
            "판매·홍보·공방 운영",
            "행정·예산·프로젝트 운영",
            "아직 관련 경험 없음"
          ],
          "module": "F3"
        },
        {
          "id": "F3-4",
          "type": "choice",
          "select": "single",
          "max": 1,
          "text": "미술·창작 관련 활동 기간",
          "options": [
            "아직 없음",
            "6개월 미만",
            "6개월 이상~1년 미만",
            "1년 이상~3년 미만",
            "3년 이상~5년 미만",
            "5년 이상~10년 미만",
            "10년 이상"
          ],
          "module": "F3"
        },
        {
          "id": "F3-5",
          "type": "choice",
          "select": "multi",
          "max": null,
          "text": "경험한 협업 또는 고객관계",
          "options": [
            "혼자 완결하는 개인 작업",
            "동료 창작자와의 협업",
            "여러 직군이 이어서 만드는 분업 제작",
            "감독·디렉터·리더의 방향에 따른 작업",
            "고객·의뢰인의 요청에 따른 작업",
            "관람객·사용자·학습자를 위한 작업",
            "외주·프리랜서 계약",
            "팀·기관 소속 업무",
            "아직 관련 경험 없음"
          ],
          "module": "F3"
        },
        {
          "id": "F3-6",
          "type": "choice",
          "select": "multi",
          "max": 3,
          "text": "관심이 가는 분야",
          "options": [
            "아동·청소년 미술교육",
            "성인 미술교육·워크숍",
            "게임·애니메이션·디지털 제작",
            "영화·공연·무대·현장 제작",
            "패션·공예·제품·공방",
            "작가·프리랜서·독립 스튜디오",
            "미술관·갤러리·전시·공공문화",
            "디자인·브랜드·콘텐츠 회사",
            "아직 잘 모르겠음"
          ],
          "help": "지금 관심이 가는 분야를 골라주세요. 확신이 없어도 괜찮아요. 결과지에서 “관심 있다고 하신 분야”로 표시되고, 이 중 하나를 다음 질문에서 고르시게 됩니다.",
          "module": "F3"
        },
        {
          "id": "F3-7",
          "type": "choice",
          "select": "single",
          "max": 1,
          "text": "이 검사에서 자세히 물어볼 분야",
          "options": [
            "아동·청소년 미술교육",
            "게임·애니메이션·디지털 제작",
            "영화·공연·무대·현장 제작",
            "패션·공예·제품·공방",
            "작가·프리랜서·독립 스튜디오",
            "미술관·갤러리·전시·공공문화",
            "디자인·브랜드·콘텐츠 회사",
            "아직 분야를 정하지 않은 탐색"
          ],
          "help": "지금 가장 먼저 알아보고 싶은 분야 하나를 골라주세요. 선택한 분야의 추가 질문이 나옵니다. 결과에서는 다른 분야의 가능성도 함께 보여드려요. 아직 모르겠다면 ‘아직 분야를 정하지 않은 탐색’을 선택하세요.",
          "values": [
            "EDU",
            "GAME",
            "FILM",
            "MAKE",
            "INDEP",
            "CULTURE",
            "DESIGN",
            "GENERAL"
          ],
          "module": "F3"
        },
        {
          "id": "F3-8",
          "type": "choice",
          "select": "single",
          "max": 1,
          "text": "지금 살고 있는 지역",
          "options": [
            "서울특별시",
            "부산광역시",
            "대구광역시",
            "인천광역시",
            "광주광역시",
            "대전광역시",
            "울산광역시",
            "세종특별자치시",
            "경기도",
            "강원특별자치도",
            "충청북도",
            "충청남도",
            "전북특별자치도",
            "전라남도",
            "경상북도",
            "경상남도",
            "제주특별자치도",
            "해외"
          ],
          "help": "일할 수 있는 거리를 확인하기 위해 여쭤봅니다. 출신 지역이 아니라 현재 거주 지역입니다.",
          "module": "F3"
        },
        {
          "id": "F3-9",
          "type": "choice",
          "select": "multi",
          "max": null,
          "text": "통근하거나 이동할 수 있는 범위",
          "options": [
            "지금 사는 지역 안에서만",
            "인접한 시·군·구까지",
            "같은 시·도 안이면 어디든",
            "수도권 전역",
            "전국 — 숙소나 이동비가 지원되면",
            "원격·재택 위주로 일하고 싶다",
            "아직 정하지 못했다"
          ],
          "module": "F3"
        }
      ]
    },
    {
      "code": "R3",
      "label": "활동 흥미",
      "display_title": "어떤 활동이 좋은가",
      "group": 2,
      "scored": true,
      "branching": false,
      "response_scale": "likert_1_5",
      "items": [
        {
          "id": "R3-01",
          "type": "likert_1_5",
          "text": "재료·도구·장비를 직접 점검하고 작업할 수 있게 준비하는 일",
          "module": "R3"
        },
        {
          "id": "R3-02",
          "type": "likert_1_5",
          "text": "결과가 예상과 달라진 원인을 자료와 과정을 살펴 분석하는 일",
          "module": "R3"
        },
        {
          "id": "R3-03",
          "type": "likert_1_5",
          "text": "정답이 정해지지 않은 새로운 이미지나 표현을 구상하는 일",
          "module": "R3"
        },
        {
          "id": "R3-04",
          "type": "likert_1_5",
          "text": "누군가 어려워하는 내용이나 방법을 이해하기 쉽게 설명하는 일",
          "module": "R3"
        },
        {
          "id": "R3-05",
          "type": "likert_1_5",
          "text": "내가 만든 기획이나 작업의 가치를 사람들에게 제안하는 일",
          "module": "R3"
        },
        {
          "id": "R3-06",
          "type": "likert_1_5",
          "text": "일정·예산·파일·자료를 정해진 방식으로 정확하게 관리하는 일",
          "module": "R3"
        },
        {
          "id": "R3-07",
          "type": "likert_1_5",
          "text": "제작 방법을 직접 시험하고 사용할 도구나 재료를 조정하는 일",
          "module": "R3"
        },
        {
          "id": "R3-08",
          "type": "likert_1_5",
          "text": "작품·사용자·시장·문화에 관한 자료를 찾아 맥락을 이해하는 일",
          "module": "R3"
        },
        {
          "id": "R3-09",
          "type": "likert_1_5",
          "text": "색·형태·움직임·재료를 조합해 새로운 표현을 만드는 일",
          "module": "R3"
        },
        {
          "id": "R3-10",
          "type": "likert_1_5",
          "text": "다른 사람이 작업이나 활동을 시작할 수 있도록 차분히 돕는 일",
          "module": "R3"
        },
        {
          "id": "R3-11",
          "type": "likert_1_5",
          "text": "발표·행사·프로젝트에서 사람들의 관심과 참여를 이끄는 일",
          "module": "R3"
        },
        {
          "id": "R3-12",
          "type": "likert_1_5",
          "text": "제작 단계와 마감을 체크리스트로 관리하는 일",
          "module": "R3"
        },
        {
          "id": "R3-13",
          "type": "likert_1_5",
          "text": "작품·전시·촬영·활동에 맞게 실제 공간과 물건을 배치하는 일",
          "module": "R3"
        },
        {
          "id": "R3-14",
          "type": "likert_1_5",
          "text": "서로 다른 제작 방법을 작게 시험하고 결과를 비교하는 일",
          "module": "R3"
        },
        {
          "id": "R3-15",
          "type": "likert_1_5",
          "text": "이야기·감정·경험에서 시각적 주제나 세계관을 발전시키는 일",
          "module": "R3"
        },
        {
          "id": "R3-16",
          "type": "likert_1_5",
          "text": "다른 사람의 변화와 성장을 가까이에서 지원하는 일",
          "module": "R3"
        },
        {
          "id": "R3-17",
          "type": "likert_1_5",
          "text": "필요한 예산·인력·일정을 확보하기 위해 관계자를 설득하고 협의하는 일",
          "module": "R3"
        },
        {
          "id": "R3-18",
          "type": "likert_1_5",
          "text": "재고·원가·계약·권리 관련 자료를 빠짐없이 정리하는 일",
          "module": "R3"
        },
        {
          "id": "R3-19",
          "type": "likert_1_5",
          "text": "장비·재료·제작 과정에서 생긴 문제를 현장에서 해결하는 일",
          "module": "R3"
        },
        {
          "id": "R3-20",
          "type": "likert_1_5",
          "text": "반응·피드백·기록을 살펴 반복되는 패턴을 찾아내는 일",
          "module": "R3"
        },
        {
          "id": "R3-21",
          "type": "likert_1_5",
          "text": "화면·공간·의상·사물의 구성을 미적으로 완성하는 일",
          "module": "R3"
        },
        {
          "id": "R3-22",
          "type": "likert_1_5",
          "text": "서로 다른 의견을 듣고 사람들이 함께 작업하도록 조율하는 일",
          "module": "R3"
        },
        {
          "id": "R3-23",
          "type": "likert_1_5",
          "text": "팀이 망설일 때 방향을 제안하고 역할을 나누는 일",
          "module": "R3"
        },
        {
          "id": "R3-24",
          "type": "likert_1_5",
          "text": "제출·계약·안전·제작 기준에 맞춰 문서와 결과물을 확인하는 일",
          "module": "R3"
        },
        {
          "id": "R3-25",
          "type": "likert_1_5",
          "text": "손이나 도구를 사용해 제작 과정을 직접 보여주는 일",
          "module": "R3"
        },
        {
          "id": "R3-26",
          "type": "likert_1_5",
          "text": "새로운 기술·재료·표현방법의 원리와 근거를 공부하는 일",
          "module": "R3"
        },
        {
          "id": "R3-27",
          "type": "likert_1_5",
          "text": "주어진 주제나 작업 요청을 나만의 시각으로 재해석하는 일",
          "module": "R3"
        },
        {
          "id": "R3-28",
          "type": "likert_1_5",
          "text": "작품이나 프로젝트의 의미를 비전문가도 이해할 수 있게 전달하는 일",
          "module": "R3"
        },
        {
          "id": "R3-29",
          "type": "likert_1_5",
          "text": "내 작업이나 프로젝트를 소개해 고객·관객·협력자를 모으는 일",
          "module": "R3"
        },
        {
          "id": "R3-30",
          "type": "likert_1_5",
          "text": "작업 파일·과정·결과물을 기준에 따라 분류하고 보관하는 일",
          "module": "R3"
        }
      ]
    },
    {
      "code": "B3",
      "label": "일반 성향",
      "display_title": "평소의 나",
      "group": 3,
      "scored": true,
      "branching": false,
      "response_scale": "likert_1_5",
      "items": [
        {
          "id": "B3-01",
          "type": "likert_1_5",
          "text": "나는 외향적이고 사교적인 편이다",
          "module": "B3"
        },
        {
          "id": "B3-02",
          "type": "likert_1_5",
          "text": "나는 말수가 적은 편이다",
          "module": "B3"
        },
        {
          "id": "B3-03",
          "type": "likert_1_5",
          "text": "나는 때때로 수줍고 내향적인 편이다",
          "module": "B3"
        },
        {
          "id": "B3-04",
          "type": "likert_1_5",
          "text": "나는 말을 많이 하는 편이다",
          "module": "B3"
        },
        {
          "id": "B3-05",
          "type": "likert_1_5",
          "text": "나는 내 의견을 분명하게 말하는 편이다",
          "module": "B3"
        },
        {
          "id": "B3-06",
          "type": "likert_1_5",
          "text": "나는 주도적으로 행동하고 리더 역할을 맡는 편이다",
          "module": "B3"
        },
        {
          "id": "B3-07",
          "type": "likert_1_5",
          "text": "나는 다른 사람에게 영향력을 발휘하기 어렵다고 느낀다",
          "module": "B3"
        },
        {
          "id": "B3-08",
          "type": "likert_1_5",
          "text": "나는 다른 사람이 주도하는 것을 선호하는 편이다",
          "module": "B3"
        },
        {
          "id": "B3-09",
          "type": "likert_1_5",
          "text": "나는 좀처럼 들뜨거나 의욕을 느끼지 못하는 편이다",
          "module": "B3"
        },
        {
          "id": "B3-10",
          "type": "likert_1_5",
          "text": "나는 다른 사람들보다 활동량이 적은 편이다",
          "module": "B3"
        },
        {
          "id": "B3-11",
          "type": "likert_1_5",
          "text": "나는 에너지가 넘치는 편이다",
          "module": "B3"
        },
        {
          "id": "B3-12",
          "type": "likert_1_5",
          "text": "나는 열정을 많이 보이는 편이다",
          "module": "B3"
        },
        {
          "id": "B3-13",
          "type": "likert_1_5",
          "text": "나는 다른 사람의 잘못이나 단점을 자주 찾는 편이다",
          "module": "B3"
        },
        {
          "id": "B3-14",
          "type": "likert_1_5",
          "text": "나는 다른 사람을 용서하는 편이다",
          "module": "B3"
        },
        {
          "id": "B3-15",
          "type": "likert_1_5",
          "text": "나는 다른 사람의 의도를 의심하는 편이다",
          "module": "B3"
        },
        {
          "id": "B3-16",
          "type": "likert_1_5",
          "text": "나는 대체로 사람들의 좋은 의도를 믿는 편이다",
          "module": "B3"
        }
      ]
    },
    {
      "code": "W3",
      "label": "업무 행동",
      "display_title": "최근에 일할 때 나는",
      "group": 4,
      "scored": true,
      "branching": false,
      "response_scale": "likert_1_5",
      "items": [
        {
          "id": "W3-01",
          "type": "likert_1_5",
          "text": "일을 시작하기 전에 준비물·진행 순서·마감 시점을 확인했다",
          "module": "W3"
        },
        {
          "id": "W3-02",
          "type": "likert_1_5",
          "text": "예정대로 마치기 어렵다고 보이면 미리 알리고 범위나 순서를 조정했다",
          "module": "W3"
        },
        {
          "id": "W3-03",
          "type": "likert_1_5",
          "text": "수정 요청을 받으면 원하는 결과와 요청 이유를 먼저 확인했다",
          "module": "W3"
        },
        {
          "id": "W3-04",
          "type": "likert_1_5",
          "text": "피드백에서 달라진 기준을 다음 작업에도 반영했다",
          "module": "W3"
        },
        {
          "id": "W3-05",
          "type": "likert_1_5",
          "text": "재료·시간·예산이 부족할 때 실행 가능한 대안을 둘 이상 비교했다",
          "module": "W3"
        },
        {
          "id": "W3-06",
          "type": "likert_1_5",
          "text": "예상하지 못한 일이 생기면 꼭 지킬 것과 미뤄도 될 것을 나누어 순서를 다시 정했다",
          "module": "W3"
        },
        {
          "id": "W3-07",
          "type": "likert_1_5",
          "text": "함께 일하는 사람이 다음 행동에 필요한 정보를 미리 공유했다",
          "module": "W3"
        },
        {
          "id": "W3-08",
          "type": "likert_1_5",
          "text": "의견이 다를 때 확인된 사실과 서로의 생각을 나누어 말했다",
          "module": "W3"
        },
        {
          "id": "W3-09",
          "type": "likert_1_5",
          "text": "작업이 끝난 뒤 변경사항·남은 일·다음에 필요한 정보를 기록했다",
          "module": "W3"
        },
        {
          "id": "W3-10",
          "type": "likert_1_5",
          "text": "이름·수량·시간·버전·준비물을 체크리스트나 마지막 확인 절차로 점검했다",
          "module": "W3"
        },
        {
          "id": "W3-11",
          "type": "likert_1_5",
          "text": "익숙하지 않은 도구는 사용법을 확인한 뒤 작은 범위에서 시험했다",
          "module": "W3"
        },
        {
          "id": "W3-12",
          "type": "likert_1_5",
          "text": "개선 아이디어를 작은 범위에 먼저 적용해 결과를 살폈다",
          "module": "W3"
        },
        {
          "id": "W3-13",
          "type": "likert_1_5",
          "text": "시작 전에 공간·도구·재료·파일에서 생길 수 있는 위험과 오류를 확인했다",
          "module": "W3"
        },
        {
          "id": "W3-14",
          "type": "likert_1_5",
          "text": "급한 상황에도 필요한 기준과 제한을 지키고 그 이유를 안내했다",
          "module": "W3"
        },
        {
          "id": "W3-15",
          "type": "likert_1_5",
          "text": "결과가 바로 보이지 않아도 처음 정한 기간까지 일을 이어갔다",
          "module": "W3"
        },
        {
          "id": "W3-16",
          "type": "likert_1_5",
          "text": "여러 번 다시 해야 하는 작업에서도 방식을 조금씩 바꾸며 이어갔다",
          "module": "W3"
        },
        {
          "id": "W3-17",
          "type": "likert_1_5",
          "text": "힘이 빠졌을 때 다음 일정에 지장이 없도록 회복 방법을 사용했다",
          "module": "W3"
        },
        {
          "id": "W3-18",
          "type": "likert_1_5",
          "text": "연속된 작업이나 일정 사이에 쉴 시간을 미리 확보했다",
          "module": "W3"
        },
        {
          "id": "W3-19",
          "type": "likert_1_5",
          "text": "잘 풀리지 않은 일을 돌아보며 내가 다르게 할 수 있었던 선택을 찾았다",
          "module": "W3"
        },
        {
          "id": "W3-20",
          "type": "likert_1_5",
          "text": "바꿀 수 없는 조건과 내가 결정할 수 있는 범위를 나누어 정리했다",
          "module": "W3"
        }
      ]
    },
    {
      "code": "E3",
      "label": "근무환경 선호",
      "display_title": "어떤 곳이 편한가",
      "group": 5,
      "scored": true,
      "branching": false,
      "response_scale": "bipolar_1_7",
      "items": [
        {
          "id": "E3-01",
          "type": "bipolar_1_7",
          "left": "구체적인 작업 요청과 기준이 제공됨",
          "right": "목표만 공유받고 방법은 자율적으로 설계",
          "module": "E3"
        },
        {
          "id": "E3-02",
          "type": "bipolar_1_7",
          "left": "기초 기술과 검증된 단계를 차근차근 사용",
          "right": "자유로운 시도와 탐색을 넓게 허용",
          "module": "E3"
        },
        {
          "id": "E3-03",
          "type": "bipolar_1_7",
          "left": "완성된 결과물이 분명하게 남음",
          "right": "시도와 탐색 과정이 충분히 보장됨",
          "module": "E3"
        },
        {
          "id": "E3-04",
          "type": "bipolar_1_7",
          "left": "리더가 순서와 방향을 정함",
          "right": "구성원이 선택하고 리더가 지원함",
          "module": "E3"
        },
        {
          "id": "E3-05",
          "type": "bipolar_1_7",
          "left": "공통 목표와 동일한 방식으로 전체 운영",
          "right": "구성원별 속도와 방식에 맞춰 다르게 운영",
          "module": "E3"
        },
        {
          "id": "E3-06",
          "type": "bipolar_1_7",
          "left": "모두에게 같은 기준을 일관되게 적용",
          "right": "개인과 상황의 이유에 따라 적용을 조정",
          "module": "E3"
        },
        {
          "id": "E3-07",
          "type": "bipolar_1_7",
          "left": "어려움이 보이면 빠르게 개입해 방향 제시",
          "right": "스스로 시도할 시간을 두고 관찰 후 개입",
          "module": "E3"
        },
        {
          "id": "E3-08",
          "type": "bipolar_1_7",
          "left": "사전에 세운 계획을 안정적으로 유지",
          "right": "현장 반응에 따라 계획을 유연하게 변경",
          "module": "E3"
        },
        {
          "id": "E3-09",
          "type": "bipolar_1_7",
          "left": "각자 맡은 일을 독립적으로 수행",
          "right": "진행 중 자주 의견을 나누고 함께 조정",
          "module": "E3"
        },
        {
          "id": "E3-10",
          "type": "bipolar_1_7",
          "left": "익숙한 도구와 일정한 방식을 반복",
          "right": "새로운 도구와 방식을 자주 실험",
          "module": "E3"
        },
        {
          "id": "E3-11",
          "type": "bipolar_1_7",
          "left": "원인과 해결안을 먼저 정리",
          "right": "관계자의 감정과 입장을 먼저 확인",
          "module": "E3"
        },
        {
          "id": "E3-12",
          "type": "bipolar_1_7",
          "left": "꼭 필요할 때 핵심만 공유",
          "right": "진행 상황을 정기적으로 공유하고 자주 조율",
          "module": "E3"
        }
      ]
    },
    {
      "code": "P3",
      "label": "관계·협업 행동",
      "display_title": "사람과 함께 일할 때 나는",
      "group": 6,
      "scored": true,
      "branching": false,
      "response_scale": "likert_1_5",
      "items": [
        {
          "id": "P3-01",
          "type": "likert_1_5",
          "text": "상대가 말수가 줄거나 작업을 멈추면 재촉하기 전에 어려움을 확인했다",
          "module": "P3"
        },
        {
          "id": "P3-02",
          "type": "likert_1_5",
          "text": "누군가 걱정을 말하면 해결책보다 무엇이 가장 걱정되는지 먼저 확인했다",
          "module": "P3"
        },
        {
          "id": "P3-03",
          "type": "likert_1_5",
          "text": "예상하지 못한 해석이나 결과가 나오면 수정하기 전에 상대의 의도를 물었다",
          "module": "P3"
        },
        {
          "id": "P3-04",
          "type": "likert_1_5",
          "text": "참여가 늦거나 반대할 때 의지 부족으로 단정하지 않고 다른 이유를 살폈다",
          "module": "P3"
        },
        {
          "id": "P3-05",
          "type": "likert_1_5",
          "text": "기준이나 제한을 알릴 때 그 이유와 가능한 대안을 함께 말했다",
          "module": "P3"
        },
        {
          "id": "P3-06",
          "type": "likert_1_5",
          "text": "필요한 경계를 말할 때 상대를 공격하지 않고 요청을 분명히 표현했다",
          "module": "P3"
        },
        {
          "id": "P3-07",
          "type": "likert_1_5",
          "text": "사람을 평가하기보다 직접 본 행동과 당시 상황을 설명했다",
          "module": "P3"
        },
        {
          "id": "P3-08",
          "type": "likert_1_5",
          "text": "의견이 다를 때 상대의 말을 끝까지 듣고 내가 이해한 내용을 확인했다",
          "module": "P3"
        },
        {
          "id": "P3-09",
          "type": "likert_1_5",
          "text": "말뿐 아니라 표정·반응 속도·행동의 변화도 살폈다",
          "module": "P3"
        },
        {
          "id": "P3-10",
          "type": "likert_1_5",
          "text": "이전에 합의한 내용이나 상대가 중요하게 말한 조건을 기억하거나 기록했다",
          "module": "P3"
        },
        {
          "id": "P3-11",
          "type": "likert_1_5",
          "text": "일이 막히면 익숙한 방법 외의 다른 대안을 떠올렸다",
          "module": "P3"
        },
        {
          "id": "P3-12",
          "type": "likert_1_5",
          "text": "정답이 하나가 아닌 문제에서 서로 다른 관점과 결과를 살펴봤다",
          "module": "P3"
        },
        {
          "id": "P3-13",
          "type": "likert_1_5",
          "text": "감정이 올라오면 바로 말하거나 결정하기 전에 잠깐 멈췄다",
          "module": "P3"
        },
        {
          "id": "P3-14",
          "type": "likert_1_5",
          "text": "제안이나 도움을 거절당해도 개인적인 무시로 단정하지 않았다",
          "module": "P3"
        },
        {
          "id": "P3-15",
          "type": "likert_1_5",
          "text": "이전에 들은 상대의 관심사나 중요한 조건을 다음 만남에 연결했다",
          "module": "P3"
        },
        {
          "id": "P3-16",
          "type": "likert_1_5",
          "text": "결과뿐 아니라 상대의 구체적인 기여와 변화를 찾아 말해주었다",
          "module": "P3"
        }
      ]
    },
    {
      "code": "X3",
      "label": "불확실성·경력선택·일의 의미",
      "display_title": "불확실할 때, 진로를 고를 때, 일의 의미",
      "group": 7,
      "scored": true,
      "branching": false,
      "response_scale": "mixed",
      "items": [
        {
          "id": "X3-U01",
          "type": "likert_1_5",
          "text": "필요한 정보가 모두 정해지지 않았더라도 안전하게 시험할 수 있는 작은 범위를 찾아 먼저 시작한다",
          "module": "X3"
        },
        {
          "id": "X3-U02",
          "type": "likert_1_5",
          "text": "계획이 갑자기 바뀌면 확인된 사실, 아직 모르는 것, 지금 할 수 있는 일을 나누어 정리한다",
          "module": "X3"
        },
        {
          "id": "X3-U03",
          "type": "likert_1_5",
          "text": "담당자의 답이나 결정이 늦어지면 다시 확인을 요청하기보다 혼자 상황을 예상하며 기다리는 편이다",
          "module": "X3"
        },
        {
          "id": "X3-U04",
          "type": "likert_1_5",
          "text": "새로운 직장이나 프로젝트에서 편안하게 일하려면 업무범위와 결정권한이 구체적으로 설명되어야 한다",
          "module": "X3"
        },
        {
          "id": "X3-D01",
          "type": "likert_1_5",
          "text": "직장을 선택할 때 보상, 일정, 작업방식, 자율성, 성장기회 중 나의 우선순위를 설명할 수 있다",
          "module": "X3"
        },
        {
          "id": "X3-D02",
          "type": "likert_1_5",
          "text": "일이 맞지 않을 때 내가 바꿀 것, 상대에게 요청할 것, 받아들이기 어려운 조건을 구분한다",
          "module": "X3"
        },
        {
          "id": "X3-D03",
          "type": "likert_1_5",
          "text": "좋은 기회를 놓칠까 걱정되더라도 감당하기 어려운 역할이나 조건은 말할 수 있다",
          "module": "X3"
        },
        {
          "id": "X3-D04",
          "type": "likert_1_5",
          "text": "처음 내린 선택이 실제 경험과 다르면 새로운 정보를 바탕으로 계획을 수정할 수 있다",
          "module": "X3"
        },
        {
          "id": "X3-M01",
          "type": "likert_1_5",
          "text": "새로운 이미지·이야기·물건·경험을 구상하고 실제 형태로 만드는 과정에 깊이 몰입한다",
          "module": "X3"
        },
        {
          "id": "X3-M02",
          "type": "likert_1_5",
          "text": "내가 만든 작업이 다른 사람의 이해·경험·성장에 도움이 될 때 의미를 크게 느낀다",
          "module": "X3"
        },
        {
          "id": "X3-M03",
          "type": "likert_1_5",
          "text": "새로운 기술을 익히고 작업의 완성도와 전문성이 향상될 때 만족감을 느낀다",
          "module": "X3"
        },
        {
          "id": "X3-M04",
          "type": "likert_1_5",
          "text": "조직이나 프로젝트의 방향이 내가 중요하게 생각하는 가치와 맞을 때 더 오래 일하고 싶어진다",
          "module": "X3"
        },
        {
          "id": "X3-M06",
          "type": "likert_1_5",
          "text": "작업에 깊이 몰입하면 정해둔 시간이나 다음 일정을 놓칠 때가 있다",
          "module": "X3"
        },
        {
          "id": "X3-U05",
          "type": "choice",
          "select": "multi",
          "max": 3,
          "text": "새로운 직장·프로젝트를 시작하기 전에 특히 확인하고 싶은 정보",
          "options": [
            "담당 업무의 범위",
            "내가 결정할 수 있는 범위",
            "작업 요청과 품질 기준",
            "마감과 일정 변경 방식",
            "수정 요청과 피드백 방식",
            "보고·파일·기록 방식",
            "문제 발생 시 도움을 요청할 담당자",
            "안전·저작권·비밀유지 기준",
            "급여·준비시간·추가작업·취소 기준",
            "특별히 없음"
          ],
          "module": "X3"
        },
        {
          "id": "X3-D05",
          "type": "choice",
          "select": "ranked",
          "max": 3,
          "text": "일할 곳을 선택할 때 가장 중요한 조건",
          "options": [
            "급여와 보상",
            "일정의 안정성",
            "이동거리·근무장소",
            "고용의 안정성",
            "창작·업무의 자율성",
            "준비·제작·정리시간 보장",
            "동료와 관리자의 지원",
            "조직·프로젝트의 가치와 방향",
            "기술과 전문성 성장기회",
            "저작권·크레디트·포트폴리오 사용 조건",
            "행정·보고·고객응대의 양",
            "프로젝트 규모와 협업 방식"
          ],
          "module": "X3"
        },
        {
          "id": "X3-M05",
          "type": "choice",
          "select": "multi",
          "max": 2,
          "text": "일을 하면서 가장 큰 의미를 느끼는 원천",
          "options": [
            "새로운 것을 창작하고 표현하는 것",
            "이야기와 감정을 전달하는 것",
            "사람의 경험·이해·성장을 돕는 것",
            "기술과 제작 전문성을 발전시키는 것",
            "사람들과 좋은 관계와 팀을 만드는 것",
            "내가 만든 작업을 확장하고 알리는 것",
            "안정적인 수입과 지속 가능한 생활을 만드는 것",
            "조직이나 사회의 가치 있는 목표에 기여하는 것",
            "아직 잘 모르겠음"
          ],
          "module": "X3"
        }
      ]
    },
    {
      "code": "J3",
      "label": "창작직무 좌표",
      "display_title": "어떤 형태의 일이 맞는가",
      "group": 8,
      "scored": true,
      "branching": false,
      "response_scale": "bipolar_1_7",
      "items": [
        {
          "id": "J3-01",
          "type": "bipolar_1_7",
          "left": "화면과 디지털 도구를 중심으로 작업",
          "right": "재료·도구·몸·공간을 직접 다루며 작업",
          "module": "J3"
        },
        {
          "id": "J3-02",
          "type": "bipolar_1_7",
          "left": "최초의 콘셉트와 방향을 새로 구상",
          "right": "주어진 방향을 반복 수정하며 정교하게 완성",
          "module": "J3"
        },
        {
          "id": "J3-03",
          "type": "bipolar_1_7",
          "left": "이야기·정서·세계관을 표현",
          "right": "정보·기능·사용 문제를 해결",
          "module": "J3"
        },
        {
          "id": "J3-04",
          "type": "bipolar_1_7",
          "left": "한 작업을 처음부터 끝까지 맡음",
          "right": "작업 단계를 여러 사람이 나누어 맡음",
          "module": "J3"
        },
        {
          "id": "J3-05",
          "type": "bipolar_1_7",
          "left": "하나의 장기 프로젝트를 깊게 발전",
          "right": "짧은 결과물을 여러 개 빠르게 완성",
          "module": "J3"
        },
        {
          "id": "J3-06",
          "type": "bipolar_1_7",
          "left": "기준이 적은 상태에서 자유롭게 탐색",
          "right": "명확한 규격과 제약 안에서 해결",
          "module": "J3"
        },
        {
          "id": "J3-07",
          "type": "bipolar_1_7",
          "left": "직접 만들고 다듬는 제작 역할",
          "right": "사람·일정·자원을 조율하는 기획 역할",
          "module": "J3"
        },
        {
          "id": "J3-08",
          "type": "bipolar_1_7",
          "left": "나의 표현과 작품 방향을 우선",
          "right": "사용자·고객·시장 목적을 우선",
          "module": "J3"
        },
        {
          "id": "J3-09",
          "type": "bipolar_1_7",
          "left": "한 가지 작업에 오래 집중",
          "right": "여러 작업과 요청을 빠르게 전환",
          "module": "J3"
        },
        {
          "id": "J3-10",
          "type": "bipolar_1_7",
          "left": "책상·스튜디오·원격 중심",
          "right": "현장 이동과 물리적 설치·운영 중심",
          "module": "J3"
        },
        {
          "id": "J3-11",
          "type": "bipolar_1_7",
          "left": "소속기관에서 정기적으로 고정 보상을 받음",
          "right": "계약·판매·프로젝트에 따라 보상이 달라짐",
          "module": "J3"
        },
        {
          "id": "J3-12",
          "type": "bipolar_1_7",
          "left": "한 기술과 역할을 깊게 전문화",
          "right": "여러 역할을 두루 맡음",
          "module": "J3"
        }
      ]
    },
    {
      "code": "D3",
      "label": "선택 분야 맥락",
      "display_title": "고른 분야에서 실제로 어느 쪽인가",
      "group": 9,
      "scored": true,
      "branching": true,
      "response_scale": "bipolar_1_7",
      "items": [
        {
          "id": "D3-EDU01",
          "type": "bipolar_1_7",
          "left": "정해진 커리큘럼을 안정적으로 운영",
          "right": "대상에 맞춰 수업을 새로 설계",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "EDU"
        },
        {
          "id": "D3-EDU02",
          "type": "bipolar_1_7",
          "left": "완성 결과가 분명한 수업",
          "right": "탐색 과정이 충분한 수업",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "EDU"
        },
        {
          "id": "D3-EDU03",
          "type": "bipolar_1_7",
          "left": "강사가 순서와 방향을 주도",
          "right": "학습자가 선택하고 강사가 지원",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "EDU"
        },
        {
          "id": "D3-EDU04",
          "type": "bipolar_1_7",
          "left": "모두에게 같은 규칙을 적용",
          "right": "개인의 상황에 따라 규칙 적용을 조정",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "EDU"
        },
        {
          "id": "D3-EDU05",
          "type": "bipolar_1_7",
          "left": "어려움이 보이면 빠르게 개입",
          "right": "스스로 시도할 시간을 두고 관찰",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "EDU"
        },
        {
          "id": "D3-EDU06",
          "type": "bipolar_1_7",
          "left": "수업을 독립적으로 준비·진행",
          "right": "동료와 자주 협의하며 진행",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "EDU"
        },
        {
          "id": "D3-EDU07",
          "type": "bipolar_1_7",
          "left": "차분하고 절제된 태도로 관계 형성",
          "right": "활기 있고 풍부한 표현으로 관계 형성",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "EDU"
        },
        {
          "id": "D3-EDU08",
          "type": "bipolar_1_7",
          "left": "수업내용과 활동 진행을 우선",
          "right": "상태와 관계 확인을 먼저 확보",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "EDU"
        },
        {
          "id": "D3-EDU09",
          "type": "bipolar_1_7",
          "left": "반응이 좋았던 수업을 안정적으로 반복",
          "right": "새로운 재료와 방식을 자주 시험",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "EDU"
        },
        {
          "id": "D3-EDU10",
          "type": "bipolar_1_7",
          "left": "보호자와 강사가 직접 소통",
          "right": "기관 담당자가 소통을 중간에서 지원",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "EDU"
        },
        {
          "id": "D3-GAME01",
          "type": "bipolar_1_7",
          "left": "초기 콘셉트와 세계관을 구상",
          "right": "정해진 방향의 에셋과 장면을 정교하게 제작",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "GAME"
        },
        {
          "id": "D3-GAME02",
          "type": "bipolar_1_7",
          "left": "하나의 결과물을 개인이 주도",
          "right": "여러 직군이 작업을 이어받아 제작",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "GAME"
        },
        {
          "id": "D3-GAME03",
          "type": "bipolar_1_7",
          "left": "개인적 스타일을 폭넓게 반영",
          "right": "프로젝트 스타일 가이드를 일관되게 유지",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "GAME"
        },
        {
          "id": "D3-GAME04",
          "type": "bipolar_1_7",
          "left": "소수 결과물을 오래 다듬음",
          "right": "많은 결과물을 일정 품질로 반복 제작",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "GAME"
        },
        {
          "id": "D3-GAME05",
          "type": "bipolar_1_7",
          "left": "확정된 요구사항을 중심으로 작업",
          "right": "테스트 결과에 따라 반복적으로 수정",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "GAME"
        },
        {
          "id": "D3-GAME06",
          "type": "bipolar_1_7",
          "left": "시각적 완성도를 우선",
          "right": "엔진·성능·파일규격 등 기술 제약을 우선",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "GAME"
        },
        {
          "id": "D3-GAME07",
          "type": "bipolar_1_7",
          "left": "짧은 프로젝트를 빠르게 마무리",
          "right": "하나의 프로젝트를 장기간 발전",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "GAME"
        },
        {
          "id": "D3-GAME08",
          "type": "bipolar_1_7",
          "left": "긴 개인 집중시간을 보장",
          "right": "짧고 잦은 회의·리뷰로 계속 동기화",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "GAME"
        },
        {
          "id": "D3-GAME09",
          "type": "bipolar_1_7",
          "left": "예측 가능한 일정과 작업량",
          "right": "출시·마감 전 업무 강도가 크게 변함",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "GAME"
        },
        {
          "id": "D3-GAME10",
          "type": "bipolar_1_7",
          "left": "하나의 제작기술을 깊게 담당",
          "right": "기획·아트·기술 사이를 넘나들며 해결",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "GAME"
        },
        {
          "id": "D3-FILM01",
          "type": "bipolar_1_7",
          "left": "사전계획과 준비를 충분히 확정",
          "right": "촬영·공연 현장에서 즉시 방법을 바꿈",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "FILM"
        },
        {
          "id": "D3-FILM02",
          "type": "bipolar_1_7",
          "left": "맡은 제작 파트를 깊게 담당",
          "right": "여러 부서와 계속 연결하며 조율",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "FILM"
        },
        {
          "id": "D3-FILM03",
          "type": "bipolar_1_7",
          "left": "감독·연출의 방향을 정확히 구현",
          "right": "대안을 적극적으로 제안하며 방향을 조정",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "FILM"
        },
        {
          "id": "D3-FILM04",
          "type": "bipolar_1_7",
          "left": "미적 완성도를 최대한 확보",
          "right": "시간·예산 안에서 가능한 결과를 우선",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "FILM"
        },
        {
          "id": "D3-FILM05",
          "type": "bipolar_1_7",
          "left": "책상에서 조사·도면·기획 중심",
          "right": "세트·공간·현장에서 몸을 움직이며 제작",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "FILM"
        },
        {
          "id": "D3-FILM06",
          "type": "bipolar_1_7",
          "left": "일정한 출퇴근과 예측 가능한 시간",
          "right": "촬영·공연에 따른 이른 시간·야간·변동 일정",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "FILM"
        },
        {
          "id": "D3-FILM07",
          "type": "bipolar_1_7",
          "left": "새 재료와 구조를 매번 제작",
          "right": "기존 물품을 찾아 수리·변형해 활용",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "FILM"
        },
        {
          "id": "D3-FILM08",
          "type": "bipolar_1_7",
          "left": "조용한 환경에서 개인 작업에 집중",
          "right": "많은 사람이 동시에 움직이는 현장에서 대응",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "FILM"
        },
        {
          "id": "D3-FILM09",
          "type": "bipolar_1_7",
          "left": "명확한 지휘체계에 따라 결정",
          "right": "직급과 관계없이 현장 의견을 빠르게 교환",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "FILM"
        },
        {
          "id": "D3-FILM10",
          "type": "bipolar_1_7",
          "left": "짧고 강도 높은 프로젝트를 반복",
          "right": "한 조직에서 비교적 안정적으로 연속 제작",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "FILM"
        },
        {
          "id": "D3-MAKE01",
          "type": "bipolar_1_7",
          "left": "이미지와 형태의 콘셉트를 먼저 발전",
          "right": "소재·구조·제작 가능성을 먼저 확인",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "MAKE"
        },
        {
          "id": "D3-MAKE02",
          "type": "bipolar_1_7",
          "left": "하나뿐인 작품을 개별 제작",
          "right": "같은 품질로 반복 생산 가능한 제품을 제작",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "MAKE"
        },
        {
          "id": "D3-MAKE03",
          "type": "bipolar_1_7",
          "left": "개인적 표현과 작품성을 우선",
          "right": "고객·브랜드·시장 반응을 우선",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "MAKE"
        },
        {
          "id": "D3-MAKE04",
          "type": "bipolar_1_7",
          "left": "손도구와 재료를 직접 다룸",
          "right": "디지털 설계와 제작장비를 중심으로 작업",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "MAKE"
        },
        {
          "id": "D3-MAKE05",
          "type": "bipolar_1_7",
          "left": "같은 과정을 정교하게 반복",
          "right": "여러 재료와 과제를 자주 바꿈",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "MAKE"
        },
        {
          "id": "D3-MAKE06",
          "type": "bipolar_1_7",
          "left": "익숙한 소재와 공정을 안정적으로 사용",
          "right": "새로운 소재와 공정을 계속 시험",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "MAKE"
        },
        {
          "id": "D3-MAKE07",
          "type": "bipolar_1_7",
          "left": "개별 주문과 맞춤 요구에 대응",
          "right": "정해진 제품군과 운영기준을 유지",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "MAKE"
        },
        {
          "id": "D3-MAKE08",
          "type": "bipolar_1_7",
          "left": "창작과 제작에 대부분의 시간을 사용",
          "right": "원가·재고·포장·판매까지 직접 관리",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "MAKE"
        },
        {
          "id": "D3-MAKE09",
          "type": "bipolar_1_7",
          "left": "혼자 완결하는 공방 작업",
          "right": "외주업체·생산자·판매자와 분업",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "MAKE"
        },
        {
          "id": "D3-MAKE10",
          "type": "bipolar_1_7",
          "left": "제작에 집중하고 고객 접촉을 줄임",
          "right": "판매·체험·워크숍으로 고객을 직접 만남",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "MAKE"
        },
        {
          "id": "D3-INDEP01",
          "type": "bipolar_1_7",
          "left": "스스로 정한 주제를 장기간 발전",
          "right": "의뢰인이 정한 요청에 맞춰 제작",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "INDEP"
        },
        {
          "id": "D3-INDEP02",
          "type": "bipolar_1_7",
          "left": "혼자 깊게 몰입하며 작업",
          "right": "다른 창작자·기획자와 함께 발전",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "INDEP"
        },
        {
          "id": "D3-INDEP03",
          "type": "bipolar_1_7",
          "left": "정기적이고 예측 가능한 수입을 우선",
          "right": "판매·수주에 따라 달라지는 수입을 수용",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "INDEP"
        },
        {
          "id": "D3-INDEP04",
          "type": "bipolar_1_7",
          "left": "작품 제작에 대부분의 시간을 사용",
          "right": "홍보·네트워킹·판매에도 시간을 적극 사용",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "INDEP"
        },
        {
          "id": "D3-INDEP05",
          "type": "bipolar_1_7",
          "left": "하나의 작품군을 깊게 발전",
          "right": "여러 의뢰와 프로젝트를 동시에 전환",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "INDEP"
        },
        {
          "id": "D3-INDEP06",
          "type": "bipolar_1_7",
          "left": "스스로 정한 완성도와 속도를 우선",
          "right": "고객의 마감과 예산 안에서 결과를 조정",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "INDEP"
        },
        {
          "id": "D3-INDEP07",
          "type": "bipolar_1_7",
          "left": "공개 전 충분히 작업을 발전",
          "right": "전시·공모·온라인에 자주 공개하며 반응을 확인",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "INDEP"
        },
        {
          "id": "D3-INDEP08",
          "type": "bipolar_1_7",
          "left": "계약·정산·저작권을 직접 관리",
          "right": "행정과 판매를 플랫폼·대리인에게 맡김",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "INDEP"
        },
        {
          "id": "D3-INDEP09",
          "type": "bipolar_1_7",
          "left": "일정한 작업 루틴을 유지",
          "right": "프로젝트에 따라 시간과 장소를 유연하게 변경",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "INDEP"
        },
        {
          "id": "D3-INDEP10",
          "type": "bipolar_1_7",
          "left": "고객·구매자와 직접 관계를 형성",
          "right": "갤러리·플랫폼·기획자를 통해 작품을 전달",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "INDEP"
        },
        {
          "id": "D3-CULTURE01",
          "type": "bipolar_1_7",
          "left": "작품과 자료를 조사하고 글로 정리",
          "right": "관람객과 현장에서 직접 소통",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "CULTURE"
        },
        {
          "id": "D3-CULTURE02",
          "type": "bipolar_1_7",
          "left": "전시 기획과 작품구성을 중심으로 일함",
          "right": "교육·행사·공공 프로그램을 중심으로 일함",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "CULTURE"
        },
        {
          "id": "D3-CULTURE03",
          "type": "bipolar_1_7",
          "left": "작가와 작품의 의도를 충실히 전달",
          "right": "관람객이 이해하기 쉽게 해석을 조정",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "CULTURE"
        },
        {
          "id": "D3-CULTURE04",
          "type": "bipolar_1_7",
          "left": "기획의 완성도와 전문성을 우선",
          "right": "예산·행정·공공 절차 안에서 실행을 우선",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "CULTURE"
        },
        {
          "id": "D3-CULTURE05",
          "type": "bipolar_1_7",
          "left": "아카이브·목록·원고를 세밀하게 관리",
          "right": "설치·행사·현장을 직접 운영",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "CULTURE"
        },
        {
          "id": "D3-CULTURE06",
          "type": "bipolar_1_7",
          "left": "개인 조사와 기획에 긴 시간을 사용",
          "right": "작가·기관·업체·관람객과 계속 조율",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "CULTURE"
        },
        {
          "id": "D3-CULTURE07",
          "type": "bipolar_1_7",
          "left": "장기간 전시를 계획하고 준비",
          "right": "짧은 행사와 프로그램을 빠르게 반복",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "CULTURE"
        },
        {
          "id": "D3-CULTURE08",
          "type": "bipolar_1_7",
          "left": "정해진 보존·행정 절차를 안정적으로 적용",
          "right": "현장 상황에 맞게 절차와 운영을 조정",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "CULTURE"
        },
        {
          "id": "D3-CULTURE09",
          "type": "bipolar_1_7",
          "left": "공공성과 문화적 가치를 우선",
          "right": "판매·후원·관객확대 성과를 우선",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "CULTURE"
        },
        {
          "id": "D3-CULTURE10",
          "type": "bipolar_1_7",
          "left": "글·자료·온라인 콘텐츠로 전달",
          "right": "도슨트·워크숍·발표로 직접 전달",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "CULTURE"
        },
        {
          "id": "D3-DESIGN01",
          "type": "bipolar_1_7",
          "left": "초기 콘셉트와 방향을 구상",
          "right": "정해진 방향을 실제 결과물로 정교하게 제작",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "DESIGN"
        },
        {
          "id": "D3-DESIGN02",
          "type": "bipolar_1_7",
          "left": "브랜드 기준을 일관되게 유지",
          "right": "프로젝트마다 새로운 스타일을 실험",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "DESIGN"
        },
        {
          "id": "D3-DESIGN03",
          "type": "bipolar_1_7",
          "left": "사용자와 고객의 문제를 해결",
          "right": "시각적 개성과 표현 가능성을 확장",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "DESIGN"
        },
        {
          "id": "D3-DESIGN04",
          "type": "bipolar_1_7",
          "left": "적은 프로젝트를 오래 발전",
          "right": "여러 결과물을 짧은 주기로 제작",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "DESIGN"
        },
        {
          "id": "D3-DESIGN05",
          "type": "bipolar_1_7",
          "left": "담당자가 비교적 독립적으로 결정",
          "right": "고객·기획자와 잦은 리뷰를 거쳐 결정",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "DESIGN"
        },
        {
          "id": "D3-DESIGN06",
          "type": "bipolar_1_7",
          "left": "하나의 매체와 전문영역을 깊게 담당",
          "right": "인쇄·영상·SNS·공간 등 여러 매체를 오가며 작업",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "DESIGN"
        },
        {
          "id": "D3-DESIGN07",
          "type": "bipolar_1_7",
          "left": "조사·데이터·사용자 반응을 근거로 판단",
          "right": "미적 직관과 경험을 중심으로 판단",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "DESIGN"
        },
        {
          "id": "D3-DESIGN08",
          "type": "bipolar_1_7",
          "left": "확정된 작업 요청을 바탕으로 진행",
          "right": "요구와 범위가 바뀌는 과정에서 계속 조정",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "DESIGN"
        },
        {
          "id": "D3-DESIGN09",
          "type": "bipolar_1_7",
          "left": "시간보다 완성도와 디테일을 우선",
          "right": "제한된 시간·예산 안에서 속도를 우선",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "DESIGN"
        },
        {
          "id": "D3-DESIGN10",
          "type": "bipolar_1_7",
          "left": "내부 팀에서 제작에 집중",
          "right": "외부 고객에게 직접 발표하고 설득",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "DESIGN"
        },
        {
          "id": "D3-GENERAL01",
          "type": "bipolar_1_7",
          "left": "주어진 작업 요청과 역할에서 시작",
          "right": "스스로 주제와 목표를 정해 시작",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "GENERAL"
        },
        {
          "id": "D3-GENERAL02",
          "type": "bipolar_1_7",
          "left": "혼자 완결하는 작업",
          "right": "여러 사람과 분업하는 작업",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "GENERAL"
        },
        {
          "id": "D3-GENERAL03",
          "type": "bipolar_1_7",
          "left": "완성된 결과와 품질을 우선",
          "right": "실험과 탐색 과정을 우선",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "GENERAL"
        },
        {
          "id": "D3-GENERAL04",
          "type": "bipolar_1_7",
          "left": "일정과 업무량이 안정적인 환경",
          "right": "프로젝트마다 일정과 업무량이 달라지는 환경",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "GENERAL"
        },
        {
          "id": "D3-GENERAL05",
          "type": "bipolar_1_7",
          "left": "고객·관람객과의 접촉이 적은 역할",
          "right": "사람에게 설명하고 반응을 받는 역할",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "GENERAL"
        },
        {
          "id": "D3-GENERAL06",
          "type": "bipolar_1_7",
          "left": "개인적 표현을 중심으로 작업",
          "right": "다른 사람의 필요와 목적을 해결",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "GENERAL"
        },
        {
          "id": "D3-GENERAL07",
          "type": "bipolar_1_7",
          "left": "새로운 결과물을 매번 제작",
          "right": "같은 품질로 반복 제작하고 개선",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "GENERAL"
        },
        {
          "id": "D3-GENERAL08",
          "type": "bipolar_1_7",
          "left": "한 기술을 깊게 사용하는 역할",
          "right": "사람·일정·자원을 조율하는 역할",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "GENERAL"
        },
        {
          "id": "D3-GENERAL09",
          "type": "bipolar_1_7",
          "left": "디지털·원격 중심의 작업",
          "right": "재료·공간·현장 중심의 작업",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "GENERAL"
        },
        {
          "id": "D3-GENERAL10",
          "type": "bipolar_1_7",
          "left": "소속과 고정 보상이 있는 일",
          "right": "계약·프로젝트 단위로 자율성이 큰 일",
          "evidence": [
            "A",
            "B",
            "C"
          ],
          "module": "D3",
          "branch": "GENERAL"
        }
      ]
    },
    {
      "code": "S3",
      "label": "분야별 상황판단",
      "display_title": "이런 상황이라면 먼저 무엇을",
      "group": 9,
      "scored": true,
      "branching": true,
      "response_scale": "sjt",
      "items": [
        {
          "id": "S3-EDU01",
          "type": "sjt",
          "title": "한 아이의 활동 중단과 전체 수업",
          "scenario": "8명이 함께하는 수업에서 한 아이가 작품을 구기며 “난 미술을 못해요”라고 말하고 멈췄습니다. 수업은 15분 남았고 다른 아이들도 다음 안내를 기다리고 있습니다.",
          "options": [
            {
              "key": "A",
              "text": "다른 아이들에게 2~3분 동안 할 단계를 먼저 안내한 뒤, 그 아이에게 속상한 점과 원하는 도움을 짧게 묻는다"
            },
            {
              "key": "B",
              "text": "그 아이에게 잠시 쉴 자리와 다시 참여할 시점을 알려주고, 전체 수업의 다음 단계를 먼저 진행한다"
            },
            {
              "key": "C",
              "text": "긴 대화 대신 난도를 낮춘 두 가지 방법을 보여주고, 아이가 하나를 고르게 한다"
            },
            {
              "key": "D",
              "text": "남은 활동을 ‘작품을 바꾸어 보는 시간’으로 전체 조정해, 그 아이도 따로 드러나지 않고 다시 참여하게 한다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "EDU"
        },
        {
          "id": "S3-EDU02",
          "type": "sjt",
          "title": "기관 기준과 아이의 표현",
          "scenario": "기관은 같은 주제와 형식의 작품을 전시하려고 합니다. 한 아이는 전혀 다른 이야기와 재료로 표현하고 싶어 하지만, 수업 안에서 기관의 결과 기준도 지켜야 합니다.",
          "options": [
            {
              "key": "A",
              "text": "전시에 필요한 공통 요소는 유지하고, 재료나 이야기에서 아이가 선택할 범위를 만든다"
            },
            {
              "key": "B",
              "text": "이번에는 아이의 방식으로 진행하게 하고, 선택 이유와 관찰 내용을 기록해 수업 후 기관과 조율한다"
            },
            {
              "key": "C",
              "text": "기관 기준을 아이에게 설명한 뒤, 그 기준 안에서 가능한 대안 두세 가지를 제시해 고르게 한다"
            },
            {
              "key": "D",
              "text": "아이에게 임시 활동을 제시하고, 기준을 바꿀 수 있는지 담당자에게 먼저 확인한 뒤 본 활동을 정한다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "EDU"
        },
        {
          "id": "S3-EDU03",
          "type": "sjt",
          "title": "보호자의 결과 기대와 아이의 탐색",
          "scenario": "보호자는 “집에 가져올 만큼 완성된 작품”을 원하지만, 아이는 완성보다 여러 재료를 만지고 바꾸는 과정에 오래 머뭅니다.",
          "options": [
            {
              "key": "A",
              "text": "다음 수업 중 한 회는 완성 결과가 남도록 구성하고, 나머지 시간에는 탐색 방식을 유지하겠다고 안내한다"
            },
            {
              "key": "B",
              "text": "탐색 과정에서 관찰된 배움을 구체적으로 설명하고, 같은 방식으로 한두 회 더 지켜보자고 제안한다"
            },
            {
              "key": "C",
              "text": "보호자가 기대하는 최소 결과와 아이가 선택할 탐색 범위를 함께 정해 다음 수업에 반영한다"
            },
            {
              "key": "D",
              "text": "기관의 교육 방향과 상담 범위를 먼저 확인한 뒤, 바로 약속하지 않고 정리된 답변을 다시 드리겠다고 안내한다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "EDU"
        },
        {
          "id": "S3-EDU04",
          "type": "sjt",
          "title": "비웃는 행동이 멈춘 다음",
          "scenario": "한 아이가 친구의 작품을 반복해서 비웃었습니다. 행동은 이미 멈췄고 두 아이는 떨어져 있으며 안전 문제는 없습니다. 다른 아이들은 2분 동안 할 활동을 진행 중입니다.",
          "options": [
            {
              "key": "A",
              "text": "불편을 표현한 아이의 상태를 먼저 확인하고, 비웃은 아이와는 수업 후 따로 이야기한다"
            },
            {
              "key": "B",
              "text": "전체를 잠깐 멈추고 서로의 작품에 말하는 기준을 모두에게 다시 안내한 뒤, 두 아이와 각각 이야기한다"
            },
            {
              "key": "C",
              "text": "비웃은 아이에게 그 말이 상대에게 어떻게 닿았는지 지금 짧게 확인하고, 사과 여부는 스스로 정하게 한다"
            },
            {
              "key": "D",
              "text": "두 아이 모두 활동에 돌아가게 하고, 관찰한 내용을 기록해 기관 담당자와 공유한다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "EDU"
        },
        {
          "id": "S3-CULTURE01",
          "type": "sjt",
          "title": "해설 중 제기된 다른 주장",
          "scenario": "전시 해설 중 한 관람객이 작품 배경에 대해 사실과 다른 내용을 확신 있게 말합니다. 주변 관람객 여러 명이 듣고 있고, 회차는 계속 진행해야 합니다.",
          "options": [
            {
              "key": "A",
              "text": "확인된 자료를 근거로 그 자리에서 정정하고 해설을 이어간다"
            },
            {
              "key": "B",
              "text": "두 가지 견해가 있다고 설명하고, 확인 후 정확한 내용을 회차 끝에 알려주겠다고 말한다"
            },
            {
              "key": "C",
              "text": "해설을 먼저 이어가고, 회차가 끝난 뒤 그 관람객에게 개별적으로 설명한다"
            },
            {
              "key": "D",
              "text": "관람객의 관심을 인정하고, 그 주제를 작품 감상 질문으로 바꿔 전체에게 던진다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "CULTURE"
        },
        {
          "id": "S3-CULTURE02",
          "type": "sjt",
          "title": "남은 시간과 계속되는 질문",
          "scenario": "회차 종료 10분 전인데 한 관람객이 질문을 계속 이어갑니다. 남은 전시실 두 곳을 아직 안내하지 못했고, 다른 관람객들은 이동을 기다리고 있습니다.",
          "options": [
            {
              "key": "A",
              "text": "남은 동선을 먼저 안내하고, 질문은 회차 종료 후에 이어서 받겠다고 말한다"
            },
            {
              "key": "B",
              "text": "질문 하나만 더 짧게 답하고 나머지는 자료나 연락처로 안내한 뒤 이동한다"
            },
            {
              "key": "C",
              "text": "남은 두 곳 중 한 곳을 줄이고, 지금 나온 질문을 충분히 다룬다"
            },
            {
              "key": "D",
              "text": "전체에게 남은 시간과 선택지를 알리고 어느 쪽을 원하는지 확인한다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "CULTURE"
        },
        {
          "id": "S3-CULTURE03",
          "type": "sjt",
          "title": "단체 관람 중 작품 접촉",
          "scenario": "아동 단체 관람 중 한 아이가 설치작품에 손을 뻗습니다. 인솔교사는 다른 아이들과 떨어져 있고, 작품에는 접촉 금지 표시가 있습니다.",
          "options": [
            {
              "key": "A",
              "text": "아이와 작품 사이로 이동해 접촉을 막고, 왜 만지면 안 되는지 짧게 설명한다"
            },
            {
              "key": "B",
              "text": "즉시 아이를 멈추게 하고 전체에게 관람 규칙을 다시 안내한다"
            },
            {
              "key": "C",
              "text": "접촉을 막은 뒤 인솔교사에게 상황을 알리고 이후 인솔 방식을 함께 정한다"
            },
            {
              "key": "D",
              "text": "접촉을 막고, 그 아이가 관심을 보인 지점을 다른 방식으로 볼 수 있게 안내한다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "CULTURE"
        },
        {
          "id": "S3-CULTURE04",
          "type": "sjt",
          "title": "기관 문안과 내가 확인한 내용",
          "scenario": "기관이 정한 해설 문안 일부가 내가 확인한 최신 연구와 다릅니다. 회차는 오늘 시작되고 문안 변경 권한은 나에게 없습니다.",
          "options": [
            {
              "key": "A",
              "text": "기관 문안대로 진행하고, 다른 견해가 있다는 사실만 덧붙인다"
            },
            {
              "key": "B",
              "text": "기관 문안대로 진행하고, 회차 후 담당자에게 근거를 정리해 전달한다"
            },
            {
              "key": "C",
              "text": "담당자에게 먼저 연락해 오늘 회차에서 어떻게 다룰지 확인한 뒤 진행한다"
            },
            {
              "key": "D",
              "text": "관람객에게 두 견해를 모두 소개하고 판단을 열어둔 채 해설한다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "CULTURE"
        },
        {
          "id": "S3-DESIGN01",
          "type": "sjt",
          "title": "마감 직전의 방향 변경",
          "scenario": "클라이언트가 마감 3일 전에 핵심 방향을 바꾸고 싶다고 알려왔습니다. 일정 조정 권한은 나에게 없고, 팀원 두 명이 이미 다음 단계를 진행 중입니다.",
          "options": [
            {
              "key": "A",
              "text": "변경에 필요한 추가 일정과 영향 범위를 정리해 담당자와 클라이언트에게 먼저 알린다"
            },
            {
              "key": "B",
              "text": "팀원에게 진행을 잠시 멈추게 하고, 무엇이 바뀌는지 확인한 뒤 다시 배분한다"
            },
            {
              "key": "C",
              "text": "현재 방향을 유지한 안과 변경한 안을 나란히 준비해 선택하게 한다"
            },
            {
              "key": "D",
              "text": "마감 안에 가능한 최소 변경 범위를 제안하고 나머지는 다음 차수로 미루자고 말한다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "DESIGN"
        },
        {
          "id": "S3-DESIGN02",
          "type": "sjt",
          "title": "내 기획안이 대체됐을 때",
          "scenario": "회의에서 내가 준비한 기획안 대신 다른 사람의 안이 채택됐습니다. 채택 이유는 충분히 설명되지 않았고, 나는 그 안에 있는 위험을 알고 있습니다.",
          "options": [
            {
              "key": "A",
              "text": "회의 자리에서 그 위험을 구체적으로 말하고 확인할 항목을 제안한다"
            },
            {
              "key": "B",
              "text": "채택된 안을 받아들이고, 위험 요소만 별도로 정리해 담당자에게 전달한다"
            },
            {
              "key": "C",
              "text": "채택 이유를 먼저 물어 판단 기준을 확인한 뒤 필요한 부분을 이야기한다"
            },
            {
              "key": "D",
              "text": "채택된 안대로 진행하면서 위험이 실제로 나타나는 지점을 기록해 다음 회의에서 다룬다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "DESIGN"
        },
        {
          "id": "S3-DESIGN03",
          "type": "sjt",
          "title": "권한 없는 상태의 일정 관리",
          "scenario": "함께 일하는 협력자가 마감을 반복해서 놓치고 있습니다. 나에게 관리 권한은 없지만 최종 결과물의 책임은 나에게 있습니다.",
          "options": [
            {
              "key": "A",
              "text": "협력자에게 직접 남은 일정과 필요한 것을 확인하고 조정안을 함께 만든다"
            },
            {
              "key": "B",
              "text": "지금까지의 지연 내역을 정리해 담당자에게 알리고 판단을 요청한다"
            },
            {
              "key": "C",
              "text": "내가 할 수 있는 범위에서 결과물을 먼저 확보하고, 부족한 부분은 나중에 채운다"
            },
            {
              "key": "D",
              "text": "전체 일정을 다시 나누어 지연이 반복되는 구간을 다른 방식으로 배치하자고 제안한다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "DESIGN"
        },
        {
          "id": "S3-DESIGN04",
          "type": "sjt",
          "title": "지시와 조사 결과가 다를 때",
          "scenario": "상급자가 지시한 방향이 내가 진행한 사용자 조사 결과와 반대입니다. 조사 표본은 크지 않고 결정 시한은 이번 주입니다.",
          "options": [
            {
              "key": "A",
              "text": "조사 결과와 그 한계를 함께 정리해 보여주고 판단을 요청한다"
            },
            {
              "key": "B",
              "text": "지시대로 진행하되, 조사에서 나온 우려 지점을 확인할 방법을 함께 제안한다"
            },
            {
              "key": "C",
              "text": "두 방향을 작은 범위에서 짧게 비교해볼 수 있는지 제안한다"
            },
            {
              "key": "D",
              "text": "지시대로 진행하고, 조사 결과는 다음 차수의 검토 자료로 남긴다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "DESIGN"
        },
        {
          "id": "S3-GAME01",
          "type": "sjt",
          "title": "파이프라인 뒷단에서 막힌 동료",
          "scenario": "내가 넘긴 파일 때문에 다음 공정의 동료가 계속 막히고 있습니다. 그 동료는 따로 말하지 않고 야근으로 메우고 있고, 이번 주 내 작업량도 밀려 있습니다.",
          "options": [
            {
              "key": "A",
              "text": "내 작업을 잠시 멈추고 그 동료가 막힌 지점을 함께 확인한다"
            },
            {
              "key": "B",
              "text": "파일 규격을 먼저 맞춰 다시 넘기고, 남은 문제는 리드에게 공유한다"
            },
            {
              "key": "C",
              "text": "그 동료에게 무엇이 가장 오래 걸리는지 묻고 처리 순서를 함께 정한다"
            },
            {
              "key": "D",
              "text": "반복되는 문제라고 보고, 규격 자체를 정리해 팀 채널에 올린다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "GAME"
        },
        {
          "id": "S3-GAME02",
          "type": "sjt",
          "title": "스타일 가이드와 실제 화면",
          "scenario": "스타일 가이드대로 만들면 이 장면에서 캐릭터가 배경에 묻힙니다. 가이드를 정한 아트 디렉터는 휴가 중이고 이번 주 빌드에는 들어가야 합니다.",
          "options": [
            {
              "key": "A",
              "text": "가이드대로 제출하고, 묻히는 문제를 코멘트로 함께 남긴다"
            },
            {
              "key": "B",
              "text": "가이드가 허용하는 범위 안에서 가능한 최대치로 조정해 제출한다"
            },
            {
              "key": "C",
              "text": "두 버전을 만들어 리드에게 선택하게 한다"
            },
            {
              "key": "D",
              "text": "아트 디렉터에게 연락해 판단을 받은 뒤 진행한다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "GAME"
        },
        {
          "id": "S3-GAME03",
          "type": "sjt",
          "title": "출시 2주 전의 품질 배분",
          "scenario": "출시 2주 전입니다. 맡은 에셋 12개 중 5개만 목표 품질에 도달했고 나머지는 기준선 수준입니다. 안전이나 기능 문제는 없으며 12개 모두 제출해야 합니다.",
          "options": [
            {
              "key": "A",
              "text": "화면에 가장 많이 노출되는 것부터 품질을 올리고 나머지는 기준선만 맞춘다"
            },
            {
              "key": "B",
              "text": "12개 전부를 비슷한 중간 품질로 맞춘다"
            },
            {
              "key": "C",
              "text": "현재 상태를 그대로 공유하고 어디에 남은 시간을 쓸지 리드의 결정을 받는다"
            },
            {
              "key": "D",
              "text": "완성도가 높은 5개를 먼저 넘기고 나머지는 일정 연장을 요청한다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "GAME"
        },
        {
          "id": "S3-GAME04",
          "type": "sjt",
          "title": "가능해 보이지 않는 다음 스프린트",
          "scenario": "다음 스프린트 일정이 지금 인원으로는 어려워 보입니다. 일정은 내 권한 밖이고, 팀에서 아직 아무도 문제를 제기하지 않았습니다.",
          "options": [
            {
              "key": "A",
              "text": "작업량 추정 근거를 정리해 리드에게 개별적으로 전달한다"
            },
            {
              "key": "B",
              "text": "스프린트 회의에서 공개적으로 문제를 제기한다"
            },
            {
              "key": "C",
              "text": "우선 시작하고, 실제 지연이 나타나는 시점에 기록과 함께 보고한다"
            },
            {
              "key": "D",
              "text": "같은 생각인지 팀원 몇 명에게 먼저 확인한 뒤 함께 제기한다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "GAME"
        },
        {
          "id": "S3-FILM01",
          "type": "sjt",
          "title": "현장에서 실수가 반복되는 스태프",
          "scenario": "현장에서 한 스태프가 같은 실수를 반복하고 있습니다. 촬영은 진행 중이고 다른 부서가 대기 중이며, 안전 문제는 없습니다.",
          "options": [
            {
              "key": "A",
              "text": "진행을 멈추지 않고 옆에서 바로 방법을 알려준다"
            },
            {
              "key": "B",
              "text": "다음 세팅 대기 시간에 따로 불러 무엇이 어려운지 확인한다"
            },
            {
              "key": "C",
              "text": "그 파트를 잠시 다른 사람에게 넘기고 촬영을 이어간다"
            },
            {
              "key": "D",
              "text": "해당 부서 담당자에게 알리고 조치를 맡긴다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "FILM"
        },
        {
          "id": "S3-FILM02",
          "type": "sjt",
          "title": "연출 요청과 고증",
          "scenario": "감독이 요청한 소품이 시대 고증과 맞지 않습니다. 촬영은 내일이고, 바꾸면 연결된 다른 소품도 함께 조정해야 합니다.",
          "options": [
            {
              "key": "A",
              "text": "고증 자료와 함께 문제를 알리고 판단을 요청한다"
            },
            {
              "key": "B",
              "text": "요청대로 준비하되 대안 소품도 함께 현장에 가져간다"
            },
            {
              "key": "C",
              "text": "요청대로 준비한다. 연출 의도가 고증보다 우선일 수 있다고 본다"
            },
            {
              "key": "D",
              "text": "미술감독에게 먼저 알리고 부서 차원에서 정리한다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "FILM"
        },
        {
          "id": "S3-FILM03",
          "type": "sjt",
          "title": "남은 40분과 구조물 고정",
          "scenario": "야간 촬영 마지막 세팅에 40분이 남았습니다. 구조물 고정이 계획보다 약하게 됐는데, 배우가 그 위에 올라가는 장면입니다.",
          "options": [
            {
              "key": "A",
              "text": "지금 상태로는 진행할 수 없다고 알리고 세팅을 다시 한다"
            },
            {
              "key": "B",
              "text": "보강할 수 있는 최소 조치를 하고 담당자에게 확인받는다"
            },
            {
              "key": "C",
              "text": "그 장면 없이 촬영을 진행할 수 있는지 연출에 제안한다"
            },
            {
              "key": "D",
              "text": "안전 담당자를 불러 판단을 받고 그 판단에 따른다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "FILM"
        },
        {
          "id": "S3-FILM04",
          "type": "sjt",
          "title": "계약과 실제 일정의 차이",
          "scenario": "제작부가 정한 근무 일정이 계약서에 적힌 조건을 넘어서고 있습니다. 나는 계약직이고, 팀 분위기상 문제 제기를 꺼리는 편입니다.",
          "options": [
            {
              "key": "A",
              "text": "제작부 담당자에게 개별적으로 확인하고 조정이 가능한지 묻는다"
            },
            {
              "key": "B",
              "text": "기록만 남기고 이번 회차는 그대로 진행한다"
            },
            {
              "key": "C",
              "text": "같은 조건의 동료들과 먼저 이야기한 뒤 함께 요청한다"
            },
            {
              "key": "D",
              "text": "계약서와 실제 일정의 차이를 정리해 공식적으로 문의한다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "FILM"
        },
        {
          "id": "S3-MAKE01",
          "type": "sjt",
          "title": "워크숍에서 혼자 느린 참가자",
          "scenario": "워크숍 참가자 한 명이 다른 사람들보다 훨씬 느립니다. 정해진 시간은 40분 남았고 다른 참가자들은 다음 단계를 기다리고 있습니다. 안전 문제는 없습니다.",
          "options": [
            {
              "key": "A",
              "text": "전체에게 다음 단계를 안내하고, 그 참가자 옆에서 따로 돕는다"
            },
            {
              "key": "B",
              "text": "그 참가자에게 단계를 줄인 방법을 제안하고 전체 진행 속도는 유지한다"
            },
            {
              "key": "C",
              "text": "전체 진행을 늦춰 모두가 같은 단계에 있도록 맞춘다"
            },
            {
              "key": "D",
              "text": "완성하지 못한 부분은 가져가서 마무리할 수 있게 안내한다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "MAKE"
        },
        {
          "id": "S3-MAKE02",
          "type": "sjt",
          "title": "고객이 원하는 마감과 소재의 한계",
          "scenario": "주문 고객이 요청한 마감 방식이 이 소재에서는 오래 유지되지 않습니다. 고객은 그 방식을 강하게 원합니다.",
          "options": [
            {
              "key": "A",
              "text": "왜 오래가지 않는지 설명하고 대안 두 가지를 제안한다"
            },
            {
              "key": "B",
              "text": "요청대로 만들고, 관리 방법과 예상 수명을 함께 안내한다"
            },
            {
              "key": "C",
              "text": "두 방식의 샘플을 만들어 보여준 뒤 고르게 한다"
            },
            {
              "key": "D",
              "text": "이 소재로는 어렵다고 알리고 다른 소재를 제안한다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "MAKE"
        },
        {
          "id": "S3-MAKE03",
          "type": "sjt",
          "title": "납기 3일 전의 재고 부족",
          "scenario": "납기 3일 전에 주요 소재의 재고가 부족한 것을 발견했습니다. 대체 소재는 색이 미묘하게 다르고, 기능이나 안전 문제는 없습니다.",
          "options": [
            {
              "key": "A",
              "text": "고객에게 상황과 대체안을 알리고 납기 조정 여부를 묻는다"
            },
            {
              "key": "B",
              "text": "대체 소재로 진행하고 차이를 사전에 안내한다"
            },
            {
              "key": "C",
              "text": "가능한 수량만 원래 소재로 만들고 나머지는 납기를 나눈다"
            },
            {
              "key": "D",
              "text": "원래 소재를 구할 경로를 더 찾아보고 납기 연장을 요청한다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "MAKE"
        },
        {
          "id": "S3-MAKE04",
          "type": "sjt",
          "title": "외주 생산처의 다른 공정",
          "scenario": "함께 일하는 외주 생산처가 합의한 것과 다른 공정을 쓴 것으로 보입니다. 계약 관리는 대표가 하고 나는 제작 담당입니다.",
          "options": [
            {
              "key": "A",
              "text": "확인된 차이를 정리해 대표에게 알린다"
            },
            {
              "key": "B",
              "text": "생산처에 직접 연락해 공정을 확인한다"
            },
            {
              "key": "C",
              "text": "결과물 검수 기준으로 판단하고 문제가 있을 때만 알린다"
            },
            {
              "key": "D",
              "text": "대표에게 알리면서 다음 물량의 검수 절차를 함께 제안한다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "MAKE"
        },
        {
          "id": "S3-INDEP01",
          "type": "sjt",
          "title": "오래된 의뢰인의 지급 연기 요청",
          "scenario": "오래 함께 일한 의뢰인이 개인적으로 어려운 상황이라며 대금 지급을 미뤄달라고 합니다. 이번 달 내 고정 지출이 걸려 있습니다.",
          "options": [
            {
              "key": "A",
              "text": "사정을 확인하고 분할 지급 일정을 함께 정한다"
            },
            {
              "key": "B",
              "text": "이번은 미뤄주되 다음 작업부터 선금 조건을 두자고 말한다"
            },
            {
              "key": "C",
              "text": "계약된 일정대로 요청하고, 어려우면 공식적으로 조정하자고 한다"
            },
            {
              "key": "D",
              "text": "내 상황도 함께 설명하고 서로 가능한 선을 찾는다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "INDEP"
        },
        {
          "id": "S3-INDEP02",
          "type": "sjt",
          "title": "계약에 없던 사용 요청",
          "scenario": "의뢰인이 내 작업물을 계약에 없던 용도로 쓰고 싶다고 합니다. 추가 비용 이야기는 없고, 나는 관계를 계속 이어가고 싶습니다.",
          "options": [
            {
              "key": "A",
              "text": "계약 범위를 설명하고 추가 사용 조건을 새로 정하자고 말한다"
            },
            {
              "key": "B",
              "text": "이번은 허용하되 사용 범위를 문서로 남긴다"
            },
            {
              "key": "C",
              "text": "사용 범위와 비용 기준표를 만들어 보내고 고르게 한다"
            },
            {
              "key": "D",
              "text": "관계를 고려해 허용하고, 다음 계약부터 조항을 넣는다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "INDEP"
        },
        {
          "id": "S3-INDEP03",
          "type": "sjt",
          "title": "같은 주에 겹친 두 마감",
          "scenario": "전시 마감과 의뢰 마감이 같은 주에 겹쳤습니다. 둘 다 온전히 해내기는 어렵고, 전시는 무보수 초대전입니다.",
          "options": [
            {
              "key": "A",
              "text": "의뢰인에게 상황을 알리고 마감 조정을 요청한다"
            },
            {
              "key": "B",
              "text": "전시 출품 규모를 줄이고 의뢰를 우선한다"
            },
            {
              "key": "C",
              "text": "두 곳 모두에 지금 가능한 범위를 알리고 각각 조정한다"
            },
            {
              "key": "D",
              "text": "전시를 우선하고, 의뢰는 조정이 안 되면 다음으로 미룬다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "INDEP"
        },
        {
          "id": "S3-INDEP04",
          "type": "sjt",
          "title": "모르는 사이에 이루어진 작품 대여",
          "scenario": "갤러리가 내 작품을 내가 모르는 곳에 대여했다는 사실을 나중에 알게 됐습니다. 계약서의 해당 조항은 모호하게 적혀 있습니다.",
          "options": [
            {
              "key": "A",
              "text": "계약 조항의 해석을 먼저 확인한 뒤 갤러리에 문의한다"
            },
            {
              "key": "B",
              "text": "사실관계를 정리해 서면으로 설명을 요청한다"
            },
            {
              "key": "C",
              "text": "우선 구두로 물어보고 반응을 본 뒤 대응을 정한다"
            },
            {
              "key": "D",
              "text": "앞으로의 조건을 명확히 하는 데 집중하고 이번 건은 넘어간다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "INDEP"
        },
        {
          "id": "S3-GENERAL01",
          "type": "sjt",
          "title": "진도가 늦은 사람과 다가오는 마감",
          "scenario": "함께 일하는 사람의 진도가 계속 늦습니다. 마감은 다가오고 다른 사람들은 그 부분을 기다리고 있습니다. 안전 문제는 없습니다.",
          "options": [
            {
              "key": "A",
              "text": "무엇이 막혔는지 먼저 묻고 함께 방법을 찾는다"
            },
            {
              "key": "B",
              "text": "내가 할 수 있는 부분을 먼저 진행하고 남은 것을 다시 나눈다"
            },
            {
              "key": "C",
              "text": "전체에게 남은 일과 시간을 공유하고 다시 배분하자고 제안한다"
            },
            {
              "key": "D",
              "text": "책임자에게 상황을 알리고 조정을 요청한다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "GENERAL"
        },
        {
          "id": "S3-GENERAL02",
          "type": "sjt",
          "title": "오래된 방식과 새로 온 사람",
          "scenario": "맡은 일의 방식이 내가 보기에는 비효율적입니다. 그 방식을 정한 사람은 오래 그렇게 해왔고, 나는 최근에 합류했습니다.",
          "options": [
            {
              "key": "A",
              "text": "우선 정해진 방식대로 하면서 그 이유를 파악한다"
            },
            {
              "key": "B",
              "text": "다른 방식을 시험해본 결과를 들고 제안한다"
            },
            {
              "key": "C",
              "text": "왜 그 방식인지 먼저 묻고 배경을 확인한다"
            },
            {
              "key": "D",
              "text": "내 담당 범위 안에서만 다른 방식을 써본다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "GENERAL"
        },
        {
          "id": "S3-GENERAL03",
          "type": "sjt",
          "title": "다 끝낼 수 없는 시간",
          "scenario": "시간이 부족해 맡은 일을 계획대로 다 끝낼 수 없습니다. 무엇을 줄일지는 내가 정해야 합니다.",
          "options": [
            {
              "key": "A",
              "text": "결과에 가장 큰 영향을 주는 것부터 하고 나머지를 줄인다"
            },
            {
              "key": "B",
              "text": "전체를 일정한 수준으로 맞추고 완성도를 조금씩 낮춘다"
            },
            {
              "key": "C",
              "text": "관련된 사람에게 상황을 알리고 무엇을 줄일지 함께 정한다"
            },
            {
              "key": "D",
              "text": "마감을 늦출 수 있는지 먼저 확인한다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "GENERAL"
        },
        {
          "id": "S3-GENERAL04",
          "type": "sjt",
          "title": "내가 결정할 수 없는 문제",
          "scenario": "내 권한으로는 결정할 수 없는 문제를 발견했습니다. 지금 알리면 일정이 늦어지고, 알리지 않으면 나중에 더 커질 수 있습니다.",
          "options": [
            {
              "key": "A",
              "text": "지금 알리고 판단을 요청한다"
            },
            {
              "key": "B",
              "text": "영향 범위를 먼저 확인한 뒤 정리해서 알린다"
            },
            {
              "key": "C",
              "text": "내가 할 수 있는 임시 조치를 하고 함께 알린다"
            },
            {
              "key": "D",
              "text": "기록해두고 다음 정기 보고 때 다룬다"
            }
          ],
          "reason_tags_max": 2,
          "free_text": true,
          "module": "S3",
          "branch": "GENERAL"
        }
      ]
    },
    {
      "code": "N3",
      "label": "아동·청소년 안전·경계",
      "display_title": "아이를 만나는 일의 안전 규범",
      "group": 9,
      "scored": true,
      "branching": true,
      "response_scale": "norm_check",
      "items": [
        {
          "id": "N3-01",
          "type": "norm_check",
          "title": "수업 후 남은 아이",
          "scenario": "수업이 끝나고 한 아이만 남았습니다. 보호자는 15분 뒤 도착 예정이고, 공간에 다른 성인은 없습니다.",
          "options": [
            {
              "key": "A",
              "text": "문을 열어둔 채 밖에서 보이는 자리에서 함께 기다린다"
            },
            {
              "key": "B",
              "text": "기관 담당자에게 알리고 함께 있어달라고 요청한다"
            },
            {
              "key": "C",
              "text": "아이를 공용 대기 공간으로 안내하고 담당자에게 인계한다"
            },
            {
              "key": "D",
              "text": "보호자에게 연락해 도착 시간을 확인하고 그때까지 함께 있는다"
            }
          ],
          "followup": {
            "text": "이런 상황에 대한 기관 규정을 확인해본 적이 있다",
            "options": [
              "예",
              "아니오",
              "잘 모르겠다"
            ]
          },
          "module": "N3",
          "branch": "*EDU_CULTURE*"
        },
        {
          "id": "N3-02",
          "type": "norm_check",
          "title": "놀란 아이의 요청",
          "scenario": "아이가 재료를 다루다 손을 다칠 뻔했습니다. 놀란 아이가 울면서 안아달라고 합니다.",
          "options": [
            {
              "key": "A",
              "text": "안아주며 진정시키고, 이후 담당자에게 상황을 알린다"
            },
            {
              "key": "B",
              "text": "손을 잡거나 어깨에 손을 얹는 정도로 진정시키고 옆에 앉는다"
            },
            {
              "key": "C",
              "text": "신체 접촉 없이 옆에서 말로 진정시키고 담당자를 부른다"
            },
            {
              "key": "D",
              "text": "기관의 접촉 규정을 떠올려 그 범위 안에서 대응한다"
            }
          ],
          "followup": {
            "text": "이런 상황에 대한 기관 규정을 확인해본 적이 있다",
            "options": [
              "예",
              "아니오",
              "잘 모르겠다"
            ]
          },
          "module": "N3",
          "branch": "*EDU_CULTURE*"
        },
        {
          "id": "N3-03",
          "type": "norm_check",
          "title": "활동 사진의 사용",
          "scenario": "수업 중 아이들의 활동 사진을 찍었습니다. 기관 홍보 담당자가 SNS 게시용으로 보내달라고 요청합니다.",
          "options": [
            {
              "key": "A",
              "text": "촬영 동의 범위를 확인한 뒤 동의된 사진만 전달한다"
            },
            {
              "key": "B",
              "text": "얼굴이 드러나지 않은 사진만 골라 전달한다"
            },
            {
              "key": "C",
              "text": "담당자에게 보호자 동의 여부를 먼저 확인해달라고 요청한다"
            },
            {
              "key": "D",
              "text": "기관의 요청이므로 전달하고, 사용 범위는 기관이 판단하게 한다"
            }
          ],
          "followup": {
            "text": "이런 상황에 대한 기관 규정을 확인해본 적이 있다",
            "options": [
              "예",
              "아니오",
              "잘 모르겠다"
            ]
          },
          "module": "N3",
          "branch": "*EDU_CULTURE*"
        },
        {
          "id": "N3-04",
          "type": "norm_check",
          "title": "개인 연락 요청",
          "scenario": "한 아이가 수업 밖에서도 질문하고 싶다며 개인 연락처나 SNS 계정을 묻습니다.",
          "options": [
            {
              "key": "A",
              "text": "기관을 통해 연락하는 방법을 안내한다"
            },
            {
              "key": "B",
              "text": "보호자를 통해 연락하도록 안내한다"
            },
            {
              "key": "C",
              "text": "기관 규정을 확인한 뒤 알려주겠다고 말한다"
            },
            {
              "key": "D",
              "text": "수업과 관련된 내용에 한해 알려준다"
            }
          ],
          "followup": {
            "text": "이런 상황에 대한 기관 규정을 확인해본 적이 있다",
            "options": [
              "예",
              "아니오",
              "잘 모르겠다"
            ]
          },
          "module": "N3",
          "branch": "*EDU_CULTURE*"
        }
      ]
    }
  ]
}
;
},"reference/employer-bank.v2.json":function(require,module,exports){
module.exports={
  "meta": {
    "questionnaire_id": "edupin-role-profile",
    "version": "2.0",
    "language": "ko-KR",
    "status": "pilot",
    "audience": "employer",
    "source_document": "docs/02-employer-profile.md",
    "mirrors": "docs/01-applicant-questionnaire.md 의 J3·E3·D3·N3"
  },
  "location": {
    "region_item": "HF-07",
    "remote_item": "HF-08",
    "note": "지원자의 F3-8·F3-9와 대조한다. 좌표 24축에 들어가지 않는다."
  },
  "modules": [
    {
      "code": "HF",
      "label": "기관·직무 기본 정보",
      "display_title": "기관과 자리에 대해",
      "scored": false,
      "items": [
        {
          "id": "HF-01",
          "type": "choice",
          "text": "기관 형태",
          "select": "single",
          "options": [
            "소규모·중형 미술 아틀리에",
            "대규모 미술교육 체인",
            "미술관·갤러리 교육 부문",
            "상업 갤러리",
            "공공 문화·예술교육 기관",
            "지역문화·커뮤니티 예술기관",
            "디자인·브랜드·콘텐츠 회사",
            "게임·애니메이션·영상 제작사",
            "패션·공예·제품 제작사",
            "프리랜서·독립 스튜디오",
            "기타: __________"
          ]
        },
        {
          "id": "HF-02",
          "type": "text",
          "text": "채용하려는 직무의 이름",
          "select": null,
          "options": null
        },
        {
          "id": "HF-03",
          "type": "text",
          "text": "이 자리에서 하는 일",
          "select": null,
          "options": null
        },
        {
          "id": "HF-04",
          "type": "choice",
          "text": "이 직무를 답하는 사람의 역할",
          "select": "single",
          "options": [
            "채용·인사 담당",
            "이 자리의 직속 관리자",
            "같은 일을 하는 현업자",
            "대표·운영자",
            "기타: __________"
          ]
        },
        {
          "id": "HF-05",
          "type": "choice",
          "text": "이 직무가 속한 분야",
          "select": "single",
          "options": [
            "`EDU` 아동·청소년 미술교육",
            "`GAME` 게임·애니메이션·디지털 제작",
            "`FILM` 영화·공연·무대·현장 제작",
            "`MAKE` 패션·공예·제품·공방",
            "`INDEP` 작가·프리랜서·독립 스튜디오",
            "`CULTURE` 미술관·갤러리·전시·공공문화",
            "`DESIGN` 디자인·브랜드·콘텐츠 회사",
            "`GENERAL` 위 분류에 맞지 않음"
          ]
        },
        {
          "id": "HF-06",
          "type": "choice",
          "text": "이 자리는 아동·청소년을 직접 만나는가",
          "select": "single",
          "options": [
            "정기적으로 만난다",
            "가끔 만난다 (단체 관람, 행사 등)",
            "만나지 않는다"
          ]
        },
        {
          "id": "HF-07",
          "type": "choice",
          "text": "근무지 지역",
          "select": "single",
          "options": [
            "서울특별시",
            "부산광역시",
            "대구광역시",
            "인천광역시",
            "광주광역시",
            "대전광역시",
            "울산광역시",
            "세종특별자치시",
            "경기도",
            "강원특별자치도",
            "충청북도",
            "충청남도",
            "전북특별자치도",
            "전라남도",
            "경상북도",
            "경상남도",
            "제주특별자치도",
            "여러 지역 — 현장에 따라 다름"
          ]
        },
        {
          "id": "HF-08",
          "type": "choice",
          "text": "원격·재택",
          "select": "single",
          "options": [
            "전일 출근",
            "일부 재택 가능",
            "대부분 재택",
            "현장마다 다름"
          ]
        }
      ]
    },
    {
      "code": "HJ",
      "label": "창작직무 좌표",
      "display_title": "이 자리의 일은 실제로 어떤 형태인가",
      "scored": true,
      "mirrors": "J3",
      "items": [
        {
          "id": "HJ-01",
          "type": "bipolar_1_7_or_undefined",
          "left": "대부분 화면과 디지털 파일을 다룬다",
          "right": "대부분 실물 재료·장비·공간을 다룬다",
          "mirrors": "J3-01"
        },
        {
          "id": "HJ-02",
          "type": "bipolar_1_7_or_undefined",
          "left": "방향을 새로 만드는 일이 대부분이다",
          "right": "정해진 방향을 다듬어 완성하는 일이 대부분이다",
          "mirrors": "J3-02"
        },
        {
          "id": "HJ-03",
          "type": "bipolar_1_7_or_undefined",
          "left": "결과물이 이야기·정서·경험을 다룬다",
          "right": "결과물이 정보·기능·사용성을 다룬다",
          "mirrors": "J3-03"
        },
        {
          "id": "HJ-04",
          "type": "bipolar_1_7_or_undefined",
          "left": "한 사람이 한 건을 처음부터 끝까지 맡는다",
          "right": "여러 사람이 단계를 나눠 이어 만든다",
          "mirrors": "J3-04"
        },
        {
          "id": "HJ-05",
          "type": "bipolar_1_7_or_undefined",
          "left": "몇 달 단위의 긴 건이 소수 있다",
          "right": "짧은 건이 여러 개 동시에 돌아간다",
          "mirrors": "J3-05"
        },
        {
          "id": "HJ-06",
          "type": "bipolar_1_7_or_undefined",
          "left": "제약이 적고 방향을 스스로 정한다",
          "right": "규격·가이드·검수 기준이 촘촘하다",
          "mirrors": "J3-06"
        },
        {
          "id": "HJ-07",
          "type": "bipolar_1_7_or_undefined",
          "left": "시간의 대부분을 직접 만드는 데 쓴다",
          "right": "시간의 대부분을 사람·일정·자원 조율에 쓴다",
          "mirrors": "J3-07"
        },
        {
          "id": "HJ-08",
          "type": "bipolar_1_7_or_undefined",
          "left": "만드는 사람의 관점과 완성도로 판단한다",
          "right": "고객·사용자·의뢰인의 목적으로 판단한다",
          "mirrors": "J3-08"
        },
        {
          "id": "HJ-09",
          "type": "bipolar_1_7_or_undefined",
          "left": "한 가지 일에 길게 집중할 수 있다",
          "right": "여러 건과 요청 사이를 자주 전환한다",
          "mirrors": "J3-09"
        },
        {
          "id": "HJ-10",
          "type": "bipolar_1_7_or_undefined",
          "left": "고정된 자리나 원격에서 일한다",
          "right": "현장 이동·설치·운영이 일의 중심이다",
          "mirrors": "J3-10"
        },
        {
          "id": "HJ-11",
          "type": "bipolar_1_7_or_undefined",
          "left": "고정 급여 중심이다",
          "right": "건별·성과별 변동 비중이 크다",
          "mirrors": "J3-11"
        },
        {
          "id": "HJ-12",
          "type": "bipolar_1_7_or_undefined",
          "left": "한 영역의 전문성을 깊게 쓴다",
          "right": "여러 역할을 겸해야 한다",
          "mirrors": "J3-12"
        }
      ]
    },
    {
      "code": "HE",
      "label": "근무환경",
      "display_title": "이 조직은 실제로 어떻게 일하는가",
      "scored": true,
      "mirrors": "E3",
      "items": [
        {
          "id": "HE-01",
          "type": "bipolar_1_7_or_undefined",
          "left": "상세한 브리프와 작업 기준을 제공한다",
          "right": "목표만 주고 방법은 담당자에게 맡긴다",
          "mirrors": "E3-01"
        },
        {
          "id": "HE-02",
          "type": "bipolar_1_7_or_undefined",
          "left": "검증된 방식과 정착된 단계를 쓴다",
          "right": "새로운 시도와 탐색을 넓게 허용한다",
          "mirrors": "E3-02"
        },
        {
          "id": "HE-03",
          "type": "bipolar_1_7_or_undefined",
          "left": "완성된 결과물로 성과를 확인한다",
          "right": "시도와 탐색 과정을 충분히 보장한다",
          "mirrors": "E3-03"
        },
        {
          "id": "HE-04",
          "type": "bipolar_1_7_or_undefined",
          "left": "관리자가 순서와 방향을 정한다",
          "right": "담당자가 정하고 관리자가 지원한다",
          "mirrors": "E3-04"
        },
        {
          "id": "HE-05",
          "type": "bipolar_1_7_or_undefined",
          "left": "전원에게 같은 목표와 방식을 적용한다",
          "right": "사람마다 속도와 방식을 다르게 운영한다",
          "mirrors": "E3-05"
        },
        {
          "id": "HE-06",
          "type": "bipolar_1_7_or_undefined",
          "left": "규칙은 예외 없이 일관되게 적용한다",
          "right": "개인과 상황의 사정에 따라 조정한다",
          "mirrors": "E3-06"
        },
        {
          "id": "HE-07",
          "type": "bipolar_1_7_or_undefined",
          "left": "막히면 관리자가 빠르게 개입한다",
          "right": "스스로 시도할 시간을 두고 지켜본다",
          "mirrors": "E3-07"
        },
        {
          "id": "HE-08",
          "type": "bipolar_1_7_or_undefined",
          "left": "세운 계획이 대체로 그대로 간다",
          "right": "현장 반응에 따라 계획이 자주 바뀐다",
          "mirrors": "E3-08"
        },
        {
          "id": "HE-09",
          "type": "bipolar_1_7_or_undefined",
          "left": "각자 맡은 일을 독립적으로 진행한다",
          "right": "진행 중 수시로 의견을 나누고 조정한다",
          "mirrors": "E3-09"
        },
        {
          "id": "HE-10",
          "type": "bipolar_1_7_or_undefined",
          "left": "익숙한 도구와 방식을 반복해서 쓴다",
          "right": "새로운 도구와 방식을 자주 도입한다",
          "mirrors": "E3-10"
        },
        {
          "id": "HE-11",
          "type": "bipolar_1_7_or_undefined",
          "left": "문제가 생기면 원인과 해결을 먼저 정리한다",
          "right": "문제가 생기면 관계자의 상태를 먼저 확인한다",
          "mirrors": "E3-11"
        },
        {
          "id": "HE-12",
          "type": "bipolar_1_7_or_undefined",
          "left": "필요할 때 핵심만 공유한다",
          "right": "진행 상황을 정기적으로 자주 공유한다",
          "mirrors": "E3-12"
        }
      ]
    },
    {
      "code": "HP",
      "label": "이 자리에서 특히 중요한 것",
      "display_title": "이 자리에서 특히 중요한 것",
      "scored": true,
      "items": [
        {
          "id": "HP-01",
          "type": "dynamic_axis_select",
          "source": "strong_axes",
          "strong_threshold": 2,
          "min": 0,
          "max": 4,
          "allow_none": true,
          "per_item_reason": "HP-02",
          "selection_limit": {
            "type": "by_visible_count",
            "formula": "round(visible_count / 3)",
            "minimum_when_visible": 1,
            "maximum": 4,
            "bands": [
              {
                "visible": "6-7",
                "max": 2
              },
              {
                "visible": "8-10",
                "max": 3
              },
              {
                "visible": "11-12",
                "max": 4
              }
            ]
          },
          "rule": "HJ·HE 응답이 4에서 2 이상 떨어진 축만, 응답한 쪽의 사람 모습으로 보여준다. 최대 선택 수는 노출 수의 약 3분의 1이며 4개를 넘지 않는다. 꼭 맞아야 할 조건이 없으면 0개 선택도 허용한다.",
          "personas": {
            "HJ-01": {
              "left": {
                "label": "화면 작업을 편해하는 사람",
                "why": "디지털 도구 안에서 일하는 쪽"
              },
              "right": {
                "label": "실물 재료를 직접 다루는 사람",
                "why": "화면 작업보다 손으로 만지는 쪽"
              }
            },
            "HJ-02": {
              "left": {
                "label": "처음부터 새로 구상하는 사람",
                "why": "있는 것을 다듬기보다 방향을 만드는 쪽"
              },
              "right": {
                "label": "정해진 걸 다듬어 완성하는 사람",
                "why": "매번 새로 구상하기보다 있는 것을 좋게 만드는 쪽"
              }
            },
            "HJ-03": {
              "left": {
                "label": "이야기와 감정을 다루는 사람",
                "why": "기능보다 정서와 세계관 쪽"
              },
              "right": {
                "label": "정보와 기능을 다루는 사람",
                "why": "정서보다 쓰임새와 문제 해결 쪽"
              }
            },
            "HJ-04": {
              "left": {
                "label": "한 작업을 혼자 끝까지 맡는 사람",
                "why": "분업보다 처음부터 끝까지 책임지는 쪽"
              },
              "right": {
                "label": "여러 사람과 나눠 만드는 사람",
                "why": "혼자 완결하기보다 이어받고 넘기는 쪽"
              }
            },
            "HJ-05": {
              "left": {
                "label": "하나를 오래 붙잡는 사람",
                "why": "자주 마무리하기보다 깊게 파는 쪽"
              },
              "right": {
                "label": "짧은 주기로 결과를 내는 사람",
                "why": "하나를 오래 붙잡기보다 자주 마무리하는 쪽"
              }
            },
            "HJ-06": {
              "left": {
                "label": "기준이 적을 때 잘하는 사람",
                "why": "규격보다 열린 탐색 쪽"
              },
              "right": {
                "label": "명확한 규격 안에서 잘하는 사람",
                "why": "열린 탐색보다 정해진 기준 쪽"
              }
            },
            "HJ-07": {
              "left": {
                "label": "직접 만들고 다듬는 사람",
                "why": "조율보다 손으로 만드는 일 쪽"
              },
              "right": {
                "label": "사람·일정을 조율할 줄 아는 사람",
                "why": "직접 만드는 것만이 아니라 챙기고 맞추는 일까지"
              }
            },
            "HJ-08": {
              "left": {
                "label": "자기 표현을 우선하는 사람",
                "why": "고객 목적보다 작업의 방향을 지키는 쪽"
              },
              "right": {
                "label": "고객과 사용자 목적을 우선하는 사람",
                "why": "자기 표현보다 쓰는 사람 쪽"
              }
            },
            "HJ-09": {
              "left": {
                "label": "한 가지에 오래 집중하는 사람",
                "why": "여러 일을 오가기보다 하나에 몰두하는 쪽"
              },
              "right": {
                "label": "여러 일을 빠르게 오가는 사람",
                "why": "한 가지에만 몰두하기보다 왔다갔다 하는 쪽"
              }
            },
            "HJ-10": {
              "left": {
                "label": "책상에서 집중하는 걸 편해하는 사람",
                "why": "현장보다 자리에 앉아 일하는 쪽"
              },
              "right": {
                "label": "현장에서 움직이는 걸 편해하는 사람",
                "why": "책상에 앉아 있는 것보다 현장이 편한 쪽"
              }
            },
            "HJ-11": {
              "left": {
                "label": "고정된 보상을 원하는 사람",
                "why": "건별 수입보다 안정적인 급여 쪽"
              },
              "right": {
                "label": "성과에 따른 보상을 받아들이는 사람",
                "why": "고정 급여보다 건별·성과별 쪽"
              }
            },
            "HJ-12": {
              "left": {
                "label": "한 영역을 깊게 파는 사람",
                "why": "여러 역할보다 한 가지 전문성 쪽"
              },
              "right": {
                "label": "여러 역할을 넘나드는 사람",
                "why": "한 가지 전문성보다 두루 맡는 쪽"
              }
            },
            "HE-01": {
              "left": {
                "label": "명확한 지시가 있을 때 잘하는 사람",
                "why": "자율보다 기준과 순서가 주어지는 쪽"
              },
              "right": {
                "label": "목표만 주면 알아서 하는 사람",
                "why": "상세한 브리프보다 방법을 스스로 정하는 쪽"
              }
            },
            "HE-02": {
              "left": {
                "label": "검증된 방식대로 하는 사람",
                "why": "새 시도보다 정착된 단계 쪽"
              },
              "right": {
                "label": "새로운 시도를 넓게 하는 사람",
                "why": "정착된 단계보다 자유로운 실험 쪽"
              }
            },
            "HE-03": {
              "left": {
                "label": "완성된 결과를 남기는 사람",
                "why": "과정보다 결과물 쪽"
              },
              "right": {
                "label": "탐색 과정을 중시하는 사람",
                "why": "결과물보다 시도와 과정 쪽"
              }
            },
            "HE-04": {
              "left": {
                "label": "방향을 정해주면 따르는 사람",
                "why": "스스로 정하기보다 리더의 순서를 따르는 쪽"
              },
              "right": {
                "label": "스스로 정하고 지원받는 사람",
                "why": "리더가 정해주기보다 본인이 고르는 쪽"
              }
            },
            "HE-05": {
              "left": {
                "label": "모두에게 같은 방식으로 하는 사람",
                "why": "개별 대응보다 공통 기준 쪽"
              },
              "right": {
                "label": "사람마다 다르게 대응하는 사람",
                "why": "모두에게 같은 방식보다 상대에 맞추는 쪽"
              }
            },
            "HE-06": {
              "left": {
                "label": "규칙을 똑같이 적용하는 사람",
                "why": "사정보다 일관성 쪽"
              },
              "right": {
                "label": "상황에 따라 기준을 조정하는 사람",
                "why": "규칙을 똑같이 적용하기보다 사정을 보는 쪽"
              }
            },
            "HE-07": {
              "left": {
                "label": "어려움이 보이면 바로 나서는 사람",
                "why": "지켜보기보다 빠르게 방향을 잡아주는 쪽"
              },
              "right": {
                "label": "스스로 시도할 시간을 주는 사람",
                "why": "바로 개입하기보다 지켜보는 쪽"
              }
            },
            "HE-08": {
              "left": {
                "label": "세운 계획대로 가는 사람",
                "why": "즉흥 변경보다 안정적인 진행 쪽"
              },
              "right": {
                "label": "현장 반응에 따라 바꾸는 사람",
                "why": "계획 고수보다 그때그때 조정하는 쪽"
              }
            },
            "HE-09": {
              "left": {
                "label": "맡은 일을 혼자 진행하는 사람",
                "why": "잦은 협의보다 독립적으로 하는 쪽"
              },
              "right": {
                "label": "진행 중 자주 의견을 나누는 사람",
                "why": "혼자 하기보다 함께 조정하는 쪽"
              }
            },
            "HE-10": {
              "left": {
                "label": "익숙한 도구를 안정적으로 쓰는 사람",
                "why": "새 도구보다 검증된 방식 쪽"
              },
              "right": {
                "label": "새로운 도구와 방식을 시도하는 사람",
                "why": "익숙한 것을 반복하기보다 바꿔보는 쪽"
              }
            },
            "HE-11": {
              "left": {
                "label": "문제가 생기면 원인부터 정리하는 사람",
                "why": "감정보다 해결책 쪽"
              },
              "right": {
                "label": "문제가 생기면 사람 상태부터 챙기는 사람",
                "why": "원인 분석보다 관계자의 마음을 먼저"
              }
            },
            "HE-12": {
              "left": {
                "label": "핵심만 간결하게 공유하는 사람",
                "why": "자주 보고하기보다 필요할 때 요점만"
              },
              "right": {
                "label": "진행 상황을 자주 나누는 사람",
                "why": "요점만 보고하기보다 정기적으로 공유하는 쪽"
              }
            }
          },
          "text": "이 자리에서 특히 중요한 것을 골라주세요",
          "help": "앞에서 뚜렷하게 답하신 조건을 모았어요. 이 중에서도 특히 ‘다르면 힘들고 꼭 맞아야 하는 조건’을 최대 ○개 골라주세요. 꼭 맞아야 할 조건이 없다면 선택하지 않아도 됩니다. 선택하지 않은 조건은 서로 달라도 맞춰갈 수 있는 부분으로 봅니다."
        },
        {
          "id": "HP-02",
          "type": "text",
          "per_selected": true,
          "optional": true,
          "text": "왜 중요한가요",
          "help": "표시한 항목 아래에 열린다. 안 써도 된다. 가능하면 실제로 겪은 일을 적는다. 이 문장은 면접 확인 질문을 만드는 재료가 된다."
        },
        {
          "id": "HP-04",
          "type": "text",
          "text": "입사 후 첫 3개월에 반드시 되어 있어야 하는 상태",
          "help": "지원자에게 그대로 전달된다. 역량 목록이 아니라 관찰 가능한 상태로 적는다. 예: “혼자 수업 한 회를 준비부터 정리까지 운영할 수 있다.”"
        }
      ]
    },
    {
      "code": "HD",
      "label": "분야 맥락",
      "display_title": "이 분야에서 실제 조건",
      "scored": true,
      "mirrors": "D3",
      "branching": true,
      "branches": [
        {
          "branch": "EDU",
          "label": "아동·청소년 미술교육",
          "items": [
            {
              "id": "HD-EDU01",
              "type": "bipolar_1_7_or_undefined",
              "left": "정해진 커리큘럼을 안정적으로 운영",
              "right": "대상에 맞춰 수업을 새로 설계",
              "mirrors": "D3-EDU01"
            },
            {
              "id": "HD-EDU02",
              "type": "bipolar_1_7_or_undefined",
              "left": "완성 결과가 분명한 수업",
              "right": "탐색 과정이 충분한 수업",
              "mirrors": "D3-EDU02"
            },
            {
              "id": "HD-EDU03",
              "type": "bipolar_1_7_or_undefined",
              "left": "강사가 순서와 방향을 주도",
              "right": "학습자가 선택하고 강사가 지원",
              "mirrors": "D3-EDU03"
            },
            {
              "id": "HD-EDU04",
              "type": "bipolar_1_7_or_undefined",
              "left": "모두에게 같은 규칙을 적용",
              "right": "개인의 상황에 따라 규칙 적용을 조정",
              "mirrors": "D3-EDU04"
            },
            {
              "id": "HD-EDU05",
              "type": "bipolar_1_7_or_undefined",
              "left": "어려움이 보이면 빠르게 개입",
              "right": "스스로 시도할 시간을 두고 관찰",
              "mirrors": "D3-EDU05"
            },
            {
              "id": "HD-EDU06",
              "type": "bipolar_1_7_or_undefined",
              "left": "수업을 독립적으로 준비·진행",
              "right": "동료와 자주 협의하며 진행",
              "mirrors": "D3-EDU06"
            },
            {
              "id": "HD-EDU07",
              "type": "bipolar_1_7_or_undefined",
              "left": "차분하고 절제된 태도로 관계 형성",
              "right": "활기 있고 풍부한 표현으로 관계 형성",
              "mirrors": "D3-EDU07"
            },
            {
              "id": "HD-EDU08",
              "type": "bipolar_1_7_or_undefined",
              "left": "수업내용과 활동 진행을 우선",
              "right": "상태와 관계 확인을 먼저 확보",
              "mirrors": "D3-EDU08"
            },
            {
              "id": "HD-EDU09",
              "type": "bipolar_1_7_or_undefined",
              "left": "반응이 좋았던 수업을 안정적으로 반복",
              "right": "새로운 재료와 방식을 자주 시험",
              "mirrors": "D3-EDU09"
            },
            {
              "id": "HD-EDU10",
              "type": "bipolar_1_7_or_undefined",
              "left": "보호자와 강사가 직접 소통",
              "right": "기관 담당자가 소통을 중간에서 지원",
              "mirrors": "D3-EDU10"
            }
          ]
        },
        {
          "branch": "GAME",
          "label": "게임·애니메이션·디지털 제작",
          "items": [
            {
              "id": "HD-GAME01",
              "type": "bipolar_1_7_or_undefined",
              "left": "초기 콘셉트와 세계관을 구상",
              "right": "정해진 방향의 에셋과 장면을 정교하게 제작",
              "mirrors": "D3-GAME01"
            },
            {
              "id": "HD-GAME02",
              "type": "bipolar_1_7_or_undefined",
              "left": "하나의 결과물을 개인이 주도",
              "right": "여러 직군이 작업을 이어받아 제작",
              "mirrors": "D3-GAME02"
            },
            {
              "id": "HD-GAME03",
              "type": "bipolar_1_7_or_undefined",
              "left": "개인적 스타일을 폭넓게 반영",
              "right": "프로젝트 스타일 가이드를 일관되게 유지",
              "mirrors": "D3-GAME03"
            },
            {
              "id": "HD-GAME04",
              "type": "bipolar_1_7_or_undefined",
              "left": "소수 결과물을 오래 다듬음",
              "right": "많은 결과물을 일정 품질로 반복 제작",
              "mirrors": "D3-GAME04"
            },
            {
              "id": "HD-GAME05",
              "type": "bipolar_1_7_or_undefined",
              "left": "확정된 요구사항을 중심으로 작업",
              "right": "테스트 결과에 따라 반복적으로 수정",
              "mirrors": "D3-GAME05"
            },
            {
              "id": "HD-GAME06",
              "type": "bipolar_1_7_or_undefined",
              "left": "시각적 완성도를 우선",
              "right": "엔진·성능·파일규격 등 기술 제약을 우선",
              "mirrors": "D3-GAME06"
            },
            {
              "id": "HD-GAME07",
              "type": "bipolar_1_7_or_undefined",
              "left": "짧은 프로젝트를 빠르게 마무리",
              "right": "하나의 프로젝트를 장기간 발전",
              "mirrors": "D3-GAME07"
            },
            {
              "id": "HD-GAME08",
              "type": "bipolar_1_7_or_undefined",
              "left": "긴 개인 집중시간을 보장",
              "right": "짧고 잦은 회의·리뷰로 계속 동기화",
              "mirrors": "D3-GAME08"
            },
            {
              "id": "HD-GAME09",
              "type": "bipolar_1_7_or_undefined",
              "left": "예측 가능한 일정과 작업량",
              "right": "출시·마감 전 업무 강도가 크게 변함",
              "mirrors": "D3-GAME09"
            },
            {
              "id": "HD-GAME10",
              "type": "bipolar_1_7_or_undefined",
              "left": "하나의 제작기술을 깊게 담당",
              "right": "기획·아트·기술 사이를 넘나들며 해결",
              "mirrors": "D3-GAME10"
            }
          ]
        },
        {
          "branch": "FILM",
          "label": "영화·공연·무대·현장 제작",
          "items": [
            {
              "id": "HD-FILM01",
              "type": "bipolar_1_7_or_undefined",
              "left": "사전계획과 준비를 충분히 확정",
              "right": "촬영·공연 현장에서 즉시 방법을 바꿈",
              "mirrors": "D3-FILM01"
            },
            {
              "id": "HD-FILM02",
              "type": "bipolar_1_7_or_undefined",
              "left": "맡은 제작 파트를 깊게 담당",
              "right": "여러 부서와 계속 연결하며 조율",
              "mirrors": "D3-FILM02"
            },
            {
              "id": "HD-FILM03",
              "type": "bipolar_1_7_or_undefined",
              "left": "감독·연출의 방향을 정확히 구현",
              "right": "대안을 적극적으로 제안하며 방향을 조정",
              "mirrors": "D3-FILM03"
            },
            {
              "id": "HD-FILM04",
              "type": "bipolar_1_7_or_undefined",
              "left": "미적 완성도를 최대한 확보",
              "right": "시간·예산 안에서 가능한 결과를 우선",
              "mirrors": "D3-FILM04"
            },
            {
              "id": "HD-FILM05",
              "type": "bipolar_1_7_or_undefined",
              "left": "책상에서 조사·도면·기획 중심",
              "right": "세트·공간·현장에서 몸을 움직이며 제작",
              "mirrors": "D3-FILM05"
            },
            {
              "id": "HD-FILM06",
              "type": "bipolar_1_7_or_undefined",
              "left": "일정한 출퇴근과 예측 가능한 시간",
              "right": "촬영·공연에 따른 이른 시간·야간·변동 일정",
              "mirrors": "D3-FILM06"
            },
            {
              "id": "HD-FILM07",
              "type": "bipolar_1_7_or_undefined",
              "left": "새 재료와 구조를 매번 제작",
              "right": "기존 물품을 찾아 수리·변형해 활용",
              "mirrors": "D3-FILM07"
            },
            {
              "id": "HD-FILM08",
              "type": "bipolar_1_7_or_undefined",
              "left": "조용한 환경에서 개인 작업에 집중",
              "right": "많은 사람이 동시에 움직이는 현장에서 대응",
              "mirrors": "D3-FILM08"
            },
            {
              "id": "HD-FILM09",
              "type": "bipolar_1_7_or_undefined",
              "left": "명확한 지휘체계에 따라 결정",
              "right": "직급과 관계없이 현장 의견을 빠르게 교환",
              "mirrors": "D3-FILM09"
            },
            {
              "id": "HD-FILM10",
              "type": "bipolar_1_7_or_undefined",
              "left": "짧고 강도 높은 프로젝트를 반복",
              "right": "한 조직에서 비교적 안정적으로 연속 제작",
              "mirrors": "D3-FILM10"
            }
          ]
        },
        {
          "branch": "MAKE",
          "label": "패션·공예·제품·공방",
          "items": [
            {
              "id": "HD-MAKE01",
              "type": "bipolar_1_7_or_undefined",
              "left": "이미지와 형태의 콘셉트를 먼저 발전",
              "right": "소재·구조·제작 가능성을 먼저 확인",
              "mirrors": "D3-MAKE01"
            },
            {
              "id": "HD-MAKE02",
              "type": "bipolar_1_7_or_undefined",
              "left": "하나뿐인 작품을 개별 제작",
              "right": "같은 품질로 반복 생산 가능한 제품을 제작",
              "mirrors": "D3-MAKE02"
            },
            {
              "id": "HD-MAKE03",
              "type": "bipolar_1_7_or_undefined",
              "left": "개인적 표현과 작품성을 우선",
              "right": "고객·브랜드·시장 반응을 우선",
              "mirrors": "D3-MAKE03"
            },
            {
              "id": "HD-MAKE04",
              "type": "bipolar_1_7_or_undefined",
              "left": "손도구와 재료를 직접 다룸",
              "right": "디지털 설계와 제작장비를 중심으로 작업",
              "mirrors": "D3-MAKE04"
            },
            {
              "id": "HD-MAKE05",
              "type": "bipolar_1_7_or_undefined",
              "left": "같은 과정을 정교하게 반복",
              "right": "여러 재료와 과제를 자주 바꿈",
              "mirrors": "D3-MAKE05"
            },
            {
              "id": "HD-MAKE06",
              "type": "bipolar_1_7_or_undefined",
              "left": "익숙한 소재와 공정을 안정적으로 사용",
              "right": "새로운 소재와 공정을 계속 시험",
              "mirrors": "D3-MAKE06"
            },
            {
              "id": "HD-MAKE07",
              "type": "bipolar_1_7_or_undefined",
              "left": "개별 주문과 맞춤 요구에 대응",
              "right": "정해진 제품군과 운영기준을 유지",
              "mirrors": "D3-MAKE07"
            },
            {
              "id": "HD-MAKE08",
              "type": "bipolar_1_7_or_undefined",
              "left": "창작과 제작에 대부분의 시간을 사용",
              "right": "원가·재고·포장·판매까지 직접 관리",
              "mirrors": "D3-MAKE08"
            },
            {
              "id": "HD-MAKE09",
              "type": "bipolar_1_7_or_undefined",
              "left": "혼자 완결하는 공방 작업",
              "right": "외주업체·생산자·판매자와 분업",
              "mirrors": "D3-MAKE09"
            },
            {
              "id": "HD-MAKE10",
              "type": "bipolar_1_7_or_undefined",
              "left": "제작에 집중하고 고객 접촉을 줄임",
              "right": "판매·체험·워크숍으로 고객을 직접 만남",
              "mirrors": "D3-MAKE10"
            }
          ]
        },
        {
          "branch": "INDEP",
          "label": "작가·프리랜서·독립 스튜디오",
          "items": [
            {
              "id": "HD-INDEP01",
              "type": "bipolar_1_7_or_undefined",
              "left": "스스로 정한 주제를 장기간 발전",
              "right": "의뢰인이 정한 요청에 맞춰 제작",
              "mirrors": "D3-INDEP01"
            },
            {
              "id": "HD-INDEP02",
              "type": "bipolar_1_7_or_undefined",
              "left": "혼자 깊게 몰입하며 작업",
              "right": "다른 창작자·기획자와 함께 발전",
              "mirrors": "D3-INDEP02"
            },
            {
              "id": "HD-INDEP03",
              "type": "bipolar_1_7_or_undefined",
              "left": "정기적이고 예측 가능한 수입을 우선",
              "right": "판매·수주에 따라 달라지는 수입을 수용",
              "mirrors": "D3-INDEP03"
            },
            {
              "id": "HD-INDEP04",
              "type": "bipolar_1_7_or_undefined",
              "left": "작품 제작에 대부분의 시간을 사용",
              "right": "홍보·네트워킹·판매에도 시간을 적극 사용",
              "mirrors": "D3-INDEP04"
            },
            {
              "id": "HD-INDEP05",
              "type": "bipolar_1_7_or_undefined",
              "left": "하나의 작품군을 깊게 발전",
              "right": "여러 의뢰와 프로젝트를 동시에 전환",
              "mirrors": "D3-INDEP05"
            },
            {
              "id": "HD-INDEP06",
              "type": "bipolar_1_7_or_undefined",
              "left": "스스로 정한 완성도와 속도를 우선",
              "right": "고객의 마감과 예산 안에서 결과를 조정",
              "mirrors": "D3-INDEP06"
            },
            {
              "id": "HD-INDEP07",
              "type": "bipolar_1_7_or_undefined",
              "left": "공개 전 충분히 작업을 발전",
              "right": "전시·공모·온라인에 자주 공개하며 반응을 확인",
              "mirrors": "D3-INDEP07"
            },
            {
              "id": "HD-INDEP08",
              "type": "bipolar_1_7_or_undefined",
              "left": "계약·정산·저작권을 직접 관리",
              "right": "행정과 판매를 플랫폼·대리인에게 맡김",
              "mirrors": "D3-INDEP08"
            },
            {
              "id": "HD-INDEP09",
              "type": "bipolar_1_7_or_undefined",
              "left": "일정한 작업 루틴을 유지",
              "right": "프로젝트에 따라 시간과 장소를 유연하게 변경",
              "mirrors": "D3-INDEP09"
            },
            {
              "id": "HD-INDEP10",
              "type": "bipolar_1_7_or_undefined",
              "left": "고객·구매자와 직접 관계를 형성",
              "right": "갤러리·플랫폼·기획자를 통해 작품을 전달",
              "mirrors": "D3-INDEP10"
            }
          ]
        },
        {
          "branch": "CULTURE",
          "label": "미술관·갤러리·전시·공공문화",
          "items": [
            {
              "id": "HD-CULTURE01",
              "type": "bipolar_1_7_or_undefined",
              "left": "작품과 자료를 조사하고 글로 정리",
              "right": "관람객과 현장에서 직접 소통",
              "mirrors": "D3-CULTURE01"
            },
            {
              "id": "HD-CULTURE02",
              "type": "bipolar_1_7_or_undefined",
              "left": "전시 기획과 작품구성을 중심으로 일함",
              "right": "교육·행사·공공 프로그램을 중심으로 일함",
              "mirrors": "D3-CULTURE02"
            },
            {
              "id": "HD-CULTURE03",
              "type": "bipolar_1_7_or_undefined",
              "left": "작가와 작품의 의도를 충실히 전달",
              "right": "관람객이 이해하기 쉽게 해석을 조정",
              "mirrors": "D3-CULTURE03"
            },
            {
              "id": "HD-CULTURE04",
              "type": "bipolar_1_7_or_undefined",
              "left": "기획의 완성도와 전문성을 우선",
              "right": "예산·행정·공공 절차 안에서 실행을 우선",
              "mirrors": "D3-CULTURE04"
            },
            {
              "id": "HD-CULTURE05",
              "type": "bipolar_1_7_or_undefined",
              "left": "아카이브·목록·원고를 세밀하게 관리",
              "right": "설치·행사·현장을 직접 운영",
              "mirrors": "D3-CULTURE05"
            },
            {
              "id": "HD-CULTURE06",
              "type": "bipolar_1_7_or_undefined",
              "left": "개인 조사와 기획에 긴 시간을 사용",
              "right": "작가·기관·업체·관람객과 계속 조율",
              "mirrors": "D3-CULTURE06"
            },
            {
              "id": "HD-CULTURE07",
              "type": "bipolar_1_7_or_undefined",
              "left": "장기간 전시를 계획하고 준비",
              "right": "짧은 행사와 프로그램을 빠르게 반복",
              "mirrors": "D3-CULTURE07"
            },
            {
              "id": "HD-CULTURE08",
              "type": "bipolar_1_7_or_undefined",
              "left": "정해진 보존·행정 절차를 안정적으로 적용",
              "right": "현장 상황에 맞게 절차와 운영을 조정",
              "mirrors": "D3-CULTURE08"
            },
            {
              "id": "HD-CULTURE09",
              "type": "bipolar_1_7_or_undefined",
              "left": "공공성과 문화적 가치를 우선",
              "right": "판매·후원·관객확대 성과를 우선",
              "mirrors": "D3-CULTURE09"
            },
            {
              "id": "HD-CULTURE10",
              "type": "bipolar_1_7_or_undefined",
              "left": "글·자료·온라인 콘텐츠로 전달",
              "right": "도슨트·워크숍·발표로 직접 전달",
              "mirrors": "D3-CULTURE10"
            }
          ]
        },
        {
          "branch": "DESIGN",
          "label": "디자인·브랜드·콘텐츠 회사",
          "items": [
            {
              "id": "HD-DESIGN01",
              "type": "bipolar_1_7_or_undefined",
              "left": "초기 콘셉트와 방향을 구상",
              "right": "정해진 방향을 실제 결과물로 정교하게 제작",
              "mirrors": "D3-DESIGN01"
            },
            {
              "id": "HD-DESIGN02",
              "type": "bipolar_1_7_or_undefined",
              "left": "브랜드 기준을 일관되게 유지",
              "right": "프로젝트마다 새로운 스타일을 실험",
              "mirrors": "D3-DESIGN02"
            },
            {
              "id": "HD-DESIGN03",
              "type": "bipolar_1_7_or_undefined",
              "left": "사용자와 고객의 문제를 해결",
              "right": "시각적 개성과 표현 가능성을 확장",
              "mirrors": "D3-DESIGN03"
            },
            {
              "id": "HD-DESIGN04",
              "type": "bipolar_1_7_or_undefined",
              "left": "적은 프로젝트를 오래 발전",
              "right": "여러 결과물을 짧은 주기로 제작",
              "mirrors": "D3-DESIGN04"
            },
            {
              "id": "HD-DESIGN05",
              "type": "bipolar_1_7_or_undefined",
              "left": "담당자가 비교적 독립적으로 결정",
              "right": "고객·기획자와 잦은 리뷰를 거쳐 결정",
              "mirrors": "D3-DESIGN05"
            },
            {
              "id": "HD-DESIGN06",
              "type": "bipolar_1_7_or_undefined",
              "left": "하나의 매체와 전문영역을 깊게 담당",
              "right": "인쇄·영상·SNS·공간 등 여러 매체를 오가며 작업",
              "mirrors": "D3-DESIGN06"
            },
            {
              "id": "HD-DESIGN07",
              "type": "bipolar_1_7_or_undefined",
              "left": "조사·데이터·사용자 반응을 근거로 판단",
              "right": "미적 직관과 경험을 중심으로 판단",
              "mirrors": "D3-DESIGN07"
            },
            {
              "id": "HD-DESIGN08",
              "type": "bipolar_1_7_or_undefined",
              "left": "확정된 작업 요청을 바탕으로 진행",
              "right": "요구와 범위가 바뀌는 과정에서 계속 조정",
              "mirrors": "D3-DESIGN08"
            },
            {
              "id": "HD-DESIGN09",
              "type": "bipolar_1_7_or_undefined",
              "left": "시간보다 완성도와 디테일을 우선",
              "right": "제한된 시간·예산 안에서 속도를 우선",
              "mirrors": "D3-DESIGN09"
            },
            {
              "id": "HD-DESIGN10",
              "type": "bipolar_1_7_or_undefined",
              "left": "내부 팀에서 제작에 집중",
              "right": "외부 고객에게 직접 발표하고 설득",
              "mirrors": "D3-DESIGN10"
            }
          ]
        },
        {
          "branch": "GENERAL",
          "label": "아직 분야를 정하지 않은 탐색",
          "items": [
            {
              "id": "HD-GENERAL01",
              "type": "bipolar_1_7_or_undefined",
              "left": "주어진 작업 요청과 역할에서 시작",
              "right": "스스로 주제와 목표를 정해 시작",
              "mirrors": "D3-GENERAL01"
            },
            {
              "id": "HD-GENERAL02",
              "type": "bipolar_1_7_or_undefined",
              "left": "혼자 완결하는 작업",
              "right": "여러 사람과 분업하는 작업",
              "mirrors": "D3-GENERAL02"
            },
            {
              "id": "HD-GENERAL03",
              "type": "bipolar_1_7_or_undefined",
              "left": "완성된 결과와 품질을 우선",
              "right": "실험과 탐색 과정을 우선",
              "mirrors": "D3-GENERAL03"
            },
            {
              "id": "HD-GENERAL04",
              "type": "bipolar_1_7_or_undefined",
              "left": "일정과 업무량이 안정적인 환경",
              "right": "프로젝트마다 일정과 업무량이 달라지는 환경",
              "mirrors": "D3-GENERAL04"
            },
            {
              "id": "HD-GENERAL05",
              "type": "bipolar_1_7_or_undefined",
              "left": "고객·관람객과의 접촉이 적은 역할",
              "right": "사람에게 설명하고 반응을 받는 역할",
              "mirrors": "D3-GENERAL05"
            },
            {
              "id": "HD-GENERAL06",
              "type": "bipolar_1_7_or_undefined",
              "left": "개인적 표현을 중심으로 작업",
              "right": "다른 사람의 필요와 목적을 해결",
              "mirrors": "D3-GENERAL06"
            },
            {
              "id": "HD-GENERAL07",
              "type": "bipolar_1_7_or_undefined",
              "left": "새로운 결과물을 매번 제작",
              "right": "같은 품질로 반복 제작하고 개선",
              "mirrors": "D3-GENERAL07"
            },
            {
              "id": "HD-GENERAL08",
              "type": "bipolar_1_7_or_undefined",
              "left": "한 기술을 깊게 사용하는 역할",
              "right": "사람·일정·자원을 조율하는 역할",
              "mirrors": "D3-GENERAL08"
            },
            {
              "id": "HD-GENERAL09",
              "type": "bipolar_1_7_or_undefined",
              "left": "디지털·원격 중심의 작업",
              "right": "재료·공간·현장 중심의 작업",
              "mirrors": "D3-GENERAL09"
            },
            {
              "id": "HD-GENERAL10",
              "type": "bipolar_1_7_or_undefined",
              "left": "소속과 고정 보상이 있는 일",
              "right": "계약·프로젝트 단위로 자율성이 큰 일",
              "mirrors": "D3-GENERAL10"
            }
          ]
        }
      ]
    },
    {
      "code": "HN",
      "label": "아동·청소년 안전 규정",
      "display_title": "아이를 만나는 자리의 안전 규정",
      "scored": true,
      "mirrors": "N3",
      "condition": "HF-06 이 '만나지 않는다'가 아닐 때",
      "items": [
        {
          "id": "HN-01",
          "type": "norm_status",
          "text": "수업 후 아동이 보호자를 기다리며 혼자 남는 경우",
          "mirrors": "N3-01",
          "status_options": [
            "A 문서화된 규정이 있다",
            "B 관행은 있으나 문서는 없다",
            "C 정해진 것이 없다"
          ]
        },
        {
          "id": "HN-02",
          "type": "norm_status",
          "text": "아동을 진정시키거나 도울 때의 신체 접촉 범위",
          "mirrors": "N3-02",
          "status_options": [
            "A 문서화된 규정이 있다",
            "B 관행은 있으나 문서는 없다",
            "C 정해진 것이 없다"
          ]
        },
        {
          "id": "HN-03",
          "type": "norm_status",
          "text": "활동 사진·영상의 촬영과 외부 게시",
          "mirrors": "N3-03",
          "status_options": [
            "A 문서화된 규정이 있다",
            "B 관행은 있으나 문서는 없다",
            "C 정해진 것이 없다"
          ]
        },
        {
          "id": "HN-04",
          "type": "norm_status",
          "text": "강사와 아동·보호자 사이의 개인 연락 수단",
          "mirrors": "N3-04",
          "status_options": [
            "A 문서화된 규정이 있다",
            "B 관행은 있으나 문서는 없다",
            "C 정해진 것이 없다"
          ]
        },
        {
          "id": "HN-05",
          "type": "checklist",
          "text": "법정 경력 조회 절차",
          "options": [
            "「아동·청소년의 성보호에 관한 법률」에 따른 성범죄 경력 조회 절차가 있다",
            "「아동복지법」에 따른 아동학대관련범죄 전력 조회 절차가 있다",
            "조회 대상·시점·주체가 문서로 정해져 있다",
            "아직 확인하지 못했다"
          ]
        }
      ]
    }
  ],
  "matching_gates": [
    "HJ·HE 24축 중 '-'가 8축 이상이면 매칭을 실행하지 않는다",
    "24축 중 4(중립)가 16축 이상이면 판별력이 없어 실행하지 않는다",
    "같은 직무에 두 명 이상이 답했고, 모두 비워둔 경우가 아닌데 HP-01 선택이 겹치지 않으면 내부 조율을 먼저 요청한다"
  ]
}
;
},"reference/scoring-spec.v2.json":function(require,module,exports){
module.exports={
  "meta": {
    "standard_id": "edupin-career-scoring",
    "version": "1.0",
    "language": "ko-KR",
    "status": "pilot",
    "questionnaire_version": "1.0",
    "questionnaire_file": "questionnaire.v1.json",
    "purpose": "self_understanding_and_role_exploration",
    "prohibited_uses": [
      "clinical_diagnosis",
      "automatic_hiring_rejection",
      "candidate_ranking",
      "unvalidated_fit_percentage",
      "personality_type_label"
    ]
  },
  "calculation": {
    "round_decimals": 2,
    "missing_policy": "omit_from_mean_require_min_one",
    "reverse_1_5_formula": "6 - raw",
    "no_global_total": true,
    "operational_not_normative": true
  },
  "operational_bands": {
    "likert_tendency": [
      {
        "id": "lower_endorsement",
        "min": 1.0,
        "max": 2.49,
        "label": "비동의 응답 우세"
      },
      {
        "id": "mixed_or_middle",
        "min": 2.5,
        "max": 3.49,
        "label": "혼합·중간 응답"
      },
      {
        "id": "higher_endorsement",
        "min": 3.5,
        "max": 5.0,
        "label": "동의 응답 우세"
      }
    ],
    "notice": "운영 구간이며 규준·백분위·적성 판정이 아니다."
  },
  "scales": [
    {
      "id": "riasec.R",
      "label": "현실형",
      "items": [
        "R3-01",
        "R3-07",
        "R3-13",
        "R3-19",
        "R3-25"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "riasec.I",
      "label": "탐구형",
      "items": [
        "R3-02",
        "R3-08",
        "R3-14",
        "R3-20",
        "R3-26"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "riasec.A",
      "label": "예술형",
      "items": [
        "R3-03",
        "R3-09",
        "R3-15",
        "R3-21",
        "R3-27"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "riasec.S",
      "label": "사회형",
      "items": [
        "R3-04",
        "R3-10",
        "R3-16",
        "R3-22",
        "R3-28"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "riasec.E",
      "label": "진취형",
      "items": [
        "R3-05",
        "R3-11",
        "R3-17",
        "R3-23",
        "R3-29"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "riasec.C",
      "label": "관습형",
      "items": [
        "R3-06",
        "R3-12",
        "R3-18",
        "R3-24",
        "R3-30"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "personality.sociability",
      "label": "사교성",
      "items": [
        "B3-01",
        "B3-02",
        "B3-03",
        "B3-04"
      ],
      "reverse": [
        "B3-02",
        "B3-03"
      ],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "personality.assertiveness",
      "label": "주도성",
      "items": [
        "B3-05",
        "B3-06",
        "B3-07",
        "B3-08"
      ],
      "reverse": [
        "B3-07",
        "B3-08"
      ],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "personality.energy",
      "label": "활력",
      "items": [
        "B3-09",
        "B3-10",
        "B3-11",
        "B3-12"
      ],
      "reverse": [
        "B3-09",
        "B3-10"
      ],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "personality.trust",
      "label": "신뢰 성향",
      "items": [
        "B3-13",
        "B3-14",
        "B3-15",
        "B3-16"
      ],
      "reverse": [
        "B3-13",
        "B3-15"
      ],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "work.responsibility_execution",
      "label": "책임·실행",
      "items": [
        "W3-01",
        "W3-02"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "work.feedback_use",
      "label": "피드백 활용",
      "items": [
        "W3-03",
        "W3-04"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "work.creative_problem_solving",
      "label": "창의적 문제해결",
      "items": [
        "W3-05",
        "W3-06"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "work.collaboration_communication",
      "label": "협업·소통",
      "items": [
        "W3-07",
        "W3-08"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "work.records_detail",
      "label": "기록·세부관리",
      "items": [
        "W3-09",
        "W3-10"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "work.learning_initiative",
      "label": "학습·주도성",
      "items": [
        "W3-11",
        "W3-12"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "work.rules_safety",
      "label": "규칙·안전",
      "items": [
        "W3-13",
        "W3-14"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "work.persistence",
      "label": "지속력",
      "items": [
        "W3-15",
        "W3-16"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "work.recovery_energy",
      "label": "회복·에너지 관리",
      "items": [
        "W3-17",
        "W3-18"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "work.self_attribution",
      "label": "자기귀인·통제범위",
      "items": [
        "W3-19",
        "W3-20"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "relationship.emotional_empathy",
      "label": "정서적 공감",
      "items": [
        "P3-01",
        "P3-02"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "relationship.perspective_taking",
      "label": "관점 수용",
      "items": [
        "P3-03",
        "P3-04"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "relationship.gentle_expression",
      "label": "온화한 표현",
      "items": [
        "P3-05",
        "P3-06"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "relationship.nonjudgmental_respect",
      "label": "비판단적 존중",
      "items": [
        "P3-07",
        "P3-08"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "relationship.observational_sensitivity",
      "label": "관찰 민감성",
      "items": [
        "P3-09",
        "P3-10"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "relationship.imaginative_openness",
      "label": "상상적 개방성",
      "items": [
        "P3-11",
        "P3-12"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "relationship.emotion_regulation_patience",
      "label": "감정조절·인내",
      "items": [
        "P3-13",
        "P3-14"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "relationship.relational_warmth",
      "label": "관계적 온기",
      "items": [
        "P3-15",
        "P3-16"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "career.uncertainty_action_resources",
      "label": "불확실성 행동자원",
      "items": [
        "X3-U01",
        "X3-U02"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "career.uncertainty_waiting",
      "label": "불확실성 대기행동",
      "items": [
        "X3-U03"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency",
      "note": "단일 참고값. 채용처 리포트 제외."
    },
    {
      "id": "career.clarity_need",
      "label": "명확성 필요",
      "items": [
        "X3-U04"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency",
      "note": "단일 참고값"
    },
    {
      "id": "career.self_direction",
      "label": "진로 자기결정",
      "items": [
        "X3-D01",
        "X3-D02",
        "X3-D03",
        "X3-D04"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency"
    },
    {
      "id": "meaning.creative_design_immersion",
      "label": "창작·설계 몰입",
      "items": [
        "X3-M01"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency",
      "note": "단일 참고값"
    },
    {
      "id": "meaning.learner_growth",
      "label": "학습자 성장 의미",
      "items": [
        "X3-M02"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency",
      "note": "단일 참고값"
    },
    {
      "id": "meaning.mastery",
      "label": "숙련·전문성 의미",
      "items": [
        "X3-M03"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency",
      "note": "단일 참고값"
    },
    {
      "id": "meaning.values_alignment",
      "label": "가치·방향 일치",
      "items": [
        "X3-M04"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency",
      "note": "단일 참고값"
    },
    {
      "id": "meaning.immersion_time_awareness",
      "label": "몰입 시 시간 인지",
      "items": [
        "X3-M06"
      ],
      "reverse": [],
      "method": "mean",
      "band": "likert_tendency",
      "note": "단일 참고값"
    }
  ],
  "riasec_profile": {
    "order_for_exact_tie": [
      "R",
      "I",
      "A",
      "S",
      "E",
      "C"
    ],
    "top_code_length": 3,
    "preserve_exact_ties": true,
    "differentiation": {
      "formula": "max_minus_min",
      "bands": [
        {
          "id": "even",
          "min": 0.0,
          "max_exclusive": 0.5
        },
        {
          "id": "mild",
          "min": 0.5,
          "max_exclusive": 1.0
        },
        {
          "id": "differentiated",
          "min": 1.0,
          "max": 4.0
        }
      ],
      "notice": "파일럿 운영 표기이며 검증된 기준이 아니다."
    }
  },
  "environment_axes": {
    "E1": {
      "item": "E3-01"
    },
    "E2": {
      "item": "E3-02"
    },
    "E3": {
      "item": "E3-03"
    },
    "E4": {
      "item": "E3-04"
    },
    "E5": {
      "item": "E3-05"
    },
    "E6": {
      "item": "E3-06"
    },
    "E7": {
      "item": "E3-07"
    },
    "E8": {
      "item": "E3-08"
    },
    "E9": {
      "item": "E3-09"
    },
    "E10": {
      "item": "E3-10"
    },
    "E11": {
      "item": "E3-11"
    },
    "E12": {
      "item": "E3-12"
    }
  },
  "creative_role_axes": {
    "J1": {
      "item": "J3-01"
    },
    "J2": {
      "item": "J3-02"
    },
    "J3": {
      "item": "J3-03"
    },
    "J4": {
      "item": "J3-04"
    },
    "J5": {
      "item": "J3-05"
    },
    "J6": {
      "item": "J3-06"
    },
    "J7": {
      "item": "J3-07"
    },
    "J8": {
      "item": "J3-08"
    },
    "J9": {
      "item": "J3-09"
    },
    "J10": {
      "item": "J3-10"
    },
    "J11": {
      "item": "J3-11"
    },
    "J12": {
      "item": "J3-12"
    }
  },
  "creative_role_profile": {
    "differentiation": {
      "formula": "count(J1..J12 where abs(raw - 4) >= 2)",
      "neutral": 4,
      "bands": [
        {
          "id": "undifferentiated",
          "min": 0,
          "max": 2,
          "label": "좌표가 아직 뚜렷하지 않음"
        },
        {
          "id": "partial",
          "min": 3,
          "max": 5,
          "label": "일부 축이 뚜렷함"
        },
        {
          "id": "differentiated",
          "min": 6,
          "max": 12,
          "label": "좌표가 뚜렷함"
        }
      ],
      "notice": "분화도가 낮은 것은 결함이 아니라 경험이 아직 좁혀지지 않은 상태다."
    },
    "no_global_total": true
  },
  "branch_context": {
    "module": "D3",
    "axes_per_branch": 10,
    "evidence": {
      "values": [
        "A",
        "B",
        "C"
      ],
      "labels": {
        "A": "이 분야에서 직접 경험했다",
        "B": "다른 분야에서 비슷한 경험을 했다",
        "C": "경험 없이 예상했다"
      }
    },
    "evidence_ratio_thresholds": {
      "hypothetical_heavy": 0.7,
      "experience_anchored": 0.5
    }
  },
  "sjt": {
    "module": "S3",
    "items_per_branch": 4,
    "actions": [
      "A",
      "B",
      "C",
      "D"
    ],
    "reason_tags_max": 2,
    "free_text_required": true,
    "notice": "선택지에 총점이나 정답 점수를 부여하지 않는다. 첫 행동·이유 태그·이유 서술을 각각 별개로 코딩한다."
  },
  "safety_norms": {
    "module": "N3",
    "branches": [
      "EDU",
      "CULTURE"
    ],
    "output": {
      "metric": "safety.norm_check_gaps",
      "formula": "count(followup != '예')",
      "notice": "점수도 등급도 아니다. 경력이 짧을수록 높게 나오는 것이 정상이며 배제 근거가 아니다."
    },
    "action_scoring": false
  },
  "quality_flags": {
    "straight_lining": {
      "enabled": true,
      "minimum_consecutive_same_answers": 12,
      "meaning": "같은 값이 연속으로 이어짐. 결과 무효가 아니라 사람 검토 신호."
    },
    "extreme_endpoints": {
      "enabled": true,
      "threshold_ratio": 0.8,
      "meaning": "양극축 응답이 1 또는 7에 몰림."
    },
    "all_neutral_bipolar": {
      "enabled": true,
      "threshold_count": 16,
      "meaning": "E·J 24축 중 16축 이상이 4. 판별력 없음."
    },
    "hypothetical_heavy": {
      "enabled": true,
      "source": "branch_context.evidence_ratio"
    }
  },
  "freshness": {
    "module_decay": [
      {
        "modules": [
          "W3",
          "P3"
        ],
        "rate": "fastest",
        "reason": "문항이 최근 6개월을 기준으로 묻는다"
      },
      {
        "modules": [
          "D3"
        ],
        "rate": "fastest",
        "reason": "근거 C에서 A로의 전환이 설계 목표다"
      },
      {
        "modules": [
          "N3"
        ],
        "rate": "fast"
      },
      {
        "modules": [
          "J3"
        ],
        "rate": "fast_to_medium"
      },
      {
        "modules": [
          "X3"
        ],
        "rate": "medium"
      },
      {
        "modules": [
          "E3"
        ],
        "rate": "medium"
      },
      {
        "modules": [
          "R3"
        ],
        "rate": "slow"
      },
      {
        "modules": [
          "B3"
        ],
        "rate": "slowest"
      }
    ],
    "rank_inputs": [
      "months_elapsed",
      "creative_role.differentiation.distinct_axes",
      "branch_context.evidence_c_ratio",
      "career_change_reported"
    ],
    "double_weight_when": [
      "J_UNDIFFERENTIATED",
      "evidence_c_ratio >= 0.7"
    ],
    "notice": "신선도는 데이터의 나이에 대한 정렬이며 사람의 적합도 순위가 아니다. 일치 축 수와 곱하거나 더하지 않는다."
  },
  "employer_report_excluded_scales": [
    "personality.energy",
    "personality.trust",
    "career.uncertainty_waiting",
    "safety.norm_check_gaps"
  ]
}
;
},"engine/assessment.js":function(require,module,exports){
"use strict";
const S=require("engine/schema.js");
const present=v=>v!==undefined&&v!==null&&v!=='';
const numeric=(v,lo,hi)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi;
const rating=(v,max)=>numeric(v,1,max)&&Number.isInteger(v);
const unknown=v=>v==='U'||v==='-'||v===S.UNKNOWN;
const arrayValid=(v,opts,max)=>Array.isArray(v)&&v.every(x=>opts.includes(x))&&new Set(v).size===v.length&&(!max||v.length<=max);
const dateValid=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
function validate(res={},audience='applicant'){
 const active=S.activeItems(res,audience),errors=[],missing=[],secondaryMissing=[];
 const valid={}, known=new Set();let answered=0,requiredAnswered=0,secondaryAnswered=0;
 const err=(id,message)=>errors.push({id,message});
 for(const i of active){
  known.add(i.id);const v=res[i.id];let ok=false;
  if(!present(v)){if(i.required)missing.push(i.id);continue;}
  if(i.type==='likert_1_5')ok=rating(v,5)||unknown(v);
  else if(i.type.startsWith('bipolar'))ok=rating(v,7)||unknown(v);
  else if(i.type==='choice'){
   const opts=i.values||i.options;
   ok=i.select==='single'?opts.includes(v):arrayValid(v,opts,i.max)&&v.length>0;
   if(ok&&Array.isArray(v)&&v.length>1&&v.some(x=>/아직 관련 경험 없음|아직 잘 모르겠음/.test(x)))ok=false;
  } else if(i.type==='sjt'||i.type==='norm_check')ok=i.options.some(o=>o.key===v)||v==='U';
  else if(i.type==='priority'){
   const candidates=S.priorityCandidates(res);ok=arrayValid(v,candidates.map(x=>x.id),S.priorityMax(candidates.length));
   if(candidates.length===0&&Array.isArray(v)&&v.length)ok=false;
  } else if(i.type==='group'){
   ok=v&&typeof v==='object'&&!Array.isArray(v);let any=false;
   if(ok)for(const f of i.fields){
    const x=v[f.key];if(!present(x)||Array.isArray(x)&&!x.length){
     if(!f.optional&&['select','multi'].includes(f.type)){err(i.id,`${f.label}: 선택하거나 미정으로 표시해주세요.`);ok=false;}
     continue;
    }
    any=true;let good=true;
    if(f.type==='number')good=numeric(x,f.min,f.max);
    else if(f.type==='select')good=f.options.includes(x);
    else if(f.type==='multi'){
     good=arrayValid(x,f.options)&&x.length>0;
     if(good&&x.length>1&&x.some(t=>[S.UNKNOWN,'아직 없음','특별히 없음','별도 지원 없음'].includes(t)))good=false;
    }else if(f.type==='date')good=dateValid(x);
    else good=typeof x==='string'&&x.length<=600;
    if(!good){ok=false;err(i.id,`${f.label}: 입력 범위와 선택을 확인해주세요.`);}
   }
   if(!any)ok=false;
   if(ok&&i.id==='K3-01'&&numeric(v.minimum,0,1e8)&&numeric(v.desired,0,1e8)&&v.desired<v.minimum){ok=false;err(i.id,'희망 금액이 최소 금액보다 작습니다.');}
   if(ok&&i.id==='HK-01'&&numeric(v.minimum,0,1e8)&&numeric(v.maximum,0,1e8)&&v.maximum<v.minimum){ok=false;err(i.id,'보수 상한이 하한보다 작습니다.');}
   if(ok&&i.id==='HK-04'){
    const xs=['making','coordination','admin'].map(k=>v[k]);
    if(v.status==='입력했어요'&&(!xs.every(x=>numeric(x,0,100))||Math.abs(xs.reduce((a,b)=>a+b,0)-100)>.01)||v.status===S.UNKNOWN&&xs.some(present)){ok=false;err(i.id,'업무 비중을 모두 입력하고 합계 100으로 맞추거나, 미정을 고르고 숫자를 비워주세요.');}
   }
  }else if(i.type==='norm_status')ok=(i.status_options||i.options||[]).includes(v);
  else if(i.type==='checklist')ok=arrayValid(v,i.options)&&v.length>0;
  else ok=typeof v==='string'&&v.trim().length>0&&v.length<=(i.maxLength||600);
  if(!ok){err(i.id,'유효한 답변 형식이 아닙니다.');continue;}
  valid[i.id]=v;answered++;if(i.required)requiredAnswered++;
  const details=[];
  if(i.evidence&&!unknown(v))details.push(['evidence',['A','B','C'],true]);
  if(i.type==='sjt'&&!unknown(v))details.push(['reason_tags',S.tags,true],['evidence',['A','B','C'],true],['free_text',null,false]);
  if(i.type==='norm_check')details.push(['norm_checked',['예','아니오','잘 모르겠다'],true]);
  if(i.type==='norm_status')details.push(['policy',null,false]);
  if(i.type.startsWith('bipolar')&&v===4)details.push(['neutral_reason',S.neutralOptions,true]);
  for(const [suffix,opts,required] of details){
   const key=`${i.id}__${suffix}`,x=res[key];known.add(key);
   if(!present(x)||Array.isArray(x)&&!x.length){if(required)secondaryMissing.push(key);continue;}
   const good=suffix==='reason_tags'?arrayValid(x,opts,2)&&x.length>0:opts?opts.includes(x):typeof x==='string'&&x.length<=600;
   if(good){valid[key]=x;secondaryAnswered++;}else err(key,'추가 답변 형식이나 선택 개수를 확인해주세요.');
  }
 }
 const ignored=Object.keys(res).filter(k=>!known.has(k));
 const requiredExpected=active.filter(i=>i.required).length;
 return {valid,errors,missing,secondaryMissing,ignored,expected:active.length,answered,requiredExpected,requiredAnswered,secondaryAnswered,complete:missing.length===0&&errors.length===0&&secondaryMissing.length===0&&!!S.branchOf(res,audience)};
}
const itemMap=()=>Object.fromEntries(S.allItems('applicant').map(i=>[i.id,i]));
function assess(input={}){
 const version=input.version||null;
 const raw=input.responses||{};
 const validation=validate(raw);
 if(version!==S.version){validation.errors.push({id:'version',message:`검사 버전이 현재 구성(v${S.version})과 다릅니다. 이전 결과를 그대로 사용하지 말고 문항 구성과 응답 기록을 확인해 주세요.`});validation.complete=false;}
 const r=validation.valid,byId=itemMap(),branch=S.branchOf(r);
 const scales=S.scales.map(s=>{
  const values=s.items.filter(id=>rating(r[id],5)).map(id=>({id,value:s.reverse.includes(id)?6-r[id]:r[id]}));
  const ready=s.active&&values.length>=s.minimum_answered;
  const value=ready?Math.round(values.reduce((a,b)=>a+b.value,0)/values.length*100)/100:null;
  return {id:s.id,label:s.label,active:s.active,source_ids:s.items,answered:values.length,of:s.items.length,value,
   ...(s.revision?{revision:s.revision,note:s.note}:{}),
   status:!s.active?'이번 판에서 묻지 않음':!ready?'답변 근거 부족':values.length===1?'한 문항의 자기보고':'응답 요약',
   pattern:!ready?'unknown':values.every(v=>v.value>=4)?'high':values.every(v=>v.value<=2)?'low':'mixed',
   observation:!s.active?'다른 답변으로 이 값을 추정하거나 이전 점수를 재사용하지 않습니다.':!ready?'아직 이 부분을 설명할 답변이 충분하지 않아요.':
    s.items.length===1?`“${byId[s.items[0]].text}”에 ${value}로 답하셨어요.`:
    `‘${s.label}’에 관한 ${values.length}개 질문을 ${values.map(v=>v.value).join(' · ')}로 답하셨어요. 실제 능력이나 사람의 우열을 뜻하지 않습니다.`};
 });
 const axes=S.activeItems(r).filter(i=>i.type.startsWith('bipolar')).map(i=>{
  const v=rating(r[i.id],7)?r[i.id]:null;
  const reason=r[`${i.id}__neutral_reason`]||null;
  const comparable=v!==null&&(v!==4||reason==='두 방식 모두 괜찮아요');
  const reading=v===null?'아직 판단하기 어려움':v===4?(reason||'가운데를 고른 이유 확인 필요'):v<4?i.left:i.right;
  return {id:i.id,module:i.module,left:i.left,right:i.right,value:v,comparable,reading,neutral_reason:reason,distinct:v!==null&&Math.abs(v-4)>=2,evidence:r[`${i.id}__evidence`]||null,source_ids:[i.id]};
 });
 const scenario=S.activeItems(r).filter(i=>i.type==='sjt').map(i=>({id:i.id,title:i.title,scenario:i.scenario,
   action:i.options.find(o=>o.key===r[i.id])?.text||null,selected:r[i.id]||null,tags:r[`${i.id}__reason_tags`]||[],
   explanation:r[`${i.id}__free_text`]||null,evidence:r[`${i.id}__evidence`]||null,source_ids:[i.id,`${i.id}__reason_tags`,`${i.id}__free_text`],
   limit:'가상 상황에서 고른 첫 행동입니다. 실제 수행 능력이나 도덕성의 등급이 아닙니다.'}));
 const coreIds=S.activeItems(r).filter(i=>['R3','W3','P3','X3','J3','E3'].includes(i.module)&&i.type!=='choice').map(i=>i.id);
 const numericCore=coreIds.filter(id=>rating(r[id],byId[id].type==='likert_1_5'?5:7)).length;
 const common=axes.filter(x=>['J3','E3'].includes(x.module));
 const flags=[];
 let sameRun=0,previous=null;
 for(const id of coreIds.filter(id=>byId[id].type==='likert_1_5')){
  const v=r[id];sameRun=rating(v,5)?(v===previous?sameRun+1:1):0;previous=v;
  if(sameRun===12)flags.push('연속된 숫자 질문에 같은 답을 골랐습니다. 불성실로 단정하지 않고 실제 경험과 문항 이해를 확인합니다.');
 }
 if(common.filter(a=>a.value===4).length>=16)flags.push('가운데 응답이 많아 이유를 먼저 확인해야 합니다.');
 const vals=common.filter(a=>a.value!==null);
 if(vals.length>=12&&vals.filter(a=>a.value===1||a.value===7).length/vals.length>=.8)flags.push('양끝 응답이 많습니다. 잘못된 답으로 단정하지 않고 실제 선호인지 확인합니다.');
 if(validation.errors.length)flags.push('입력 오류를 보완해야 합니다.');
 const self_insight_ready=version===S.version&&validation.errors.length===0&&!!branch&&numericCore/coreIds.length>=.8;
 const ready=self_insight_ready&&['J3','E3'].every(m=>common.filter(a=>a.module===m&&a.comparable).length>=8);
 const counts={A:0,B:0,C:0};
 for(const a of axes.filter(a=>a.module==='D3'&&a.value!==null))if(counts[a.evidence]!==undefined)counts[a.evidence]++;
 const evidence={...counts,total:counts.A+counts.B+counts.C,scope:branch?S.labels[branch]:'미선택'};
 const profile={version,branch,r,validation,scales,axes,scenario,evidence,flags,ready,self_insight_ready,
  status:!self_insight_ready?'답변 보완 후 해석':!ready?'자기이해 요약 · 분야 추천은 추가 확인':!validation.complete?'부분 응답 · 확인 필요':'상담 검토용 초안',
  updated_at:input.assessed_at||null,conditions_updated_at:input.conditions_updated_at||null};
 return profile;
}
module.exports={assess,validate,present,rating,numeric,dateValid};

},"engine/reports.js":function(require,module,exports){
"use strict";
const S=require("engine/schema.js");
const {assess,dateValid}=require("engine/assessment.js");
const {interpret}=require("engine/interpretation.js");
const {match}=require("engine/matching.js");
const Reading=require("engine/reading.js");
function snapshot(value){
 if(Array.isArray(value))return '['+value.map(snapshot).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+snapshot(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
function freshness(date,now){
 if(!dateValid(date)||!dateValid(now))return {state:'미확인',months:null,date:date||null};
 const days=(Date.parse(now)-Date.parse(date))/86400000;
 if(days<0)return {state:'날짜 확인 필요',months:null,date};
 const months=Math.floor(days/30.44);
 return {state:months>=6?'현재 조건 재확인 필요':'기록 시점 확인됨',months,date};
}
function employerShare(value){
 if(Array.isArray(value))return value.map(employerShare);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!['source_ids','experience_source_ids','id','employer_id'].includes(key)).map(([key,item])=>[key,employerShare(item)]));
 return value;
}
function contactBrief(m,n){
 const positive=m.axes.filter(a=>a.state==='MATCH').slice(0,3);
 const conditions=m.practical.filter(p=>p.state==='NEAR');
 const checks=m.mandatory_checks.concat(m.practical.filter(p=>p.state==='UNKNOWN'&&!p.mandatory));
 let say;
 if(!m.eligible)say='대조에 필요한 답변이 아직 부족합니다. 조건이 맞는다는 제안 문장을 만들지 않습니다.';
 else if(!m.contact_allowed_by_preference)say='현재 남겨주신 제안 범위를 먼저 확인해야 합니다. 관심이나 연락 의향을 확인하기 전에는 이 자리를 권하지 않습니다.';
 else if(m.experience_requirement_needs_check)say='채용처가 경험자를 원하지만 해당 분야의 직접 경험이 확인되지 않았습니다. 성향이 비슷하다는 이유로 지원을 권하지 않고, 경험 요건과 실제 수행 경험을 먼저 확인합니다.';
 else if(m.mandatory_checks.length)say='“자리를 살펴보던 중 꼭 지키고 싶다고 하신 조건에 확인할 부분이 있었어요. 지원을 권하기 전에 그 조건부터 정확히 알아보겠습니다.”';
 else if(positive.length===0)say='“이 자리와 가까운 조건은 아직 확인하지 못했어요. 역할과 조건을 더 확인한 뒤 검토할지 함께 판단하겠습니다.”';
 else say=`“${m.label}을 살펴보며 답변과 가까운 업무 조건을 찾았어요. ${m.experience==='아직 없음'?'다만 이 분야는 아직 경험하지 않았다고 하셔서, 처음 맡을 범위와 배울 수 있는 지원을 먼저 확인하려고 합니다.':'실제로 맡을 역할과 운영 조건을 함께 확인하고 싶습니다.'} 지금 중요하게 보시는 조건과 함께 들으신 뒤, 더 알아볼지 결정하셔도 됩니다.”`;
 return {say,reasons:positive.map(a=>a.summary),confirmed_conditions:conditions.map(c=>c.detail),checks:checks.map(c=>c.detail),hesitations:m.hesitations,
  first_information:n.first_information,priorities:n.priorities,
  avoid:['검사에서 잘 맞으니 이 일을 해야 합니다.','경험이 없어도 문제가 없습니다.','조건이 좋으니 일단 지원하세요.'],
  next:m.next,rule:'제안 문장은 초안입니다. 실제 조건 확인, 현재 연락 의향, 매칭 동의, 담당자 검토를 거쳐야 합니다.'};
}
function employerDraft(m,p,n){
 const employerPractical=m.practical.map(x=>x.condition==='개인 활동 시간'?{...x,detail:'지원자의 다른 일정과 근무시간이 양립할 수 있는지 확인합니다. 개인 활동의 원문과 사정은 제공하지 않습니다.'}:x);
 const practicalQuestions=employerPractical.filter(x=>x.state!=='NEAR').map(x=>({title:x.condition,question:x.detail,source_ids:x.source_ids,category:x.mandatory?'지원자 필수 조건':'실제 조건 확인'}));
 const axisQuestions=m.axes.filter(a=>a.needs_interview).slice(0,5).map(a=>({title:a.priority?'채용처 핵심 조건':'업무 방식 확인',context:a.summary,question:a.question,listen_for:a.listen_for,source_ids:a.source_ids}));
 const scenarioQuestions=(m.field===p.branch?p.scenario:[]).filter(s=>s.action).slice(0,2).map(s=>({title:'상황과 판단 기준 확인',question:`‘${s.title}’과 비슷한 경험이 있나요? 없다면 이 상황에서 필요한 정보와 도움을 어디서 확인하시겠어요?`,source_ids:[s.id],listen_for:['직접 경험과 예상의 구분','역할 범위','먼저 고려할 기준과 이유']}));
 const normQuestions=m.safety?[{title:'안전·운영 안내',question:'이 기관의 안전·인계·사진·개인 연락 규정을 안내한 뒤, 모르는 상황에서 누구에게 확인하고 어떻게 기록할지 함께 설명해 주세요.',source_ids:['HF-06','HN-01','HN-02','HN-03','HN-04']}]:[];
 return {audience:'employer',delivery_status:'담당자 검토·공유 동의 전 초안',position_id:m.position_id,label:m.label,eligible:m.eligible,gate:m.gate,
  summary:m.priority_summary,counts:m.counts,core_conditions:m.axes.filter(a=>a.priority),
  work_style:m.axes.filter(a=>a.state==='MATCH').slice(0,4).map(a=>a.summary),
  behavioral_observations:n.cards.filter(c=>c.id==='feedback_context'||c.id==='notice_before_solution'&&m.field===p.branch).map(c=>({title:c.title,observation:c.observation,limit:c.unknown,question:c.question,source_ids:c.source_ids})),
  differences:m.axes.filter(a=>['GAP','UNKNOWN'].includes(a.state)).slice(0,5),
  practical:employerPractical,readiness:m.readiness,experience_source_ids:m.experience_source_ids,field_note:m.field_note,field_axes:m.field_axes,
  evidence:m.field===p.branch?{...p.evidence,note:'이번 직무 분야의 조건 답변이 무엇에 기반했는지 나타냅니다. 검사 전체의 신뢰도나 수행 능력 점수가 아닙니다.'}:{scope:'이번 직무 분야의 세부 답변 없음',A:0,B:0,C:0,total:0,note:'다른 분야에서 받은 경험 근거를 이 직무의 근거로 대체하지 않습니다.'},
  role_description:m.role_description,success_at_three_months:m.success_at_three_months,
  interview_questions:practicalQuestions.concat(axisQuestions,scenarioQuestions,normQuestions),
  onboarding:[m.support.detail||'초기 지원의 담당자·기간·범위를 확인해 주세요.',m.success_at_three_months||'처음 세 달의 기대 상태를 합의해 주세요.',m.adjustments?.detail||'조정 가능한 운영 조건을 구체적으로 합의해 주세요.'],
  limits:['흥미·선호·자기보고 행동은 실력이나 성과를 증명하지 않습니다.','전체 일치 개수는 채용 적합률이 아닙니다.','성격·정신건강·도덕성 등급, 자유서술 원문, 다른 자리와의 비교를 제공하지 않습니다.','아동 안전 및 직무상 필수 확인 절차를 대신하지 않습니다.']};
}
function run(input={}){
 const p=assess(input),n=interpret(p),positions=(input.positions||[]).map(x=>match(p,x));
 const now=input.now||new Date().toISOString().slice(0,10);
 const age=freshness(input.assessed_at,now),conditionAge=freshness(input.conditions_updated_at,now);
 const consent=input.consent||{};
 const review=input.review||{};
 const drafts=positions.map(m=>employerDraft(m,p,n));
 drafts.forEach((d,i)=>{d.reading=Reading.employer(d,{experienceCheck:positions[i].experience_requirement_needs_check});});
 const permission=drafts.map((d,i)=>{
  const m=positions[i],positionReview=review.positions?.[m.position_id];
  const reasons=[];
  if(!consent.matching)reasons.push('매칭 활용 동의 확인');
  if(!Array.isArray(consent.employer_position_ids)||!consent.employer_position_ids.includes(m.position_id))reasons.push('이 자리의 채용처 공유 동의 확인');
  if(!p.ready||!p.validation.complete)reasons.push('지원자 필수 답변·추가 근거 보완');
  if(!m.eligible||!m.validation.complete)reasons.push('채용처 필수 조건·추가 답변 보완');
  if(!positionReview?.reviewer_id||!dateValid(positionReview?.reviewed_at)||positionReview.reviewed_at>now||!['approved'].includes(positionReview?.status))reasons.push('자리별 담당자 검토 승인 필요');
  if(positionReview?.applicant_snapshot!==snapshot(input.responses||{})||positionReview?.position_snapshot!==snapshot(input.positions[i].responses||{}))reasons.push('현재 응답에 연결된 검토 승인 필요');
  if(m.safety&&!positionReview?.safety_checked)reasons.push('안전·운영 안내 확인');
  if(age.state!=='기록 시점 확인됨'||conditionAge.state!=='기록 시점 확인됨')reasons.push('현재 상태·조건 재확인');
  if(!m.contact_allowed_by_preference)reasons.push('현재 제안 범위·연락 의향 확인');
  return {position_id:m.position_id,allowed:reasons.length===0,reasons};
 });
 const applicant={audience:'applicant',version:S.version,status:p.status,headline:n.headline,summary:n.summary,cards:n.cards,
  preferences:n.preferences,priorities:n.priorities,meaning_choices:n.meaning_choices,first_information:n.first_information,
  own_words:n.own_words,families:n.families,next:n.next,scenario:p.scenario,axes:p.axes,scales:p.scales.filter(s=>s.active),
  practical_choices:Object.fromEntries(Object.entries(p.r).filter(([id])=>id.startsWith('K3-'))),
  updated_at:p.updated_at,field_evidence:p.evidence,
  notice:'자기보고를 바탕으로 만든 탐색 자료입니다. 진단·능력 인증·채용 판정이 아니며, 실제 경험과 조건을 함께 확인해 주세요.'};
 applicant.reading=Reading.applicant(applicant,p.self_insight_ready);
 const inventory=S.activeItems(input.responses||{}).map(i=>({id:i.id,module:i.module,prompt:i.text||i.title||`${i.left} / ${i.right}`,response:input.responses?.[i.id]??null,
  details:Object.fromEntries(Object.entries(input.responses||{}).filter(([key])=>key.startsWith(i.id+'__')).map(([key,v])=>[key.slice(i.id.length+2),v]))}));
 const edupin={audience:'edupin',status:p.status,headline:n.headline,summary:n.summary,
  preferences:n.preferences,priorities:n.priorities,first_information:n.first_information,
  current_conditions:applicant.practical_choices,own_words:n.own_words,
  positions:positions.map(m=>({...m,contact_brief:contactBrief(m,n)})),cards:n.cards,scenario:p.scenario,scales:p.scales,axes:p.axes,
  validation:p.validation,quality_flags:p.flags,evidence:p.evidence,freshness:age,conditions_freshness:conditionAge,
  inventory,unmapped:Object.fromEntries(p.validation.ignored.map(id=>[id,input.responses[id]])),
  employer_drafts:drafts,delivery_permissions:permission,
  operational_status:{usable_for_matching:p.ready&&p.validation.complete&&consent.matching===true,automatic_delivery:false,human_review_required:true},
  access_note:'전체 답변과 자유서술은 권한 있는 매칭 담당자용입니다. 실서비스에서 접근 통제·열람 기록·동의 철회·보관기간을 별도로 구현해야 합니다.'};
 edupin.reading=Reading.edupin(edupin,applicant.reading);
 // Drafts stay inside the internal report. No audience flag is an access-control substitute.
 const employer=drafts.filter((d,i)=>permission[i].allowed).map(d=>employerShare({...d,delivery_status:'공유 승인 조건 충족 · 발송하지 않음'}));
 return {version:S.version,profile:p,interpretation:n,reports:{applicant,edupin,employer},notice:'로컬 분석만 수행합니다. 저장·연락·외부 발송은 하지 않습니다.'};
}
module.exports={run,freshness,snapshot,employerShare};

},"engine/interpretation.js":function(require,module,exports){
"use strict";
const S=require("engine/schema.js");
const {experience}=require("engine/experience.js");
const catalog=[
 {id:'teaching',label:'아동·청소년 미술교육',field:'EDU',axes:[['J3-10','right'],['J3-05','right']],scale:'riasec.S',next:'아동 수업을 참관하고 준비·수업·보호자 소통에 쓰는 시간을 물어보세요. 단독 수업은 안전·운영 안내를 받은 뒤 검토합니다.'},
 {id:'adult',label:'성인 미술교육·워크숍',field:'ADULT',axes:[['J3-10','right'],['J3-05','right']],scale:'riasec.S',next:'지인과 15분짜리 모의 설명을 해보고, 설명과 개별 피드백 중 편했던 장면을 적어보세요.'},
 {id:'culture',label:'전시 해설·관람객 프로그램',field:'CULTURE',axes:[['J3-10','right'],['J3-03','left']],scale:'riasec.S',next:'전시 한 작품을 3분 안에 설명해보고, 상대가 궁금해한 지점을 기록해보세요.'},
 {id:'craft',label:'공예·제품 제작',field:'MAKE',axes:[['J3-01','right'],['J3-07','left']],scale:'riasec.R',next:'작은 결과물 하나를 정해진 재료와 시간 안에서 만들어보고, 반복 제작도 하고 싶은지 살펴보세요.'},
 {id:'digital',label:'디지털 아트·콘텐츠 제작',field:'GAME',axes:[['J3-01','left'],['J3-07','left']],scale:'riasec.A',next:'작은 디지털 결과물을 만들고 한 차례 수정해보며, 구상과 수정 중 어느 과정이 편한지 적어보세요.'},
 {id:'design',label:'목적이 분명한 디자인·콘텐츠',field:'DESIGN',axes:[['J3-03','right'],['J3-08','right']],scale:'riasec.A',next:'누구를 위한 결과물인지 정하고 작은 시안을 만든 뒤, 요청에 맞춰 수정하는 경험을 해보세요.'},
 {id:'production',label:'공연·전시 현장 제작',field:'FILM',axes:[['J3-10','right'],['J3-01','right']],scale:'riasec.R',next:'현장 담당자에게 일정·안전 교육·담당 범위를 물어보세요. 위험한 도구나 구조물 작업을 혼자 시험하지 않습니다.'},
 {id:'independent',label:'개인 창작·독립 작업',field:'INDEP',axes:[['J3-08','left'],['J3-07','left']],scale:'riasec.A',next:'개인 작업 시간을 짧게 정해 확보해보고, 제작 외 의뢰·홍보·정산까지 맡는 방식도 원하는지 살펴보세요.'},
 {id:'coordination',label:'문화·창작 프로젝트 운영',field:'CULTURE',axes:[['J3-07','right'],['J3-04','right']],scale:'riasec.C',next:'작은 공동 작업의 일정과 역할을 정리해보고, 직접 제작할 때와 다른 보람·부담을 기록해보세요.'}
];
function interpret(p){
 const r=p.r,axis=id=>p.axes.find(a=>a.id===id),scale=id=>p.scales.find(s=>s.id===id);
 const cards=[];
 const add=(id,title,observation,source_ids,unknown,question)=>cards.push({id,title,observation,source_ids,unknown,question});
 const high=id=>scale(id)?.pattern==='high';
 const both=[axis('E3-01'),axis('E3-05')];
 if(both[0]?.comparable&&both[0].value<=3&&both[1]?.comparable&&both[1].value>=5)
 add('clear_then_adapt','기준을 이해하고, 사람에 맞게 조정하고 싶어요','시작할 때는 구체적인 기준이 있는 쪽을, 운영할 때는 구성원별 속도와 방식에 맞추는 쪽을 골랐어요. 정해진 기준을 이해한 뒤 조정할 여지가 있는 환경을 살펴볼 수 있습니다.',both.map(a=>a.id),'실제로 조정해본 범위는 별도 경험 확인이 필요합니다.','기준을 지키면서 상대에 맞게 방법을 바꾼 경험이 있나요? 없다면 어느 범위까지 조정 가능한지 먼저 무엇을 확인하시겠어요?');
 if(high('work.feedback_use')&&high('relationship.perspective_taking'))
 add('feedback_context','수정하기 전에 이유를 먼저 알아보는 편이에요','수정 요청의 이유를 확인하고, 예상과 다른 결과가 나오면 상대의 의도를 묻는 행동을 자주 했다고 답했어요. 피드백의 배경을 나눌 수 있는 환경을 살펴볼 수 있습니다.',['W3-03','W3-04','P3-03','P3-04'],'빠른 마감이나 의견 충돌에서도 같은 방식인지 아직 모릅니다.','수정 이유가 분명하지 않았던 때 어떻게 확인했나요? 비슷한 경험이 없다면 어떤 정보를 먼저 요청하시겠어요?');
 if(high('meaning.creative_design_immersion')&&high('meaning.learner_growth'))
 add('create_and_help','만드는 과정과 누군가에게 닿는 결과가 함께 중요해요','창작에 깊이 몰입하는 문항과, 작업이 다른 사람에게 도움이 될 때 보람을 느끼는 문항에 모두 높은 쪽으로 답했어요. 집중해서 만들고 그 반응도 확인할 수 있는 일을 살펴볼 이유가 있습니다.',['X3-M01','X3-M02'],'두 문항의 자기보고입니다. 가르치는 능력이나 특정 대상에 대한 선호까지 확인한 것은 아닙니다.','최근 작업이 누군가에게 도움이 됐다고 느낀 순간은 언제였나요?');
 const feeling=p.scenario.filter(s=>s.action&&s.tags.includes('상대의 감정과 상태'));
 if(high('relationship.emotional_empathy')&&feeling.length)
 add('notice_before_solution','해결을 서두르기 전에 상대의 상태를 확인해요','최근 행동에서는 상대의 어려움과 걱정을 먼저 확인했다고 답했고, 상황 질문에서도 상대의 감정과 상태를 중요한 이유로 골랐어요. 서로 다른 질문에서 가까운 방향이 보입니다.',['P3-01','P3-02',...feeling.map(s=>s.id)],'가상 상황의 선택과 자기보고가 일치한다는 뜻입니다. 갈등 대응의 실력을 확인한 것은 아닙니다.','상대의 상태를 확인하면서 전체 진행도 챙겨야 할 때 무엇을 먼저 정하나요?');
 if(high('meaning.immersion_time_awareness'))
 add('time_support','집중할 때 끝나는 시각을 보이게 해두면 좋아요','몰입하면 정해둔 시간이나 다음 일정을 놓칠 때가 있다는 문항에 높은 쪽으로 답했어요. 시간표·알림·정리 시작 시점처럼 종료를 확인할 방법을 함께 살펴볼 수 있습니다.',['X3-M06'],'한 문항의 자기보고이며 시간 관리 능력 전체를 판단하지 않습니다.','마감을 지키는 데 도움이 됐던 도구나 방식이 있나요?');
 const tagGroups=S.tags.map(tag=>({tag,answers:p.scenario.filter(s=>s.action&&s.tags.includes(tag))})).filter(g=>g.answers.length>=2);
 for(const g of tagGroups.slice(0,2))add('scenario_'+S.tags.indexOf(g.tag),`상황에서 ‘${g.tag}’을 여러 번 고려했어요`,`${g.answers.length}개의 상황에서 ‘${g.tag}’을 선택 이유로 골랐어요. 같은 이유라도 첫 행동은 다를 수 있으므로, 선택한 행동과 본인의 설명을 함께 확인합니다.`,g.answers.map(s=>s.id),'이유 태그는 동기의 전부가 아닙니다. 설명하지 않은 마음을 추측하지 않습니다.',`‘${g.tag}’과 다른 조건이 부딪힐 때는 무엇을 기준으로 우선순위를 정하나요?`);
 const families=[];
 if(p.ready)for(const f of catalog){
  const evidence=f.axes.map(([id,side])=>axis(id));
  const meets=f.axes.every(([id,side])=>axis(id)?.comparable&&(side==='right'?axis(id).value>=5:axis(id).value<=3));
  const interest=scale(f.scale);
  if(!meets||interest?.value===null||interest?.value<3.5)continue;
  const experienceInfo=experience(r,f.field);
  families.push({id:f.id,label:f.label,field:f.field,relation:p.branch===f.field?'이번에 자세히 살펴본 분야':(r['F3-6']||[]).includes(S.labels[f.field])?'관심 있다고 고른 분야':'고른 분야 밖의 탐색 방향',
   reason:`‘${evidence.map(a=>a.reading).join('’, ‘')}’ 쪽의 답변과 ‘${interest.label}’ 활동에 대한 관심을 함께 살펴본 방향입니다.`,
   source_ids:[...evidence.map(a=>a.id),...interest.source_ids,...experienceInfo.source_ids],experience:experienceInfo.status,experience_summary:experienceInfo.summary,
   limit:'공통 답변에서 찾은 탐색 가설입니다. 실제 직무 역량과 분야의 세부 조건은 별도로 확인해야 합니다.',next:f.next});
 }
 const distinct=p.axes.filter(a=>['J3','E3'].includes(a.module)&&a.distinct);
 const headline=!p.self_insight_ready?'아직 나를 설명할 답변이 충분히 모이지 않았어요':cards.length?cards[0].title:distinct.length?'답변에서 편하게 느끼는 일의 조건이 보였어요':'한쪽으로 단정하기보다 조건별로 살펴볼 수 있어요';
 const summary=!p.self_insight_ready?'빠진 답과 아직 판단하기 어려운 부분을 먼저 확인해 주세요. 근거가 부족한 상태에서는 특정 분야를 추천하지 않습니다.':cards[0]?.observation||(distinct.length?`‘${distinct.slice(0,3).map(a=>a.reading).join('’, ‘')}’ 쪽을 골랐어요. 이 선호를 실제 업무와 비교하면 다음 선택의 기준을 만들 수 있습니다.`:'현재는 한쪽으로 뚜렷하게 고른 조건이 적어요. 가운데를 고른 이유와 실제 업무 조건을 함께 보며 선택 기준을 정리할 수 있습니다.');
 return {headline,summary,cards:p.self_insight_ready?cards:[],families,distinct,
  preferences:{preferred:distinct.map(a=>({text:a.reading,source_ids:[a.id]})),nonpreferred:r['K3-10']?.avoid||null,must:r['K3-10']?.must?.filter(x=>x!=='아직 없음')||[],negotiable:r['K3-10']?.negotiable||null,unknown:p.axes.filter(a=>!a.comparable).map(a=>({text:`${a.left} / ${a.right}: ${a.reading}`,source_ids:[a.id]}))},
  own_words:[['K3-08','다시 하고 싶은 경험'],['K3-09','계속하기 어려웠던 조건']].filter(([id])=>r[id]).map(([id,label])=>({id,label,text:r[id],status:'지원자 본인의 설명 · 자동 성격 판정에 사용하지 않음'})),
  next:p.ready?(families.length?families.slice(0,2).map(f=>f.next):['관심 있는 직무의 실제 하루 일정을 들어보고, 편해 보이는 장면과 더 확인하고 싶은 장면을 하나씩 적어보세요.']):['판단하기 어려웠던 질문은 경험 부족인지, 두 방식 모두 괜찮은지 구분해보세요.'],
  priorities:r['X3-D05']||[],meaning_choices:r['X3-M05']||[],first_information:r['X3-U05']||[]};
}
module.exports={interpret,catalog};

},"engine/experience.js":function(require,module,exports){
"use strict";
// F3 describes activities and overall context, not certified experience in a specific role.
const activityByField={
 EDU:['교육·워크숍·멘토링'],
 ADULT:['교육·워크숍·멘토링'],
 GAME:['게임·애니메이션·영상 제작'],
 FILM:['영화·공연·전시 현장 제작'],
 MAKE:['패션·공예·제품 제작','판매·홍보·공방 운영'],
 INDEP:['개인 창작·작품 제작','고객·의뢰인 대상 작업'],
 CULTURE:['전시·큐레이션·문화기획'],
 DESIGN:['디자인·브랜드·콘텐츠 실무']
};
const none='아직 관련 경험 없음';
const quote=xs=>xs.map(x=>`‘${x}’`).join(', ');
function experience(res={},field){
 const activities=Array.isArray(res['F3-3'])?res['F3-3']:[];
 const relationships=Array.isArray(res['F3-5'])?res['F3-5']:[];
 const duration=res['F3-4']||null;
 const relevant=activities.filter(x=>(activityByField[field]||[]).includes(x));
 const noActivities=activities.length===1&&activities[0]===none;
 const hasRelationships=relationships.some(x=>x!==none);
 const conflict=noActivities&&(duration&&duration!=='아직 없음'||hasRelationships)||duration==='아직 없음'&&(activities.some(x=>x!==none)||hasRelationships);
 const status=conflict?'응답 확인 필요':noActivities?'아직 없음':relevant.length?'관련 활동 경험 있음':'미확인';
 const source_ids=['F3-3','F3-4','F3-5'].filter(id=>res[id]!==undefined);
 const context=[
  duration?`전체 미술·창작 활동 기간은 ‘${duration}’으로 답했습니다.`:null,
  relationships.length?`전체 활동에서 경험한 협업·고객관계로 고른 항목은 ${quote(relationships)}입니다.`:null
 ].filter(Boolean);
 const first=conflict?'경험 활동·활동 기간·협업 답변 사이에 함께 확인할 내용이 있습니다.':
  noActivities?'아직 관련 활동 경험이 없다고 답했습니다.':
  relevant.length?`${quote(relevant)} 활동을 경험했다고 답했습니다.`:
  '현재 활동 답변만으로 이 분야의 경험을 확인하기 어렵습니다.';
 const limit='전체 활동 기간과 협업 경험을 이 분야의 경력으로 단정하지 않습니다. 해당 분야의 실제 역할·기간·숙련 정도는 별도로 확인합니다.';
 const audienceLimit=['EDU','ADULT'].includes(field)&&relevant.length?'교육·워크숍·멘토링 활동의 대상이 아동·청소년인지 성인인지는 추가로 확인합니다.':null;
 return {status,activities:relevant,duration,relationships,source_ids,
  summary:[first,...context,audienceLimit,limit].filter(Boolean).join(' ')};
}
module.exports={experience};

},"engine/matching.js":function(require,module,exports){
"use strict";
const S=require("engine/schema.js");
const {validate,rating,numeric,dateValid}=require("engine/assessment.js");
const {experience}=require("engine/experience.js");
const states={MATCH:'비슷함',ADJUSTABLE:'차이 있음 · 조정 여부 확인',GAP:'차이 큼',UNKNOWN:'미확인'};
const stateFor=d=>d===null?'UNKNOWN':d<=1?'MATCH':d===2?'ADJUSTABLE':'GAP';
const arr=x=>Array.isArray(x)?x:[];
const knownSet=x=>Array.isArray(x)&&x.length>0&&!x.includes(S.UNKNOWN);
function practical(p,er,position){
 const r=p.r,out=[],must=arr(r['K3-10']?.must);
 const add=(condition,state,detail,sources)=>out.push({condition,state,label:{NEAR:'조건상 가까움',DISCUSS:'협의 필요',CONFLICT:'차이 확인',UNKNOWN:'미확인'}[state],detail,mandatory:must.includes(condition),source_ids:sources});
 const pay=r['K3-01']||{},offer=er['HK-01']||{};
 if(!numeric(pay.minimum,0,1e8)||!numeric(offer.minimum,0,1e8)||!numeric(offer.maximum,0,1e8)||!pay.unit||pay.unit===S.UNKNOWN||pay.unit!==offer.unit)
  add('보수','UNKNOWN','금액 또는 보수 기준이 미정이거나 단위가 달라 직접 비교하지 않았습니다.',['K3-01','HK-01']);
 else {
  const state=offer.maximum<pay.minimum?'CONFLICT':offer.minimum<pay.minimum?'DISCUSS':'NEAR';
  add('보수',state,`지원자의 최소 조건은 ${pay.unit} ${pay.minimum.toLocaleString('ko-KR')}원, 제안 범위는 ${offer.minimum.toLocaleString('ko-KR')}~${offer.maximum.toLocaleString('ko-KR')}원입니다. 준비·정리시간 처리: ${offer.prep_paid||'미확인'}.`,['K3-01','HK-01']);
 }
 const av=r['K3-02']||{},sh=er['HK-02']||{};
 const scheduleKnown=knownSet(av.days)&&knownSet(av.times)&&knownSet(sh.days)&&knownSet(sh.times)&&numeric(av.weekly_max,0,168)&&numeric(sh.weekly_hours,0,168)&&dateValid(av.start)&&dateValid(sh.start);
 if(!scheduleKnown)add('요일·시간','UNKNOWN','요일·시간대·주당 시간·시작일 중 미정인 부분을 확인해야 합니다.',['K3-02','HK-02']);
 else {
  const fits=sh.days.every(v=>av.days.includes(v))&&sh.times.every(v=>av.times.includes(v))&&sh.weekly_hours<=av.weekly_max&&av.start<=sh.start;
  add('요일·시간',fits?'NEAR':sh.flexible==='협의 가능'?'DISCUSS':'CONFLICT',`지원자는 ${av.days.join('·')} ${av.times.join('·')}, 주 ${av.weekly_max}시간 이내, ${av.start}부터 가능합니다. 이 자리는 ${sh.days.join('·')} ${sh.times.join('·')}, 주 ${sh.weekly_hours}시간, 시작 희망일 ${sh.start}입니다. 구체적인 출퇴근 시각은 대화에서 확인합니다.`,['K3-02','HK-02']);
 }
 const ct=r['K3-03']?.types,ec=er['HK-03']||{};
 add('계약 형태',!knownSet(ct)||!ec.type||ec.type===S.UNKNOWN?'UNKNOWN':ct.includes(ec.type)?'NEAR':'CONFLICT',`지원자: ${arr(ct).join('·')||'미확인'} / 이 자리: ${ec.type||'미확인'}`,['K3-03','HK-03']);
 const mobility=r['K3-04']||{},range=arr(r['F3-9']);
 if(!r['F3-8']||!er['HF-07'])add('이동 범위','UNKNOWN','현재 거주 지역 또는 근무지가 비어 있습니다.',['F3-8','HF-07']);
 else if((range.includes('전국 — 숙소나 이동비가 지원되면')||mobility.support==='필요해요')&&er['HF-07']!==r['F3-8'])
  add('이동 범위',ec.travel_support==='지원 가능'?'DISCUSS':ec.travel_support==='지원 없음'?'CONFLICT':'UNKNOWN',`먼 지역의 일을 검토하려면 지원 조건을 맞춰야 합니다. 숙소·이동비: ${ec.travel_support||'미확인'}. 지원 가능하더라도 실제 금액과 이동 시간을 확인합니다.`,['F3-9','K3-04','HK-03']);
 else if(range.length===1&&range[0]==='지금 사는 지역 안에서만'&&r['F3-8']!==er['HF-07'])
  add('이동 범위','CONFLICT','지원자가 밝힌 거주 지역 한정 조건과 근무 지역이 다릅니다.',['F3-8','F3-9','HF-07']);
 else add('이동 범위','UNKNOWN',`거주 지역은 ${r['F3-8']}, 근무 지역은 ${er['HF-07']}입니다. ${numeric(mobility.minutes,0,600)?`편도 ${mobility.minutes}분 이내라는 조건을 실제 경로로 확인해야 합니다.`:'같은 시·도라도 통근 가능하다고 단정하지 않습니다.'} 재택 운영: ${er['HF-08']||'미확인'}.`,['F3-8','F3-9','K3-04','HF-07','HF-08']);
 add('개인 활동 시간','UNKNOWN',r['K3-05']?`지원자가 남긴 조건: “${r['K3-05']}”. 실제 일정과 함께 확인하세요.`:'함께 이어가고 싶은 활동과 시간을 아직 확인하지 않았습니다.',['K3-05','HK-02']);
 return out;
}
function match(p,position={}){
 const validation=validate(position.responses||{},'employer'),er=validation.valid;
 const field=S.branchOf(er,'employer');
 const allAxes=S.allItems('employer').filter(i=>['HJ','HE'].includes(i.module));
 const numericAxes=allAxes.filter(i=>rating(er[i.id],7));
 const unknownCount=24-numericAxes.length;
 const neutralCount=numericAxes.filter(i=>er[i.id]===4).length;
 const gate=[];
 if(position.version!==S.version)gate.push('채용처 문항 버전 재확인');
 if(!p.ready)gate.push('지원자 답변 근거 보완');
 if(validation.errors.length)gate.push('채용처 입력 오류 보완');
 if(!field)gate.push('채용 분야 확인');
 if(unknownCount>=8)gate.push('채용처 공통 조건 중 미확인 항목이 8개 이상');
 if(neutralCount>=16)gate.push('채용처의 가운데 응답이 많아 실제 운영 구분 필요');
 if(!Array.isArray(er['HP-01']))gate.push('핵심 조건을 고르거나 없음으로 확인');
 // A second respondent is independent evidence, never silently averaged.
 const disagreements=[];
 for(const respondent of position.other_respondents||[]){
  const other=validate(respondent.responses||{},'employer');
  if(other.errors.length){gate.push('다른 채용처 응답자의 입력 오류 확인');continue;}
  for(const i of allAxes)if(rating(er[i.id],7)&&rating(other.valid[i.id],7)&&Math.abs(er[i.id]-other.valid[i.id])>=2)disagreements.push(i.id);
  const ap=arr(er['HP-01']),bp=arr(other.valid['HP-01']);
  if((ap.length||bp.length)&&!ap.some(x=>bp.includes(x)))gate.push('채용처 응답자 사이 핵심 조건 합의 필요');
 }
 if(disagreements.length)gate.push('채용처 응답자 사이 실제 운영 조건 합의 필요');
 const priority=new Set(arr(er['HP-01']));
 const axes=allAxes.map(i=>{
  const a=p.axes.find(a=>a.id===i.mirrors),ev=rating(er[i.id],7)?er[i.id]:null;
  const eReason=er[`${i.id}__neutral_reason`];
  const comparable=a?.comparable&&ev!==null&&(ev!==4||eReason==='두 방식 모두 괜찮아요');
  const diff=comparable?Math.abs(a.value-ev):null,state=stateFor(diff);
  const employerReading=ev===null?'미확인':ev===4?(eReason||'가운데 이유 미확인'):ev<4?i.left:i.right;
  return {id:i.mirrors,employer_id:i.id,applicant:a?.reading||'미확인',employer:employerReading,
   state,label:states[state],priority:priority.has(i.mirrors),source_ids:[i.mirrors,i.id],
   summary:`지원자: ${a?.reading||'미확인'} / 이 자리: ${employerReading}`,
   needs_interview:priority.has(i.mirrors)||state==='GAP'||state==='UNKNOWN',
   question:state==='UNKNOWN'?`‘${i.left}’과 ‘${i.right}’의 실제 비중과 원하는 비중을 먼저 확인해 주세요.`:
    `‘${i.left}’과 ‘${i.right}’ 사이에서 실제로 어떤 역할을 맡았나요? 경험이 없다면 무엇을 먼저 확인하고 시작하시겠어요?`,
   listen_for:['본인이 맡은 역할과 실제 시간 비중','직접 경험인지 예상인지','도움이 필요한 범위와 조정 방법']};
 }).sort((a,b)=>(a.priority?0:1)-(b.priority?0:1)||['UNKNOWN','GAP','ADJUSTABLE','MATCH'].indexOf(a.state)-['UNKNOWN','GAP','ADJUSTABLE','MATCH'].indexOf(b.state));
 const details=practical(p,er,position);
 const df=p.axes.filter(a=>a.module==='D3');
 const fieldAxes=field===p.branch?df.map(a=>{
  const id=a.id.replace('D3-','HD-'),v=er[id];
  const comparable=a.comparable&&rating(v,7)&&(v!==4||er[`${id}__neutral_reason`]==='두 방식 모두 괜찮아요');
  const state=stateFor(comparable?Math.abs(a.value-v):null);
  return {id:a.id,employer_id:id,state,label:states[state],applicant:a.reading,employer:!rating(v,7)?'미확인':v===4?(er[`${id}__neutral_reason`]||'가운데 이유 미확인'):v<4?a.left:a.right,evidence:a.evidence,source_ids:[a.id,id]};
 }):[];
 const counts={MATCH:0,ADJUSTABLE:0,GAP:0,UNKNOWN:0};axes.forEach(a=>counts[a.state]++);
 const experienceInfo=experience(p.r,field),exp=experienceInfo.status,support=er['HK-05']||{};
 const openness=p.r['K3-06']?.openness;
 const allowed=openness==='조건이 맞으면 새로운 분야도'||openness==='지금 고른 분야만'&&field===p.branch||openness==='관심 있다고 고른 분야까지'&&(field===p.branch||arr(p.r['F3-6']).includes(S.labels[field]));
 const readiness=experienceInfo.summary+(support.entry==='경험자만 검토'?' 채용처는 경험자를 원합니다. 관련 활동과 성향 일치가 이 직무의 직접 경험 요건을 대신하지 않습니다.':exp==='아직 없음'?(support.entry==='가능'?' 채용처는 업계 경험이 없는 지원자도 검토한다고 답했습니다. 초기 지원 범위를 확인하세요.':' 미경험 지원자를 검토하는지 채용처 확인이 필요합니다.'):'');
 const safety=S.childContact(er,'employer')?{
  required:true,applicant_answered:S.activeItems(p.r).filter(i=>i.module==='N3').filter(i=>p.r[i.id]).length,
  employer_policies:S.allItems('employer').filter(i=>i.module==='HN').map(i=>({id:i.id,title:i.text,status:er[i.id]||'미확인',policy:er[`${i.id}__policy`]||null})),
  next:'기관의 안전·인계·연락·사진 규정을 먼저 안내하고 이해와 이행 방법을 사람이 확인합니다. 해당 문항을 답하지 않았다면 추가 안내·확인이 필요합니다.'
 }:null;
 const blockers=details.filter(d=>d.mandatory&&d.state!=='NEAR');
 return {position_id:position.position_id||null,label:er['HF-02']||'이름 미입력 직무',field,validation,eligible:gate.length===0,gate:[...new Set(gate)],disagreements:[...new Set(disagreements)],
  counts:gate.length?null:counts,axes,field_axes:fieldAxes,field_note:field!==p.branch?'선택 분야가 달라 세부 10문항은 아직 대조하지 않았습니다. 관심이 생기면 해당 분야 질문을 추가로 확인합니다.':'분야별 조건의 일치와 답의 경험 바탕을 나누어 확인합니다.',
  practical:details,mandatory_checks:blockers,experience:exp,experience_source_ids:experienceInfo.source_ids,readiness,support,
  role_description:er['HF-03']||null,success_at_three_months:er['HP-04']||null,priority_reasons:er['HP-02']||null,
  workload:er['HK-04']||null,pressures:er['HK-06']||null,adjustments:er['HK-07']||null,safety,
  contact_allowed_by_preference:!!allowed,experience_requirement_needs_check:support.entry==='경험자만 검토',hesitations:p.r['K3-06']?.hesitations||[],
  priority_summary:gate.length?'대조 전에 답변을 보완해야 합니다.':`꼭 맞아야 하는 ${axes.filter(a=>a.priority).length}가지 중 ${axes.filter(a=>a.priority&&a.state==='MATCH').length}가지가 비슷하고, ${axes.filter(a=>a.priority&&a.state==='UNKNOWN').length}가지는 미확인입니다.`,
  next:gate.length?'대조에 필요한 답변 보완':!allowed?'새 분야·연락 의향을 먼저 확인':support.entry==='경험자만 검토'?'채용처의 경험 요건부터 확인':blockers.length?'지원자의 필수 조건부터 확인':'역할·경험·운영 지원을 함께 확인',
  original_employer_responses:position.responses||{}};
}
module.exports={match,practical,stateFor};

},"engine/reading.js":function(require,module,exports){
"use strict";
// Presentation only. Never changes scores, recommendation eligibility, consent, or raw answers.
const version='3.5';
const copy={
 create_and_help:{title:'만드는 즐거움과 누군가에게 도움이 되는 보람이 함께 있어요',paragraphs:[
  '무언가를 구상하고 실제 형태로 만드는 과정에 깊이 몰입한다고 답했어요. 그렇게 만든 작업이 다른 사람의 이해나 경험에 도움이 될 때에도 의미를 크게 느끼셨고요.',
  '앞으로 일을 살펴볼 때는 무엇을 만들게 되는지뿐 아니라, 그 결과가 누구에게 어떻게 닿는지도 함께 물어보세요. 두 가지를 함께 볼 때 내가 원하는 일의 모습이 조금 더 구체적으로 보일 수 있어요.']},
 notice_before_solution:{title:'사람을 도울 때는 먼저 그 사람의 상태를 살피는 편이에요',paragraphs:[
  '누군가 어려움을 겪을 때 걱정이나 상태를 먼저 확인하는 행동을 자주 했다고 답했어요. 상황 질문에서도 상대의 감정과 상태를 중요한 이유로 골랐고요.',
  '문제를 해결하는 방법만큼, 지금 상대가 어떤 상태인지도 중요하게 보는 모습이에요. 실제 일을 알아볼 때는 상대를 살필 시간과 전체 진행을 함께 챙길 방법이 있는지 들어보면 좋겠어요.']},
 feedback_context:{title:'무엇을 바꿀지 알기 전에, 왜 바꾸는지 이해하고 싶어요',paragraphs:[
  '수정 요청을 받으면 원하는 결과와 그 이유를 먼저 확인하는 편이라고 답했어요. 예상과 다를 때 상대의 의도를 묻는 행동도 자주 했고요.',
  '함께 일할 곳을 살펴본다면 “수정이 필요할 때 배경도 함께 설명해주시나요?”라고 물어보세요. 피드백을 어떻게 나누는지 알면 그곳에서 일하는 모습을 그려보는 데 도움이 될 거예요.']},
 clear_then_adapt:{title:'처음의 기준은 분명하고, 사람에 맞게 조정할 여지도 있으면 좋겠어요',paragraphs:[
  '처음에는 무엇을 해야 하는지 구체적으로 안내받는 쪽을 골랐어요. 일을 진행할 때는 구성원마다 속도와 방법을 다르게 조정하는 쪽에 마음이 갔고요.',
  '두 답이 반대되는 것은 아니에요. 출발점은 함께 이해하되, 진행하는 방법까지 모두 같을 필요는 없다는 뜻으로 읽어볼 수 있어요. “꼭 지켜야 할 기준과 조정할 수 있는 범위는 어디까지인가요?”를 확인해보세요.']},
 time_support:{title:'집중하는 시간에는, 마무리할 때를 알려주는 장치를 곁에 두세요',paragraphs:[
  '몰입하다 보면 정해둔 시간이나 다음 일정을 놓칠 때가 있다고 답했어요. 시간 관리 전체를 평가하기보다, 집중할 때 무엇이 도움이 되는지 살펴볼 단서로 읽으면 좋겠어요.',
  '알림을 켜두거나 정리를 시작할 시각을 미리 정하는 것처럼, 나에게 맞았던 방법을 떠올려보세요. 새로운 일을 시작할 때도 그 방법을 사용할 수 있는지 확인해볼 수 있어요.']}
};
const quote=xs=>xs.map(x=>`‘${x}’`).join(', ');
const block=(text,source_ids=[])=>({text,source_ids});
function card(c,audience='applicant'){
 const id=c.id||(c.source_ids?.includes('W3-03')?'feedback_context':c.source_ids?.includes('P3-01')?'notice_before_solution':null);
 const third={
  create_and_help:{title:'만드는 과정과 누군가에게 도움이 되는 결과를 함께 중요하게 여겨요',paragraphs:['지원자는 작업을 구상해 실제 형태로 만드는 과정에 몰입하고, 그 작업이 다른 사람에게 도움이 될 때 의미를 느낀다고 답했어요.','상담에서는 하고 싶은 작업과 그 결과를 나누고 싶은 대상을 함께 들어보세요. 이 답만으로 가르치는 능력이나 특정 대상에 대한 선호까지 알 수 있는 것은 아니에요.']},
  notice_before_solution:{title:'문제를 풀기 전에 상대의 상태를 먼저 살피려는 모습이 보여요',paragraphs:['지원자는 최근 행동에서 상대의 걱정과 상태를 먼저 확인하는 편이라고 답했어요. 상황 질문에서도 상대의 감정과 상태를 중요한 이유로 골랐고요.','실제 역할에서는 상대를 살피는 일과 전체 진행을 어떻게 함께 챙겼는지 들어보세요. 경험이 없다면 어떤 정보와 도움을 먼저 구할지 물어볼 수 있어요.']},
  feedback_context:{title:'수정하기 전에 그 이유를 먼저 이해하려는 모습이 보여요',paragraphs:['지원자는 수정 요청의 이유와 원하는 결과를 먼저 확인하는 행동을 자주 했다고 답했어요. 예상과 다를 때 상대의 의도를 묻는 편이라고도 했고요.','함께 일한다면 수정 방향뿐 아니라 배경도 나눌 수 있는지 살펴보세요. 마감이 빠르거나 의견이 다를 때는 어떻게 했는지 별도로 들어보면 좋겠어요.']},
  clear_then_adapt:{title:'처음의 기준과 진행 중 조정할 여지를 함께 원해요',paragraphs:['지원자는 시작할 때 구체적인 기준을 안내받고, 진행할 때는 사람마다 속도와 방법을 조정하는 쪽을 골랐어요.','상담에서는 꼭 지켜야 할 기준과 조정 가능한 범위를 나누어 설명해 주세요. 지원자가 실제로 조정해본 경험은 따로 확인하면 좋겠습니다.']},
  time_support:{title:'집중할 때 마무리 시각을 어떻게 챙기는지 들어보세요',paragraphs:['지원자는 몰입하면 정해둔 시간이나 다음 일정을 놓칠 때가 있다고 답했어요. 한 문항의 답이므로 시간 관리 능력 전체로 넓혀 판단하지는 않습니다.','마감이나 종료 시각을 챙기는 데 도움이 됐던 방법을 물어보세요. 새로운 자리에서도 그 방법을 쓸 수 있는지 함께 확인할 수 있습니다.']}
 };
 const words=audience==='applicant'?copy[id]:third[id];
 return {...c,title:words?.title||c.title,paragraphs:words?.paragraphs||[c.observation],
  basis:c.observation,limit:c.unknown||c.limit};
}
function axisStory(axes,module){
 const found=axes.filter(a=>a.module===module&&a.distinct&&a.comparable).slice(0,3);
 if(!found.length)return block(module==='J3'?'일의 모습은 아직 한쪽으로 뚜렷하게 모이지 않았어요. 실제 하루의 업무를 들어보면서 끌리는 장면과 부담스러운 장면을 하나씩 골라보세요.':'일하는 환경은 실제 운영 방식을 들어보며 더 살펴볼 수 있어요. 지금 한쪽을 정하지 않았다고 해서 선호가 없는 것은 아니에요.');
 return block(`${module==='J3'?'일의 모습을 고를 때는':'함께 일할 환경에서는'} ${quote(found.map(a=>a.reading))} 쪽에 마음이 갔어요. ${module==='J3'?'직무 이름이 같아도 맡는 일은 다를 수 있으니, 이런 활동이 실제 하루에 얼마나 포함되는지 물어보세요.':'공고에 적힌 분위기보다 실제로 어떻게 운영하는지 들어보면 나와 가까운 환경인지 판단하기가 쉬워져요.'}`,found.map(a=>a.id));
}
function applicant(a,ready){
 const cards=a.cards.map(c=>card(c)),by=id=>cards.find(c=>c.id===id);
 const meaningful=by('create_and_help'),people=by('notice_before_solution'),environment=by('clear_then_adapt');
 const order=['create_and_help','notice_before_solution','feedback_context','clear_then_adapt','time_support'];
 const ordered=cards.slice().sort((x,y)=>(order.includes(x.id)?order.indexOf(x.id):99)-(order.includes(y.id)?order.indexOf(y.id):99));
 let headline='내가 편하게 일할 조건을, 하나씩 알아가고 있어요',paragraphs=[];
 if(!ready){headline='아직은 이야기를 조금 더 들어보고 싶어요';paragraphs=[block('지금 모인 답변만으로는 어떤 일을 좋아하고 어떤 환경이 편한지 충분히 설명하기 어려워요. 답할 수 있는 질문부터 조금 더 채워주세요. 경험이 없어 판단하기 어려운 질문은 그대로 남겨두셔도 괜찮아요.')];}
 else if(meaningful&&people){
  headline='만드는 일에 깊이 몰입하고, 사람의 상태도 살피는 편이에요';
  paragraphs=[block('답변을 함께 놓고 보니, 무언가를 구상해 실제 형태로 만드는 과정과 그 일이 누군가에게 도움이 되는 순간을 모두 중요하게 여기고 있었어요. 만드는 과정에 집중하면서, 그 결과가 사람에게 어떻게 닿는지도 함께 보고 싶은 모습이에요.',meaningful.source_ids),block('사람을 도울 때에도 해결 방법을 바로 제시하기보다 상대의 어려움과 상태를 먼저 확인하는 쪽으로 답했어요. 일을 고를 때는 무엇을 만드는지, 누구와 어떻게 만나게 되는지를 함께 살펴보면 좋겠어요.',people.source_ids)];
 }else if(ordered.length){headline=ordered[0].title;paragraphs=ordered[0].paragraphs.map(t=>block(t,ordered[0].source_ids));}
 else paragraphs=[block('이번 답변에서는 어떤 조건이 더 편한지 차근차근 살펴볼 수 있었어요. 지금의 선택을 한 가지 유형으로 묶기보다, 실제 일을 고를 때 가져갈 기준으로 정리해볼게요.')];
 const work=ready?axisStory(a.axes,'J3'):block('답변이 더 모이면 편하게 느끼는 일의 모습을 함께 정리해드릴게요.');
 const place=ready?axisStory(a.axes,'E3'):block('일하는 곳에서 중요하게 여기는 조건도 아직 더 들어보고 싶어요.');
 const keypoints=[];
 if(ready&&meaningful)keypoints.push({label:'보람을 느끼는 순간',text:'만드는 과정에 몰입하고, 작업이 누군가에게 도움이 될 때',source_ids:meaningful.source_ids});
 if(ready&&environment)keypoints.push({label:'편하게 시작할 환경',text:'처음의 기준은 분명하고, 사람에 맞게 진행 방법을 조정할 수 있는 곳',source_ids:environment.source_ids});
 if(a.priorities.length)keypoints.push({label:'먼저 챙길 선택 기준',text:a.priorities[0],source_ids:['X3-D05']});
 const uncertain=a.axes.filter(x=>['J3','E3'].includes(x.module)&&!x.comparable);
 const uncertainty=uncertain.length?'아직 판단을 열어둔 조건도 있어요. 양쪽 모두 괜찮은지, 상황마다 다른지, 경험이 더 필요한지에 따라 다음에 확인할 것도 달라져요. 아래에 남긴 답의 이유를 보면서 하나씩 살펴보면 됩니다.':'지금 고른 조건이 앞으로도 늘 같아야 하는 것은 아니에요. 새로운 경험을 한 뒤 더 편하게 느끼는 방식이 생기면, 그 변화도 나를 이해하는 데 도움이 됩니다.';
 return {version,ready,headline,paragraphs,keypoints,work,place,environment,
  lead_card_ids:!ready?[]:meaningful&&people?['create_and_help','notice_before_solution']:ordered.length?[ordered[0].id]:[],
  chapters:ordered.filter(c=>c.id!=='clear_then_adapt'&&c.id!=='time_support'),support:by('time_support')||null,
  uncertainty,closing:'모든 내용을 한 번에 실천할 필요는 없어요. 마음에 남는 기준 하나를 다음 선택에 써보세요. 그 일이 나에게 어땠는지 살펴보는 것부터 시작하면 됩니다.'};
}
function edupin(b,a){
 const ready=a.ready,meaningful=b.cards.find(c=>c.id==='create_and_help');
 const paragraphs=[];
 if(!ready)paragraphs.push(block('지원자의 이야기를 정리하기에는 답변이 아직 부족합니다. 특정 자리를 권하기보다 빠진 답과 지금 구직을 원하는지부터 확인해 주세요.'));
 else if(meaningful)paragraphs.push(block('이 지원자는 무언가를 만드는 과정에 몰입하고, 자신의 작업이 다른 사람에게 도움이 될 때 의미를 느낀다고 답했습니다. 상담에서는 하고 싶은 작업과 사람을 만나는 방식을 함께 들어보면 좋겠습니다.',meaningful.source_ids));
 else paragraphs.push(block('지원자가 편하게 느끼는 업무와 환경을 먼저 정리했습니다. 같은 직무 이름이라도 실제 역할은 다를 수 있으니, 아래의 선호와 현재 조건을 함께 놓고 보세요.'));
 if(b.priorities.length)paragraphs.push(block(`일을 고를 때는 ${quote(b.priorities)} 순서로 중요하게 골랐습니다. 대화를 시작할 때 첫 번째 기준부터 실제로 어떤 조건을 원하는지 물어봐 주세요.`,['X3-D05']));
 return {version,headline:ready?'이 지원자가 원하는 일부터, 함께 그려보세요':'자리를 권하기 전에, 지원자의 이야기를 더 들어주세요',paragraphs,
  keypoints:a.keypoints,chapters:b.cards.map(c=>card(c,'edupin'))};
}
const practicalQuestions={
 '보수':'실제로 제안할 보수와 준비·정리시간의 보수 처리는 어떻게 정해져 있나요?',
 '요일·시간':'실제 출퇴근 시각과 주당 시간, 시작일을 함께 맞춰볼 수 있을까요?',
 '계약 형태':'어떤 계약 형태로 함께할 수 있고, 협의할 여지는 어디까지인가요?',
 '이동 범위':'실제 근무지와 이동 시간, 필요한 이동 지원을 함께 확인해볼까요?',
 '개인 활동 시간':'근무 일정과 이미 정해진 다른 일정이 겹치지 않는지 함께 확인해볼까요?'
};
function interview(q){return {...q,spoken_question:practicalQuestions[q.title]||q.question};}
function coreStory(a){
 const start=`채용처가 특히 중요하게 본 것은 ‘${a.employer}’ 방식이에요.`;
 let text;
 if(a.state==='MATCH')text=`${start} 지원자도 ‘${a.applicant}’ 쪽을 편하게 느낀다고 답해서, 이 조건은 서로 잘 맞습니다.`;
 else if(a.state==='ADJUSTABLE')text=`${start} 지원자는 ‘${a.applicant}’ 쪽에 조금 더 가까워요. 서로 다른 부분은 있지만, 실제 역할에서 어느 정도 조정할 수 있는지 이야기해볼 수 있습니다.`;
 else if(a.state==='GAP')text=`${start} 반면 지원자는 ‘${a.applicant}’ 쪽을 편하게 느낀다고 답했어요. 이 차이는 입사 뒤의 불편으로 이어질 수 있어, 실제 업무 비중과 조정 가능 범위를 먼저 확인해야 합니다.`;
 else text=`${start} 지원자는 ‘${a.applicant}’라고 답해 아직 같은 방향인지 판단하기 어려워요. 실제 하루의 운영 방식을 설명한 뒤, 비슷한 경험에서 어떤 쪽이 편했는지 들어봐 주세요.`;
 return {id:a.id,title:a.employer,state:a.state,label:a.label,text,applicant:a.applicant,employer:a.employer,source_ids:a.source_ids};
}
function employerTrait(c){
 if(c.source_ids?.includes('W3-03'))return {kind:'behavior',title:'수정 요청의 배경을 먼저 확인합니다',text:'원하는 결과와 이유를 확인하고, 예상과 다르면 상대의 의도를 묻는 편이라고 답했어요.',source_ids:c.source_ids};
 if(c.source_ids?.includes('P3-01'))return {kind:'behavior',title:'문제를 풀기 전에 상대의 상태를 살핍니다',text:'해결을 서두르기보다 무엇이 어려운지 먼저 듣고, 전체 진행과 함께 챙기려는 답이 반복해서 나타났어요.',source_ids:c.source_ids};
 const x=card(c,'employer');
 return {kind:'behavior',title:x.title,text:x.paragraphs[0],source_ids:x.source_ids};
}
function employer(c,{experienceCheck=false}={}){
 const essential=c.core_conditions,near=essential.filter(x=>x.state==='MATCH'),different=essential.filter(x=>['GAP','ADJUSTABLE'].includes(x.state)),unknown=essential.filter(x=>x.state==='UNKNOWN');
 const required=c.practical.filter(x=>x.mandatory&&x.state!=='NEAR');
 const adjustable=essential.filter(x=>x.state==='ADJUSTABLE').length,gap=essential.filter(x=>x.state==='GAP').length;
 let headline,paragraphs=[],decision='검토 가능',tone='good';
 if(c.gate.length){decision='비교 보류';tone='pending';headline='아직은 이 지원자의 부합 정도를 판단하기 어렵습니다';paragraphs=[block('비교에 필요한 답이 충분히 모이지 않았어요. 빠진 내용을 먼저 확인하면, 중요 조건이 어디에서 맞고 다른지 같은 기준으로 보여드릴게요.')];}
 else {
  if(experienceCheck){decision='경험 요건 확인';tone='caution';headline='업무 방식보다, 현재 모집 직무의 경험 요건을 먼저 확인해야 합니다';}
  else if(required.length){decision='필수 조건 확인';tone='caution';headline='지원자가 꼭 지키려는 조건부터 맞춰봐야 합니다';}
  else if(essential.length&&near.length===essential.length){decision='핵심 조건 모두 부합';headline=`중요하게 고른 ${essential.length}가지 조건에 모두 부합하는 지원자입니다`;}
  else if(near.length){decision='핵심 조건 부분 부합';tone=different.length?'caution':'pending';headline=`중요하게 고른 ${essential.length}가지 중 ${near.length}가지 조건에 부합합니다`;}
  else if(different.length){decision='중요한 차이 확인';tone='caution';headline='중요하게 고른 조건과 다른 부분이 있습니다';}
  else if(unknown.length){decision='추가 확인 필요';tone='pending';headline='중요한 조건은 답을 조금 더 들어봐야 판단할 수 있습니다';}
  else {decision='전체 조건 검토';tone='pending';headline='현재 모집 직무의 조건과 지원자의 답변을 함께 살펴봤습니다';}
  if(experienceCheck)paragraphs.push(block('현재 모집 직무는 경험자를 원한다고 답했지만, 지원자의 해당 분야 직접 경험은 아직 확인되지 않았어요. 업무 방식이 가까워 보이더라도 이 요건을 대신할 수는 없으니, 검토 가능한 경력 범위부터 확인해 주세요.',[...(c.experience_source_ids||[]),'HK-05']));
  if(essential.length){
   const result=[`같은 방향 ${near.length}가지`,different.length?`서로 다른 방향 ${different.length}가지`:null,unknown.length?`확인 필요 ${unknown.length}가지`:null].filter(Boolean).join(', ');
   paragraphs.push(block(`채용처에서 꼭 맞아야 한다고 고른 조건은 ${quote(essential.map(a=>a.employer))}이었어요. 지원자의 답과 하나씩 맞춰보니 ${result}로 확인됐어요. 아래에서 어떤 답이 어떻게 맞았는지 바로 설명드릴게요.`,essential.flatMap(a=>a.source_ids)));
  }
  else paragraphs.push(block('꼭 맞아야 하는 조건은 따로 고르지 않으셨어요. 그래서 특정 조건에 대한 합격·불합격보다, 모집 직무의 운영 방식과 지원자가 편하게 느끼는 방식을 전체적으로 맞춰봤습니다.'));
  if(required.length)paragraphs.push(block(`지원자가 꼭 지키고 싶다고 한 ${quote(required.map(x=>x.condition))}에도 확인할 부분이 있어요. 업무 방식이 가까워 보이더라도, 이 조건이 맞는지 먼저 알아봐 주세요.`,required.flatMap(x=>x.source_ids)));
 }
 const questions=c.interview_questions.map(interview);
 const first=experienceCheck?{title:'경험 요건',spoken_question:'해당 분야의 직접 경험이 확인되지 않은 지원자도 검토할 수 있나요? 필요한 경력과 실제로 맡을 역할부터 확인해 주세요.',source_ids:[...(c.experience_source_ids||[]),'HK-05']}:
  questions.find(q=>q.category==='지원자 필수 조건')||questions.find(q=>q.title==='채용처 핵심 조건')||questions[0]||null;
 const conditionStories=essential.map(coreStory);
 const behaviorStrengths=c.behavioral_observations.map(employerTrait);
 const conditionStrengths=conditionStories.filter(x=>x.state==='MATCH').map(x=>({kind:'condition',title:x.title,text:`채용처와 지원자가 모두 ‘${x.employer}’ 방식을 골랐어요. 중요하게 보는 운영 방식과 지원자의 선호가 같습니다.`,source_ids:x.source_ids}));
 const strengths=(behaviorStrengths.length?behaviorStrengths:conditionStrengths).slice(0,3);
 const watchouts=[];
 for(const text of c.gate)watchouts.push({kind:'gate',title:'비교에 필요한 답변',text});
 if(experienceCheck)watchouts.push({kind:'experience',title:'직접 경험 요건',text:'현재 모집 직무는 경험자를 원하지만 지원자의 해당 분야 직접 경험은 아직 확인되지 않았어요. 검토 가능한 경력 범위부터 확인해야 합니다.'});
 for(const x of required)watchouts.push({kind:'required',title:`지원자의 필수 조건 · ${x.condition}`,text:x.detail,source_ids:x.source_ids});
 for(const x of conditionStories.filter(x=>x.state!=='MATCH'))watchouts.push({kind:x.state.toLowerCase(),title:x.title,text:x.text,source_ids:x.source_ids});
 for(const x of c.differences.filter(x=>!x.priority&&!essential.some(a=>a.id===x.id)))watchouts.push({kind:x.state.toLowerCase(),title:x.employer,text:coreStory(x).text,source_ids:x.source_ids});
 for(const x of c.practical.filter(x=>!x.mandatory&&x.state!=='NEAR'))watchouts.push({kind:x.state.toLowerCase(),title:x.condition,text:x.detail,source_ids:x.source_ids});
 return {version,headline,paragraphs,first_question:first,questions,condition_stories:conditionStories,
  overview:{decision,tone,matched:near.length,total:essential.length,adjustable,gap,unknown:unknown.length,strengths,watchouts:watchouts.slice(0,4),note:'여기서 부합은 같은 질문에서 채용처의 운영 방식과 지원자의 선호가 같은 방향이라는 뜻이에요. 실무 능력이나 다른 지원자보다 낫다는 순위는 아닙니다.'},
  experience_intro:'선호가 잘 맞더라도 실제로 맡아본 역할과 익숙한 업무 범위는 따로 확인해야 해요. 지원자가 이 분야를 어느 정도 경험했는지부터 짧게 살펴보세요.',
  difference_intro:'차이가 있다는 이유만으로 함께 일하기 어렵다고 정할 필요는 없어요. 다만 서로 맞춰갈 수 있는 부분인지, 실제로 바꿀 수 없는 조건인지는 대화로 확인해야 해요.',
  interview_intro:'모범 답안을 듣기보다, 실제로 맡았던 일과 그때의 판단을 들어보세요. 경험하지 않은 상황이라면 무엇을 먼저 확인하고 어떤 도움을 요청할지 물어보셔도 좋아요.',
  onboarding_intro:'함께하기로 한다면, 처음부터 모두 알아서 해내기를 기대하기보다 맡을 범위와 도움받을 방법을 먼저 맞춰주세요. 아래는 채용처가 남긴 운영 조건을 바탕으로 이야기해볼 내용이에요.'};
}
module.exports={version,card,applicant,edupin,employer,interview};

},"engine/samples.js":function(require,module,exports){
"use strict";
const S=require("engine/schema.js");
const clone=x=>JSON.parse(JSON.stringify(x));
function fill(audience,branch){
 const r=audience==='applicant'?{'F3-7':branch,'F3-10':branch==='EDU'?'예':'아니오'}:{'HF-05':branch,'HF-06':branch==='EDU'?'정기적으로 만난다':'만나지 않는다'};
 let ordinal=0;
 for(const i of S.activeItems(r,audience)){
  if(r[i.id]!==undefined)continue;
  // Fixture-only historical offset: shortening R3 must not change later sample answers.
  if(audience==='applicant'&&i.module==='R3'){
   r[i.id]=[3,4,4,3,5][(Number(i.id.slice(3))-1)%5];ordinal=30;
  }else if(i.type==='likert_1_5')r[i.id]=[3,4,4,3,5][ordinal++%5];
  else if(i.type.startsWith('bipolar'))r[i.id]=[3,6,5,2,6,3,5,4][ordinal++%8];
  else if(i.type==='choice')r[i.id]=i.select==='single'?(i.values||i.options)[0]:[(i.values||i.options)[0]];
  else if(i.type==='sjt'||i.type==='norm_check')r[i.id]='A';
  else if(i.type==='group'){
   r[i.id]={};for(const f of i.fields){
    if(f.type==='select')r[i.id][f.key]=f.options.includes(S.UNKNOWN)?S.UNKNOWN:f.options[0];
    else if(f.type==='multi')r[i.id][f.key]=[f.options.includes(S.UNKNOWN)?S.UNKNOWN:f.options[0]];
   }
  }else if(i.type==='priority')r[i.id]=[];
  else if(i.type==='norm_status')r[i.id]=(i.status_options||i.options)[0];
  else if(i.type==='checklist')r[i.id]=[i.options[0]];
  else r[i.id]='가상 예시: 담당 범위와 진행 기준을 함께 확인합니다.';
 }
 return details(r,audience);
}
function details(r,audience='applicant'){
 for(const i of S.activeItems(r,audience)){
  if(i.type.startsWith('bipolar')&&r[i.id]===4)r[`${i.id}__neutral_reason`]='두 방식 모두 괜찮아요';
  if(i.evidence)r[`${i.id}__evidence`]='A';
  if(i.type==='sjt'){
   r[`${i.id}__reason_tags`]=['상대의 감정과 상태','전체 진행과 흐름'];
   r[`${i.id}__evidence`]='B';
   r[`${i.id}__free_text`]='먼저 상대가 무엇 때문에 막혔는지 듣고, 남은 시간에 할 수 있는 범위를 함께 정하고 싶습니다.';
  }
  if(i.type==='norm_check')r[`${i.id}__norm_checked`]='잘 모르겠다';
  if(i.type==='norm_status')r[`${i.id}__policy`]='가상 예시: 담당자에게 인계하고 기관의 안내 절차를 확인합니다.';
 }
 return r;
}
function applicant(kind='artist'){
 const branch=kind==='teacher'?'EDU':kind==='open'?'GENERAL':'INDEP';
 const r=fill('applicant',branch);
 r['F3-6']=kind==='open'?['아직 잘 모르겠음']:['작가·프리랜서·독립 스튜디오','성인 미술교육·워크숍'];
 r['F3-8']='서울특별시';r['F3-9']=['수도권 전역'];
 Object.assign(r,{
  'F3-3':kind==='teacher'?['개인 창작·작품 제작','교육·워크숍·멘토링']:['개인 창작·작품 제작'],
  'F3-4':'1년 이상~3년 미만',
  'F3-5':kind==='teacher'?['혼자 완결하는 개인 작업','관람객·사용자·학습자를 위한 작업']:['혼자 완결하는 개인 작업'],
  'K3-01':{unit:'시급',minimum:25000,desired:30000},
  'K3-02':{days:['월','수','금'],times:['오후'],weekly_max:18,start:'2026-10-01',note:'개인 작업과 병행하고 싶어요.'},
  'K3-03':{types:['시간제','프리랜서·프로젝트']},
  'K3-04':{minutes:60,support:'필요해요'},
  'K3-05':'화·목 저녁에는 개인 창작 시간을 지키고 싶어요.',
  'K3-06':{openness:kind==='open'?'지금은 결과만 보고 싶어요':'조건이 맞으면 새로운 분야도',hesitations:['업무 경험 부족','개인 작업과 병행','교육·적응 지원']},
  'K3-08':'함께 작업하던 사람이 설명을 듣고 자기 방식으로 결과를 바꿨을 때 보람이 있었어요.',
  'K3-09':'작업 시간이 갑자기 바뀌어 개인 작업과 겹칠 때 계속하기 어려웠어요.',
  'K3-10':{must:['보수','요일·시간'],avoid:'사전 안내 없이 일정이 자주 바뀌는 운영',negotiable:'보고 주기와 초기 업무 범위는 설명을 듣고 협의할 수 있어요.'},
  'X3-U05':['업무 범위와 역할','업무 진행 방식'],
  'X3-D05':['일정의 안정성'],
  'X3-M05':['사람의 경험·이해·성장을 돕는 것']
 });
 // Use actual choice labels from the canonical bank, not plausible but invalid labels.
 const item=id=>S.allItems('applicant').find(i=>i.id===id);
 r['X3-U05']=[item('X3-U05').options[0],item('X3-U05').options[1]];
 r['X3-D05']=[item('X3-D05').options[2],item('X3-D05').options[0],item('X3-D05').options[4]];
 r['X3-M05']=[item('X3-M05').options[0],item('X3-M05').options[1]];
 const J=[6,6,2,3,6,3,3,4,4,6,3,5],E=[3,5,3,3,6,6,5,4,5,5,6,5];
 J.forEach((v,i)=>r[`J3-${String(i+1).padStart(2,'0')}`]=kind==='open'?4:v);
 E.forEach((v,i)=>r[`E3-${String(i+1).padStart(2,'0')}`]=kind==='open'?4:v);
 for(const id of ['P3-01','P3-02','P3-03','P3-04','W3-03','W3-04','X3-M01','X3-M02'])r[id]=4;
 r['X3-M06']=4;
 const sc=S.scales.find(s=>s.id==='riasec.S');sc.items.forEach((id,i)=>r[id]=i===0?3:4);
 details(r);
 if(kind==='open')for(const i of S.activeItems(r).filter(i=>i.type.startsWith('bipolar'))){r[i.id]=4;r[`${i.id}__neutral_reason`]='경험이 부족해서 판단하기 어려워요';}
 return r;
}
function employer(field='EDU'){
 const r=fill('employer',field);
 Object.assign(r,{
  'HF-02':field==='EDU'?'가상 아틀리에 · 아동미술 수업 담당':'가상 문화공간 · 성인 워크숍 담당',
  'HF-03':'소규모 수업의 준비·진행·정리를 맡습니다. 초반에는 담당자와 함께하고, 수업 전후 진행 내용을 나눕니다.',
  'HF-07':'서울특별시','HF-08':'전일 출근',
  'HK-01':{unit:'시급',minimum:28000,maximum:32000,prep_paid:'별도 지급'},
  'HK-02':{days:['월','수','금'],times:['오후'],weekly_hours:15,start:'2026-10-05',flexible:'협의 가능'},
  'HK-03':{type:'시간제',travel_support:'지원 없음',location_note:'가상 서울 근무지. 실제 통근 경로 확인 필요.'},
  'HK-04':{status:'입력했어요',making:70,coordination:20,admin:10},
  'HK-05':{entry:'가능',supports:['초기 동행·보조','기본 커리큘럼·예시','정기 피드백','안전·운영 교육'],detail:'가상 조건: 첫 2주 동행, 주 1회 담당자 피드백. 실제 구인 조건이 아닙니다.'},
  'HK-06':'여러 참여자의 진행 속도가 달라 설명과 개별 지원을 나누어야 할 때가 있습니다.',
  'HK-07':{flexible_axes:['보고 주기','진행 방법','초기 교육 기간'],detail:'초기 교육 기간과 보고 형식은 담당자와 협의할 수 있는 가상 예시입니다.'},
  'HP-02':'수업 준비와 진행을 직접 맡는 비중이 큽니다.',
  'HP-04':'가상 기대: 세 달 뒤에는 기준과 안전 절차를 확인하며 수업 한 회차를 준비부터 정리까지 운영합니다.'
 });
 const source=applicant('artist');
 for(const i of S.allItems('employer').filter(i=>['HJ','HE'].includes(i.module)))r[i.id]=source[i.mirrors];
 r['HJ-07']=6;
 r['HP-01']=S.priorityCandidates(r).slice(0,3).map(x=>x.id);
 return {version:S.version,position_id:field==='EDU'?'DEMO-EDU':'DEMO-ADULT',responses:details(r,'employer')};
}
function samples(){
 return [
  {id:'artist',label:'개인 작업을 이어가며 새 분야를 살펴보는 사람',input:{version:S.version,responses:applicant('artist'),positions:[employer('EDU'),employer('ADULT')],assessed_at:'2026-09-05',conditions_updated_at:'2026-09-05',now:'2026-09-05',consent:{matching:true,employer_position_ids:[]}}},
  {id:'teacher',label:'교육 활동 경험이 있는 사람',input:{version:S.version,responses:applicant('teacher'),positions:[employer('EDU')],assessed_at:'2026-09-05',conditions_updated_at:'2026-09-05',now:'2026-09-05'}},
  {id:'open',label:'아직 방향을 판단하기 어려운 사람',input:{version:S.version,responses:applicant('open'),positions:[employer('EDU')],now:'2026-09-05'}},
  {id:'empty',label:'답변 없음 · 해석 보류 확인',input:{version:S.version,responses:{},positions:[employer('EDU')],now:'2026-09-05'}}
 ];
}
module.exports={samples,applicant,employer,fill,details,clone};

},"tools/ui.js":function(require,module,exports){
"use strict";
const S=require("engine/schema.js");
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pretty=x=>Array.isArray(x)?x.join(' · '):x===null||x===undefined||x===''?'미확인':typeof x==='object'?Object.entries(x).map(([k,v])=>`${k}: ${pretty(v)}`).join(' / '):String(x);
const list=(xs,empty='아직 확인된 내용이 없습니다.')=>xs?.length?`<ul>${xs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:`<p class="muted">${esc(empty)}</p>`;
const section=(n,title,content)=>`<section class="report-section"><div class="section-label">${esc(n)}</div><h2>${esc(title)}</h2>${content}</section>`;
const sources=ids=>`<details class="source"><summary>궁금하다면, 어떤 답에서 나왔는지 보기</summary><p>${esc((ids||[]).join(' · '))}</p><p>아래 상세 근거에서 같은 문항 ID의 답을 찾아볼 수 있어요.</p></details>`;
const note=t=>`<p class="note">${esc(t)}</p>`;
function conditionList(choices){
 const out=[];
 for(const i of S.allItems('applicant').filter(i=>i.module==='K3'&&!['K3-08','K3-09'].includes(i.id))){
  const v=choices?.[i.id];if(v===undefined)continue;
  out.push(`<div><dt>${esc(i.text)}</dt><dd>${i.fields?i.fields.filter(f=>v[f.key]!==undefined&&v[f.key]!=='').map(f=>`<span class="condition-line"><b>${esc(f.label)}</b> ${esc(pretty(v[f.key]))}</span>`).join(''):esc(pretty(v))}</dd></div>`);
 }
 return out.length?`<dl class="conditions">${out.join('')}</dl>`:note('현재 선택 조건은 아직 입력되지 않았습니다.');
}
function evidenceBlock(c){return `<article class="insight"><h3>${esc(c.title)}</h3><p>${esc(c.observation)}</p><p class="muted"><b>더 확인할 부분</b> ${esc(c.unknown||c.limit)}</p>${sources(c.source_ids)}</article>`;}
function scaleTable(scales){
 return `<div class="table-wrap"><table class="dense"><caption>응답 요약 · 능력·성격의 우열 점수가 아닙니다.</caption><thead><tr><th>항목</th><th>응답 평균</th><th>근거</th><th>상태</th></tr></thead><tbody>${scales.map(s=>`<tr><td>${esc(s.label)}<small>${esc(s.id)}</small></td><td>${s.value===null?'—':esc(s.value)}</td><td>${s.answered} / ${s.of}<small>${esc(s.source_ids.join(' · '))}</small></td><td>${esc(s.status)}${s.note?`<small>${esc(s.note)}</small>`:''}</td></tr>`).join('')}</tbody></table></div>`;
}
function axisTable(axes){return `<div class="table-wrap"><table class="dense"><thead><tr><th>살펴본 조건</th><th>내 답변</th><th>답의 바탕</th></tr></thead><tbody>${axes.map(a=>`<tr><td>${esc(a.left)}<br>↔ ${esc(a.right)}<small>${esc(a.id)}</small></td><td>${esc(a.reading)}<small>${a.value===null?'숫자 판단 보류':`선택 ${a.value} / 7`}</small></td><td>${esc({A:'직접 경험',B:'비슷한 경험',C:'경험 없이 예상'}[a.evidence]||'공통 선호 응답')}</td></tr>`).join('')}</tbody></table></div>`;}
function scenarios(xs){return xs.map(s=>`<details class="scenario"><summary>${esc(s.title)} · ${esc({A:'직접 경험',B:'비슷한 경험',C:'예상'}[s.evidence]||'근거 미확인')}</summary><p>${esc(s.scenario)}</p><dl class="conditions"><div><dt>먼저 고른 행동</dt><dd>${esc(s.action||'미응답')}</dd></div><div><dt>고른 이유</dt><dd>${esc(s.tags.join(' · ')||'미응답')}</dd></div><div><dt>직접 쓴 설명</dt><dd class="quote">${esc(s.explanation||'추가 설명 없음')}</dd></div></dl>${note(s.limit)}${sources(s.source_ids)}</details>`).join('');}
function preferences(p,applicant=false){return `<div class="preference-columns"><div><h3>${applicant?'마음이 가는 조건':'선호하는 조건'}</h3>${list(p.preferred.slice(0,5).map(x=>x.text),'아직 뚜렷하게 고른 조건은 없어요.')}${p.preferred.length>5?`<details><summary>마음이 간 다른 조건도 보기</summary>${list(p.preferred.slice(5).map(x=>x.text))}</details>`:''}</div><div><h3>피하고 싶은 조건</h3><p>${esc(p.nonpreferred||'아직 따로 남기지 않았어요. 좋아하는 조건의 반대를 싫어한다고 단정하지는 않을게요.')}</p><h3>이야기해보고 정할 수 있는 부분</h3><p>${esc(p.negotiable||'아직 따로 남기지 않았어요.')}</p></div></div><p><b>꼭 지키고 싶은 조건</b> ${esc(p.must.join(' · ')||'아직 따로 고르지 않았어요.')}</p>`;}
function practicalTable(rows){return `<div class="table-wrap"><table><thead><tr><th>조건</th><th>확인 상태</th><th>양쪽의 답변</th></tr></thead><tbody>${rows.map(c=>`<tr><td>${esc(c.condition)}${c.mandatory?'<small>지원자 필수</small>':''}</td><td><span class="status ${esc(c.state.toLowerCase())}">${esc(c.label)}</span></td><td>${esc(c.detail)}</td></tr>`).join('')}</tbody></table></div>`;}
function matchAxes(axes){return `<div class="match-lines">${axes.map(a=>`<div class="match-line"><span class="status ${esc(a.state.toLowerCase())}">${esc(a.label)}${a.priority?' · 핵심':''}</span><p><b>지원자</b> ${esc(a.applicant)}<br><b>채용처</b> ${esc(a.employer)}</p></div>`).join('')}</div>`;}
function inventoryTable(xs){return `<div class="table-wrap"><table class="dense"><thead><tr><th>문항</th><th>원응답과 추가 답변</th></tr></thead><tbody>${xs.map(i=>`<tr><td>${esc(i.prompt)}<small>${esc(i.id)}</small></td><td>${esc(pretty(i.response))}${Object.entries(i.details).map(([key,v])=>`<small>${esc(key)}: ${esc(pretty(v))}</small>`).join('')}</td></tr>`).join('')}</tbody></table></div>`;}
function employerQuestionnaireReport(res){
 const active=S.activeItems(res,'employer');
 const axisReading=i=>{
  const value=res[i.id];
  return typeof value!=='number'?'아직 미정':value===4?(res[i.id+'__neutral_reason']||'양쪽이 비슷함'):value<4?i.left:i.right;
 };
 const rows=items=>`<dl class="conditions">${items.map(i=>{
  const value=res[i.id];
  const label=(i.type.startsWith('bipolar')?`${i.left} / ${i.right}`:i.text||i.title||'운영 조건').replace(/이 자리/g,'모집 직무');
  const displayValue=i.values?(i.options[i.values.indexOf(value)]||value):value;
  const answer=i.type.startsWith('bipolar')?esc(axisReading(i)):i.fields?i.fields.filter(f=>value[f.key]!==undefined&&value[f.key]!==null&&value[f.key]!=='').map(f=>`<span class="condition-line"><b>${esc(f.label)}</b> ${esc(pretty(value[f.key]))}</span>`).join(''):esc(pretty(displayValue));
  return `<div><dt>${esc(label)}</dt><dd>${answer}</dd></div>`;
 }).join('')}</dl>`;
 const priority=Array.isArray(res['HP-01'])?active.filter(i=>res['HP-01'].includes(i.mirrors)&&['HJ','HE'].includes(i.module)):[];
 const priorityBody=priority.length?list(priority.map(axisReading)):note(Array.isArray(res['HP-01'])?'꼭 맞아야 할 조건을 따로 지정하지 않았습니다.':'꼭 맞아야 할 조건은 아직 고르지 않았습니다.');
 const sections=S.employer.map((m,n)=>{
  const items=active.filter(i=>i.module===m.code&&i.id!=='HP-01'&&res[i.id]!==undefined);
  if(!items.length&&m.code!=='HP')return '';
  return section(String(n+1).padStart(2,'0'),m.display_title.replace(/이 자리/g,'모집 직무'),(m.code==='HP'?priorityBody:'')+rows(items));
 }).join('');
 return `<article class="reading-report" data-reading="employer" data-employer-summary><div class="report-lead"><span class="eyebrow">채용처 · 직무와 조직 운영</span><h1>${esc(res['HF-02']||'우리 직무와 조직의 운영 요약')}</h1><p>작성한 채용처 답변으로 실제 업무와 조직 운영 조건을 정리했어요. 지원자 답변을 함께 입력하면 직무 비교 결과도 볼 수 있습니다.</p></div>${sections||note('채용처 질문지에 답변을 입력하면 이곳에 요약이 표시됩니다.')}</article>`;
}
const readingLayout=require("tools/reading-layout.js")({esc,pretty,list,sources,note,conditionList,evidenceBlock,scaleTable,axisTable,scenarios,preferences,practicalTable,matchAxes,inventoryTable});
module.exports={esc,pretty,employerQuestionnaireReport,...readingLayout};

},"tools/reading-layout.js":function(require,module,exports){
"use strict";
module.exports=function(U){
 const {esc,pretty,list,sources,note,conditionList,evidenceBlock,scaleTable,axisTable,scenarios,preferences,practicalTable,matchAxes,inventoryTable}=U;
 const prose=blocks=>blocks.map(b=>`<p>${esc(typeof b==='string'?b:b.text)}</p>`).join('');
 const employerWords=value=>Array.isArray(value)?value.map(employerWords):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,employerWords(item)])):typeof value==='string'?value.replace(/이 자리/g,'모집 직무'):value;
 const chapter=(id,n,title,body)=>`<section class="report-section" id="${id}"><span class="section-label">${esc(n)}</span><h2>${esc(title)}</h2>${body}</section>`;
 const fold=(title,body,cls='')=>`<details class="reading-detail ${cls}"><summary>${esc(title)}</summary>${body}</details>`;
 const glance=rows=>rows.length?`<dl class="reading-glance">${rows.map(r=>`<div><dt>${esc(r.label)}</dt><dd>${esc(r.text)}</dd></div>`).join('')}</dl>`:'';
 const guide=rows=>`<nav class="reading-guide" aria-label="해설지 읽는 순서">${rows.map(([id,t])=>`<a href="#${id}">${esc(t)}</a>`).join('')}</nav>`;
 const lead=(who,r,showSources=true)=>`<div class="report-lead"><span class="eyebrow">${esc(who)}</span><h1>${esc(r.headline)}</h1>${prose(r.paragraphs)}${showSources&&r.paragraphs.some(p=>p.source_ids?.length)?sources([...new Set(r.paragraphs.flatMap(p=>p.source_ids||[]))]):''}</div>`;
 const statement=(title,text)=>`<aside class="reading-callout"><span>${esc(title)}</span><p>${esc(text)}</p></aside>`;
 const story=c=>`<article class="insight"><h3>${esc(c.title)}</h3>${prose(c.paragraphs||[c.observation])}${fold('이 이야기를 읽을 때 함께 알아둘 점',`<p>${esc(c.basis||c.observation)}</p><p>${esc(c.limit||c.unknown)}</p>${sources(c.source_ids)}`,'story-basis')}</article>`;
 const wrap=(audience,body)=>`<article class="reading-report" data-reading="${audience}">${body}</article>`;
 const pointList=(items,empty)=>items.length?`<div class="summary-points">${items.map(x=>`<article class="summary-point"><span>${esc({behavior:'지원자의 특성',condition:'중요 조건',experience:'경험 확인',required:'필수 조건',gate:'답변 확인',gap:'차이 큼',adjustable:'조율 가능',unknown:'미확인'}[x.kind]||'확인할 점')}</span><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p></article>`).join('')}</div>`:`<p class="summary-empty">${esc(empty)}</p>`;
 const interestOrder=[['riasec.R','R'],['riasec.I','I'],['riasec.A','A'],['riasec.S','S'],['riasec.E','E'],['riasec.C','C']];
 const interestProfile=(scales,compact=false)=>{
  const rows=interestOrder.map(([id,code])=>{const scale=(scales||[]).find(x=>x.id===id);return {id,code,label:scale?.label||code,value:typeof scale?.value==='number'?scale.value:null,answered:scale?.answered||0,of:scale?.of||4};});
  const cx=210,cy=184,radius=118,angle=i=>(-90+i*60)*Math.PI/180,point=(i,ratio)=>`${(cx+Math.cos(angle(i))*radius*ratio).toFixed(1)},${(cy+Math.sin(angle(i))*radius*ratio).toFixed(1)}`;
  const grid=[1,2,3,4,5].map(level=>`<polygon class="interest-grid${level===5?' outer':''}" points="${rows.map((_,i)=>point(i,level/5)).join(' ')}"></polygon>`).join('');
  const axes=rows.map((_,i)=>`<line class="interest-axis" x1="${cx}" y1="${cy}" x2="${point(i,1).replace(',','" y2="')}"></line>`).join('');
  const known=rows.filter(x=>x.value!==null),complete=known.length===6;
  const shape=complete?`<polygon class="interest-data" points="${rows.map((x,i)=>point(i,x.value/5)).join(' ')}"></polygon>`:'';
  const dots=known.map(x=>{const i=rows.indexOf(x),[x1,y1]=point(i,x.value/5).split(',');return `<circle class="interest-dot" cx="${x1}" cy="${y1}" r="4.5"></circle>`;}).join('');
  const labels=rows.map((x,i)=>{const ratio=1.31,[x1,y1]=point(i,ratio).split(',').map(Number),cos=Math.cos(angle(i)),anchor=Math.abs(cos)<.2?'middle':cos>0?'start':'end';return `<text class="interest-chart-label" x="${x1}" y="${y1}" text-anchor="${anchor}"><tspan x="${x1}">${esc(x.label)} ${x.code}</tspan><tspan class="interest-chart-value" x="${x1}" dy="18">${x.value===null?'확인 전':pretty(x.value)}</tspan></text>`;}).join('');
  const missing=rows.filter(x=>x.value===null).map(x=>x.label);
  const titleId=`interest-profile-${compact?'edupin':'applicant'}`;
  return `<section class="interest-profile${compact?' compact':''}" data-interest-profile aria-labelledby="${titleId}"><div class="interest-profile-heading"><span>활동 흥미</span><${compact?'h3':'h2'} id="${titleId}">6영역 프로필</${compact?'h3':'h2'}><p>어떤 활동에 마음이 가는지를 여섯 방향으로 보여드려요.</p></div><div class="interest-profile-body"><div class="interest-chart-wrap"><svg class="interest-chart" viewBox="0 0 420 365" role="img" aria-labelledby="${titleId}-svg-title ${titleId}-svg-desc"><title id="${titleId}-svg-title">6영역 프로필 그래프</title><desc id="${titleId}-svg-desc">${esc(rows.map(x=>`${x.label} ${x.value===null?'확인 전':pretty(x.value)}`).join(', '))}</desc>${grid}${axes}${shape}${dots}${labels}</svg></div><div class="interest-profile-side"><dl class="interest-values">${rows.map(x=>`<div><dt>${esc(x.label)} <small>${x.code}</small></dt><dd class="${x.value===null?'unknown':''}">${x.value===null?'확인 전':pretty(x.value)}<small>${x.answered} / ${x.of}</small></dd></div>`).join('')}</dl><p class="interest-scale">1 관심이 적은 편 · 3 중간 · 5 관심이 큰 편</p><p class="interest-note">${missing.length?`답변이 부족한 ${missing.join('·')}은 ‘확인 전’으로 남기고, 그래프 선을 임의로 이어 붙이지 않았어요.`:'점수가 높을수록 그 영역의 활동에 관심을 보인 답변이 많았다는 뜻이에요.'} 능력이나 채용 적합도 순위는 아닙니다.</p></div></div></section>`;
 };
 function employerOverview(r){
  const o=r.overview,segments=r.condition_stories.map(x=>`<span class="${esc(x.state.toLowerCase())}" title="${esc(x.title+' · '+x.label)}"></span>`).join('');
  const score=o.total?`<div class="match-score"><strong>${o.matched}<small>/ ${o.total}</small></strong><span>중요 조건 부합</span><div class="fit-segments" aria-label="중요 조건 ${o.total}개 중 ${o.matched}개 부합">${segments}</div></div>`:
   `<div class="match-score empty"><strong>—</strong><span>꼭 맞아야 할 조건을 따로 고르지 않음</span></div>`;
  return `<section class="employer-overview" aria-label="지원자 핵심 요약"><div class="decision-line ${esc(o.tone)}"><span>한눈에 보는 결론</span><strong>${esc(o.decision)}</strong></div><div class="overview-scoreboard">${score}<dl class="match-counts"><div><dt>같은 방향</dt><dd>${o.matched}</dd></div><div><dt>조율할 조건</dt><dd>${o.adjustable}</dd></div><div><dt>차이 큰 조건</dt><dd>${o.gap}</dd></div><div><dt>더 확인할 조건</dt><dd>${o.unknown}</dd></div></dl></div><div class="summary-columns"><section class="summary-column strength"><span class="column-label">답변에서 파악한 지원자의 특성</span>${pointList(o.strengths,'뚜렷하게 요약할 특성은 아직 없어요. 실제 경험을 먼저 들어봐 주세요.')}</section><section class="summary-column caution"><span class="column-label">채용 전 확인할 점</span>${pointList(o.watchouts,'현재 답변에서 큰 차이는 보이지 않았어요. 실제 수행 경험과 역할 범위는 면접에서 확인해 주세요.')}</section></div><p class="overview-note">${esc(o.note)}</p></section>`;
 }
 const coreStories=rows=>rows.length?`<div class="core-story-grid">${rows.map((x,i)=>`<article class="core-story ${esc(x.state.toLowerCase())}"><div class="core-story-head"><span>${String(i+1).padStart(2,'0')}</span><b class="status ${esc(x.state.toLowerCase())}">${esc(x.label)}</b></div><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p><dl><div><dt>지원자의 답</dt><dd>${esc(x.applicant)}</dd></div><div><dt>채용처의 답</dt><dd>${esc(x.employer)}</dd></div></dl></article>`).join('')}</div>`:statement('먼저 정할 것','꼭 맞아야 하는 조건을 따로 고르지 않으셨어요. 실제 역할에서 가장 중요한 운영 방식부터 정한 뒤 지원자의 답과 비교해 주세요.');
 function applicantReport(a){
  const r=a.reading;
  const own=a.own_words.map(w=>`<div class="own-words"><h3>${esc(w.label)}</h3><p class="quote">${esc(w.text)}</p></div>`).join('');
  const familyCards=a.families.map(f=>`<article class="direction"><div class="direction-head"><h3>${esc(f.label)}</h3><span>${esc(f.relation)}</span></div><p>${esc(f.reason)}</p><p class="experience-line">${esc(f.experience_summary)}</p>${fold('이 방향을 살펴본 이유와 답변',`<p>${esc(f.limit)}</p>${sources(f.source_ids)}`)}</article>`).join('');
  const environmental=r.environment?story(r.environment):prose([r.place])+sources(r.place.source_ids);
  const remaining=r.chapters.filter(c=>!r.lead_card_ids.includes(c.id));
  const main=remaining.slice(0,2),more=remaining.slice(2);
  return wrap('applicant',lead('지원자 · 나의 일 이야기',r)+glance(r.keypoints)+interestProfile(a.scales)+
   guide([['a-person','내 모습'],['a-work','편한 일과 환경'],['a-choice','선택 기준'],['a-directions','살펴볼 방향'],['a-next','다음 한 걸음']])+
   chapter('a-person','01 · 나를 이해하기','답변 속에서 이런 모습도 함께 보였어요',main.map(story).join('')+(more.length?fold('답변에서 함께 보인 다른 모습',more.map(story).join('')):'')+(!main.length?prose(['아직은 한 가지 모습으로 설명하기보다, 어떤 조건에 마음이 가는지부터 살펴보면 좋겠어요.']):''))+
   chapter('a-work','02 · 일하는 모습을 그려보기','좋아하는 일도, 어떤 환경에서 하느냐가 중요해요',prose([r.work])+sources(r.work.source_ids)+environmental)+
   chapter('a-choice','03 · 나의 선택 기준','자리를 고를 때는, 내가 중요하게 여긴 것부터 챙겨보세요',
    prose([a.priorities.length?'여러 조건 중에서도 먼저 챙기고 싶은 순서를 골라주셨어요. 공고를 읽을 때 이 순서대로 살펴보고, 적혀 있지 않다면 직접 물어보세요.':'지금 가장 중요한 조건을 아직 정하지 않았다면, 실제 자리를 보며 하나씩 골라가도 괜찮아요.'])+
    glance(a.priorities.map((text,i)=>({label:`${i+1}순위`,text})))+preferences(a.preferences,true)+
    (own?`<h3>직접 남겨주신 경험도 함께 읽어보세요</h3>${prose(['숫자 답변만으로 담기 어려운 장면을 직접 적어주셨어요. 그때 무엇이 좋았고 무엇이 어려웠는지 떠올리며, 다음 일에서도 챙기고 싶은 조건을 찾아보세요.'])}${own}`:'')+
    (a.meaning_choices.length?`<h3>일에서 이런 순간에 의미를 느껴요</h3>${list(a.meaning_choices)}`:'')+
    fold('보수·일정·계약 등 내가 남긴 조건 모두 보기',conditionList(a.practical_choices)))+
   chapter('a-directions','04 · 가능성을 넓혀보기','이런 일의 모습도 한 번 살펴보세요',
    prose(['아래는 답변에서 찾은 탐색 방향이에요. 순서가 적합도 순위는 아니고, 하나를 골라야 하는 것도 아니에요. 마음이 가는 일이 있다면 실제 역할과 근무 조건부터 들어보세요.'])+
    (familyCards||prose(['현재 답변으로 특정 방향을 제안하기는 어려워요. 우선 관심 있는 일의 하루를 들어보며, 좋아 보이는 장면과 더 알고 싶은 부분을 하나씩 골라보세요.'])))+
   chapter('a-ask','05 · 직접 이야기해보기','이 질문부터 꺼내보면 대화가 조금 쉬워질 거예요',
    prose(['처음부터 무엇을 다 물어봐야 할지 고민하지 않아도 괜찮아요. 궁금하다고 고른 내용부터 이야기해보세요.'])+
    list(a.first_information.map(t=>`“${t}은 실제로 어떻게 운영되나요?”`),'먼저 알고 싶은 조건 하나를 골라 질문해보세요.')+
    (a.cards.length?fold('나의 경험을 돌아보며 준비할 질문',list(a.cards.slice(0,2).map(c=>c.question))):''))+
   chapter('a-next','06 · 나에게 맞는 다음 한 걸음','작은 경험 하나로, 지금보다 조금 더 알아갈 수 있어요',
    (r.support?story(r.support):'')+list(a.next)+prose([r.uncertainty])+statement('마지막으로 기억해 주세요',r.closing))+
   fold('궁금할 때 펼쳐보는 나의 답변과 상세 근거',`${axisTable(a.axes)}${scenarios(a.scenario)}${scaleTable(a.scales)}${note(a.notice)}`,'appendix')+
   `<p class="reading-footnote">이 결과는 직접 답한 내용을 바탕으로 나를 이해하는 자료예요. 실력이나 채용 결과를 정하는 판정은 아니며, 실제 경험과 조건을 함께 살펴보세요.</p>`);
 }
 function positionStory(m){
  const meaningful=m.axes.filter(a=>a.priority&&a.state!=='MATCH');
  const key=!m.eligible?'지금은 이 자리를 권하기보다 비교에 필요한 답변을 먼저 보완해 주세요.':!m.contact_allowed_by_preference?'지원자가 제안받고 싶은 범위와 현재 연락 의향을 먼저 확인해 주세요.':m.experience_requirement_needs_check?'채용처의 경험 요건과 지원자의 실제 경험부터 확인해 주세요. 선호가 가깝다는 이유로 경험 요건을 대신하지 않습니다.':m.mandatory_checks.length?`지원자가 꼭 지키고 싶다고 한 ${m.mandatory_checks.map(p=>p.condition).join('·')}부터 확인해 주세요. 그 조건이 맞는지 알기 전에는 지원을 서두르지 않는 편이 좋겠습니다.`:
   meaningful.length?'중요하게 고른 조건 중 차이가 있거나 아직 모르는 부분이 있습니다. 아래 대화에서 그 조건부터 구체적으로 들어보세요.':'실제 역할과 근무 조건을 설명한 뒤, 지원자가 더 알아보고 싶은지 들어보세요.';
  return `<article class="position"><div class="direction-head"><h3>${esc(m.label)}</h3><span class="status">${esc(m.next)}</span></div>${m.gate.length?statement('지금은 이 내용부터 확인해 주세요',m.gate.join(' · ')):''}<p>${esc(key)}</p><p>${esc(m.readiness)}</p>
   <div class="talk"><span class="eyebrow">대화를 시작한다면</span><p class="quote">${esc(m.contact_brief.say)}</p></div>
   ${m.contact_brief.checks.length?`<h4>제안하기 전에 먼저 확인해 주세요</h4>${list(m.contact_brief.checks)}`:''}
   ${fold('제안의 근거와 피할 표현 함께 보기',`<h4>가까운 업무 방식</h4>${list(m.contact_brief.reasons)}<h4>확인된 근무 조건</h4>${list(m.contact_brief.confirmed_conditions)}<h4>지원자가 먼저 궁금해한 것</h4>${list(m.contact_brief.first_information)}<h4>이런 표현은 피해주세요</h4>${list(m.contact_brief.avoid)}<p class="muted">${esc(m.contact_brief.rule)}</p>`)}
   ${fold('양쪽의 실제 조건을 나란히 비교하기',`<p>${esc(m.priority_summary)}</p>${practicalTable(m.practical)}${matchAxes(m.axes)}`)}
   ${fold('업무 내용과 처음 받을 수 있는 지원',`<p>${esc(m.role_description||'맡을 업무는 아직 더 확인해야 합니다.')}</p><h4>세 달 뒤 기대하는 모습</h4><p>${esc(m.success_at_three_months||'처음 맡을 범위와 이후 기대를 함께 정해 주세요.')}</p><h4>업무에 쓰는 시간</h4><p>${esc(m.workload?`직접 수행 ${m.workload.making??'미정'}% · 조율 ${m.workload.coordination??'미정'}% · 기타 ${m.workload.admin??'미정'}%`:'업무별 시간 비중을 아직 확인하지 못했습니다.')}</p><h4>초기에 받을 수 있는 도움</h4>${list(m.support.supports)}<p>${esc(m.support.detail||'도움받을 기간과 담당 범위를 더 들어봐 주세요.')}</p><h4>현장의 어려움과 조정할 수 있는 부분</h4><p>${esc(m.pressures||'현장의 어려움은 아직 듣지 못했습니다.')}</p><p>${esc(m.adjustments?.detail||'조정할 수 있는 범위를 먼저 확인해 주세요.')}</p>${note(m.field_note)}${matchAxes(m.field_axes)}`)}
   ${m.safety?statement('아동·청소년을 만나는 일이라면 꼭 확인해 주세요',m.safety.next):''}</article>`;
 }
 function edupinReport(b){
  const r=b.reading;
  const quick=glance([{label:'지키려는 필수 조건',text:b.preferences.must.join(' · ')||'아직 따로 지정하지 않았습니다.'},{label:'분야 답변의 바탕',text:`직접 경험 ${b.evidence.A} · 비슷한 경험 ${b.evidence.B} · 예상 ${b.evidence.C} (${b.evidence.scope})`},{label:'조건을 확인한 날짜',text:b.conditions_freshness.date||'현재 조건을 다시 확인해 주세요.'}]);
  const ops=`<p>필수 문항 ${b.validation.requiredAnswered} / ${b.validation.requiredExpected} · 추가 답변 ${b.validation.secondaryAnswered}개</p>${list(b.validation.errors.map(e=>e.message),'입력 형식에서 확인할 오류는 없습니다.')}${b.validation.missing.length?note(`필수 미응답 ${b.validation.missing.length}개`):''}${b.validation.secondaryMissing.length?note(`경험 근거·가운데 이유 등 추가 확인 ${b.validation.secondaryMissing.length}개`):''}${list(b.quality_flags,'추가 응답 패턴 알림은 없습니다. 실제 경험은 대화에서 확인해 주세요.')}<p>검사 기록: ${esc(b.freshness.date||'미확인')} · ${esc(b.freshness.state)}<br>조건 기록: ${esc(b.conditions_freshness.state)}</p>${b.delivery_permissions.map(p=>`<h3>${esc(p.position_id||'이름 없는 자리')}</h3>${list(p.reasons,p.allowed?'공유 승인 조건을 충족했습니다. 실제로 발송하지는 않았습니다.':'검토가 필요합니다.')}`).join('')}${note(b.access_note)}`;
  return wrap('edupin',lead('에듀핀 · 지원자 매칭·상담 가이드',r)+
   chapter('b-first','B-01 · 연락 전에','선호와 현재 조건을 먼저 확인해 주세요',glance(r.keypoints)+preferences(b.preferences,false)+quick+interestProfile(b.scales,true)+fold('보수·일정·계약 등 현재 조건을 모두 보기',conditionList(b.current_conditions))+statement('연락·공유 전에',b.operational_status.usable_for_matching?'기초 답변을 놓고 대조를 검토할 수 있습니다. 실제 연락과 공유 전에는 자리별 동의와 승인 상태를 확인해 주세요.':'아직 매칭에 활용하기 전에 동의나 답변을 더 확인해야 합니다. 아래 검토 상태부터 살펴봐 주세요.'))+
   chapter('b-connect','B-02 · 자리와 연결하기','이 자리를 이야기할 때는, 이렇게 시작해보세요',b.positions.map(positionStory).join('')||prose(['아직 비교할 직무가 없습니다. 실제 구인 조건이 준비되면 지원자가 원하는 조건과 함께 살펴보세요.']))+
   chapter('b-person','B-03 · 사람을 더 이해하기','답변 뒤에 있는 경험도 함께 들어보세요',r.chapters.map(story).join('')+b.own_words.map(w=>`<h3>${esc(w.label)}</h3><p class="quote">${esc(w.text)}</p>`).join('')+fold('상황 질문에서 고른 행동과 직접 쓴 설명',scenarios(b.scenario)))+
   chapter('b-review','B-04 · 확인하고 공유하기','동의와 현재 조건을 확인한 뒤 전달해 주세요',ops)+
   chapter('b-all','B-05 · 필요할 때 찾아보기','요약 뒤에 있는 모든 답과 근거를 모았어요',
    prose(['전체 37개 항목의 연결을 남겨두었습니다. 이번 질문지에서는 30개를 계산하고, 묻지 않은 7개는 비워둡니다. 궁금한 부분은 같은 문항 ID로 원응답을 찾아볼 수 있습니다.'])+
    scaleTable(b.scales)+fold('공통·분야 조건 전체 보기',axisTable(b.axes))+fold('활성 문항의 원응답과 추가 답변 모두 보기',inventoryTable(b.inventory))+fold('활성 문항 밖의 수신 데이터',`<pre>${esc(JSON.stringify(b.unmapped,null,2))}</pre>`)+b.positions.map(m=>fold(`${m.label} · 채용처 원응답 전체`,`<pre>${esc(JSON.stringify(m.original_employer_responses,null,2))}</pre>`)).join('')));
 }
 function employerReport(c){
  if(!c)return note('아직 비교할 직무가 없습니다. 채용처 질문지를 입력하거나 가상 사례를 골라주세요.');
  c=employerWords(c);
  const r=c.reading;
  const readableWork=c.work_style.map(s=>({text:s}));
  return wrap('employer',`<div class="report-context"><span>${esc(c.delivery_status)}</span><b>${esc(c.label)}</b></div>`+lead('채용처 · 모집 직무와 지원자 이야기',r,false)+
   employerOverview(r)+
   (r.first_question?statement('대화는 이 질문부터 시작해보세요',r.first_question.spoken_question):'')+
   guide([['c-fit','중요 조건'],['c-near','경험과 참고 정보'],['c-difference','확인할 차이'],['c-ask','면접 질문'],['c-start','입사 초기']])+
   chapter('c-fit','C-01 · 중요 조건','채용처가 중요하게 고른 조건을 하나씩 설명드릴게요',coreStories(r.condition_stories))+
   chapter('c-near','C-02 · 경험과 참고 정보','해당 분야를 얼마나 경험했는지 확인해 주세요',prose([r.experience_intro])+`<p class="experience-summary">${esc(c.readiness)}</p>`+fold('분야 답변이 어떤 경험에서 나왔는지',`<p>${esc(c.evidence.note)}</p><p>직접 경험 ${c.evidence.A} · 비슷한 경험 ${c.evidence.B} · 예상 ${c.evidence.C}</p>`)+fold('그 밖에 모집 직무와 같은 방향으로 답한 조건',list(readableWork.map(x=>x.text))))+
   chapter('c-difference','C-03 · 확인할 차이','약점으로 단정하기 전에, 실제 업무에서 문제가 될지 확인해 주세요',prose([r.difference_intro])+matchAxes(c.core_conditions.filter(a=>a.state!=='MATCH'))+fold('꼭 맞아야 한다고 고른 조건 모두 보기',matchAxes(c.core_conditions))+fold('그 밖의 차이와 아직 모르는 조건',matchAxes(c.differences))+
    fold('보수·일정 등 실제 조건을 함께 비교하기',practicalTable(c.practical))+prose([c.field_note])+(c.field_axes.length?fold('이 분야의 세부 조건 비교',matchAxes(c.field_axes)):'')+
    (c.counts?fold('전체 24가지 조건의 비교 개수',`<p>비슷함 ${c.counts.MATCH} · 차이 있음 ${c.counts.ADJUSTABLE} · 차이 큼 ${c.counts.GAP} · 아직 미확인 ${c.counts.UNKNOWN}</p><p>두 답변을 비교한 개수이지, 채용 적합률이나 다른 지원자와의 순위가 아닙니다.</p>`):''))+
   chapter('c-ask','C-04 · 면접에서 들어보기','정답보다, 실제로 어떻게 해왔는지 들어보세요',prose([r.interview_intro])+r.questions.map(q=>`<article class="interview"><span>${esc(q.title)}${q.category?' · '+esc(q.category):''}</span><h3>${esc(q.spoken_question)}</h3>${q.listen_for?`<p class="muted">함께 들어볼 내용 · ${esc(q.listen_for.join(' · '))}</p>`:''}${fold('이 질문이 필요한 이유',`${q.context?`<p>${esc(q.context)}</p>`:''}${q.spoken_question!==q.question?`<p>${esc(q.question)}</p>`:''}`)}</article>`).join(''))+
   chapter('c-start','C-05 · 함께 시작한다면','처음 함께할 때는, 기대와 도움의 범위를 맞춰주세요',prose([r.onboarding_intro])+`<p>${esc(c.role_description||'맡을 업무의 범위는 아직 더 확인해야 해요.')}</p>`+list(c.onboarding)+
    (c.interview_questions.some(q=>q.title==='안전·운영 안내')?statement('아동·청소년을 만나는 일이라면',c.interview_questions.find(q=>q.title==='안전·운영 안내').question):''))+
   chapter('c-limits','C-06 · 마지막으로','이 이야기는 채용 결론보다, 대화의 출발점이에요',prose(['지원자가 무엇을 편하게 느끼는지 알면 실제 역할을 이야기하기가 쉬워져요. 다만 잘할 수 있는지, 오래 함께할 수 있는지는 경험과 업무 조건을 따로 확인해야 합니다.'])+fold('이 결과가 알려주지 않는 것과 정보 공유 범위',list(c.limits)))+
   `<p class="reading-footnote">자유서술 원문과 개인 사정, 다른 자리와의 비교는 채용처에 제공하지 않습니다. 현재 화면은 내부 검토용이며 실제 발송하지 않았습니다.</p>`);
 }
 const reports=(output,audience,position=0)=>audience==='applicant'?applicantReport(output.reports.applicant):audience==='edupin'?edupinReport(output.reports.edupin):employerReport(output.reports.edupin.employer_drafts[position]);
 return {reports,applicantReport,edupinReport,employerReport};
};

}};const cache={};function require(id){if(!cache[id]){const m={exports:{}};cache[id]=m;modules[id](require,m,m.exports);}return cache[id].exports;}require("tools/browser.js");})();