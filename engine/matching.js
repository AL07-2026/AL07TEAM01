"use strict";
const S=require('./schema');
const {validate,rating,numeric,dateValid}=require('./assessment');
const {experience}=require('./experience');
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
