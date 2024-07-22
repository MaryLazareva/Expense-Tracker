import os
from flask import Flask, render_template
from flask_restful import Api
from flask_migrate import Migrate
from dotenv import load_dotenv
import logging
from flask_wtf import CSRFProtect


from models import db, bcrypt, login_manager, Expense
from routes import initialize_routes


load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL') # SQLALCHEMY_DATABASE_URI — это ключ конфигурации, который используется для указания URL-адреса базы данных, к которой будет подключаться SQLAlchemy
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # SQLALCHEMY_TRACK_MODIFICATIONS - это конфигурационный параметр SQLAlchemy, который контролирует, будет ли библиотека отслеживать изменения всех объектов
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY_CSRF') # Секретный ключ для подписи данных сессии и защиты от атак CSRF

db.init_app(app)   # Инициализируем базу данных с приложением Flask
bcrypt.init_app(app) # Инициализация bcrypt с приложением Flask для хеширования паролей
login_manager.init_app(app) # Инициализация LoginManager с приложением Flask для управления сессиями пользователей


csrf = CSRFProtect(app)  # Инициализация CSRFProtect

# Этот объект позволяет вам легко выполнять миграции, такие как создание, изменение или удаление таблиц и столбцов в базе данных, не требуя ручного выполнения SQL-запросов
migrate = Migrate(app, db) # инициализирует объект Migrate, который связывает ваше приложение Flask и объект базы данных SQLAlchemy с библиотекой Flask-Migrate
api = Api(app)   # Инициализация API с приложением
initialize_routes(api)  # Используется для регистрации маршрутов и ресурсов в вашем приложении Flask-RESTful

# Создание таблиц в контексте приложения
with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')


if __name__ == '__main__':
    app.run(debug=True)