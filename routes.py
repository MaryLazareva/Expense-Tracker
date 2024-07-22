from sqlite3 import IntegrityError
from flask import request, jsonify
from flask_restful import Resource
from flask_login import login_user, logout_user, login_required, current_user
from models import db, User, Expense, CategoryExpense
from flask_wtf.csrf import generate_csrf
import datetime


class UpdateCSRFTokenResource(Resource):
    def get(self):
         """Обновление токена"""
         return jsonify({'csrf_token': generate_csrf()})


class RegisterResource(Resource):
    def post(self):
        """Регистрация пользователя"""
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if User.query.filter_by(username=username).first() or User.query.filter_by(email=email).first():
            return {'message': 'User already exists'}, 400
        
        new_user = User(username=username, email=email)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        
        return {'message': 'User registered successfully'}, 201

class LoginResource(Resource):
    def post(self):
        """Вход пользователя"""
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        user = User.query.filter_by(email=email).first()
        if user and user.check_password(password):
            login_user(user)
            return {'message': 'Login successful'}, 200
        return {'message': 'Invalid credentials'}, 401

class LogoutResource(Resource):
    @login_required
    def post(self):
        """Выход пользователя"""
        logout_user()
        return {'message': 'Logout successful'}, 200

class LoginStatusResource(Resource):
    def get(self):
        """Проверка статуса входа"""
        if current_user.is_authenticated:  # Проверяет, есть ли активная сессия для текущего пользователя и авторизован ли он
            return {'logged_in': True}, 200
        return {'logged_in': False}, 200


class ExpenseListResource(Resource):
    @login_required
    def post(self):
        """Добавляет новый расход"""
        data = request.get_json()  # Используется для получения данных, отправленных в теле запроса в формате JSON (обычно применяется для POST-запросов)
        # Проверка формата даты
        if not self.is_valid_date(data['date']):
            return {'message': 'Invalid date format'}, 400
        try:
            new_expense = Expense( 
                title=data['title'],
                price=data['price'],
                date=data['date'],
                category_id=data['category_id'],
                user_id=current_user.id
            )
            db.session.add(new_expense)
            db.session.commit()
            return {'message': 'Expense created'}, 201
        except Exception as e:
            db.session.rollback()  # Откатывает (отменяет) все изменения, сделанные в текущей сессии базы данных
            return {'message': str(e)}, 500

    def is_valid_date(self, date_str):
        try:
            datetime.datetime.strptime(date_str, '%Y-%m-%d')
            return True
        except ValueError:
            return False

class CategoryListResource(Resource):
    @login_required
    def get(self):
        """Список категорий"""
        categories = CategoryExpense.query.all()
        categories_list = [{'id': cat.id, 'category': cat.category} for cat in categories]
        return categories_list
    
class AddCategoryResource(Resource):
    @login_required
    def post(self):
        """Добавление новой категории"""
        data = request.get_json()
        category_name = data.get('category')
        
        if not category_name:
            return {'message': 'Category name is required'}, 400

        # Проверка существования категории
        category = CategoryExpense.query.filter_by(category=category_name).first()
        if category:
            return {'message': 'Category already exists'}, 400

        try:
            new_category = CategoryExpense(category=category_name)
            db.session.add(new_category)
            db.session.commit()
            return {'message': 'Category added successfully', 'category': {'id': new_category.id, 'name': new_category.category}}, 201
        except Exception as e:
            db.session.rollback()
            return {'message': str(e)}, 500

class DeleteCategoryResource(Resource):
    @login_required
    def post(self):
        """Удаляет конкретную категорию"""
        data = request.get_json(force=True)
        category_id = data.get('categoryId')
        if not category_id:
            return {'message': 'Category ID is missing'}, 400

        category = CategoryExpense.query.get(category_id)
        if not category:
            return {'message': 'Category not found'}, 404
        db.session.delete(category)
        db.session.commit()
        return {'message': 'Category deleted'}


class FilteredExpensesResource(Resource):
    @login_required
    def get(self):
        """Фильтрация расходов по дате"""
        start_date = request.args.get('start_date') # request.args используется для получения параметров из строки запроса URL
        end_date = request.args.get('end_date')
        query = Expense.query.filter_by(user_id=current_user.id) # current_user - представляет текущего аутентифицированного пользователя. Он доступен после того, как пользователь успешно вошел в систему и его сессия была установлена
        if start_date:
            try:
                datetime.datetime.strptime(start_date, '%Y-%m-%d') # string parse time
                query = query.filter(Expense.date >= start_date) # Получаем только те записи, у которых значение поля date в модели Expense больше или равно start_date
            except ValueError:
                return {'message': 'Invalid start date format'}, 400

        if end_date:
            try:
                datetime.datetime.strptime(end_date, '%Y-%m-%d')
                query = query.filter(Expense.date <= end_date)
            except ValueError:
                return {'message': 'Invalid end date format'}, 400

        expenses = query.all()
        categories = CategoryExpense.query.all()

        category_data = {cat.category: [] for cat in categories}
        for exp in expenses:
            category_data[exp.category.category].append({
                'id': exp.id,
                'title': exp.title,
                'price': exp.price,
                'date': exp.date,
                
            })

        print(f"Filtered data: {category_data}")

        return category_data

class DeleteExpenseResource(Resource):
    @login_required
    def post(self):
        """Удаляет конкретный расход. Только владелец расхода может его удалить."""
        data = request.get_json(force=True)
        expense_id = data.get('expenseId')
        if not expense_id:
            return {'message': 'Expense ID is missing'}, 400

        expense = Expense.query.get(expense_id)
        if not expense or expense.user_id != current_user.id:
            return {'message': 'Expense not found'}, 404
        db.session.delete(expense)
        db.session.commit()
        return {'message': 'Expense deleted'}

class EditExpenseResource(Resource):
    @login_required
    def post(self):
        """Обновляет данные конкретного расхода. Только владелец расхода может обновить его данные."""
        data = request.get_json(force=True)
        expense_id = data.get('expenseId')
        if not expense_id:
            return {'message': 'Expense ID is missing'}, 400

        expense = Expense.query.get(expense_id)
        if not expense or expense.user_id != current_user.id:
            return {'message': 'Expense not found'}, 404
        if not self.is_valid_date(data['date']):
            return {'message': 'Invalid date format'}, 400
        
    # Проверка существования категории
        category = CategoryExpense.query.filter_by(category=data['category']).first()
        if not category:
            return {'message': "Category doesn't exist"}, 400
        
        expense.title = data['title']
        expense.price = data['price']
        expense.date = data['date']
        expense.category = category 
        db.session.commit()
        return {'message': 'Expense updated'}

    def is_valid_date(self, date_str):
        try:
            datetime.datetime.strptime(date_str, '%Y-%m-%d')
            return True
        except ValueError:
            return False

def initialize_routes(api):
    api.add_resource(RegisterResource, '/api/register')
    api.add_resource(LoginResource, '/api/login')
    api.add_resource(LogoutResource, '/api/logout')
    api.add_resource(LoginStatusResource, '/api/login_status')
    api.add_resource(ExpenseListResource, '/api/expenses')
    api.add_resource(CategoryListResource, '/api/categories')
    api.add_resource(FilteredExpensesResource, '/api/filtered_expenses')
    api.add_resource(DeleteExpenseResource, '/api/delete_expense')
    api.add_resource(EditExpenseResource, '/api/edit_expense')
    api.add_resource(AddCategoryResource, '/api/add_category')
    api.add_resource(DeleteCategoryResource, '/api/delete_category')
    api.add_resource(UpdateCSRFTokenResource,'/api/csrf-token')
