"use strict";
const S=require('./schema');
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
