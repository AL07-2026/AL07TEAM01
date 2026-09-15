"use strict";
const S=require('./schema');
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
