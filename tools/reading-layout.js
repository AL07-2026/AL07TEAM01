"use strict";
module.exports=function(U){
 const {esc,pretty,list,sources,note,conditionList,evidenceBlock,scaleTable,axisTable,scenarios,preferences,practicalTable,matchAxes,inventoryTable}=U;
 const prose=blocks=>blocks.map(b=>`<p>${esc(typeof b==='string'?b:b.text)}</p>`).join('');
 const employerWords=value=>Array.isArray(value)?value.map(employerWords):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,employerWords(item)])):typeof value==='string'?value.replace(/이 자리/g,'모집 직무'):value;
 const chapter=(id,n,title,body)=>`<section class="report-section" id="${id}"><span class="section-label">${esc(n)}</span><h2>${esc(title)}</h2>${body}</section>`;
 const fold=(title,body,cls='')=>`<details class="reading-detail ${cls}"><summary>${esc(title)}</summary>${body}</details>`;
 const glance=rows=>rows.length?`<dl class="reading-glance">${rows.map(r=>`<div><dt>${esc(r.label)}</dt><dd>${esc(r.text)}</dd></div>`).join('')}</dl>`:'';
 const guide=rows=>`<nav class="reading-guide" aria-label="해설지 읽는 순서">${rows.map(([id,t])=>`<a href="#${id}">${esc(t)}</a>`).join('')}</nav>`;
 const lead=(who,r,showSources=true)=>`<div class="report-lead"><span class="eyebrow">${esc(who)}</span><h1>${esc(r.headline)}</h1>${prose(r.paragraphs)}${showSources&&r.paragraphs.some(p=>p.source_ids?.length)?sources([...new Set(r.paragraphs.flatMap(p=>p.source_ids||[]))]):''}</div>`;
 const statement=(title,text)=>`<aside class="reading-callout"><span>${esc(title)}</span><p>${esc(text)}</p></aside>`;
 const story=c=>`<article class="insight"><h3>${esc(c.title)}</h3>${prose(c.paragraphs||[c.observation])}${fold('이 이야기를 읽을 때 함께 알아둘 점',`<p>${esc(c.basis||c.observation)}</p><p>${esc(c.limit||c.unknown)}</p>${sources(c.source_ids)}`,'story-basis')}</article>`;
 const wrap=(audience,body)=>`<article class="reading-report" data-reading="${audience}">${body}</article>`;
 const pointList=(items,empty)=>items.length?`<div class="summary-points">${items.map(x=>`<article class="summary-point"><span>${esc({behavior:'지원자의 특성',condition:'중요 조건',experience:'경험 확인',required:'필수 조건',gate:'답변 확인',gap:'차이 큼',adjustable:'조율 가능',unknown:'미확인'}[x.kind]||'확인할 점')}</span><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p></article>`).join('')}</div>`:`<p class="summary-empty">${esc(empty)}</p>`;
 const interestOrder=[['riasec.R','R'],['riasec.I','I'],['riasec.A','A'],['riasec.S','S'],['riasec.E','E'],['riasec.C','C']];
 const interestProfile=(scales,compact=false)=>{
  const rows=interestOrder.map(([id,code])=>{const scale=(scales||[]).find(x=>x.id===id);return {id,code,label:scale?.label||code,value:typeof scale?.value==='number'?scale.value:null,answered:scale?.answered||0,of:scale?.of||4};});
  const cx=210,cy=184,radius=118,angle=i=>(-90+i*60)*Math.PI/180,point=(i,ratio)=>`${(cx+Math.cos(angle(i))*radius*ratio).toFixed(1)},${(cy+Math.sin(angle(i))*radius*ratio).toFixed(1)}`;
  const grid=[1,2,3,4,5].map(level=>`<polygon class="interest-grid${level===5?' outer':''}" points="${rows.map((_,i)=>point(i,level/5)).join(' ')}"></polygon>`).join('');
  const axes=rows.map((_,i)=>`<line class="interest-axis" x1="${cx}" y1="${cy}" x2="${point(i,1).replace(',','" y2="')}"></line>`).join('');
  const known=rows.filter(x=>x.value!==null),complete=known.length===6;
  const shape=complete?`<polygon class="interest-data" points="${rows.map((x,i)=>point(i,x.value/5)).join(' ')}"></polygon>`:'';
  const dots=known.map(x=>{const i=rows.indexOf(x),[x1,y1]=point(i,x.value/5).split(',');return `<circle class="interest-dot" cx="${x1}" cy="${y1}" r="4.5"></circle>`;}).join('');
  const labels=rows.map((x,i)=>{const ratio=1.31,[x1,y1]=point(i,ratio).split(',').map(Number),cos=Math.cos(angle(i)),anchor=Math.abs(cos)<.2?'middle':cos>0?'start':'end';return `<text class="interest-chart-label" x="${x1}" y="${y1}" text-anchor="${anchor}"><tspan x="${x1}">${esc(x.label)} ${x.code}</tspan><tspan class="interest-chart-value" x="${x1}" dy="18">${x.value===null?'확인 전':pretty(x.value)}</tspan></text>`;}).join('');
  const missing=rows.filter(x=>x.value===null).map(x=>x.label);
  const titleId=`interest-profile-${compact?'edupin':'applicant'}`;
  return `<section class="interest-profile${compact?' compact':''}" data-interest-profile aria-labelledby="${titleId}"><div class="interest-profile-heading"><span>활동 흥미</span><${compact?'h3':'h2'} id="${titleId}">6영역 프로필</${compact?'h3':'h2'}><p>어떤 활동에 마음이 가는지를 여섯 방향으로 보여드려요.</p></div><div class="interest-profile-body"><div class="interest-chart-wrap"><svg class="interest-chart" viewBox="0 0 420 365" role="img" aria-labelledby="${titleId}-svg-title ${titleId}-svg-desc"><title id="${titleId}-svg-title">6영역 프로필 그래프</title><desc id="${titleId}-svg-desc">${esc(rows.map(x=>`${x.label} ${x.value===null?'확인 전':pretty(x.value)}`).join(', '))}</desc>${grid}${axes}${shape}${dots}${labels}</svg></div><div class="interest-profile-side"><dl class="interest-values">${rows.map(x=>`<div><dt>${esc(x.label)} <small>${x.code}</small></dt><dd class="${x.value===null?'unknown':''}">${x.value===null?'확인 전':pretty(x.value)}<small>${x.answered} / ${x.of}</small></dd></div>`).join('')}</dl><p class="interest-scale">1 관심이 적은 편 · 3 중간 · 5 관심이 큰 편</p><p class="interest-note">${missing.length?`답변이 부족한 ${missing.join('·')}은 ‘확인 전’으로 남기고, 그래프 선을 임의로 이어 붙이지 않았어요.`:'점수가 높을수록 그 영역의 활동에 관심을 보인 답변이 많았다는 뜻이에요.'} 능력이나 채용 적합도 순위는 아닙니다.</p></div></div></section>`;
 };
 function employerOverview(r){
  const o=r.overview,segments=r.condition_stories.map(x=>`<span class="${esc(x.state.toLowerCase())}" title="${esc(x.title+' · '+x.label)}"></span>`).join('');
  const score=o.total?`<div class="match-score"><strong>${o.matched}<small>/ ${o.total}</small></strong><span>중요 조건 부합</span><div class="fit-segments" aria-label="중요 조건 ${o.total}개 중 ${o.matched}개 부합">${segments}</div></div>`:
   `<div class="match-score empty"><strong>—</strong><span>꼭 맞아야 할 조건을 따로 고르지 않음</span></div>`;
  return `<section class="employer-overview" aria-label="지원자 핵심 요약"><div class="decision-line ${esc(o.tone)}"><span>한눈에 보는 결론</span><strong>${esc(o.decision)}</strong></div><div class="overview-scoreboard">${score}<dl class="match-counts"><div><dt>같은 방향</dt><dd>${o.matched}</dd></div><div><dt>조율할 조건</dt><dd>${o.adjustable}</dd></div><div><dt>차이 큰 조건</dt><dd>${o.gap}</dd></div><div><dt>더 확인할 조건</dt><dd>${o.unknown}</dd></div></dl></div><div class="summary-columns"><section class="summary-column strength"><span class="column-label">답변에서 파악한 지원자의 특성</span>${pointList(o.strengths,'뚜렷하게 요약할 특성은 아직 없어요. 실제 경험을 먼저 들어봐 주세요.')}</section><section class="summary-column caution"><span class="column-label">채용 전 확인할 점</span>${pointList(o.watchouts,'현재 답변에서 큰 차이는 보이지 않았어요. 실제 수행 경험과 역할 범위는 면접에서 확인해 주세요.')}</section></div><p class="overview-note">${esc(o.note)}</p></section>`;
 }
 const coreStories=rows=>rows.length?`<div class="core-story-grid">${rows.map((x,i)=>`<article class="core-story ${esc(x.state.toLowerCase())}"><div class="core-story-head"><span>${String(i+1).padStart(2,'0')}</span><b class="status ${esc(x.state.toLowerCase())}">${esc(x.label)}</b></div><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p><dl><div><dt>지원자의 답</dt><dd>${esc(x.applicant)}</dd></div><div><dt>채용처의 답</dt><dd>${esc(x.employer)}</dd></div></dl></article>`).join('')}</div>`:statement('먼저 정할 것','꼭 맞아야 하는 조건을 따로 고르지 않으셨어요. 실제 역할에서 가장 중요한 운영 방식부터 정한 뒤 지원자의 답과 비교해 주세요.');
 function applicantReport(a){
  const r=a.reading;
  const own=a.own_words.map(w=>`<div class="own-words"><h3>${esc(w.label)}</h3><p class="quote">${esc(w.text)}</p></div>`).join('');
  const familyCards=a.families.map(f=>`<article class="direction"><div class="direction-head"><h3>${esc(f.label)}</h3><span>${esc(f.relation)}</span></div><p>${esc(f.reason)}</p><p class="experience-line">${esc(f.experience_summary)}</p>${fold('이 방향을 살펴본 이유와 답변',`<p>${esc(f.limit)}</p>${sources(f.source_ids)}`)}</article>`).join('');
  const environmental=r.environment?story(r.environment):prose([r.place])+sources(r.place.source_ids);
  const remaining=r.chapters.filter(c=>!r.lead_card_ids.includes(c.id));
  const main=remaining.slice(0,2),more=remaining.slice(2);
  return wrap('applicant',lead('지원자 · 나의 일 이야기',r)+glance(r.keypoints)+interestProfile(a.scales)+
   guide([['a-person','내 모습'],['a-work','편한 일과 환경'],['a-choice','선택 기준'],['a-directions','살펴볼 방향'],['a-next','다음 한 걸음']])+
   chapter('a-person','01 · 나를 이해하기','답변 속에서 이런 모습도 함께 보였어요',main.map(story).join('')+(more.length?fold('답변에서 함께 보인 다른 모습',more.map(story).join('')):'')+(!main.length?prose(['아직은 한 가지 모습으로 설명하기보다, 어떤 조건에 마음이 가는지부터 살펴보면 좋겠어요.']):''))+
   chapter('a-work','02 · 일하는 모습을 그려보기','좋아하는 일도, 어떤 환경에서 하느냐가 중요해요',prose([r.work])+sources(r.work.source_ids)+environmental)+
   chapter('a-choice','03 · 나의 선택 기준','자리를 고를 때는, 내가 중요하게 여긴 것부터 챙겨보세요',
    prose([a.priorities.length?'여러 조건 중에서도 먼저 챙기고 싶은 순서를 골라주셨어요. 공고를 읽을 때 이 순서대로 살펴보고, 적혀 있지 않다면 직접 물어보세요.':'지금 가장 중요한 조건을 아직 정하지 않았다면, 실제 자리를 보며 하나씩 골라가도 괜찮아요.'])+
    glance(a.priorities.map((text,i)=>({label:`${i+1}순위`,text})))+preferences(a.preferences,true)+
    (own?`<h3>직접 남겨주신 경험도 함께 읽어보세요</h3>${prose(['숫자 답변만으로 담기 어려운 장면을 직접 적어주셨어요. 그때 무엇이 좋았고 무엇이 어려웠는지 떠올리며, 다음 일에서도 챙기고 싶은 조건을 찾아보세요.'])}${own}`:'')+
    (a.meaning_choices.length?`<h3>일에서 이런 순간에 의미를 느껴요</h3>${list(a.meaning_choices)}`:'')+
    fold('보수·일정·계약 등 내가 남긴 조건 모두 보기',conditionList(a.practical_choices)))+
   chapter('a-directions','04 · 가능성을 넓혀보기','이런 일의 모습도 한 번 살펴보세요',
    prose(['아래는 답변에서 찾은 탐색 방향이에요. 순서가 적합도 순위는 아니고, 하나를 골라야 하는 것도 아니에요. 마음이 가는 일이 있다면 실제 역할과 근무 조건부터 들어보세요.'])+
    (familyCards||prose(['현재 답변으로 특정 방향을 제안하기는 어려워요. 우선 관심 있는 일의 하루를 들어보며, 좋아 보이는 장면과 더 알고 싶은 부분을 하나씩 골라보세요.'])))+
   chapter('a-ask','05 · 직접 이야기해보기','이 질문부터 꺼내보면 대화가 조금 쉬워질 거예요',
    prose(['처음부터 무엇을 다 물어봐야 할지 고민하지 않아도 괜찮아요. 궁금하다고 고른 내용부터 이야기해보세요.'])+
    list(a.first_information.map(t=>`“${t}은 실제로 어떻게 운영되나요?”`),'먼저 알고 싶은 조건 하나를 골라 질문해보세요.')+
    (a.cards.length?fold('나의 경험을 돌아보며 준비할 질문',list(a.cards.slice(0,2).map(c=>c.question))):''))+
   chapter('a-next','06 · 나에게 맞는 다음 한 걸음','작은 경험 하나로, 지금보다 조금 더 알아갈 수 있어요',
    (r.support?story(r.support):'')+list(a.next)+prose([r.uncertainty])+statement('마지막으로 기억해 주세요',r.closing))+
   fold('궁금할 때 펼쳐보는 나의 답변과 상세 근거',`${axisTable(a.axes)}${scenarios(a.scenario)}${scaleTable(a.scales)}${note(a.notice)}`,'appendix')+
   `<p class="reading-footnote">이 결과는 직접 답한 내용을 바탕으로 나를 이해하는 자료예요. 실력이나 채용 결과를 정하는 판정은 아니며, 실제 경험과 조건을 함께 살펴보세요.</p>`);
 }
 function positionStory(m){
  const meaningful=m.axes.filter(a=>a.priority&&a.state!=='MATCH');
  const key=!m.eligible?'지금은 이 자리를 권하기보다 비교에 필요한 답변을 먼저 보완해 주세요.':!m.contact_allowed_by_preference?'지원자가 제안받고 싶은 범위와 현재 연락 의향을 먼저 확인해 주세요.':m.experience_requirement_needs_check?'채용처의 경험 요건과 지원자의 실제 경험부터 확인해 주세요. 선호가 가깝다는 이유로 경험 요건을 대신하지 않습니다.':m.mandatory_checks.length?`지원자가 꼭 지키고 싶다고 한 ${m.mandatory_checks.map(p=>p.condition).join('·')}부터 확인해 주세요. 그 조건이 맞는지 알기 전에는 지원을 서두르지 않는 편이 좋겠습니다.`:
   meaningful.length?'중요하게 고른 조건 중 차이가 있거나 아직 모르는 부분이 있습니다. 아래 대화에서 그 조건부터 구체적으로 들어보세요.':'실제 역할과 근무 조건을 설명한 뒤, 지원자가 더 알아보고 싶은지 들어보세요.';
  return `<article class="position"><div class="direction-head"><h3>${esc(m.label)}</h3><span class="status">${esc(m.next)}</span></div>${m.gate.length?statement('지금은 이 내용부터 확인해 주세요',m.gate.join(' · ')):''}<p>${esc(key)}</p><p>${esc(m.readiness)}</p>
   <div class="talk"><span class="eyebrow">대화를 시작한다면</span><p class="quote">${esc(m.contact_brief.say)}</p></div>
   ${m.contact_brief.checks.length?`<h4>제안하기 전에 먼저 확인해 주세요</h4>${list(m.contact_brief.checks)}`:''}
   ${fold('제안의 근거와 피할 표현 함께 보기',`<h4>가까운 업무 방식</h4>${list(m.contact_brief.reasons)}<h4>확인된 근무 조건</h4>${list(m.contact_brief.confirmed_conditions)}<h4>지원자가 먼저 궁금해한 것</h4>${list(m.contact_brief.first_information)}<h4>이런 표현은 피해주세요</h4>${list(m.contact_brief.avoid)}<p class="muted">${esc(m.contact_brief.rule)}</p>`)}
   ${fold('양쪽의 실제 조건을 나란히 비교하기',`<p>${esc(m.priority_summary)}</p>${practicalTable(m.practical)}${matchAxes(m.axes)}`)}
   ${fold('업무 내용과 처음 받을 수 있는 지원',`<p>${esc(m.role_description||'맡을 업무는 아직 더 확인해야 합니다.')}</p><h4>세 달 뒤 기대하는 모습</h4><p>${esc(m.success_at_three_months||'처음 맡을 범위와 이후 기대를 함께 정해 주세요.')}</p><h4>업무에 쓰는 시간</h4><p>${esc(m.workload?`직접 수행 ${m.workload.making??'미정'}% · 조율 ${m.workload.coordination??'미정'}% · 기타 ${m.workload.admin??'미정'}%`:'업무별 시간 비중을 아직 확인하지 못했습니다.')}</p><h4>초기에 받을 수 있는 도움</h4>${list(m.support.supports)}<p>${esc(m.support.detail||'도움받을 기간과 담당 범위를 더 들어봐 주세요.')}</p><h4>현장의 어려움과 조정할 수 있는 부분</h4><p>${esc(m.pressures||'현장의 어려움은 아직 듣지 못했습니다.')}</p><p>${esc(m.adjustments?.detail||'조정할 수 있는 범위를 먼저 확인해 주세요.')}</p>${note(m.field_note)}${matchAxes(m.field_axes)}`)}
   ${m.safety?statement('아동·청소년을 만나는 일이라면 꼭 확인해 주세요',m.safety.next):''}</article>`;
 }
 function edupinReport(b){
  const r=b.reading;
  const quick=glance([{label:'지키려는 필수 조건',text:b.preferences.must.join(' · ')||'아직 따로 지정하지 않았습니다.'},{label:'분야 답변의 바탕',text:`직접 경험 ${b.evidence.A} · 비슷한 경험 ${b.evidence.B} · 예상 ${b.evidence.C} (${b.evidence.scope})`},{label:'조건을 확인한 날짜',text:b.conditions_freshness.date||'현재 조건을 다시 확인해 주세요.'}]);
  const ops=`<p>필수 문항 ${b.validation.requiredAnswered} / ${b.validation.requiredExpected} · 추가 답변 ${b.validation.secondaryAnswered}개</p>${list(b.validation.errors.map(e=>e.message),'입력 형식에서 확인할 오류는 없습니다.')}${b.validation.missing.length?note(`필수 미응답 ${b.validation.missing.length}개`):''}${b.validation.secondaryMissing.length?note(`경험 근거·가운데 이유 등 추가 확인 ${b.validation.secondaryMissing.length}개`):''}${list(b.quality_flags,'추가 응답 패턴 알림은 없습니다. 실제 경험은 대화에서 확인해 주세요.')}<p>검사 기록: ${esc(b.freshness.date||'미확인')} · ${esc(b.freshness.state)}<br>조건 기록: ${esc(b.conditions_freshness.state)}</p>${b.delivery_permissions.map(p=>`<h3>${esc(p.position_id||'이름 없는 자리')}</h3>${list(p.reasons,p.allowed?'공유 승인 조건을 충족했습니다. 실제로 발송하지는 않았습니다.':'검토가 필요합니다.')}`).join('')}${note(b.access_note)}`;
  return wrap('edupin',lead('에듀핀 · 지원자 매칭·상담 가이드',r)+
   chapter('b-first','B-01 · 연락 전에','선호와 현재 조건을 먼저 확인해 주세요',glance(r.keypoints)+preferences(b.preferences,false)+quick+interestProfile(b.scales,true)+fold('보수·일정·계약 등 현재 조건을 모두 보기',conditionList(b.current_conditions))+statement('연락·공유 전에',b.operational_status.usable_for_matching?'기초 답변을 놓고 대조를 검토할 수 있습니다. 실제 연락과 공유 전에는 자리별 동의와 승인 상태를 확인해 주세요.':'아직 매칭에 활용하기 전에 동의나 답변을 더 확인해야 합니다. 아래 검토 상태부터 살펴봐 주세요.'))+
   chapter('b-connect','B-02 · 자리와 연결하기','이 자리를 이야기할 때는, 이렇게 시작해보세요',b.positions.map(positionStory).join('')||prose(['아직 비교할 직무가 없습니다. 실제 구인 조건이 준비되면 지원자가 원하는 조건과 함께 살펴보세요.']))+
   chapter('b-person','B-03 · 사람을 더 이해하기','답변 뒤에 있는 경험도 함께 들어보세요',r.chapters.map(story).join('')+b.own_words.map(w=>`<h3>${esc(w.label)}</h3><p class="quote">${esc(w.text)}</p>`).join('')+fold('상황 질문에서 고른 행동과 직접 쓴 설명',scenarios(b.scenario)))+
   chapter('b-review','B-04 · 확인하고 공유하기','동의와 현재 조건을 확인한 뒤 전달해 주세요',ops)+
   chapter('b-all','B-05 · 필요할 때 찾아보기','요약 뒤에 있는 모든 답과 근거를 모았어요',
    prose(['전체 37개 항목의 연결을 남겨두었습니다. 이번 질문지에서는 30개를 계산하고, 묻지 않은 7개는 비워둡니다. 궁금한 부분은 같은 문항 ID로 원응답을 찾아볼 수 있습니다.'])+
    scaleTable(b.scales)+fold('공통·분야 조건 전체 보기',axisTable(b.axes))+fold('활성 문항의 원응답과 추가 답변 모두 보기',inventoryTable(b.inventory))+fold('활성 문항 밖의 수신 데이터',`<pre>${esc(JSON.stringify(b.unmapped,null,2))}</pre>`)+b.positions.map(m=>fold(`${m.label} · 채용처 원응답 전체`,`<pre>${esc(JSON.stringify(m.original_employer_responses,null,2))}</pre>`)).join('')));
 }
 function employerReport(c){
  if(!c)return note('아직 비교할 직무가 없습니다. 채용처 질문지를 입력하거나 가상 사례를 골라주세요.');
  c=employerWords(c);
  const r=c.reading;
  const readableWork=c.work_style.map(s=>({text:s}));
  return wrap('employer',`<div class="report-context"><span>${esc(c.delivery_status)}</span><b>${esc(c.label)}</b></div>`+lead('채용처 · 모집 직무와 지원자 이야기',r,false)+
   employerOverview(r)+
   (r.first_question?statement('대화는 이 질문부터 시작해보세요',r.first_question.spoken_question):'')+
   guide([['c-fit','중요 조건'],['c-near','경험과 참고 정보'],['c-difference','확인할 차이'],['c-ask','면접 질문'],['c-start','입사 초기']])+
   chapter('c-fit','C-01 · 중요 조건','채용처가 중요하게 고른 조건을 하나씩 설명드릴게요',coreStories(r.condition_stories))+
   chapter('c-near','C-02 · 경험과 참고 정보','해당 분야를 얼마나 경험했는지 확인해 주세요',prose([r.experience_intro])+`<p class="experience-summary">${esc(c.readiness)}</p>`+fold('분야 답변이 어떤 경험에서 나왔는지',`<p>${esc(c.evidence.note)}</p><p>직접 경험 ${c.evidence.A} · 비슷한 경험 ${c.evidence.B} · 예상 ${c.evidence.C}</p>`)+fold('그 밖에 모집 직무와 같은 방향으로 답한 조건',list(readableWork.map(x=>x.text))))+
   chapter('c-difference','C-03 · 확인할 차이','약점으로 단정하기 전에, 실제 업무에서 문제가 될지 확인해 주세요',prose([r.difference_intro])+matchAxes(c.core_conditions.filter(a=>a.state!=='MATCH'))+fold('꼭 맞아야 한다고 고른 조건 모두 보기',matchAxes(c.core_conditions))+fold('그 밖의 차이와 아직 모르는 조건',matchAxes(c.differences))+
    fold('보수·일정 등 실제 조건을 함께 비교하기',practicalTable(c.practical))+prose([c.field_note])+(c.field_axes.length?fold('이 분야의 세부 조건 비교',matchAxes(c.field_axes)):'')+
    (c.counts?fold('전체 24가지 조건의 비교 개수',`<p>비슷함 ${c.counts.MATCH} · 차이 있음 ${c.counts.ADJUSTABLE} · 차이 큼 ${c.counts.GAP} · 아직 미확인 ${c.counts.UNKNOWN}</p><p>두 답변을 비교한 개수이지, 채용 적합률이나 다른 지원자와의 순위가 아닙니다.</p>`):''))+
   chapter('c-ask','C-04 · 면접에서 들어보기','정답보다, 실제로 어떻게 해왔는지 들어보세요',prose([r.interview_intro])+r.questions.map(q=>`<article class="interview"><span>${esc(q.title)}${q.category?' · '+esc(q.category):''}</span><h3>${esc(q.spoken_question)}</h3>${q.listen_for?`<p class="muted">함께 들어볼 내용 · ${esc(q.listen_for.join(' · '))}</p>`:''}${fold('이 질문이 필요한 이유',`${q.context?`<p>${esc(q.context)}</p>`:''}${q.spoken_question!==q.question?`<p>${esc(q.question)}</p>`:''}`)}</article>`).join(''))+
   chapter('c-start','C-05 · 함께 시작한다면','처음 함께할 때는, 기대와 도움의 범위를 맞춰주세요',prose([r.onboarding_intro])+`<p>${esc(c.role_description||'맡을 업무의 범위는 아직 더 확인해야 해요.')}</p>`+list(c.onboarding)+
    (c.interview_questions.some(q=>q.title==='안전·운영 안내')?statement('아동·청소년을 만나는 일이라면',c.interview_questions.find(q=>q.title==='안전·운영 안내').question):''))+
   chapter('c-limits','C-06 · 마지막으로','이 이야기는 채용 결론보다, 대화의 출발점이에요',prose(['지원자가 무엇을 편하게 느끼는지 알면 실제 역할을 이야기하기가 쉬워져요. 다만 잘할 수 있는지, 오래 함께할 수 있는지는 경험과 업무 조건을 따로 확인해야 합니다.'])+fold('이 결과가 알려주지 않는 것과 정보 공유 범위',list(c.limits)))+
   `<p class="reading-footnote">자유서술 원문과 개인 사정, 다른 자리와의 비교는 채용처에 제공하지 않습니다. 현재 화면은 내부 검토용이며 실제 발송하지 않았습니다.</p>`);
 }
 const reports=(output,audience,position=0)=>audience==='applicant'?applicantReport(output.reports.applicant):audience==='edupin'?edupinReport(output.reports.edupin):employerReport(output.reports.edupin.employer_drafts[position]);
 return {reports,applicantReport,edupinReport,employerReport};
};
