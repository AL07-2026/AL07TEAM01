# React SPA Boilerplate

수업과 소규모 프로젝트에서 바로 시작할 수 있는 가벼운 React SPA 기본 구성입니다.

## 요구 환경

- Node 22.22.2 이상, 23 미만 또는 Node 24.15 이상, 25 미만
- 권장 Node 버전: 24.18.0
- npm은 현재 설치된 버전을 그대로 사용

직접 의존성은 정확한 버전으로 고정되어 있고, 전체 의존성 트리는 `package-lock.json`으로
관리합니다.

협업과 CI의 기준은 Node 24.18.0입니다. 기존에 Node 22.22.2 이상이 설치되어 있다면 다시
설치하지 않고 그대로 사용할 수 있습니다.

## 시작

최초 한 번 `npm run setup`을 실행합니다. 환경 확인, 필요한 의존성 설치, 타입·린트·테스트·
빌드 검증까지 완료됩니다.

이후에는 `npm run dev`로 개발 서버를 실행합니다.

전체 검증만 다시 실행하려면 `npm run validate`를 사용합니다.

PowerShell에서 `npm.ps1` 실행 정책 오류가 발생하면 명령 프롬프트를 사용하거나
`npm.cmd run setup`으로 실행하세요. Node나 프로젝트를 다시 설치할 필요는 없습니다.

OneDrive 같은 동기화 폴더에서는 설치가 느리거나 파일 잠금이 발생할 수 있습니다. 같은 오류가
반복되면 짧은 영문 로컬 경로로 옮겨 사용하세요.

## 포함된 구성

- Vite, React, TypeScript
- React Router
- Tailwind CSS
- shadcn/ui 호환 설정
- Lucide 아이콘
- ESLint, Prettier
- Vitest, Testing Library

TanStack Query, Zustand, React Hook Form, Zod, Axios는 모든 프로젝트에 필요한 도구가 아니므로
기본 설치에서 제외했습니다. 실제 프로젝트에서 필요할 때 추가하세요.

## 명령

- `npm run setup`: 최초 설치와 전체 검증
- `npm run dev`: 개발 서버 실행
- `npm run validate`: 타입·린트·테스트·빌드 전체 검사
- `npm run test`: 단위 테스트
- `npm run format`: 코드 포맷 정리
- `npm run build`: 프로덕션 빌드

## 주요 구조

- `src/app`: 앱과 라우터
- `src/components/ui`: 공통 UI
- `src/lib`: 공통 유틸리티
- `src/styles`: 전역 스타일
- `src/test`: 테스트 설정
