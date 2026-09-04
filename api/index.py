import os
import sys

# 프로젝트 루트 및 todo_app 경로 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
todo_app_dir = os.path.abspath(os.path.join(current_dir, '..', 'todo_app'))
if todo_app_dir not in sys.path:
    sys.path.insert(0, todo_app_dir)

from app import app
