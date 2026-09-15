"use strict";
const S=require('./schema');
const {experience}=require('./experience');
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
