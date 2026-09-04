import os
from datetime import datetime, date
from supabase import create_client, Client

# 로컬 .env 파일 자동 로드
if not os.environ.get('SUPABASE_URL'):
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        for cand in [os.path.join(base_dir, '.env'), os.path.join(base_dir, '..', '.env')]:
            if os.path.exists(cand):
                with open(cand, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            k, v = line.split('=', 1)
                            os.environ[k.strip()] = v.strip()
                break
    except Exception:
        pass

SUPABASE_URL = os.environ.get('SUPABASE_URL', '').strip()
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '').strip()

_supabase: Client = None

def get_supabase() -> Client:
    """Supabase 클라이언트 인스턴스 반환 (환경변수가 있을 경우)"""
    global _supabase
    url = os.environ.get('SUPABASE_URL', '').strip()
    key = os.environ.get('SUPABASE_KEY', '').strip()
    if not url or not key:
        return None
    if _supabase is None:
        _supabase = create_client(url, key)
    return _supabase

def is_supabase_enabled() -> bool:
    """Supabase 사용 가능 여부 확인"""
    url = os.environ.get('SUPABASE_URL', '').strip()
    key = os.environ.get('SUPABASE_KEY', '').strip()
    return bool(url and key)


def get_todos(filter_status='all', category='', priority='', search='', sort_by='created_desc'):
    """Supabase에서 할 일 목록 조회"""
    sb = get_supabase()
    query = sb.table('todos').select('*')

    if filter_status == 'active':
        query = query.eq('completed', 0)
    elif filter_status == 'completed':
        query = query.eq('completed', 1)

    if category:
        query = query.eq('category', category)

    if priority:
        query = query.eq('priority', priority)

    if search:
        # Supabase ilike or or-filter
        query = query.or_(f'title.ilike.%{search}%,description.ilike.%{search}%')

    # 정렬
    if sort_by == 'created_asc':
        query = query.order('id', desc=False)
    elif sort_by == 'due_date':
        query = query.order('due_date', desc=False, nulls_first=False)
    else:
        query = query.order('id', desc=True)

    res = query.execute()
    todos = res.data or []

    # 우선순위 정렬이 필요한 경우 파이썬 레벨 정렬 지원
    if sort_by == 'priority':
        priority_map = {'high': 1, 'medium': 2, 'low': 3}
        todos.sort(key=lambda x: priority_map.get(x.get('priority', 'medium'), 4))

    return todos


def create_todo(title, description='', category='일반', priority='medium', due_date=None):
    """Supabase에 새 할 일 생성"""
    sb = get_supabase()
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    payload = {
        'title': title,
        'description': description or '',
        'category': category or '일반',
        'priority': priority or 'medium',
        'due_date': due_date if due_date else None,
        'completed': 0,
        'created_at': now_str,
        'updated_at': now_str
    }
    res = sb.table('todos').insert(payload).execute()
    if res.data and len(res.data) > 0:
        return res.data[0]
    return payload


def update_todo(todo_id, title, description='', category='일반', priority='medium', due_date=None, completed=0):
    """Supabase 할 일 수정"""
    sb = get_supabase()
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    payload = {
        'title': title,
        'description': description or '',
        'category': category or '일반',
        'priority': priority or 'medium',
        'due_date': due_date if due_date else None,
        'completed': 1 if completed else 0,
        'updated_at': now_str
    }
    res = sb.table('todos').update(payload).eq('id', todo_id).execute()
    if res.data and len(res.data) > 0:
        return res.data[0]
    return None


def toggle_todo(todo_id):
    """Supabase 할 일 완료 상태 토글"""
    sb = get_supabase()
    res = sb.table('todos').select('completed').eq('id', todo_id).execute()
    if not res.data or len(res.data) == 0:
        return None

    current_status = res.data[0].get('completed', 0)
    new_status = 0 if current_status == 1 else 1
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    update_res = sb.table('todos').update({
        'completed': new_status,
        'updated_at': now_str
    }).eq('id', todo_id).execute()

    if update_res.data and len(update_res.data) > 0:
        return update_res.data[0]
    return None


def delete_todo(todo_id):
    """Supabase 할 일 삭제"""
    sb = get_supabase()
    res = sb.table('todos').delete().eq('id', todo_id).execute()
    return bool(res.data and len(res.data) > 0)


def get_stats():
    """Supabase 통계 데이터 산출"""
    sb = get_supabase()
    res = sb.table('todos').select('*').execute()
    todos = res.data or []

    total = len(todos)
    completed = sum(1 for t in todos if t.get('completed') == 1)
    active = total - completed
    completion_rate = round((completed / total * 100) if total > 0 else 0, 1)

    today_str = date.today().strftime('%Y-%m-%d')
    due_today = sum(1 for t in todos if t.get('completed') == 0 and t.get('due_date') == today_str)
    overdue = sum(1 for t in todos if t.get('completed') == 0 and t.get('due_date') and t.get('due_date') < today_str)

    priority_counts = {}
    for t in todos:
        if t.get('completed') == 0:
            p = t.get('priority', 'medium')
            priority_counts[p] = priority_counts.get(p, 0) + 1

    categories = list({t.get('category') for t in todos if t.get('category')})

    return {
        'total': total,
        'completed': completed,
        'active': active,
        'completion_rate': completion_rate,
        'due_today': due_today,
        'overdue': overdue,
        'priority_counts': priority_counts,
        'categories': categories
    }
