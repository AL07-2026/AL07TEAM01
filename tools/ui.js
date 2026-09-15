"use strict";
const S=require('../engine/schema');
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pretty=x=>Array.isArray(x)?x.join(' · '):x===null||x===undefined||x===''?'미확인':typeof x==='object'?Object.entries(x).map(([k,v])=>`${k}: ${pretty(v)}`).join(' / '):String(x);
const list=(xs,empty='아직 확인된 내용이 없습니다.')=>xs?.length?`<ul>${xs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:`<p class="muted">${esc(empty)}</p>`;
const section=(n,title,content)=>`<section class="report-section"><div class="section-label">${esc(n)}</div><h2>${esc(title)}</h2>${content}</section>`;
const sources=ids=>`<details class="source"><summary>궁금하다면, 어떤 답에서 나왔는지 보기</summary><p>${esc((ids||[]).join(' · '))}</p><p>아래 상세 근거에서 같은 문항 ID의 답을 찾아볼 수 있어요.</p></details>`;
const note=t=>`<p class="note">${esc(t)}</p>`;
function conditionList(choices){
 const out=[];
 for(const i of S.allItems('applicant').filter(i=>i.module==='K3'&&!['K3-08','K3-09'].includes(i.id))){
  const v=choices?.[i.id];if(v===undefined)continue;
  out.push(`<div><dt>${esc(i.text)}</dt><dd>${i.fields?i.fields.filter(f=>v[f.key]!==undefined&&v[f.key]!=='').map(f=>`<span class="condition-line"><b>${esc(f.label)}</b> ${esc(pretty(v[f.key]))}</span>`).join(''):esc(pretty(v))}</dd></div>`);
 }
 return out.length?`<dl class="conditions">${out.join('')}</dl>`:note('현재 선택 조건은 아직 입력되지 않았습니다.');
}
function evidenceBlock(c){return `<article class="insight"><h3>${esc(c.title)}</h3><p>${esc(c.observation)}</p><p class="muted"><b>더 확인할 부분</b> ${esc(c.unknown||c.limit)}</p>${sources(c.source_ids)}</article>`;}
function scaleTable(scales){
 return `<div class="table-wrap"><table class="dense"><caption>응답 요약 · 능력·성격의 우열 점수가 아닙니다.</caption><thead><tr><th>항목</th><th>응답 평균</th><th>근거</th><th>상태</th></tr></thead><tbody>${scales.map(s=>`<tr><td>${esc(s.label)}<small>${esc(s.id)}</small></td><td>${s.value===null?'—':esc(s.value)}</td><td>${s.answered} / ${s.of}<small>${esc(s.source_ids.join(' · '))}</small></td><td>${esc(s.status)}${s.note?`<small>${esc(s.note)}</small>`:''}</td></tr>`).join('')}</tbody></table></div>`;
}
function axisTable(axes){return `<div class="table-wrap"><table class="dense"><thead><tr><th>살펴본 조건</th><th>내 답변</th><th>답의 바탕</th></tr></thead><tbody>${axes.map(a=>`<tr><td>${esc(a.left)}<br>↔ ${esc(a.right)}<small>${esc(a.id)}</small></td><td>${esc(a.reading)}<small>${a.value===null?'숫자 판단 보류':`선택 ${a.value} / 7`}</small></td><td>${esc({A:'직접 경험',B:'비슷한 경험',C:'경험 없이 예상'}[a.evidence]||'공통 선호 응답')}</td></tr>`).join('')}</tbody></table></div>`;}
function scenarios(xs){return xs.map(s=>`<details class="scenario"><summary>${esc(s.title)} · ${esc({A:'직접 경험',B:'비슷한 경험',C:'예상'}[s.evidence]||'근거 미확인')}</summary><p>${esc(s.scenario)}</p><dl class="conditions"><div><dt>먼저 고른 행동</dt><dd>${esc(s.action||'미응답')}</dd></div><div><dt>고른 이유</dt><dd>${esc(s.tags.join(' · ')||'미응답')}</dd></div><div><dt>직접 쓴 설명</dt><dd class="quote">${esc(s.explanation||'추가 설명 없음')}</dd></div></dl>${note(s.limit)}${sources(s.source_ids)}</details>`).join('');}
function preferences(p,applicant=false){return `<div class="preference-columns"><div><h3>${applicant?'마음이 가는 조건':'선호하는 조건'}</h3>${list(p.preferred.slice(0,5).map(x=>x.text),'아직 뚜렷하게 고른 조건은 없어요.')}${p.preferred.length>5?`<details><summary>마음이 간 다른 조건도 보기</summary>${list(p.preferred.slice(5).map(x=>x.text))}</details>`:''}</div><div><h3>피하고 싶은 조건</h3><p>${esc(p.nonpreferred||'아직 따로 남기지 않았어요. 좋아하는 조건의 반대를 싫어한다고 단정하지는 않을게요.')}</p><h3>이야기해보고 정할 수 있는 부분</h3><p>${esc(p.negotiable||'아직 따로 남기지 않았어요.')}</p></div></div><p><b>꼭 지키고 싶은 조건</b> ${esc(p.must.join(' · ')||'아직 따로 고르지 않았어요.')}</p>`;}
function practicalTable(rows){return `<div class="table-wrap"><table><thead><tr><th>조건</th><th>확인 상태</th><th>양쪽의 답변</th></tr></thead><tbody>${rows.map(c=>`<tr><td>${esc(c.condition)}${c.mandatory?'<small>지원자 필수</small>':''}</td><td><span class="status ${esc(c.state.toLowerCase())}">${esc(c.label)}</span></td><td>${esc(c.detail)}</td></tr>`).join('')}</tbody></table></div>`;}
function matchAxes(axes){return `<div class="match-lines">${axes.map(a=>`<div class="match-line"><span class="status ${esc(a.state.toLowerCase())}">${esc(a.label)}${a.priority?' · 핵심':''}</span><p><b>지원자</b> ${esc(a.applicant)}<br><b>채용처</b> ${esc(a.employer)}</p></div>`).join('')}</div>`;}
function inventoryTable(xs){return `<div class="table-wrap"><table class="dense"><thead><tr><th>문항</th><th>원응답과 추가 답변</th></tr></thead><tbody>${xs.map(i=>`<tr><td>${esc(i.prompt)}<small>${esc(i.id)}</small></td><td>${esc(pretty(i.response))}${Object.entries(i.details).map(([key,v])=>`<small>${esc(key)}: ${esc(pretty(v))}</small>`).join('')}</td></tr>`).join('')}</tbody></table></div>`;}
function employerQuestionnaireReport(res){
 const active=S.activeItems(res,'employer');
 const axisReading=i=>{
  const value=res[i.id];
  return typeof value!=='number'?'아직 미정':value===4?(res[i.id+'__neutral_reason']||'양쪽이 비슷함'):value<4?i.left:i.right;
 };
 const rows=items=>`<dl class="conditions">${items.map(i=>{
  const value=res[i.id];
  const label=(i.type.startsWith('bipolar')?`${i.left} / ${i.right}`:i.text||i.title||'운영 조건').replace(/이 자리/g,'모집 직무');
  const displayValue=i.values?(i.options[i.values.indexOf(value)]||value):value;
  const answer=i.type.startsWith('bipolar')?esc(axisReading(i)):i.fields?i.fields.filter(f=>value[f.key]!==undefined&&value[f.key]!==null&&value[f.key]!=='').map(f=>`<span class="condition-line"><b>${esc(f.label)}</b> ${esc(pretty(value[f.key]))}</span>`).join(''):esc(pretty(displayValue));
  return `<div><dt>${esc(label)}</dt><dd>${answer}</dd></div>`;
 }).join('')}</dl>`;
 const priority=Array.isArray(res['HP-01'])?active.filter(i=>res['HP-01'].includes(i.mirrors)&&['HJ','HE'].includes(i.module)):[];
 const priorityBody=priority.length?list(priority.map(axisReading)):note(Array.isArray(res['HP-01'])?'꼭 맞아야 할 조건을 따로 지정하지 않았습니다.':'꼭 맞아야 할 조건은 아직 고르지 않았습니다.');
 const sections=S.employer.map((m,n)=>{
  const items=active.filter(i=>i.module===m.code&&i.id!=='HP-01'&&res[i.id]!==undefined);
  if(!items.length&&m.code!=='HP')return '';
  return section(String(n+1).padStart(2,'0'),m.display_title.replace(/이 자리/g,'모집 직무'),(m.code==='HP'?priorityBody:'')+rows(items));
 }).join('');
 return `<article class="reading-report" data-reading="employer" data-employer-summary><div class="report-lead"><span class="eyebrow">채용처 · 직무와 조직 운영</span><h1>${esc(res['HF-02']||'우리 직무와 조직의 운영 요약')}</h1><p>작성한 채용처 답변으로 실제 업무와 조직 운영 조건을 정리했어요. 지원자 답변을 함께 입력하면 직무 비교 결과도 볼 수 있습니다.</p></div>${sections||note('채용처 질문지에 답변을 입력하면 이곳에 요약이 표시됩니다.')}</article>`;
}
const readingLayout=require('./reading-layout')({esc,pretty,list,sources,note,conditionList,evidenceBlock,scaleTable,axisTable,scenarios,preferences,practicalTable,matchAxes,inventoryTable});
module.exports={esc,pretty,employerQuestionnaireReport,...readingLayout};
