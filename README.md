# 2026 주중기도회 출석체크 (QR Attendance)

2026 주중기도회 출석체크를 위한 QR 코드 생성 및 스캔 웹앱입니다.
**무료 서버(Vercel)와 데이터베이스(Supabase)를 사용하여 24/7 운영됩니다.**

## 기능
- **참석자**: 이름/폰번호 등록 -> 고유 QR 코드 생성 (DB 저장) -> 브라우저 재방문 시 자동 표시
- **관리자**: QR 코드 스캔 -> 출석 로그 DB 저장 -> 실시간 명단 확인 (로그인 필요)

## 배포 및 실행 가이드

### 1단계: Supabase (데이터베이스) 설정
1. [Supabase](https://supabase.com/)에 가입하고 'New Project'를 생성합니다.
2. 프로젝트가 생성되면 `Table Editor`로 이동하지 말고, `SQL Editor`로 이동합니다.
3. 프로젝트 내 `schema.sql` 파일의 내용을 복사하여 SQL Editor에 붙여넣고 `Run`을 클릭합니다.
4. 프로젝트 설정(Project Settings) -> `API` 메뉴에서 다음 두 값을 복사합니다:
   - Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
   - anon public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### 2단계: Vercel 배포
1. GitHub에 이 코드를 업로드합니다.
2. [Vercel](https://vercel.com)에 로그인하여 'Add New Project'를 합니다.
3. GitHub 레포지토리를 연결합니다.
4. **Environment Variables** 설정 섹션에 다음 값들을 추가합니다:
   - `NEXT_PUBLIC_SUPABASE_URL`: (위에서 복사한 값)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (위에서 복사한 값)
   - `ADMIN_PASSWORD`: 관리자 접속용 비밀번호 (예: `2026prayer`)
5. `Deploy` 버튼을 누릅니다.

### 3단계: 사용하기
배포된 URL(예: `https://your-project.vercel.app`)에 접속하여 테스트합니다.
- `/`: 메인 페이지
- `/attendee`: 참석자 등록 (누구나 가능)
- `/admin`: 관리자 스캔 (비밀번호 필요)

## 로컬 개발 환경
`.env.local` 파일을 생성하고 키를 입력하세요.
```bash
cp .env.local.example .env.local
# 파일 편집 후
npm run dev
```
