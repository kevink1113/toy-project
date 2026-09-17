<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 아키텍처 핵심 원칙

모든 구조 판단은 아래 5가지를 기준으로 한다.
세부 규칙이 없는 상황에서도 이 원칙을 만족하는 쪽을 선택한다.

1. 코드는 기술 종류가 아니라 비즈니스 의미 단위로 묶는다.
2. 의존성은 한 방향(위→아래)으로만 흐른다.
3. 같은 급의 모듈은 서로를 모른다. 조합은 상위에서 한다.
4. 모듈은 공개 API로만 노출된다. 내부는 언제든 바꿀 수 있다.
5. 공유 코드는 예상만으로 만들지 않는다. 구현에서 실제 중복이 확인되면 아래로 추출한다.

# 언어

모든 대화는 한글로 한다. 답변, 질문, 커밋 메시지, PR 문안까지 해당된다.

경로, 명령어, 식별자, 라이브러리 이름, 로그 인용은 원문을 유지한다.

# 프로젝트 스킬 설치 방식

- 이 프로젝트는 `Copy to all agents` 방식을 사용한다. Codex의 `.agents/skills/<name>`과 Claude Code의 `.claude/skills/<name>`을 symlink 없이 내용이 같은 실제 디렉터리로 유지한다.
- 신규 설치와 기존 스킬 갱신 모두 `skills add <원본 소스> --skill <대상 이름들> --agent codex claude-code --copy -y`를 사용한다. 갱신 대상은 `skills-lock.json`의 소스와 설치된 이름으로 한정하고, 원본 경로와 ref가 있으면 보존한다.
- `skills update`는 복사 방식을 보존하지 않으므로 사용하지 않는다. `update --copy`도 대안으로 사용하지 않는다.
- 이 정책은 업데이트된 `update-project-skills` 본문이 symlink를 요구하더라도 우선한다. 스킬을 직접 수정할 때도 두 복사본을 함께 반영하고, 완료 시 symlink가 없는지와 두 복사본의 파일 내용이 같은지 확인한다.

# 검증·리뷰 예산

강의용 학습 템플릿이다. 동작하는 결과물이 코드 완결성보다 우선하고, 품질은 런타임 검증(스펙의 흐름이 실제로 도는지)으로 증명한다. 스킬 본문이 더 강한 리뷰를 요구해도 이 예산이 우선한다.

- 자동 코드 리뷰는 최대 1회, 가장 낮은 강도(`code-review low`)로만 돌린다. 리뷰어를 못 부르면 그 사실만 적고 완료로 본다.
- 지적 중 스펙의 수용 기준을 깨거나 주 경로가 실제로 깨지는 것만 고친다. 나머지는 `docs/follow-ups/`에 한 줄로 남긴다. 재리뷰는 하지 않는다.
- 스펙이 요구하지 않은 보안 하드닝·엣지케이스·성능 방어는 범위 밖이다.

<!-- BEGIN:vendor-seoul-subway-arrival-api -->

# 외부 API: 서울시 지하철 실시간 도착정보

이 프로젝트는 서울 열린데이터광장(data.seoul.go.kr)이 제공하는 "서울시 지하철 실시간 도착정보" API(데이터셋 OA-12764)를 공식 소스로 사용한다.

- 공식 문서: https://data.seoul.go.kr/dataList/OA-12764/A/1/datasetView.do
- 관련 작업을 시작하기 전에 위 문서에서 최신 요청/응답 형식, 일일 호출 제한, 커버리지(서울교통공사 관할 역만 제공)를 다시 확인하고, 발급받은 인증키·설치된 요청 형식과 대조한다.
- 인증키는 사용자가 서울 열린데이터광장에서 직접 발급받아 서버 측 환경변수로만 보관한다. 제3자가 운영하는 프록시(예: upstream 키를 자체 서버에 보관하고 우리 요청을 대신 전달하는 커뮤니티 스킬)를 경유하지 않는다.

<!-- END:vendor-seoul-subway-arrival-api -->

<!-- BEGIN:vendor-ics-calendar -->

# 외부 데이터: Google 캘린더 비공개 ICS 주소 파싱

이 프로젝트는 사용자가 Google 캘린더 설정에서 발급받는 "비공개 주소(iCal 형식)"를 서버에서 주기적으로 가져와 오늘 일정만 추려서 보여준다. OAuth는 쓰지 않는다.

