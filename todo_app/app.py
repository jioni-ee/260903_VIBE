import os
import sqlite3
from datetime import datetime, date
from flask import Flask, render_template, request, jsonify, g

# Supabase 클라이언트 임포트
try:
    from supabase_client import (
        is_supabase_enabled,
        get_todos as sb_get_todos,
        create_todo as sb_create_todo,
        update_todo as sb_update_todo,
        toggle_todo as sb_toggle_todo,
        delete_todo as sb_delete_todo,
        get_stats as sb_get_stats,
        get_schedules as sb_get_schedules,
        create_schedule as sb_create_schedule,
        update_schedule as sb_update_schedule,
        delete_schedule as sb_delete_schedule
    )
except ImportError:
    try:
        from todo_app.supabase_client import (
            is_supabase_enabled,
            get_todos as sb_get_todos,
            create_todo as sb_create_todo,
            update_todo as sb_update_todo,
            toggle_todo as sb_toggle_todo,
            delete_todo as sb_delete_todo,
            get_stats as sb_get_stats,
            get_schedules as sb_get_schedules,
            create_schedule as sb_create_schedule,
            update_schedule as sb_update_schedule,
            delete_schedule as sb_delete_schedule
        )
    except ImportError:
        def is_supabase_enabled(): return False

def is_supabase_active():
    """테스트 모드가 아니고 Supabase 환경변수가 설정되어 있을 때 활성화"""
    if app.config.get('TESTING'):
        return False
    return is_supabase_enabled()

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
    """서버리스 환경 콜드 스타트 시 DB 자동 초기화 보장 (SQLite 모드일 때만)"""
    global _db_initialized
    if not is_supabase_active() and not _db_initialized:
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
    """SQLite 테이블 초기화 및 스키마 자동 마이그레이션"""
    with app.app_context():
        db = get_db()
        cursor = db.cursor()

        # 1. todos 테이블 생성
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                category TEXT DEFAULT '일반',
                priority TEXT DEFAULT 'medium',
                due_date TEXT,
                completed INTEGER DEFAULT 0,
                assignee TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        ''')

        # 기존 todos 테이블에 assignee 컬럼이 없을 경우 마이그레이션
        cursor.execute("PRAGMA table_info(todos)")
        columns = [row['name'] for row in cursor.fetchall()]
        if 'assignee' not in columns:
            cursor.execute("ALTER TABLE todos ADD COLUMN assignee TEXT DEFAULT ''")

        # 2. schedules 테이블 생성
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS schedules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                start_date TEXT NOT NULL,
                end_date TEXT,
                start_time TEXT DEFAULT '',
                is_all_day INTEGER DEFAULT 1,
                location TEXT DEFAULT '',
                color TEXT DEFAULT '#6366f1',
                category TEXT DEFAULT '회의',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        ''')
        db.commit()

        # 샘플 todo 데이터
        cursor.execute('SELECT COUNT(*) as cnt FROM todos')
        if cursor.fetchone()['cnt'] == 0:
            today_str = date.today().strftime('%Y-%m-%d')
            now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            sample_todos = [
                ('Flask 할 일 관리 웹앱 설계 및 구현', '백엔드 API 및 프론트엔드 UI 연동하기', '개발', 'high', today_str, 1, '김개발', now_str, now_str),
                ('팀 주간 스프린트 회의 준비', '지난 스프린트 성과 공유 및 신규 로드맵 발표 자료', '업무', 'medium', today_str, 0, '이지원', now_str, now_str),
                ('도서 읽기: 파이썬 클린코드', '매일 30분씩 읽고 핵심 디자인 패턴 정리하기', '자기계발', 'low', None, 0, '', now_str, now_str)
            ]
            cursor.executemany('''
                INSERT INTO todos (title, description, category, priority, due_date, completed, assignee, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', sample_todos)
            db.commit()

        # 샘플 schedule 데이터
        cursor.execute('SELECT COUNT(*) as cnt FROM schedules')
        if cursor.fetchone()['cnt'] == 0:
            today_str = date.today().strftime('%Y-%m-%d')
            now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            sample_schedules = [
                ('팀 주간 스프린트 킥오프', '신규 스프린트 목표 및 태스크 분배', today_str, today_str, '14:00', 0, '대회의실 A', '#6366f1', '회의', now_str, now_str),
                ('팀 테크 워크샵', '최신 AI 에이전트 기술 동향 공유', today_str, today_str, '', 1, '본사 타운홀', '#8b5cf6', '행사', now_str, now_str)
            ]
            cursor.executemany('''
                INSERT INTO schedules (title, description, start_date, end_date, start_time, is_all_day, location, color, category, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', sample_schedules)
            db.commit()


@app.route('/')
def index():
    """메인 대시보드 페이지"""
    return render_template('index.html')


# ==============================================================================
# Todos API Endpoints (with Assignee)
# ==============================================================================

@app.route('/api/todos', methods=['GET'])
def get_todos():
    """할 일 목록 조회 (필터링, 검색, 정렬 지원)"""
    filter_status = request.args.get('filter', 'all')
    category = request.args.get('category', '')
    priority = request.args.get('priority', '')
    search = request.args.get('search', '').strip()
    sort_by = request.args.get('sort', 'created_desc')

    # 1. Supabase 모드
    if is_supabase_active():
        try:
            todos = sb_get_todos(filter_status, category, priority, search, sort_by)
            return jsonify({'success': True, 'todos': todos, 'count': len(todos), 'source': 'supabase'})
        except Exception as e:
            app.logger.error(f'Supabase error: {e}')

    # 2. SQLite 모드
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
        query += ' AND (title LIKE ? OR description LIKE ? OR assignee LIKE ?)'
        params.append(f'%{search}%')
        params.append(f'%{search}%')
        params.append(f'%{search}%')

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
    else:
        query += ' ORDER BY id DESC'

    db = get_db()
    cursor = db.cursor()
    cursor.execute(query, params)
    todos = [dict(row) for row in cursor.fetchall()]

    return jsonify({'success': True, 'todos': todos, 'count': len(todos), 'source': 'sqlite'})


@app.route('/api/todos', methods=['POST'])
def create_todo():
    """새로운 할 일 등록 (업무/개발 카테고리 시 담당자 지원)"""
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

    # 업무 또는 개발일 때만 담당자 저장
    assignee = data.get('assignee', '').strip() if category in ['업무', '개발'] else ''

    # 1. Supabase 모드
    if is_supabase_active():
        try:
            new_todo = sb_create_todo(title, description, category, priority, due_date, assignee)
            return jsonify({'success': True, 'todo': new_todo, 'message': '할 일이 추가되었습니다.', 'source': 'supabase'}), 201
        except Exception as e:
            app.logger.error(f'Supabase create error: {e}')

    # 2. SQLite 모드
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        INSERT INTO todos (title, description, category, priority, due_date, completed, assignee, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
    ''', (title, description, category, priority, due_date, assignee, now_str, now_str))
    db.commit()

    todo_id = cursor.lastrowid
    cursor.execute('SELECT * FROM todos WHERE id = ?', (todo_id,))
    new_todo = dict(cursor.fetchone())

    return jsonify({'success': True, 'todo': new_todo, 'message': '할 일이 추가되었습니다.', 'source': 'sqlite'}), 201


@app.route('/api/todos/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    """할 일 정보 수정 (담당자 지원)"""
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
    assignee = data.get('assignee', '').strip() if category in ['업무', '개발'] else ''

    # 1. Supabase 모드
    if is_supabase_active():
        try:
            updated_todo = sb_update_todo(todo_id, title, description, category, priority, due_date, completed, assignee)
            if updated_todo:
                return jsonify({'success': True, 'todo': updated_todo, 'message': '할 일이 수정되었습니다.', 'source': 'supabase'})
        except Exception as e:
            app.logger.error(f'Supabase update error: {e}')

    # 2. SQLite 모드
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        UPDATE todos 
        SET title = ?, description = ?, category = ?, priority = ?, due_date = ?, completed = ?, assignee = ?, updated_at = ?
        WHERE id = ?
    ''', (title, description, category, priority, due_date, completed, assignee, now_str, todo_id))
    db.commit()

    if cursor.rowcount == 0:
        return jsonify({'success': False, 'message': '해당 할 일을 찾을 수 없습니다.'}), 404

    cursor.execute('SELECT * FROM todos WHERE id = ?', (todo_id,))
    updated_todo = dict(cursor.fetchone())

    return jsonify({'success': True, 'todo': updated_todo, 'message': '할 일이 수정되었습니다.', 'source': 'sqlite'})


@app.route('/api/todos/<int:todo_id>/toggle', methods=['PATCH'])
def toggle_todo(todo_id):
    """할 일 완료/미완료 토글"""
    if is_supabase_active():
        try:
            todo = sb_toggle_todo(todo_id)
            if todo:
                return jsonify({'success': True, 'todo': todo, 'completed': bool(todo.get('completed')), 'source': 'supabase'})
        except Exception as e:
            app.logger.error(f'Supabase toggle error: {e}')

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

    return jsonify({'success': True, 'todo': todo, 'completed': bool(new_status), 'source': 'sqlite'})


@app.route('/api/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    """할 일 삭제"""
    if is_supabase_active():
        try:
            success = sb_delete_todo(todo_id)
            if success:
                return jsonify({'success': True, 'message': '할 일이 삭제되었습니다.', 'source': 'supabase'})
        except Exception as e:
            app.logger.error(f'Supabase delete error: {e}')

    db = get_db()
    cursor = db.cursor()
    cursor.execute('DELETE FROM todos WHERE id = ?', (todo_id,))
    db.commit()

    if cursor.rowcount == 0:
        return jsonify({'success': False, 'message': '해당 할 일을 찾을 수 없습니다.'}), 404

    return jsonify({'success': True, 'message': '할 일이 삭제되었습니다.', 'source': 'sqlite'})


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """통계 요약 데이터 반환"""
    if is_supabase_active():
        try:
            stats = sb_get_stats()
            return jsonify({'success': True, 'stats': stats, 'source': 'supabase'})
        except Exception as e:
            app.logger.error(f'Supabase stats error: {e}')

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
        },
        'source': 'sqlite'
    })


