from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import UserMixin, LoginManager

# ORM библиотека, которая позволяет взаимодействовать с базой данных с использованием объектно-ориентированного подхода
db = SQLAlchemy()
# Библиотека для безопасного хеширования паролей
bcrypt = Bcrypt()
# Экземпляр LoginManager, который управляет сессиями пользователей и аутентификацией
login_manager = LoginManager()


class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(150), nullable=False)

    def set_password(self, password):
        """ Метод для хеширования пароля перед сохранением его в базу данных"""
        self.password = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        """Метод для проверки введенного пароля против сохраненного хеша"""
        return bcrypt.check_password_hash(self.password, password)
    

class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('expenses', lazy=True))
    category_id = db.Column(db.Integer, db.ForeignKey('category_expense.id'), nullable=False)
    category = db.relationship('CategoryExpense', backref=db.backref('expenses', lazy=True))
    title = db.Column(db.String(100))
    price = db.Column(db.Float)
    date = db.Column(db.String(10))
    

class CategoryExpense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(50), unique=True)

@login_manager.user_loader
def load_user(user_id):
    """Позволяет системе загружать пользователя из базы данных по его идентификатору, 
    что обеспечивает поддержку сессий и управление доступом в приложении.
    Без этой функции Flask-Login не смог бы автоматически загружать информацию о 
    текущем пользователе из базы данных при каждом запросе, где требуется авторизация"""
    return User.query.get(int(user_id))