## 🔐 AUTH (Публичные)
```bash
POST   /auth/register
POST   /auth/login
```
## 👥 USERS
```bash
GET    /users                    # Все пользователи (ADMIN, DIRECTOR)
GET    /users/:id                # Профиль пользователя (Все роли)
PATCH  /users/:id                # Обновить пользователя (ADMIN)
DELETE /users/:id                # Удалить пользователя (ADMIN)
```
## 📁 PROJECTS
```bash
GET    /projects                 # Мои проекты (Все роли)
POST   /projects                 # Создать проект (ADMIN, DIRECTOR, ZAM_DIRECTOR)
GET    /projects/:id             # Детали проекта (Участники + DIRECTOR, ADMIN)
PATCH  /projects/:id             # Обновить проект (ADMIN, Owner проекта)
DELETE /projects/:id             # Удалить проект (ADMIN, Owner проекта)
POST   /projects/:id/members     # Добавить участника (ADMIN, Owner, ZAM_DIRECTOR)
DELETE /projects/:id/members/:userId  # Удалить участника (ADMIN, Owner)
GET    /projects/:id/statistics  # Статистика проекта (DIRECTOR, ADMIN, Owner)
```
## ✅ TASKS
```bash
GET    /projects/:projectId/tasks              # Все задачи проекта
POST   /projects/:projectId/tasks              # Создать задачу (ADMIN, ZAM_DIRECTOR, EMPLOYEE)
GET    /tasks/:id                              # Детали задачи
PATCH  /tasks/:id                              # Обновить задачу (Creator, Assignee, ADMIN)
DELETE /tasks/:id                              # Удалить задачу (ADMIN, Creator)
PATCH  /tasks/:id/status                       # Изменить статус (Assignee, ADMIN, ZAM_DIRECTOR)
PATCH  /tasks/:id/approve                      # Утвердить задачу → DONE (ZAM_DIRECTOR, ADMIN)
PATCH  /tasks/:id/reject                       # Отклонить задачу → REJECTED (ZAM_DIRECTOR, ADMIN)
PATCH  /tasks/:id/assign                       # Назначить исполнителя (ADMIN, ZAM_DIRECTOR, Creator)
GET    /tasks/my/assigned                      # Мои назначенные задачи
GET    /tasks/my/created                       # Мои созданные задачи
```
## 💬 COMMENTS
```bash
GET    /tasks/:taskId/comments   # Комментарии к задаче
POST   /tasks/:taskId/comments   # Добавить комментарий (Все кроме VIEWER)
PATCH  /comments/:id             # Редактировать комментарий (Author, ADMIN)
DELETE /comments/:id             # Удалить комментарий (Author, ADMIN)
```
