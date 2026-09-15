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
