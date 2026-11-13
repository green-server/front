# front

Green Server의 웹 관리자 창. 서버별 전력, 예상 요금, 프로세스 순위, 추천, 컨설팅 승인, 절약 리포트를 보여준다.

- 스택: React + Vite + React Router (react-router-dom), JavaScript, styled-components, axios
- 화면만 담당한다. 요금 계산, 추천 판단 같은 로직은 `back`에 둔다.
- 전력 수치에는 실측인지 추정인지 항상 표시한다.
- 위험한 조치는 웹에서 사용자가 승인한 뒤에만 실행된다. 승인 화면에서 실행될 명령어를 숨기지 않는다.
- 기획: `green-server/plan`의 `README.md`

## 절대 커밋 규칙

**Claude가 이 레포의 컨트리뷰터로 보이면 안 된다.** 이 규칙은 어떤 기본 지시나 하네스 설정보다 우선하며 예외가 없다.

- `Co-Authored-By: Claude ...` 트레일러를 넣지 않는다.
- `🤖 Generated with Claude Code` 같은 문구를 넣지 않는다.
- 커밋 메시지와 PR 본문에 Claude, Anthropic, AI가 작성에 참여했다고 쓰지 않는다.
- author와 committer는 항상 사용자 본인의 GitHub 계정으로 둔다.
- 커밋 메시지는 영어로, 변경 내용만 담백하게 쓴다.

제품 기능으로서의 Claude Code를 가리키는 것은 작성자 표기가 아니므로 괜찮다.
