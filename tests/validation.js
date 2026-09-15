"use strict";
const assert=require('node:assert/strict');
const fs=require('node:fs');
const S=require('../engine/schema');
const A=require('../engine/assessment');
const I=require('../engine/interpretation');
const {run,freshness,snapshot}=require('../engine/reports');
const M=require('../engine/matching');
const {samples,applicant,employer,details,fill,clone}=require('../engine/samples');
const UI=require('../tools/ui');
let passed=0;
const test=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name);throw e;}};
const base=()=>clone(samples()[0].input);
const pr=i=>run(i).profile;
const pos=i=>run(i).reports.edupin.positions[0];
test('빈 답변은 해석·추천·활용·외부 공유를 보류',()=>{const o=run({version:S.version,responses:{}});assert.equal(o.profile.ready,false);assert.equal(o.interpretation.families.length,0);assert.equal(o.reports.edupin.operational_status.usable_for_matching,false);assert.equal(o.reports.employer.length,0);});
test('한 문항으로 두 문항 척도값을 만들지 않음',()=>{const p=pr({version:S.version,responses:{'P3-01':5}});assert.equal(p.scales.find(s=>s.id==='relationship.emotional_empathy').value,null);assert.equal(I.interpret(p).cards.length,0);});
test('네 문항 중 셋이면 요약값을 보류',()=>{const p=pr({version:S.version,responses:{'R3-01':5,'R3-07':5,'R3-13':5}});assert.equal(p.scales.find(s=>s.id==='riasec.R').value,null);});
test('네 문항 모두 응답은 분모와 실제 수를 표시',()=>{const p=pr({version:S.version,responses:{'R3-01':5,'R3-07':4,'R3-13':5,'R3-19':4}});assert.equal(p.scales.find(s=>s.id==='riasec.R').answered,4);assert.equal(p.scales.find(s=>s.id==='riasec.R').value,4.5);});
for(const invalid of [0,6,9,-1,1.2,'5',Infinity,NaN,null])test('리커트 범위·형식 방어 '+String(invalid),()=>{const x=base();x.responses['P3-01']=invalid;const p=pr(x);assert.equal(p.scales.find(s=>s.id==='relationship.emotional_empathy').value,null);if(invalid!==null)assert.ok(p.validation.errors.length);});
test('null은 응답으로 집계하지 않음',()=>assert.equal(A.validate({'F3-7':null}).answered,0));
test('잘못된 양극축 값 방어',()=>{const x=base();x.responses['J3-01']=9;assert.equal(pr(x).axes.find(a=>a.id==='J3-01').value,null);});
test('다른 분기의 근거는 집계에서 제외',()=>{const x=base(),before=pr(x).evidence;x.responses['D3-GAME01__evidence']='C';assert.deepEqual(pr(x).evidence,before);});
test('숫자 답이 없는 경험 근거는 집계에서 제외',()=>{const x=base();delete x.responses['D3-INDEP01'];const p=pr(x);assert.equal(p.evidence.total,9);});
test('중간 이유 미정은 일치로 계산하지 않음',()=>{const x=base();x.responses['J3-01']=4;delete x.responses['J3-01__neutral_reason'];assert.equal(pos(x).axes.find(a=>a.id==='J3-01').state,'UNKNOWN');assert.ok(pr(x).validation.secondaryMissing.includes('J3-01__neutral_reason'));});
test('두 방식 모두 원하지 않음은 중간 일치가 아님',()=>{const x=base();x.responses['J3-01']=4;x.responses['J3-01__neutral_reason']='두 방식 모두 원하지 않아요';assert.equal(pos(x).axes.find(a=>a.id==='J3-01').state,'UNKNOWN');});
test('경험 부족의 가운데와 미응답을 구분',()=>{const x=base();x.responses['J3-01']=4;x.responses['J3-01__neutral_reason']='경험이 부족해서 판단하기 어려워요';assert.match(pr(x).axes.find(a=>a.id==='J3-01').reading,/경험/);});
test('숫자 판단 어려움은 결측값 보간하지 않음',()=>{const x=base();x.responses['J3-01']='U';assert.equal(pr(x).axes.find(a=>a.id==='J3-01').value,null);});
test('중요한 미확인 조건에는 확인 질문 유지',()=>{const x=base();const id=x.positions[0].responses['HP-01'][0];x.responses[id]='U';const row=pos(x).axes.find(a=>a.id===id);assert.equal(row.state,'UNKNOWN');assert.equal(row.needs_interview,true);});
test('중요 조건은 비슷해도 실제 경험을 확인',()=>{const x=base();const r=x.positions[0].responses;r['HJ-10']=x.responses['J3-10'];r['HP-01']=['J3-10'];const row=pos(x).axes.find(a=>a.id==='J3-10');assert.equal(row.state,'MATCH');assert.equal(row.needs_interview,true);});
test('전국 이동의 지원 조건을 무시하지 않음',()=>{const x=base();x.responses['F3-9']=['전국 — 숙소나 이동비가 지원되면'];x.positions[0].responses['HF-07']='제주특별자치도';assert.equal(pos(x).practical.find(p=>p.condition==='이동 범위').state,'CONFLICT');});
test('같은 시·도도 통근 가능으로 단정하지 않음',()=>assert.equal(pos(base()).practical.find(p=>p.condition==='이동 범위').state,'UNKNOWN'));
test('보수 하한은 확실한 충족, 걸친 범위는 협의',()=>{const x=base();x.positions[0].responses['HK-01'].minimum=20000;assert.equal(pos(x).practical.find(p=>p.condition==='보수').state,'DISCUSS');});
test('보수 상한도 최소 조건 미달이면 차이 확인',()=>{const x=base();x.positions[0].responses['HK-01'].maximum=24000;x.positions[0].responses['HK-01'].minimum=20000;assert.equal(pos(x).practical.find(p=>p.condition==='보수').state,'CONFLICT');assert.match(pos(x).next,/필수/);});
test('보수 단위가 다르면 계산하지 않음',()=>{const x=base();x.positions[0].responses['HK-01'].unit='월급';assert.equal(pos(x).practical.find(p=>p.condition==='보수').state,'UNKNOWN');});
test('희망금액·최소금액 역전은 입력 오류',()=>{const x=base();x.responses['K3-01'].desired=100;assert.ok(pr(x).validation.errors.some(e=>e.id==='K3-01'));});
test('일정·시작일 차이를 반영',()=>{const x=base();x.positions[0].responses['HK-02'].start='2026-09-10';x.positions[0].responses['HK-02'].flexible='정해져 있음';assert.equal(pos(x).practical.find(p=>p.condition==='요일·시간').state,'CONFLICT');});
test('미정과 구체 일정 동시 선택은 오류',()=>{const x=base();x.responses['K3-02'].days=['월',S.UNKNOWN];assert.ok(pr(x).validation.errors.length);});
test('계약 차이를 별도 반영',()=>{const x=base();x.positions[0].responses['HK-03'].type='정규직';assert.equal(pos(x).practical.find(p=>p.condition==='계약 형태').state,'CONFLICT');});
test('업무 비중 합계 검증',()=>{const x=base();x.positions[0].responses['HK-04'].making=90;assert.ok(pos(x).validation.errors.some(e=>e.id==='HK-04'));});
test('성인 교육을 직접 선택하고 별도 문항 라우팅',()=>{const r=fill('applicant','ADULT');assert.equal(S.activeItems(r).filter(i=>i.branch==='ADULT').length,14);assert.equal(S.branchOf(r),'ADULT');});
test('아동을 만나는 공방은 안전 문항 포함',()=>{const r={'F3-7':'MAKE','F3-10':'예'};assert.equal(S.activeItems(r).filter(i=>i.module==='N3').length,4);});
test('아동 접촉 없는 문화 직무는 안전 문항 생략',()=>{const r={'F3-7':'CULTURE','F3-10':'아니오'};assert.equal(S.activeItems(r).filter(i=>i.module==='N3').length,0);});
test('개정 전 의미가 바뀐 응답은 자동 재사용 금지',()=>{const x=base();x.version='2.0';assert.equal(pr(x).ready,false);assert.ok(pr(x).validation.errors.some(e=>e.id==='version'));});
test('버전 없는 입력도 자동 호환하지 않음',()=>{const x=base();delete x.version;assert.equal(pr(x).ready,false);});
test('관리자 개입의 주체가 양쪽에서 같음',()=>{const a=S.allItems('applicant').find(i=>i.id==='E3-07'),e=S.allItems('employer').find(i=>i.id==='HE-07');assert.equal(a.left,e.left);assert.match(e.left,/내가 막혔을 때/);});
test('작업 주기와 동시 진행을 혼합하지 않음',()=>{const e=S.allItems('employer').find(i=>i.id==='HJ-05');assert.equal(e.right,'하나의 결과를 짧은 주기로 마무리함');});
test('노출 개수에 따른 핵심 조건 제한',()=>assert.deepEqual([0,6,7,8,10,11,12].map(S.priorityMax),[0,2,2,3,3,4,4]));
test('핵심 조건 미선택과 명시한 없음을 구분',()=>{const x=base();x.positions[0].responses['HP-01']=[];assert.equal(pos(x).eligible,true);delete x.positions[0].responses['HP-01'];assert.equal(pos(x).eligible,false);});
test('노출하지 않은 조건은 핵심 지정 불가',()=>{const x=base();x.positions[0].responses['HP-01']=['nonexistent'];assert.ok(pos(x).validation.errors.length);});
test('다중 응답자 불일치를 평균으로 숨기지 않음',()=>{const x=base(),other=clone(x.positions[0]);other.responses['HJ-01']=1;x.positions[0].other_respondents=[other];assert.equal(pos(x).eligible,false);assert.ok(pos(x).disagreements.includes('HJ-01'));});
test('채용처 미확인 조건이 8개 이상이면 비교 보류',()=>{const x=base();for(let i=1;i<=8;i++)x.positions[0].responses[`HJ-${String(i).padStart(2,'0')}`]='U';x.positions[0].responses['HP-01']=[];assert.equal(pos(x).counts,null);});
test('모든 흥미가 같아도 임의의 RIA 유형을 붙이지 않음',()=>{const x=base();S.scales.filter(s=>s.id.startsWith('riasec')).flatMap(s=>s.items).forEach(id=>x.responses[id]=3);assert.equal(pr(x).riasec_profile,undefined);assert.ok(!JSON.stringify(run(x).reports.applicant).includes('top_code'));});
test('미측정 7개 값은 추정하지 않음',()=>{const p=pr(base());assert.equal(p.scales.filter(s=>!s.active).length,7);assert.ok(p.scales.filter(s=>!s.active).every(s=>s.value===null));assert.equal(p.scales.filter(s=>s.active).length,30);});
test('상황 이유 변경이 교차 해석에 반영됨',()=>{const x=base(),before=run(x).interpretation.cards;for(const id of Object.keys(x.responses).filter(id=>id.endsWith('__reason_tags')))x.responses[id]=['남은 시간'];const after=run(x).interpretation.cards;assert.notDeepEqual(after,before);assert.ok(after.some(c=>c.title.includes('남은 시간')));});
test('상황 원문을 왜곡하지 않고 내부·본인에게 보존',()=>{const x=base();x.responses['S3-INDEP01__free_text']='UNIQUE_SELF_EXPLANATION';const o=run(x);assert.equal(o.reports.applicant.scenario.find(s=>s.id==='S3-INDEP01').explanation,'UNIQUE_SELF_EXPLANATION');assert.ok(JSON.stringify(o.reports.edupin.inventory).includes('UNIQUE_SELF_EXPLANATION'));});
test('기존 우선순위와 확인 정보가 상담 초안에 반영됨',()=>{const x=base();x.responses['X3-U05']=S.allItems('applicant').find(i=>i.id==='X3-U05').options.slice(-2);assert.deepEqual(run(x).reports.edupin.positions[0].contact_brief.first_information,x.responses['X3-U05']);});
test('미선택 분야도 활동 답변으로 관련 경험 확인',()=>{const x=base();x.responses['F3-3']=['교육·워크숍·멘토링'];assert.equal(pos(x).experience,'관련 활동 경험 있음');assert.match(pos(x).readiness,/교육·워크숍·멘토링/);});
test('현재 제안 의향이 없으면 추천 연락 문구 차단',()=>{const x=base();x.responses['K3-06'].openness='지금은 결과만 보고 싶어요';assert.equal(pos(x).contact_allowed_by_preference,false);assert.match(run(x).reports.edupin.positions[0].contact_brief.say,/권하지 않습니다/);});
test('채용처의 미경험 수용 조건을 정확히 표시',()=>{const x=base();x.positions[0].responses['HK-05'].entry='경험자만 검토';assert.match(pos(x).readiness,/대신하지 않습니다/);});
test('다른 분야 경험 근거를 채용처 근거로 전달하지 않음',()=>{const o=run(base());assert.equal(o.reports.edupin.employer_drafts[0].evidence.total,0);assert.equal(o.reports.edupin.employer_drafts[0].evidence.scope,'이번 직무 분야의 세부 답변 없음');});
test('외부 초안에서 개인 사정·자유서술·다른 자리 원문 제외',()=>{const x=base();x.responses['K3-05']='PRIVATE_ACTIVITY_SECRET';x.responses['K3-08']='PRIVATE_STORY_SECRET';x.responses['S3-INDEP01__free_text']='PRIVATE_SCENARIO_SECRET';const s=JSON.stringify(run(x).reports.edupin.employer_drafts);assert.ok(!s.includes('PRIVATE_'));assert.ok(!s.includes('personality.energy'));});
test('동의·승인 없이는 외부용 결과가 반환되지 않음',()=>assert.equal(run(base()).reports.employer.length,0));
test('승인은 현재 응답 스냅샷과 연결되어야 함',()=>{const x=base();x.consent.employer_position_ids=['DEMO-EDU'];x.review={positions:{'DEMO-EDU':{reviewer_id:'test-reviewer',reviewed_at:'2026-09-05',status:'approved',safety_checked:true}}};assert.equal(run(x).reports.employer.length,0);});
test('검사와 조건 업데이트 시점을 분리',()=>{assert.equal(freshness('2025-01-01','2026-09-05').state,'현재 조건 재확인 필요');assert.equal(freshness('2026-09-05','2026-09-05').state,'기록 시점 확인됨');});
test('없거나 미래인 날짜는 최신으로 간주하지 않음',()=>{assert.equal(freshness(null,'2026-09-05').state,'미확인');assert.equal(freshness('2027-09-05','2026-09-05').state,'날짜 확인 필요');});
test('입력한 글은 HTML 실행 코드로 렌더하지 않음',()=>{const x=base();x.responses['K3-08']='<img src=x onerror=alert(1)>';const html=UI.reports(run(x),'applicant');assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('&lt;img'));});
test('인물 식별·문체가 추천 방향을 바꾸지 않음',()=>{const x=base(),before=run(x).interpretation.families;x.responses['name']='김가상';x.responses['age']=57;x.responses['K3-08']='짧은 문체.';assert.deepEqual(run(x).interpretation.families,before);});
test('모든 개인 해석의 근거는 실제 유효 입력에 존재',()=>{for(const sample of samples()){const o=run(sample.input);for(const c of o.interpretation.cards)for(const id of c.source_ids)assert.ok(o.profile.r[id]!==undefined,id);}});
test('가상 사례는 다른 상황과 빈 답변을 포함',()=>{for(const s of samples())assert.doesNotThrow(()=>run(s.input));assert.equal(samples().length,4);});
test('중복 경험 문항 삭제 후 문항 수와 30개 활성 척도 확인',()=>{assert.equal(S.activeItems({'F3-7':'INDEP','F3-10':'아니오'}).length,127);assert.equal(S.activeItems({'F3-7':'EDU','F3-10':'예'}).length,131);});
test('요약 평균은 가능한 문항 응답으로부터 계산',()=>{for(const s of pr(base()).scales.filter(s=>s.value!==null)){assert.ok(s.value>=1&&s.value<=5);assert.ok(s.answered>=1);}});
test('모든 활성 문항 ID가 유일함',()=>{for(const a of ['applicant','employer']){const ids=S.allItems(a).map(i=>i.id);assert.equal(new Set(ids).size,ids.length);}});
test('소스에 임시 문구와 미완성 번역이 없음',()=>{for(const f of ['schema.js','assessment.js','interpretation.js','matching.js','reports.js'])assert.ok(!/[\u3040-\u30ff]/.test(fs.readFileSync(require.resolve('../engine/'+f),'utf8')));});
test('분야를 좁히기 어려워도 근거 있는 자기이해를 보존',()=>{const o=run(samples().find(s=>s.id==='open').input);assert.equal(o.profile.ready,false);assert.equal(o.profile.self_insight_ready,true);assert.ok(o.interpretation.cards.length>0);assert.equal(o.interpretation.families.length,0);});
test('경험자만 찾는 자리에는 미경험자를 긍정 문구로 권하지 않음',()=>{const x=base();x.positions[0].responses['HK-05'].entry='경험자만 검토';const m=run(x).reports.edupin.positions[0];assert.equal(m.experience_requirement_needs_check,true);assert.match(m.contact_brief.say,/권하지 않고/);});
function reviewed(){
 const x=clone(samples().find(s=>s.id==='teacher').input),id=x.positions[0].position_id;
 x.consent={matching:true,employer_position_ids:[id]};
 x.review={positions:{[id]:{reviewer_id:'SYNTHETIC-REVIEWER',status:'approved',reviewed_at:'2026-09-05',safety_checked:true,applicant_snapshot:snapshot(x.responses),position_snapshot:snapshot(x.positions[0].responses)}}};
 return x;
}
test('현재 응답의 동의·검토 조건이 모두 충족되면 발송 없는 승인본 반환',()=>{const o=run(reviewed());assert.equal(o.reports.employer.length,1);assert.match(o.reports.employer[0].delivery_status,/발송하지 않음/);});
test('검토 이후 지원자 답이 바뀌면 재검토',()=>{const x=reviewed();x.responses['P3-01']=2;assert.equal(run(x).reports.employer.length,0);});
test('검토 이후 직무 조건이 바뀌면 재검토',()=>{const x=reviewed();x.positions[0].responses['HK-01'].maximum=35000;assert.equal(run(x).reports.employer.length,0);});
test('단축하지 않은 24개 척도는 같은 완전 응답에서 구판 식과 동일',()=>{const x=base(),p=pr(x),legacy=require('../reference/scoring-spec.v2.json');for(const s of p.scales.filter(s=>s.active&&!s.id.startsWith('riasec.'))){const def=legacy.scales.find(d=>d.id===s.id),values=def.items.map(id=>def.reverse.includes(id)?6-x.responses[id]:x.responses[id]);const expected=Math.round(values.reduce((a,b)=>a+b,0)/values.length*100)/100;assert.equal(s.value,expected);}});
test('v3.0 표시 번호 기준 지정한 6개만 흥미 문항에서 제외',()=>{
 assert.deepEqual(S.retiredInterest.map(i=>i.previousNumber),[29,34,45,48,49,50]);
 assert.deepEqual(S.retiredInterest.map(i=>i.id),['R3-09','R3-14','R3-25','R3-28','R3-29','R3-30']);
 assert.equal(S.allItems('applicant').filter(i=>i.module==='R3').length,24);
 for(const item of S.retiredInterest)assert.ok(!S.allItems('applicant').some(i=>i.id===item.id));
});
test('여섯 흥미 영역은 각각 4문항, 최소 4응답, 활성 상태',()=>{
 const interest=S.scales.filter(s=>s.id.startsWith('riasec.'));
 assert.equal(interest.length,6);
 for(const s of interest){assert.equal(s.items.length,4);assert.equal(s.minimum_answered,4);assert.equal(s.active,true);assert.equal(s.revision,'3.1');assert.equal(s.removed_items.length,1);}
});
test('여섯 영역 모두 남은 네 응답 평균과 4개 분모를 사용',()=>{
 const x=base();for(const s of S.scales.filter(s=>s.id.startsWith('riasec.')))s.items.forEach((id,n)=>x.responses[id]=[1,3,4,5][n]);
 for(const s of pr(x).scales.filter(s=>s.id.startsWith('riasec.'))){assert.equal(s.value,3.25);assert.equal(s.of,4);assert.equal(s.answered,4);assert.equal(s.source_ids.length,4);assert.match(s.note,/단축/);}
});
test('제외 문항이 다시 들어와도 점수·해석·필수 응답에 반영하지 않음',()=>{
 const x=base(),before=run(x);
 for(const item of S.retiredInterest)x.responses[item.id]=5;
 const after=run(x);
 assert.deepEqual(after.profile.scales,before.profile.scales);
 assert.deepEqual(after.interpretation,before.interpretation);
 assert.equal(after.profile.validation.requiredExpected,before.profile.validation.requiredExpected);
 for(const item of S.retiredInterest){assert.ok(!after.profile.r[item.id]);assert.ok(JSON.stringify(after.reports.edupin.unmapped).includes(item.id));}
});
test('여섯 영역 모두 한 답이 판단 어려움이면 평균과 해당 분야 근거 보류',()=>{
 const x=base();for(const s of S.scales.filter(s=>s.id.startsWith('riasec.')))x.responses[s.items[0]]='U';
 const o=run(x);for(const s of o.profile.scales.filter(s=>s.id.startsWith('riasec.'))){assert.equal(s.value,null);assert.equal(s.answered,3);assert.equal(s.of,4);}
 assert.equal(o.interpretation.families.length,0);
});
test('v3.0 패키지 입력은 새 판으로 몰래 변환하지 않음',()=>{
 const x=base();x.version='3.0';assert.equal(pr(x).ready,false);assert.ok(pr(x).validation.errors.some(e=>e.id==='version'&&e.message.includes('3.1')));
});
test('가상 예시에도 삭제 문항이나 삭제 문항 근거가 남지 않음',()=>{
 for(const sample of samples()){
  const o=run(sample.input),sources=o.reports.applicant.families.flatMap(f=>f.source_ids);
  for(const item of S.retiredInterest){assert.equal(sample.input.responses[item.id],undefined);assert.ok(!sources.includes(item.id));}
 }
});
test('유지한 흥미 문구와 비흥미 활성 척도 수를 보존',()=>{
 const original=require('../reference/applicant-bank.v2.json').modules.flatMap(m=>m.items);
 for(const i of S.allItems('applicant').filter(i=>i.module==='R3'))assert.equal(i.text,original.find(o=>o.id===i.id).text);
 const p=pr(base());assert.equal(p.scales.filter(s=>s.active&&!s.id.startsWith('riasec.')).length,24);
});
console.log(`\nRESULT: ${passed} passed. These are software checks, not psychometric validation.`);