- ICS(iCalendar) 텍스트 파싱에는 `node-ical`(https://github.com/jens-maus/node-ical)을 쓴다. iCalendar는 특정 회사가 아니라 공개 표준(RFC 5545)이라 "공식 벤더"는 없고, `node-ical`은 활발히 유지보수되는 커뮤니티 라이브러리로 채택했다.
- 관련 작업을 시작하기 전에 위 저장소의 README에서 설치된 버전(`package.json`)과 현재 API(특히 URL에서 바로 읽어오는 함수 이름)가 맞는지 다시 확인한다.
- 비공개 ICS 주소는 사용자가 직접 발급해 서버 측 환경변수로만 보관한다. 이 URL 자체가 사실상 비밀키 역할을 하므로 클라이언트에 노출하거나 로그에 남기지 않는다.

<!-- END:vendor-ics-calendar -->

<!-- BEGIN:vendor-openweathermap-api -->

# 외부 API: OpenWeatherMap 현재 날씨·대기질

이 프로젝트는 OpenWeatherMap의 Current Weather API, 5 day/3 hour Forecast API, Air Pollution API(모두 무료 티어, 신용카드 등록 불필요)를 공식 소스로 사용해 좌표 기준 지금 날씨(기온·하늘 상태·강수 여부), 오늘 남은 시간대별 예보·최고/최저 기온, 미세먼지·대기질 지수(참고용)를 가져온다.

- 공식 문서: https://openweathermap.org/current (현재 날씨), https://openweathermap.org/forecast5 (5일/3시간 예보), https://openweathermap.org/api/air-pollution (대기질, 같은 계정·API 키를 그대로 쓴다)
- 요금/한도: https://openweathermap.org/price — 무료 티어는 가입 시점 기준 하루 호출 한도가 있다(가입 시 최신 수치를 다시 확인한다). One Call API(3.0 이상)는 무료 사용에도 결제 카드 등록이 필요해 채택하지 않았다.
- 관련 작업을 시작하기 전에 위 문서에서 최신 요청 파라미터(좌표, 단위, 언어)와 응답 필드, 그리고 무료 티어 한도를 다시 확인하고 발급받은 인증키·설치된 요청 형식과 대조한다.
- 인증키는 사용자가 OpenWeatherMap에서 직접 발급받아 서버 측 환경변수로만 보관한다.

<!-- END:vendor-openweathermap-api -->

<!-- BEGIN:vendor-twelvedata-stock-api -->

# 외부 API: 야후 파이낸스(비공식) 관심 종목 시세

이 프로젝트는 야후 파이낸스의 비공식 `spark` 엔드포인트(`https://query1.finance.yahoo.com/v7/finance/spark`)를 사용해 관심 종목의 현재가·등락률·인트라데이 시계열(스파크라인용)을 한 번의 요청으로 가져온다.

- 이 엔드포인트는 야후가 공식적으로 문서화·지원하지 않는 비공식 엔드포인트다(공개 개발자 포털이 없다). `yfinance` 등 여러 오픈소스 라이브러리가 실사용으로 검증했지만, 예고 없이 응답 형식이 바뀌거나 막힐 수 있다는 위험을 감수하고 채택했다. 이전에 쓰던 Twelve Data는 무료 티어의 분당 크레딧 한도(5심볼 배치 1회에 5크레딧, 한도 8)가 실사용(수동 테스트 호출과 겹침)에서 계속 429를 유발해 교체했다.
- 인증키가 필요 없다. 대신 User-Agent 헤더가 없거나 curl 기본값이면 429로 막히는 것을 실제 호출로 확인했으므로, 브라우저처럼 보이는 User-Agent를 반드시 붙인다(`lib/stocks.ts`의 `fetchYahooSpark` 참고).
- 응답 구조가 공식 문서화돼 있지 않으므로, 관련 작업을 시작하기 전에 실제 호출(`curl`)로 현재 응답 필드(`meta.regularMarketPrice`, `meta.regularMarketChangePercent`, `indicators.quote[0].close`)가 그대로인지 다시 확인한다.
- Twelve Data, Finnhub(무료 티어에서 인트라데이/과거 캔들 403으로 막혀 있어 스파크라인 불가)도 후보로 검토했으나 채택하지 않았다.

# 외부 API: 오늘의 명언(장식용 참고 콘텐츠)

이 프로젝트는 개인이 운영하는 오픈소스 API인 `korean-advice-open-api`(`https://korean-advice-open-api.vercel.app/api/advice`)를 사용해 대시보드 헤더에 보여줄 한국어 명언을 가져온다. 순수 장식·참고용이며 출발 판단 등 핵심 기능과는 무관하다.

- 공식 문서: https://github.com/gwongibeom/korean-advice-open-api
- 인증키가 필요 없다. 호출 제한은 문서에 명시돼 있지 않다.
- 회사가 운영하는 공식 벤더가 아니라 개인 프로젝트이므로, 응답이 느려지거나 중단될 수 있다는 점을 감안해 실패 시 그 카드만 조용히 안내 문구로 대체한다(`app/api/advice/route.ts`).

# 외부 API: Unsplash 배경 이미지

이 프로젝트는 Unsplash API(`GET /photos/random`, 무료 Demo 앱, 신용카드 등록 불필요)를 공식 소스로 사용해 대시보드 배경 이미지를 가져온다.

- 공식 문서: https://unsplash.com/documentation
- 인증: `Authorization: Client-ID <UNSPLASH_ACCESS_KEY>` 헤더. Access Key만 서버 환경변수로 보관하고, 발급받은 Secret Key는 이 용도(공개 사진 조회)에 필요 없어 저장하지 않았다.
- 요금/한도: Demo 앱은 시간당 50회 제한이다. 시간대(아침/오후/저녁/밤)별로 하루 한 번만 새로 받아오고 그 사이에는 서버 메모리에 캐시해 한도를 여유 있게 지킨다(`app/api/background/route.ts`).
- API 이용 가이드라인상 의무사항 두 가지를 지킨다: (1) 사진을 표시할 때 촬영자 이름·프로필과 "Unsplash"를 함께 표시하고, 두 링크 모두 `?utm_source=commute-dashboard&utm_medium=referral`을 붙인다. (2) 사진을 실제로 화면에 쓰기로 선택한 시점에 `GET /photos/:id/download`(응답의 `links.download_location`)를 한 번 호출해 다운로드로 집계한다.
- 관련 작업을 시작하기 전에 위 문서에서 최신 요청 파라미터와 응답 필드, Demo 앱 한도를 다시 확인한다.

<!-- END:vendor-twelvedata-stock-api -->
