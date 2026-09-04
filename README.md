# 260903_VIBE - TaskFlow (Flask 할 일 관리 웹앱)

파이썬 Flask와 Vanilla CSS/JS, SQLite 기반의 모던 할 일 관리(Todo & Task Manager) 웹 애플리케이션입니다.

## 🚀 주요 기능
- **스마트 캘린더 (Calendar View)**: 마감일이 설정된 할 일을 월별 캘린더에서 한눈에 시각화 및 특정 날짜 필터링 지원
- **할 일(Task) CRUD**: 우선순위(긴급/보통/낮음), 카테고리(업무, 개발, 개인, 자기계발, 일반), 마감일 지정
- **상태 관리**: 원클릭 완료/미완료 토글, 인라인 모달 수정, 부드러운 삭제
- **실시간 통계**: 달성률(%), 전체/진행중/완료 개수 및 오늘 마감 건수 대시보드
- **스마트 검색 & 정렬**: 실시간 키워드 검색, 다중 필터(카테고리, 상태), 마감순/등록순 정렬
- **프리미엄 UI/UX**: 글래스모피즘(Glassmorphism), 다크 인디고 테마, 반응형 레이아웃

## 📂 프로젝트 구조
```
├── todo_app/
│   ├── app.py              # Flask 백엔드 및 RESTful API
│   ├── templates/
│   │   └── index.html      # SPA 대시보드 템플릿
│   ├── static/
│   │   ├── css/style.css   # 글래스모피즘 & 모던 디자인 CSS
│   │   └── js/app.js       # 비동기 통신 및 캘린더/인터랙션 스크립트
│   └── tests/
│       └── test_app.py     # 단위 및 통합 테스트 스위트
└── README.md
```

## 💻 실행 방법

### 1. 의존성 설치
```bash
pip install flask
```

### 2. 서버 실행
```bash
python todo_app/app.py
```
브라우저에서 `http://127.0.0.1:5000`으로 접속합니다.

### 3. 테스트 실행
```bash
python -m unittest discover -s todo_app/tests -p "test_*.py"
```