# ==============================================================================
# Schedules API Endpoints (Calendar Events)
# ==============================================================================

@app.route('/api/schedules', methods=['GET'])
def get_schedules():
    """일정 목록 조회 (월별/범위 지원)"""
    month_prefix = request.args.get('month', '')  # e.g., '2026-09'
    start_date = request.args.get('start_date', '')
    end_date = request.args.get('end_date', '')

    if is_supabase_active():
        try:
            schedules = sb_get_schedules(month_prefix, start_date, end_date)
            return jsonify({'success': True, 'schedules': schedules, 'count': len(schedules), 'source': 'supabase'})
        except Exception as e:
            app.logger.error(f'Supabase schedules error: {e}')

    query = 'SELECT * FROM schedules WHERE 1=1'
    params = []

    if month_prefix:
        query += ' AND (start_date LIKE ? OR end_date LIKE ?)'
        params.append(f'{month_prefix}%')
        params.append(f'{month_prefix}%')
    elif start_date and end_date:
        query += ' AND (start_date <= ? AND end_date >= ?)'
        params.append(end_date)
        params.append(start_date)

    query += ' ORDER BY start_date ASC, start_time ASC'

    db = get_db()
    cursor = db.cursor()
    cursor.execute(query, params)
    schedules = [dict(row) for row in cursor.fetchall()]

    return jsonify({'success': True, 'schedules': schedules, 'count': len(schedules), 'source': 'sqlite'})


