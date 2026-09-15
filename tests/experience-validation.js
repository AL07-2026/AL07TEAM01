"use strict";
const assert=require('node:assert/strict');
const S=require('../engine/schema');
const {run,snapshot}=require('../engine/reports');
const {samples,clone}=require('../engine/samples');
const {experience}=require('../engine/experience');
const UI=require('../tools/ui');
let passed=0;
const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
const base=()=>clone(samples()[0].input);

test('기존 17번을 삭제하고 03·04·05와 나머지 ID를 유지',()=>{
 const active=S.activeItems({});
 assert.deepEqual(active.slice(2,5).map(i=>i.id),['F3-3','F3-4','F3-5']);
 assert.equal(active[16].id,'K3-08');assert.equal(active[19].id,'R3-01');
 assert.ok(!S.allItems().some(i=>i.id==='K3-07'));
 const original=require('../reference/applicant-bank.v2.json').modules.flatMap(m=>m.items);
 for(const id of ['F3-3','F3-4','F3-5']){
  const current=active.find(i=>i.id===id),old=original.find(i=>i.id===id);
  assert.equal(current.text,old.text);assert.deepEqual(current.options,old.options);
 }
});
test('추천·담당자·채용처 해설에서 세 답변을 함께 활용',()=>{
 const x=base();Object.assign(x.responses,{'F3-3':['교육·워크숍·멘토링'],'F3-4':'5년 이상~10년 미만','F3-5':['고객·의뢰인의 요청에 따른 작업']});
 const o=run(x),f=o.reports.applicant.families.find(f=>f.field==='EDU'),p=o.reports.edupin.positions[0];
 assert.equal(f.experience,'관련 활동 경험 있음');assert.equal(p.experience,f.experience);
 for(const id of ['F3-3','F3-4','F3-5'])assert.ok(f.source_ids.includes(id));
 for(const audience of ['applicant','edupin','employer']){
  const html=UI.reports(o,audience);
  for(const text of ['교육·워크숍·멘토링','5년 이상~10년 미만','고객·의뢰인의 요청에 따른 작업'])assert.ok(html.includes(text));
 }
});
test('03번의 분야별 관련 활동을 분기 선택과 독립적으로 읽음',()=>{
 const cases={EDU:'교육·워크숍·멘토링',ADULT:'교육·워크숍·멘토링',GAME:'게임·애니메이션·영상 제작',FILM:'영화·공연·전시 현장 제작',MAKE:'패션·공예·제품 제작',INDEP:'개인 창작·작품 제작',CULTURE:'전시·큐레이션·문화기획',DESIGN:'디자인·브랜드·콘텐츠 실무'};
 for(const [field,activity] of Object.entries(cases))assert.equal(experience({'F3-3':[activity]},field).status,'관련 활동 경험 있음');
 assert.equal(experience({'F3-3':['개인 창작·작품 제작']},'EDU').status,'미확인');
});
test('전체 기간·협업·관심·선택 분야만으로 직무 경험을 만들지 않음',()=>{
 const r={'F3-4':'10년 이상','F3-5':['팀·기관 소속 업무'],'F3-6':['아동·청소년 미술교육'],'F3-7':'EDU','F3-10':'예'};
 const e=experience(r,'EDU');assert.equal(e.status,'미확인');assert.match(e.summary,/전체 미술·창작 활동 기간/);
 assert.equal(experience({},'EDU').status,'미확인');
});
test('교육 활동을 아동·성인 직무의 직접 경험으로 단정하지 않음',()=>{
 const x=base();x.responses['F3-3']=['교육·워크숍·멘토링'];
 for(const position of x.positions)position.responses['HK-05'].entry='경험자만 검토';
 const o=run(x);
 for(const p of o.reports.edupin.positions){assert.equal(p.experience_requirement_needs_check,true);assert.match(p.readiness,/아동·청소년인지 성인인지는 추가로 확인/);}
 const first=o.reports.edupin.employer_drafts[0].reading.first_question;
 assert.deepEqual(first.source_ids,['F3-3','F3-4','F3-5','HK-05']);
});
test('명시적인 무경험과 미응답·상충 답변을 구분',()=>{
 const r={'F3-3':['아직 관련 경험 없음'],'F3-4':'아직 없음','F3-5':['아직 관련 경험 없음']};
 assert.equal(experience(r,'DESIGN').status,'아직 없음');
 assert.equal(experience({...r,'F3-4':'10년 이상'},'DESIGN').status,'응답 확인 필요');
 assert.equal(experience({...r,'F3-5':['외주·프리랜서 계약']},'DESIGN').status,'응답 확인 필요');
});
test('잘못된 03·04·05 답변은 경험 분석에서 사용하지 않음',()=>{
 const x=base();Object.assign(x.responses,{'F3-3':['교육·워크숍·멘토링','아직 관련 경험 없음'],'F3-4':'100년','F3-5':['없는 선택지']});
 const p=run(x).reports.edupin.positions[0];assert.equal(p.experience,'미확인');assert.deepEqual(p.experience_source_ids,[]);
});
test('세 경험 답변의 변경은 흥미·행동 점수와 업무 조건 대조를 바꾸지 않음',()=>{
 const x=base(),before=run(x);Object.assign(x.responses,{'F3-3':['디자인·브랜드·콘텐츠 실무'],'F3-4':'10년 이상','F3-5':['팀·기관 소속 업무']});
 const after=run(x);assert.deepEqual(after.profile.scales,before.profile.scales);assert.deepEqual(after.profile.axes,before.profile.axes);
 assert.deepEqual(after.interpretation.cards,before.interpretation.cards);assert.deepEqual(after.interpretation.families.map(f=>f.id),before.interpretation.families.map(f=>f.id));
 assert.deepEqual(after.reports.edupin.positions.map(p=>p.counts),before.reports.edupin.positions.map(p=>p.counts));
});
test('삭제된 17번 과거 응답은 원문 보관 외에 분석·필수 응답·해설에 사용하지 않음',()=>{
 const x=base(),before=run(x);x.responses['K3-07']={EDU:'직접 해봄',ADULT:'직접 해봄'};
 const after=run(x);assert.deepEqual(after.interpretation,before.interpretation);assert.deepEqual(after.reports.applicant,before.reports.applicant);
 assert.deepEqual(after.reports.edupin.positions,before.reports.edupin.positions);assert.deepEqual(after.reports.edupin.employer_drafts,before.reports.edupin.employer_drafts);
 assert.equal(after.profile.validation.requiredExpected,before.profile.validation.requiredExpected);assert.ok(after.profile.validation.complete);
 assert.deepEqual(after.reports.edupin.unmapped['K3-07'],x.responses['K3-07']);
 for(const sample of samples())assert.ok(!JSON.stringify(run(sample.input)).includes('K3-07'));
});
test('공유 승인 결과에 새 경험 근거 ID가 노출되지 않음',()=>{
 const x=base(),id=x.positions[0].position_id;
 x.consent={matching:true,employer_position_ids:[id]};x.review={positions:{[id]:{reviewer_id:'TEST',status:'approved',reviewed_at:'2026-09-05',safety_checked:true,applicant_snapshot:snapshot(x.responses),position_snapshot:snapshot(x.positions[0].responses)}}};
 const shared=run(x).reports.employer;assert.equal(shared.length,1);
 assert.ok(!JSON.stringify(shared).includes('experience_source_ids'));
 for(const id of ['F3-3','F3-4','F3-5','K3-07'])assert.ok(!JSON.stringify(shared).includes(id));
});
console.log(`RESULT: ${passed} experience checks passed.`);
