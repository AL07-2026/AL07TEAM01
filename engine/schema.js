"use strict";
// Canonical v3 definitions. The v2 banks are frozen migration references, not active instructions.
const oldA = require('../reference/applicant-bank.v2.json');
const oldE = require('../reference/employer-bank.v2.json');
const oldS = require('../reference/scoring-spec.v2.json');
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