@app.route('/api/schedules', methods=['POST'])
def create_schedule():
    """새로운 일정 등록"""
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    start_date = data.get('start_date', '').strip()

    if not title:
        return jsonify({'success': False, 'message': '일정 제목을 입력해주세요.'}), 400
    if not start_date:
        return jsonify({'success': False, 'message': '일정 시작 날짜를 선택해주세요.'}), 400

    end_date = (data.get('end_date') or '').strip() or start_date
    start_time = (data.get('start_time') or '').strip()
    is_all_day = 1 if data.get('is_all_day', True) else 0
    location = (data.get('location') or '').strip()
    color = (data.get('color') or '#6366f1').strip() or '#6366f1'
    category = (data.get('category') or '회의').strip() or '회의'
    description = (data.get('description') or '').strip()

    if is_supabase_active():
        try:
            new_sched = sb_create_schedule(title, start_date, end_date, start_time, is_all_day, location, color, category, description)
            return jsonify({'success': True, 'schedule': new_sched, 'message': '일정이 등록되었습니다.', 'source': 'supabase'}), 201
        except Exception as e:
            app.logger.error(f'Supabase create schedule error: {e}')

    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        INSERT INTO schedules (title, description, start_date, end_date, start_time, is_all_day, location, color, category, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (title, description, start_date, end_date, start_time, is_all_day, location, color, category, now_str, now_str))
    db.commit()

    sched_id = cursor.lastrowid
    cursor.execute('SELECT * FROM schedules WHERE id = ?', (sched_id,))
    new_sched = dict(cursor.fetchone())

    return jsonify({'success': True, 'schedule': new_sched, 'message': '일정이 등록되었습니다.', 'source': 'sqlite'}), 201


