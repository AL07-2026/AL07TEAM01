"use strict";
const S=require('./schema');
const {assess,dateValid}=require('./assessment');
const {interpret}=require('./interpretation');
const {match}=require('./matching');
const Reading=require('./reading');
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
