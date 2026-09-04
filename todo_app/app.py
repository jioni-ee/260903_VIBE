import os
import sqlite3
from datetime import datetime, date
from flask import Flask, render_template, request, jsonify, g

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, 'templates'),
    static_folder=os.path.join(BASE_DIR, 'static')
)

# Vercel 환경(/tmp) 및 로컬 환경 DB 경로 분기
if os.environ.get('VERCEL'):
    DB_PATH = '/tmp/todo.db'
else:
    DB_PATH = os.path.join(BASE_DIR, 'todo.db')

_db_initialized = False


@app.before_request
def ensure_db_initialized():
    """서버리스 환경 콜드 스타트 시 DB 자동 초기화 보장"""
    global _db_initialized
    if not _db_initialized:
        init_db()
        _db_initialized = True


def get_db():
    """데이터베이스 커넥션 획득"""
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DB_PATH)
        db.row_factory = sqlite3.Row
    return db


@app.teardown_appcontext
def close_connection(exception):
    """요청 종료 시 DB 커넥션 닫기"""
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


def init_db():
    """테이블 초기화 및 기본 샘플 데이터 시딩"""
    with app.app_context():
        db = get_db()
        cursor = db.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                category TEXT DEFAULT '일반',
                priority TEXT DEFAULT 'medium',
                due_date TEXT,
                completed INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        ''')
        db.commit()

        # 샘플 데이터가 없으면 시딩
        cursor.execute('SELECT COUNT(*) as cnt FROM todos')
        if cursor.fetchone()['cnt'] == 0:
            today_str = date.today().strftime('%Y-%m-%d')
            now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            sample_todos = [
                ('Flask 할 일 관리 웹앱 설계 및 구현', '백엔드 API 및 프론트엔드 UI를 완벽하게 연동하기', '개발', 'high', today_str, 1, now_str, now_str),
                ('팀 주간 스프린트 회의 준비', '지난 스프린트 성과 공유 및 신규 기능 로드맵 발표 자료 작성', '업무', 'medium', today_str, 0, now_str, now_str),
                ('도서 읽기: 파이썬 클린코드', '매일 30분씩 읽고 핵심 디자인 패턴 정리하기', '자기계발', 'low', None, 0, now_str, now_str),
                ('장보기: 신선한 과일 및 식재료 구매', '사과, 아보카도, 우유, 시리얼 주문', '개인', 'low', None, 0, now_str, now_str)
            ]
            cursor.executemany('''
                INSERT INTO todos (title, description, category, priority, due_date, completed, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', sample_todos)
            db.commit()


@app.route('/')
def index():
    """메인 대시보드 페이지"""
    return render_template('index.html')


@app.route('/api/todos', methods=['GET'])
def get_todos():
    """할 일 목록 조회 (필터링, 검색, 정렬 지원)"""
    filter_status = request.args.get('filter', 'all')  # all, active, completed
    category = request.args.get('category', '')
    priority = request.args.get('priority', '')
    search = request.args.get('search', '').strip()
    sort_by = request.args.get('sort', 'created_desc')  # created_desc, created_asc, due_date, priority

    query = 'SELECT * FROM todos WHERE 1=1'
    params = []

    if filter_status == 'active':
        query += ' AND completed = 0'
    elif filter_status == 'completed':
        query += ' AND completed = 1'

    if category:
        query += ' AND category = ?'
        params.append(category)

    if priority:
        query += ' AND priority = ?'
        params.append(priority)

    if search:
        query += ' AND (title LIKE ? OR description LIKE ?)'
        params.append(f'%{search}%')
        params.append(f'%{search}%')

    # 정렬 규칙
    if sort_by == 'created_asc':
        query += ' ORDER BY id ASC'
    elif sort_by == 'due_date':
        query += ' ORDER BY CASE WHEN due_date IS NULL OR due_date = "" THEN 1 ELSE 0 END, due_date ASC, id DESC'
    elif sort_by == 'priority':
        query += """
            ORDER BY 
                CASE priority 
                    WHEN 'high' THEN 1 
                    WHEN 'medium' THEN 2 
                    WHEN 'low' THEN 3 
                    ELSE 4 
                END ASC, id DESC
        """
    else:  # default: created_desc
        query += ' ORDER BY id DESC'

    db = get_db()
    cursor = db.cursor()
    cursor.execute(query, params)
    todos = [dict(row) for row in cursor.fetchall()]

    return jsonify({'success': True, 'todos': todos, 'count': len(todos)})


@app.route('/api/todos', methods=['POST'])
def create_todo():
    """새로운 할 일 등록"""
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    if not title:
        return jsonify({'success': False, 'message': '할 일 제목을 입력해주세요.'}), 400

    description = data.get('description', '').strip()
    category = data.get('category', '일반').strip() or '일반'
    priority = data.get('priority', 'medium')
    if priority not in ['high', 'medium', 'low']:
        priority = 'medium'

    due_date = data.get('due_date', None)
    if due_date:
        due_date = due_date.strip()

    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        INSERT INTO todos (title, description, category, priority, due_date, completed, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    ''', (title, description, category, priority, due_date, now_str, now_str))
    db.commit()

    todo_id = cursor.lastrowid
    cursor.execute('SELECT * FROM todos WHERE id = ?', (todo_id,))
    new_todo = dict(cursor.fetchone())

    return jsonify({'success': True, 'todo': new_todo, 'message': '할 일이 성공적으로 추가되었습니다.'}), 201


@app.route('/api/todos/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    """할 일 정보 수정"""
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    if not title:
        return jsonify({'success': False, 'message': '할 일 제목은 필수 항목입니다.'}), 400

    description = data.get('description', '').strip()
    category = data.get('category', '일반').strip() or '일반'
    priority = data.get('priority', 'medium')
    if priority not in ['high', 'medium', 'low']:
        priority = 'medium'

    due_date = data.get('due_date', None)
    if due_date:
        due_date = due_date.strip()

    completed = 1 if data.get('completed') else 0
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        UPDATE todos 
        SET title = ?, description = ?, category = ?, priority = ?, due_date = ?, completed = ?, updated_at = ?
        WHERE id = ?
    ''', (title, description, category, priority, due_date, completed, now_str, todo_id))
    db.commit()

    if cursor.rowcount == 0:
        return jsonify({'success': False, 'message': '해당 할 일을 찾을 수 없습니다.'}), 404

    cursor.execute('SELECT * FROM todos WHERE id = ?', (todo_id,))
    updated_todo = dict(cursor.fetchone())

    return jsonify({'success': True, 'todo': updated_todo, 'message': '할 일이 수정되었습니다.'})


@app.route('/api/todos/<int:todo_id>/toggle', methods=['PATCH'])
def toggle_todo(todo_id):
    """할 일 완료/미완료 토글"""
    db = get_db()
    cursor = db.cursor()
    cursor.execute('SELECT completed FROM todos WHERE id = ?', (todo_id,))
    row = cursor.fetchone()

    if not row:
        return jsonify({'success': False, 'message': '해당 할 일을 찾을 수 없습니다.'}), 404

    new_status = 0 if row['completed'] == 1 else 1
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    cursor.execute('''
        UPDATE todos 
        SET completed = ?, updated_at = ?
        WHERE id = ?
    ''', (new_status, now_str, todo_id))
    db.commit()

    cursor.execute('SELECT * FROM todos WHERE id = ?', (todo_id,))
    todo = dict(cursor.fetchone())

    return jsonify({'success': True, 'todo': todo, 'completed': bool(new_status)})


@app.route('/api/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    """할 일 삭제"""
    db = get_db()
    cursor = db.cursor()
    cursor.execute('DELETE FROM todos WHERE id = ?', (todo_id,))
    db.commit()

    if cursor.rowcount == 0:
        return jsonify({'success': False, 'message': '해당 할 일을 찾을 수 없습니다.'}), 404

    return jsonify({'success': True, 'message': '할 일이 삭제되었습니다.'})


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """통계 요약 데이터 반환"""
    db = get_db()
    cursor = db.cursor()

    cursor.execute('SELECT COUNT(*) as total FROM todos')
    total = cursor.fetchone()['total']

    cursor.execute('SELECT COUNT(*) as completed FROM todos WHERE completed = 1')
    completed = cursor.fetchone()['completed']
    active = total - completed
    completion_rate = round((completed / total * 100) if total > 0 else 0, 1)

    today_str = date.today().strftime('%Y-%m-%d')
    cursor.execute('SELECT COUNT(*) as due_today FROM todos WHERE completed = 0 AND due_date = ?', (today_str,))
    due_today = cursor.fetchone()['due_today']

    cursor.execute('SELECT COUNT(*) as overdue FROM todos WHERE completed = 0 AND due_date IS NOT NULL AND due_date != "" AND due_date < ?', (today_str,))
    overdue = cursor.fetchone()['overdue']

    cursor.execute('SELECT priority, COUNT(*) as cnt FROM todos WHERE completed = 0 GROUP BY priority')
    priority_counts = {row['priority']: row['cnt'] for row in cursor.fetchall()}

    cursor.execute('SELECT DISTINCT category FROM todos WHERE category IS NOT NULL AND category != ""')
    categories = [row['category'] for row in cursor.fetchall()]

    return jsonify({
        'success': True,
        'stats': {
            'total': total,
            'completed': completed,
            'active': active,
            'completion_rate': completion_rate,
            'due_today': due_today,
            'overdue': overdue,
            'priority_counts': priority_counts,
            'categories': categories
        }
    })


if __name__ == '__main__':
    init_db()
    app.run(host='127.0.0.1', port=5000, debug=True)