@app.route('/api/schedules/<int:schedule_id>', methods=['PUT'])
def update_schedule(schedule_id):
    """일정 수정"""
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    start_date = data.get('start_date', '').strip()

    if not title or not start_date:
        return jsonify({'success': False, 'message': '일정 제목과 시작 날짜는 필수입니다.'}), 400

    end_date = (data.get('end_date') or '').strip() or start_date
    start_time = (data.get('start_time') or '').strip()
    is_all_day = 1 if data.get('is_all_day', True) else 0
    location = (data.get('location') or '').strip()
    color = (data.get('color') or '#6366f1').strip() or '#6366f1'
    category = (data.get('category') or '회의').strip() or '회의'
    description = (data.get('description') or '').strip()

    if is_supabase_active():
        try:
            updated = sb_update_schedule(schedule_id, title, start_date, end_date, start_time, is_all_day, location, color, category, description)
            if updated:
                return jsonify({'success': True, 'schedule': updated, 'message': '일정이 수정되었습니다.', 'source': 'supabase'})
        except Exception as e:
            app.logger.error(f'Supabase update schedule error: {e}')

    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        UPDATE schedules
        SET title = ?, description = ?, start_date = ?, end_date = ?, start_time = ?, is_all_day = ?, location = ?, color = ?, category = ?, updated_at = ?
        WHERE id = ?
    ''', (title, description, start_date, end_date, start_time, is_all_day, location, color, category, now_str, schedule_id))
    db.commit()

    if cursor.rowcount == 0:
        return jsonify({'success': False, 'message': '해당 일정을 찾을 수 없습니다.'}), 404

    cursor.execute('SELECT * FROM schedules WHERE id = ?', (schedule_id,))
    updated = dict(cursor.fetchone())

    return jsonify({'success': True, 'schedule': updated, 'message': '일정이 수정되었습니다.', 'source': 'sqlite'})


@app.route('/api/schedules/<int:schedule_id>', methods=['DELETE'])
def delete_schedule(schedule_id):
    """일정 삭제"""
    if is_supabase_active():
        try:
            success = sb_delete_schedule(schedule_id)
            if success:
                return jsonify({'success': True, 'message': '일정이 삭제되었습니다.', 'source': 'supabase'})
        except Exception as e:
            app.logger.error(f'Supabase delete schedule error: {e}')

    db = get_db()
    cursor = db.cursor()
    cursor.execute('DELETE FROM schedules WHERE id = ?', (schedule_id,))
    db.commit()

    if cursor.rowcount == 0:
        return jsonify({'success': False, 'message': '해당 일정을 찾을 수 없습니다.'}), 404

    return jsonify({'success': True, 'message': '일정이 삭제되었습니다.', 'source': 'sqlite'})


if __name__ == '__main__':
    init_db()
    app.run(host='127.0.0.1', port=5000, debug=True)
