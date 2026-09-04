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


# ==============================================================================
# Todos CRUD (with Assignee support)
# ==============================================================================

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
        query = query.or_(f'title.ilike.%{search}%,description.ilike.%{search}%,assignee.ilike.%{search}%')

    if sort_by == 'created_asc':
        query = query.order('id', desc=False)
    elif sort_by == 'due_date':
        query = query.order('due_date', desc=False, nulls_first=False)
    else:
        query = query.order('id', desc=True)

    res = query.execute()
    todos = res.data or []

    if sort_by == 'priority':
        priority_map = {'high': 1, 'medium': 2, 'low': 3}
        todos.sort(key=lambda x: priority_map.get(x.get('priority', 'medium'), 4))

    return todos


def create_todo(title, description='', category='일반', priority='medium', due_date=None, assignee=''):
    """Supabase에 새 할 일 생성"""
    sb = get_supabase()
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    assignee_val = assignee.strip() if (category in ['업무', '개발'] and assignee) else ''
    payload = {
        'title': title,
        'description': description or '',
        'category': category or '일반',
        'priority': priority or 'medium',
        'due_date': due_date if due_date else None,
        'assignee': assignee_val,
        'completed': 0,
        'created_at': now_str,
        'updated_at': now_str
    }
    try:
        res = sb.table('todos').insert(payload).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
        return payload
    except Exception as e:
        if 'assignee' in payload and ('PGRST204' in str(e) or 'assignee' in str(e)):
            del payload['assignee']
            res = sb.table('todos').insert(payload).execute()
            if res.data and len(res.data) > 0:
                ret = res.data[0]
                ret['assignee'] = assignee_val
                return ret
            return payload
        raise


def update_todo(todo_id, title, description='', category='일반', priority='medium', due_date=None, completed=0, assignee=''):
    """Supabase 할 일 수정"""
    sb = get_supabase()
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    assignee_val = assignee.strip() if (category in ['업무', '개발'] and assignee) else ''
    payload = {
        'title': title,
        'description': description or '',
        'category': category or '일반',
        'priority': priority or 'medium',
        'due_date': due_date if due_date else None,
        'assignee': assignee_val,
        'completed': 1 if completed else 0,
        'updated_at': now_str
    }
    try:
        res = sb.table('todos').update(payload).eq('id', todo_id).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
        return None
    except Exception as e:
        if 'assignee' in payload and ('PGRST204' in str(e) or 'assignee' in str(e)):
            del payload['assignee']
            res = sb.table('todos').update(payload).eq('id', todo_id).execute()
            if res.data and len(res.data) > 0:
                ret = res.data[0]
                ret['assignee'] = assignee_val
                return ret
            return None
        raise


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


# ==============================================================================
# Schedules CRUD (Calendar Dedicated Events)
# ==============================================================================

def get_schedules(month_prefix=None, start_date=None, end_date=None):
    """일정 목록 조회"""
    sb = get_supabase()
    query = sb.table('schedules').select('*')

    if month_prefix:
        # e.g., '2026-09'
        query = query.or_(f'start_date.like.{month_prefix}%,end_date.like.{month_prefix}%')
    elif start_date and end_date:
        query = query.gte('start_date', start_date).lte('start_date', end_date)

    query = query.order('start_date', desc=False).order('start_time', desc=False)
    res = query.execute()
    return res.data or []


def create_schedule(title, start_date, end_date=None, start_time='', is_all_day=1, location='', color='#6366f1', category='회의', description=''):
    """새 일정 생성"""
    sb = get_supabase()
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    payload = {
        'title': title.strip(),
        'description': description.strip() if description else '',
        'start_date': start_date.strip(),
        'end_date': end_date.strip() if end_date else start_date.strip(),
        'start_time': start_time.strip() if start_time else '',
        'is_all_day': 1 if is_all_day else 0,
        'location': location.strip() if location else '',
        'color': color.strip() if color else '#6366f1',
        'category': category.strip() if category else '회의',
        'created_at': now_str,
        'updated_at': now_str
    }
    res = sb.table('schedules').insert(payload).execute()
    if res.data and len(res.data) > 0:
        return res.data[0]
    return payload


def update_schedule(schedule_id, title, start_date, end_date=None, start_time='', is_all_day=1, location='', color='#6366f1', category='회의', description=''):
    """일정 수정"""
    sb = get_supabase()
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    payload = {
        'title': title.strip(),
        'description': description.strip() if description else '',
        'start_date': start_date.strip(),
        'end_date': end_date.strip() if end_date else start_date.strip(),
        'start_time': start_time.strip() if start_time else '',
        'is_all_day': 1 if is_all_day else 0,
        'location': location.strip() if location else '',
        'color': color.strip() if color else '#6366f1',
        'category': category.strip() if category else '회의',
        'updated_at': now_str
    }
    res = sb.table('schedules').update(payload).eq('id', schedule_id).execute()
    if res.data and len(res.data) > 0:
        return res.data[0]
    return None


def delete_schedule(schedule_id):
    """일정 삭제"""
    sb = get_supabase()
    res = sb.table('schedules').delete().eq('id', schedule_id).execute()
    return bool(res.data and len(res.data) > 0)
