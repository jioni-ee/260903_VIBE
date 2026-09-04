import unittest
import os
import json
import tempfile
import sys

# 프로젝트 루트 경로 추가
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import app, init_db, DB_PATH


class TodoAppTestCase(unittest.TestCase):
    def setUp(self):
        # 테스트용 임시 데이터베이스 설정
        self.db_fd, self.temp_db_path = tempfile.mkstemp()
        app.config['TESTING'] = True
        
        # 전역 DB_PATH를 임시 파일로 교체
        import app as app_module
        self.original_db_path = app_module.DB_PATH
        app_module.DB_PATH = self.temp_db_path

        self.client = app.test_client()
        with app.app_context():
            init_db()

    def tearDown(self):
        import app as app_module
        app_module.DB_PATH = self.original_db_path
        os.close(self.db_fd)
        os.unlink(self.temp_db_path)

    def test_index_page(self):
        """메인 페이지 정상 렌더링 확인"""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'TaskFlow', response.data)

    def test_get_todos_and_stats(self):
        """할 일 목록 및 통계 API 조회 확인"""
        # GET /api/todos
        res_todos = self.client.get('/api/todos')
        self.assertEqual(res_todos.status_code, 200)
        data = json.loads(res_todos.data)
        self.assertTrue(data['success'])
        self.assertGreaterEqual(len(data['todos']), 1)

        # GET /api/stats
        res_stats = self.client.get('/api/stats')
        self.assertEqual(res_stats.status_code, 200)
        stats_data = json.loads(res_stats.data)
        self.assertTrue(stats_data['success'])
        self.assertIn('total', stats_data['stats'])
        self.assertIn('completion_rate', stats_data['stats'])

    def test_create_todo_success(self):
        """할 일 신규 생성 성공 확인"""
        payload = {
            'title': '새로운 자동화 테스트 할 일',
            'description': '단위 테스트를 위한 작업입니다.',
            'category': '개발',
            'priority': 'high',
            'due_date': '2026-12-31'
        }
        res = self.client.post('/api/todos',
                               data=json.dumps(payload),
                               content_type='application/json')
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        self.assertTrue(data['success'])
        self.assertEqual(data['todo']['title'], '새로운 자동화 테스트 할 일')
        self.assertEqual(data['todo']['priority'], 'high')

    def test_create_todo_missing_title(self):
        """제목 누락 시 400 에러 검증"""
        payload = {'title': '', 'description': '설명만 있음'}
        res = self.client.post('/api/todos',
                               data=json.dumps(payload),
                               content_type='application/json')
        self.assertEqual(res.status_code, 400)
        data = json.loads(res.data)
        self.assertFalse(data['success'])

    def test_toggle_todo(self):
        """할 일 완료 토글 동작 검증"""
        # 1. 새 할 일 생성
        res = self.client.post('/api/todos',
                               data=json.dumps({'title': '토글 테스트'}),
                               content_type='application/json')
        todo_id = json.loads(res.data)['todo']['id']

        # 2. 토글 -> 완료 처리
        patch_res = self.client.patch(f'/api/todos/{todo_id}/toggle')
        self.assertEqual(patch_res.status_code, 200)
        data = json.loads(patch_res.data)
        self.assertTrue(data['completed'])

        # 3. 다시 토글 -> 미완료 처리
        patch_res2 = self.client.patch(f'/api/todos/{todo_id}/toggle')
        self.assertEqual(patch_res2.status_code, 200)
        data2 = json.loads(patch_res2.data)
        self.assertFalse(data2['completed'])

    def test_update_todo(self):
        """할 일 수정 동작 검증"""
        res = self.client.post('/api/todos',
                               data=json.dumps({'title': '수정 전 제목'}),
                               content_type='application/json')
        todo_id = json.loads(res.data)['todo']['id']

        update_payload = {
            'title': '수정 후 제목',
            'description': '업데이트된 메모',
            'category': '업무',
            'priority': 'low',
            'due_date': '2026-10-15',
            'completed': True
        }
        put_res = self.client.put(f'/api/todos/{todo_id}',
                                  data=json.dumps(update_payload),
                                  content_type='application/json')
        self.assertEqual(put_res.status_code, 200)
        data = json.loads(put_res.data)
        self.assertEqual(data['todo']['title'], '수정 후 제목')
        self.assertEqual(data['todo']['completed'], 1)

    def test_delete_todo(self):
        """할 일 삭제 동작 검증"""
        res = self.client.post('/api/todos',
                               data=json.dumps({'title': '삭제할 작업'}),
                               content_type='application/json')
        todo_id = json.loads(res.data)['todo']['id']

        del_res = self.client.delete(f'/api/todos/{todo_id}')
        self.assertEqual(del_res.status_code, 200)
        data = json.loads(del_res.data)
        self.assertTrue(data['success'])

        # 삭제 후 재조회 시 해당 ID 없거나 count 감소 확인
        toggle_res = self.client.patch(f'/api/todos/{todo_id}/toggle')
        self.assertEqual(toggle_res.status_code, 404)

    def test_create_todo_with_assignee(self):
        """담당자(assignee) 포함 할 일 생성 및 수정 검증"""
        payload = {
            'title': '담당자 테스트 작업',
            'category': '개발',
            'priority': 'high',
            'assignee': '김엔지니어'
        }
        res = self.client.post('/api/todos',
                               data=json.dumps(payload),
                               content_type='application/json')
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        self.assertEqual(data['todo']['assignee'], '김엔지니어')

        todo_id = data['todo']['id']
        # 수정 시 담당자 변경 확인
        update_payload = {
            'title': '담당자 테스트 작업 (수정)',
            'category': '업무',
            'assignee': '이매니저'
        }
        put_res = self.client.put(f'/api/todos/{todo_id}',
                                  data=json.dumps(update_payload),
                                  content_type='application/json')
        self.assertEqual(put_res.status_code, 200)
        put_data = json.loads(put_res.data)
        self.assertEqual(put_data['todo']['assignee'], '이매니저')

    def test_schedule_crud(self):
        """달력 일정(Schedule) 생성, 조회, 수정, 삭제 CRUD 검증"""
        # 1. 일정 생성
        payload = {
            'title': '2026 Q3 프로젝트 킥오프',
            'start_date': '2026-09-10',
            'end_date': '2026-09-10',
            'is_all_day': False,
            'start_time': '14:00',
            'category': '회의',
            'color': '#6366f1',
            'location': '대회의실 A',
            'description': '전체 팀원 참석 필수'
        }
        create_res = self.client.post('/api/schedules',
                                      data=json.dumps(payload),
                                      content_type='application/json')
        self.assertEqual(create_res.status_code, 201)
        create_data = json.loads(create_res.data)
        self.assertTrue(create_data['success'])
        schedule_id = create_data['schedule']['id']
        self.assertEqual(create_data['schedule']['title'], '2026 Q3 프로젝트 킥오프')
        self.assertEqual(create_data['schedule']['start_time'], '14:00')

        # 2. 일정 목록 조회
        get_res = self.client.get('/api/schedules')
        self.assertEqual(get_res.status_code, 200)
        get_data = json.loads(get_res.data)
        self.assertTrue(get_data['success'])
        self.assertTrue(any(s['id'] == schedule_id for s in get_data['schedules']))

        # 3. 일정 수정
        update_payload = {
            'title': '2026 Q3 프로젝트 킥오프 (온라인 진행)',
            'start_date': '2026-09-11',
            'is_all_day': True,
            'start_time': None,
            'category': '행사',
            'color': '#10b981',
            'location': '온라인 Zoom',
            'description': '링크 추후 공지'
        }
        put_res = self.client.put(f'/api/schedules/{schedule_id}',
                                  data=json.dumps(update_payload),
                                  content_type='application/json')
        self.assertEqual(put_res.status_code, 200)
        put_data = json.loads(put_res.data)
        self.assertEqual(put_data['schedule']['title'], '2026 Q3 프로젝트 킥오프 (온라인 진행)')
        self.assertEqual(put_data['schedule']['start_date'], '2026-09-11')
        self.assertEqual(put_data['schedule']['is_all_day'], 1)

        # 4. 일정 삭제
        del_res = self.client.delete(f'/api/schedules/{schedule_id}')
        self.assertEqual(del_res.status_code, 200)
        del_data = json.loads(del_res.data)
        self.assertTrue(del_data['success'])

        # 삭제 후 재조회 시 목록에 없음 확인
        get_after = self.client.get('/api/schedules')
        get_after_data = json.loads(get_after.data)
        self.assertFalse(any(s['id'] == schedule_id for s in get_after_data['schedules']))


if __name__ == '__main__':
    unittest.main()
