운의 궤도 — 독립 배포용 정적 웹앱

최신 배포 버전: eb7a076cf226ae652468748295540091224913e7

[사이트로 배포]
1. ZIP 파일을 풀어 주세요.
2. index.html이 있는 폴더의 모든 파일과 vendor 폴더를 정적 웹 호스팅에 올려 주세요.
3. 시작 파일은 index.html입니다. 별도 빌드, npm 설치, API 키, 데이터베이스, 백엔드는 필요하지 않습니다.
4. 호스팅에 빌드 설정이 있다면 빌드 명령은 비워 두고, 게시 디렉터리는 index.html이 있는 폴더로 지정하세요.
5. .mjs 파일은 JavaScript MIME 형식(text/javascript 또는 application/javascript)으로 제공되어야 합니다.

폴더 구조와 파일 이름은 유지해 주세요. 하위 경로에 배포해도 상대 경로로 파일을 불러옵니다.
3D 엔진인 Three.js도 vendor 폴더에 포함되어 있습니다.
Google Fonts를 온라인으로 불러오며, 연결되지 않으면 시스템 글꼴을 사용합니다.

[내 컴퓨터에서 실행]
index.html을 더블클릭하는 file:// 실행 대신 HTTP 서버로 열어 주세요.
Python 3가 설치되어 있다면 압축을 푼 폴더에서 다음을 실행하세요.

    python3 preview.py

Windows에서는 다음 명령을 사용할 수 있습니다.

    py preview.py

이후 브라우저에서 http://127.0.0.1:8080/ 을 여세요.
포트 변경: python3 preview.py 8081
종료: 터미널에서 Ctrl+C
preview.py는 로컬 확인용입니다. 웹 호스팅에서는 실행하지 않아도 됩니다.

[기록 저장]
뽑기 기록, 도감, 이미 본 연출은 각 브라우저의 localStorage에 저장됩니다.
새 도메인에 배포하면 기존 사이트의 기록은 자동으로 옮겨지지 않습니다.
이 압축 파일에는 개인 뽑기 기록이 포함되어 있지 않습니다.

[포함 기능]
18개 희귀도와 확률표, 1/10/100연속 뽑기, 확인이 필요한 결과 카드,
기간별 기록, 희귀도 도감, 준비 연출과 희귀도별 3D 연출, 이미 본 전용 연출 건너뛰기.
뽑기 딜레이는 현재 비활성화되어 있습니다.

[소스 수정]
index.html: 화면 구성
style.css: UI 스타일
core.mjs: 희귀도, 확률 및 기록 처리
app.mjs: 뽑기 흐름 및 UI 동작
scene.mjs: 3D 별, 카메라 및 효과
cinematics.mjs: 희귀도별 전용 연출 설정
sky.mjs: 로비의 반짝이는 배경 별

Third-party license: vendor/THREE-LICENSE.txt

[기존 GitHub/Vercel 사이트 업데이트]
3D 해상도 수정과 모바일 확률표·도감·기록 팝업의 높이 및 스크롤 개선이 포함되어 있습니다.
뽑기 결과 팝업의 기존 디자인과 동작은 유지했습니다.
기존 프로젝트 폴더의 index.html, app.mjs, style.css, scene.mjs를 이 ZIP의 같은 이름 파일로 덮어써 주세요.
.git 폴더는 그대로 유지하세요. 이어서 기존 프로젝트 폴더에서 실행하세요.

    git add index.html app.mjs style.css scene.mjs
    git commit -m "Fix mobile information dialogs"
    git push

GitHub와 연결된 Vercel 프로젝트는 새 커밋으로 다시 배포됩니다.
