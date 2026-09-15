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
