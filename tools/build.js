"use strict";
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const S=require('../engine/schema'),UI=require('./ui'),{run}=require('../engine/reports'),{samples}=require('../engine/samples');
const reportVersion=require('../engine/reading').version;
const write=(file,content)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),content);};
function bundle(entry){
 const sources=new Map();
 function visit(filename){
  let absolute=path.resolve(root,filename);if(!path.extname(absolute))absolute+='.js';
  const id=path.relative(root,absolute).replace(/\\/g,'/');if(sources.has(id))return id;
  const source=fs.readFileSync(absolute,'utf8');sources.set(id,'');
  if(id.endsWith('.json'))sources.set(id,`module.exports=${source};`);
  else sources.set(id,source.replace(/require\(['"]([^'"]+)['"]\)/g,(whole,request)=>{
   if(!request.startsWith('.'))throw Error('Browser bundle must not include node/external modules: '+request);
   const dependency=visit(path.relative(root,path.resolve(path.dirname(absolute),request)));
   return `require(${JSON.stringify(dependency)})`;
  }));
  return id;
 }
 const id=visit(entry);
 return `(function(){'use strict';const modules={${[...sources].map(([k,s])=>`${JSON.stringify(k)}:function(require,module,exports){\n${s}\n}`).join(',')}};const cache={};function require(id){if(!cache[id]){const m={exports:{}};cache[id]=m;modules[id](require,m,m.exports);}return cache[id].exports;}require(${JSON.stringify(id)});})();`;
}
const tabs=`<nav class="tabs" aria-label="결과지 대상"><button data-audience="applicant" aria-pressed="true">지원자 · 나의 일 선택 기준</button><button data-audience="edupin" aria-pressed="false">에듀핀 · 매칭과 상담</button><button data-audience="employer" aria-pressed="false">채용처 · 직무와 지원자</button></nav><div class="controls"><label hidden>비교 직무 <select id="position-select" aria-label="비교할 직무"></select></label></div>`;
const header=`<header><span class="brand">EDUPIN</span><span class="version">해설 v${reportVersion} · 질문·분석 v${S.version}</span><nav class="toplinks"><a href="START-HERE.html">시작 안내</a><a href="edupin-questionnaire-preview.html">질문지</a><a href="edupin-report-preview.html">결과지</a></nav><p class="prototype">질문지와 가상 사례를 살펴보는 검토용 미리보기예요. 실제 개인정보 저장·접수·발송은 하지 않습니다.</p></header>`;
const footer=`<footer>자기보고 기반 탐색 자료 · 실제 능력·성과·채용 적합률을 인증하지 않습니다.<br>문항의 현장 타당도와 사용성 검증은 별도로 필요합니다. 해설 화면 2026-09-07 개정.</footer>`;
function page(type,title,body,script=true){return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} · Edupin v${type==='questionnaire'?S.version:reportVersion}</title><link rel="stylesheet" href="styles.css"></head><body data-page="${type}"><div class="page">${header}${body}${footer}</div>${script?'<script src="app.js" defer></script>':''}</body></html>`;}
const counts=S.branches.flatMap(b=>[false,true].map(child=>S.activeItems({'F3-7':b.code,'F3-10':child?'예':'아니오'}).length));
const minCount=Math.min(...counts),maxCount=Math.max(...counts);
const first=run(samples()[0].input);
write('preview/styles.css',fs.readFileSync(path.join(__dirname,'styles.css'),'utf8'));
write('preview/app.js',bundle('tools/browser.js'));
write('preview/edupin-report-preview.html',page('report','결과지 검토',`<div class="controls"><label>가상 응답 사례 <select id="sample-select"></select></label></div><p class="muted">같은 사람의 답변을 세 가지 시선으로 읽어볼 수 있어요. 채용처 화면도 아직 공유하지 않은 내부 검토 초안입니다.</p>${tabs}<main id="content">${UI.reports(first,'applicant')}</main>`));
write('preview/edupin-questionnaire-preview.html',page('questionnaire','질문지 검토',`<h1 style="margin-top:30px">나와 일의 조건을 함께 살펴봐요</h1><p>숫자로 성향의 우열을 매기는 검사가 아닙니다. 흥미·선호·최근 행동을 요약하고, 실제 일자리 선택에 필요한 질문을 정리해요. 일부 답변의 평균은 상세 근거에 표시합니다.</p><p class="muted">지원자 최대 ${minCount}~${maxCount}개 묶음(선택 서술 2개 포함). 입력란과 경험 근거·가운데 이유 등 추가 응답이 있어 소요시간은 파일럿에서 확인할 예정입니다. 이 화면은 자동 저장하지 않으며 새로고침하면 입력이 사라집니다.</p><nav class="tabs" aria-label="질문지 대상"><button data-form="applicant" aria-pressed="true">지원자 질문지</button><button data-form="employer" aria-pressed="false">채용처 질문지</button></nav><p id="form-count" class="muted"></p><nav id="module-links" class="module-links" aria-label="질문 영역 바로가기"></nav><main id="content"></main><div class="form-actions"><button class="primary" id="calculate">입력한 답으로 결과 초안 보기</button><button id="load-sample">가상 응답 채워 검토하기</button><button id="reset">입력 비우기</button></div><section id="result-area" class="result-area" hidden><h2>현재 입력으로 만든 결과 초안</h2><p id="validation-summary" class="prototype"></p>${tabs}<div id="live-result"></div></section>`));
write('preview/START-HERE.html',page('start','시작 안내',`<h1 style="margin-top:30px">여섯 가지 활동 흥미를<br>한눈에 보는 v${reportVersion}</h1><p>기존 v2.0·v3.0·v3.1·v3.2·v3.3·v3.4는 보존했습니다. 질문·분석은 v3.1을 바탕으로 하며, 중복 경험 문항을 삭제하고 03·04·05번 답변을 해설에 연결했습니다. 기존 여섯 흥미 평균을 ‘6영역 프로필’로 보여줍니다.</p><div class="start-grid"><a href="edupin-questionnaire-preview.html">질문지 살펴보기<small>지원자·채용처 · 조건부 질문 · 입력 결과 체험</small></a><a href="edupin-report-preview.html">세 결과지 비교하기<small>지원자·에듀핀 탭의 6영에 프로필과 채용처 요약 확인</small></a></div><h2>이번에 바뀐 핵심</h2><ul><li>지원자 결과 앞부분에 여섯 활동 흥미를 육각형과 숫자로 보여주는 ‘6영역 프로필’을 넣었습니다.</li><li>에듀핀에는 비교용 프로필을 넣고, 채용처에는 활동 흥미 그래프를 제공하지 않습니다.</li><li>응답이 부족한 영역은 ‘확인 전’으로 남기고 육각형을 임의로 완성하지 않습니다.</li><li>그래프는 능력·성격 등급·채용 적합도가 아니라 활동 흥미의 응답 요약입니다.</li><li>v3.4의 채용처 요약·문항 근거 비공개·반복 축소는 그대로 유지합니다.</li><li>지원자 기존 17번 경험 문항을 삭제하고 03·04·05번 답변을 경험 해설에 활용합니다. 활동 기간과 협업 경험은 전체 활동의 맥락으로 읽고, 직무의 직접 경험 요건은 별도 확인합니다.</li></ul><p><a href="docs/revision-notes.md">변경 내용과 한계</a> · <a href="docs/pilot-validation-plan.md">현장 검증 계획</a> · <a href="docs/change-impact.md">문항별 유지·수정·추가·제외 기록</a></p>`,false));
function itemMarkdown(i){
 let out=`### ${i.id}. ${i.text||i.title||'더 편한 쪽을 골라주세요'}${i.required===false?' — 선택':''}\n\n`;
 if(i.help)out+=i.help+'\n\n';
 if(i.type.startsWith('bipolar'))out+=`1: ${i.left}\n\n7: ${i.right}\n\n4를 고르면 이유를 구분합니다: ${S.neutralOptions.join(' / ')}. ?는 판단하기 어려움입니다.\n\n`;
 else if(i.type==='group')out+=i.fields.map(f=>`- ${f.label}${f.optional?' (선택)':''}: ${f.options?f.options.join(' / '):f.type==='number'?`숫자 ${f.min}~${f.max}, 미정이면 빈칸`:f.type==='date'?'날짜, 미정이면 빈칸':'짧은 글'}`).join('\n')+'\n\n';
 else if(i.type==='sjt'||i.type==='norm_check')out+=i.scenario+'\n\n'+i.options.map(o=>`- ${o.key}. ${o.text}`).join('\n')+'\n\n';
 else if(i.type==='priority')out+='공통 24축에서 1·2·6·7로 답한 조건을 뚜렷한 순서로 최대 12개 표시합니다. 0개도 가능합니다. 최대 선택 수 = 노출 수 / 3 반올림, 1~4개(노출 0개면 0개). 없음은 명시적으로 확인합니다.\n\n';
 else if(i.options||i.status_options)out+=(i.options||i.status_options).map(o=>`- ${typeof o==='string'?o:o.text}`).join('\n')+'\n\n';
 if(i.type==='likert_1_5')out+='1~5로 답합니다. 판단할 경험이 없으면 ?를 고릅니다. 질문 영역의 척도 설명을 따릅니다.\n\n';
 if(i.evidence||i.type==='sjt')out+='답의 바탕: A 직접 경험 / B 비슷한 경험 / C 경험 없이 예상. ? 응답에는 근거 선택을 강요하지 않습니다.\n\n';
 if(i.type==='sjt')out+='중요한 이유 최대 2개: '+S.tags.join(' / ')+'.\n\n선택 이유를 한두 문장으로 더 적을 수 있습니다(선택).\n\n';
 if(i.type==='norm_check')out+='기관 규정을 확인해본 적이 있나요? 예 / 아니오 / 잘 모르겠다.\n\n';
 return out+`문항판 ${i.revision||'3.0'}${i.branch?' · 분야 '+S.labels[i.branch]:''}${i.when?' · 아동·청소년 접촉 시 표시':''}\n\n`;
}
for(const audience of ['applicant','employer']){
 const mods=audience==='applicant'?S.applicant:S.employer;
 let md=`# 에듀핀 ${audience==='applicant'?'지원자':'채용처'} 질문지 v${S.version}\n\n상태: 현장 검증 전 개정 초안. 원본은 engine/schema.js이며 이 문서는 자동 생성됩니다.\n\n자기보고를 바탕으로 흥미·선호·최근 행동·실제 조건을 구분합니다. 점수 일부는 응답 평균이며 능력·우열·정신건강·도덕성·채용 적합률이 아닙니다.\n\n실서비스에서는 검사 목적, 수집 항목, 열람 대상, 보관기간, 철회·정정 방법을 확정해야 합니다. 이 로컬 미리보기는 저장하거나 접수하지 않습니다.\n\n`;
 for(const m of mods)md+=`## ${m.display_title}\n\n${m.intro}\n\n`+m.items.map(itemMarkdown).join('');
 write(`docs/${audience}-questionnaire.md`,md);
}
const old=require('../reference/applicant-bank.v2.json').modules.flatMap(m=>m.items),current=S.allItems('applicant');
const rows=old.map(i=>{
 const now=current.find(x=>x.id===i.id),removed=S.retiredInterest.find(x=>x.id===i.id);
 return [i.id,now?(now.requiresReanswer?'표현·의미 정비':'유지'):'필수 질문지에서 제외',
 removed?'v3.0 화면 '+removed.previousNumber+'번 · v3.1 제외. '+removed.reason:
 !now?(i.id.startsWith('B3')?'매칭 활용과 사용 허가·측정 범위를 재검토. 다른 답으로 성격값 추정 금지.':'자기평가보다 실제 우선순위·조건 기록과 상담 질문으로 전환. 기존 척도와 동등하다고 주장하지 않음.'):
 now.requiresReanswer?'주체·양극 의미를 일치시킴. v2 응답 자동 재사용 금지.':
 i.id.startsWith('R3-')?'문구·ID 유지. 흥미 영역별 4문항 구성으로 재계산하며 구판과 측정 동등성은 검증 전.':
 '문항 구성 유지. 미정·경험 근거와 해석 조건 보강.'];
});
rows.push(['K3-07','필수 질문지에서 제외','기존 화면 17번의 중복 경험 질문을 삭제. F3-3 활동·F3-4 전체 활동 기간·F3-5 협업·고객관계를 해설에 활용하며 특정 분야의 직접 경력으로 단정하지 않음.']);
for(const i of current.filter(i=>!old.some(x=>x.id===i.id)))rows.push([i.id,'추가',i.id.startsWith('K3')?'실제 조건·경험·제안 의향·직접 설명을 분석과 상담에 연결.':i.branch==='ADULT'?'성인 교육을 별도 탐색. 현직자 검토 필요.':'아동 접촉 여부로 안전 질문 분기.']);
write('docs/change-impact.md',`# 문항별 변경 영향\n\n문항 구성은 v3.1이며, v3.2는 전체 해설 표현, v3.3은 채용처 비교 요약, v3.4는 채용처 특성 설명 압축과 근거 비공개, v3.5는 지원자·에듀핀의 6영역 프로필 표시를 추가했습니다. v2.0·v3.0·v3.1·v3.2·v3.3·v3.4 원본은 보존합니다. 문항 감소가 측정 동등성이나 시간 단축을 입증하지는 않습니다.\n\n지원자 기본 ${minCount}묶음(선택 서술 2개 포함), 아동 접촉 시 ${maxCount}묶음. v3.0의 134~138개 대비 각각 7개 감소했습니다. 기존 17번(K3-07)의 중복 경험 문항을 삭제하고, 03·04·05번(F3-3·4·5) 답변을 경험 해설에 활용합니다. 활동 흥미는 영역별 4문항, 총 24문항입니다. v3.0 화면 29·34·45·48·49·50번을 제외했습니다. 화면 번호는 연속 재부여하지만 유지 문항의 내부 ID와 문구는 바꾸지 않습니다. 성인 분기는 선택한 사람만 답합니다.\n\n|문항|처리|이유와 분석 영향|\n|---|---|---|\n${rows.map(r=>'|'+r.join('|')+'|').join('\n')}\n\n## 요약값의 연속성\n\n${S.scales.map(s=>`- ${s.id}: ${s.active?(s.id.startsWith('riasec.')?'4문항 단축 구성 · 평균 계산':'문항 구성 유지'):'이번 판에서 묻지 않음'} · ${s.label}`).join('\n')}\n\n7개 미측정 항목을 삭제된 정보 없이 동일하게 분석한다고 주장하지 않습니다. 계산하는 30개 중 흥미 6개는 각 4문항으로 단축했고, 나머지 24개의 구성은 유지했습니다. 네 문항 모두 숫자일 때 평균을 내며, 미정·누락은 추정하지 않습니다. 흥미 평균 3.5를 사용하는 탐색 기준은 잠정 유지하며, 단축으로 달라지는 결과는 현장 검증이 필요합니다.\n`);
write('fixtures/sample-results.json',JSON.stringify(samples().map(s=>({id:s.id,label:s.label,result:run(s.input)})),null,2));
write('docs/report-layout.md',`# 대상별 결과지 구성\n\n모든 화면은 engine/reports.js의 같은 응답 기반 데이터에서 생성합니다. 수기로 별도의 인물 경력·점수를 추가하지 않습니다.\n\n## 지원자\n\n첫머리: 가장 중요한 두 가지 모습을 이야기로 읽고 핵심 선택 기준과 6영역 프로필 확인\n\n1. 여섯 활동 흥미의 응답 평균을 육각형과 숫자로 확인\n2. 첫머리에서 설명하지 않은 모습 더 살펴보기\n3. 편한 일과 환경\n4. 필수 조건·우선순위·직접 남긴 경험\n5. 새롭게 살펴볼 방향\n6. 대화를 시작할 질문\n7. 부담 없는 다음 한 걸음\n\n상세: 공통 24조건, 선택 분야 10조건, 상황 답변, 현재 30개 요약값.\n\n## 에듀핀\n\n1. 현재 구직 조건·선호·비선호·필수·협의 범위와 비교용 6영역 프로필\n2. 자리별 실제 조건·차이·초기 지원·대화 초안\n3. 교차 해석·선택 이유·원문\n4. 미응답·입력 오류·동의·담당자 검토·업데이트\n5. 기존 37항목의 상태와 모든 수신 원응답(비활성 입력은 별도 구분)\n\n## 채용처\n\n첫머리: 핵심 조건 부합 개수·검토 상태·지원자 특성·확인할 점을 같은 요약판에서 확인. 비교 보류·경험 요건·필수 조건 차이는 긍정 문장보다 먼저 표시\n\n1. 채용처가 중요하게 고른 조건과 지원자의 답을 조건별 대화문으로 비교\n2. 해당 분야 경험과 참고용 전체 업무 조건\n3. 약점으로 단정하기 전에 확인할 차이와 실제 조건\n4. 실제 경험을 듣는 면접 질문\n5. 처음 함께 정할 업무와 지원\n6. 해석의 범위와 정보 경계\n\n6영역 프로필은 지원자와 에듀핀에만 표시하며 채용처에는 제공하지 않습니다. 지원자의 행동 특성은 첫 요약에 한 번만 보여주며 아래에서 같은 설명을 반복하지 않습니다. 중요 조건은 크게, 분야 경험과 전체 업무 조건은 컴팩트한 펼쳐보기로 구분합니다. 채용처 화면과 실제 공유 데이터에는 문항 ID·근거 ID를 제공하지 않고, 해당 근거는 에듀핀 내부 결과에서만 확인합니다. 같은 위치와 상태 표현을 사용해 여러 지원자의 결과를 비교하기 쉽게 구성합니다. 부합 개수는 채용처가 중요하게 고른 조건 안에서 같은 방향으로 답한 수이며, 채용 적합률이나 지원자 순위가 아닙니다. 자유서술 원문·개인 활동 사정·다른 분야의 경험 집계·다른 자리 비교·성격값은 제외합니다. 표본 화면의 채용처 탭은 내부 검토 초안입니다. 실제 공유 가능 결과는 별도 동의와 현재 응답에 대한 담당자 승인 조건을 통과해야 합니다. 서버 접근통제는 이 로컬 도구에 포함되지 않습니다.\n`);
for(const file of ['revision-notes.md','pilot-validation-plan.md','change-impact.md'])write('preview/docs/'+file,fs.readFileSync(path.join(root,'docs',file),'utf8'));
console.log(`Built report v${reportVersion}; questionnaire v${S.version} with experience-question consolidation.`);
