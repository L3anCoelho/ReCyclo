"""
ReCyclo — App Flask com proteção CSRF
─────────────────────────────────────────
Este arquivo concentra toda a configuração de segurança e as rotas
de autenticação. Comentários extensos explicam o "porquê" de cada
decisão — leia com calma, principalmente as partes marcadas com 🔐.
"""

import os
import re
import secrets
from datetime import datetime

from flask import (
    Flask, render_template, request, redirect, url_for, flash, session
)
from flask_wtf.csrf import CSRFProtect, CSRFError
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash


# ─────────────────────────────────────────────────────────────
# 1. CONFIGURAÇÃO DA APP
# ─────────────────────────────────────────────────────────────
app = Flask(__name__)

# 🔐 SECRET_KEY: usada pra assinar cookies de sessão E gerar tokens CSRF.
# Em produção, NUNCA deixe hardcoded — carregue de variável de ambiente.
# O fallback abaixo só serve pra desenvolvimento local.
app.config['SECRET_KEY'] = os.environ.get(
    'SECRET_KEY',
    secrets.token_hex(32)  # gera uma key aleatória se não houver no .env
)

# Banco SQLite local
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///recyclo.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 🔐 Configurações de segurança de cookies de sessão
app.config['SESSION_COOKIE_HTTPONLY'] = True   # JS não consegue ler o cookie
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # protege contra CSRF cross-site
# Em produção (HTTPS), descomente a linha abaixo:
# app.config['SESSION_COOKIE_SECURE'] = True

# 🔐 Tempo de validade do token CSRF (1 hora — padrão é None = sessão inteira)
app.config['WTF_CSRF_TIME_LIMIT'] = 3600

# ─────────────────────────────────────────────────────────────
# 2. INICIALIZAÇÃO DAS EXTENSÕES
# ─────────────────────────────────────────────────────────────

# 🔐 CSRFProtect aplica proteção a TODAS as rotas POST/PUT/DELETE/PATCH
# automaticamente. Você só precisa garantir que cada <form> tenha o
# campo {{ csrf_token() }} no template.
csrf = CSRFProtect(app)

db = SQLAlchemy(app)


# ─────────────────────────────────────────────────────────────
# 3. MODELO DE USUÁRIO
# ─────────────────────────────────────────────────────────────
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    # 🔐 Guardamos o HASH da senha, NUNCA a senha em texto puro.
    # Se o banco vazar, o atacante não consegue logar nas contas.
    password_hash = db.Column(db.String(255), nullable=False)
    emblem = db.Column(db.String(10), default='🌱')
    xp = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, raw_password):
        # pbkdf2:sha256 com 600.000 iterações (padrão atual do Werkzeug)
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password):
        return check_password_hash(self.password_hash, raw_password)


# ─────────────────────────────────────────────────────────────
# 4. HANDLER DE ERRO CSRF
# ─────────────────────────────────────────────────────────────
@app.errorhandler(CSRFError)
def handle_csrf_error(e):
    """
    Quando o token CSRF tá ausente, expirado ou inválido, o Flask-WTF
    levanta CSRFError (HTTP 400). A gente captura e mostra uma mensagem
    amigável em vez da página de erro padrão feia.
    """
    flash('Sessão expirada ou requisição inválida. Tente novamente.', 'error')
    return redirect(url_for('index'))


# ─────────────────────────────────────────────────────────────
# 5. HELPERS DE VALIDAÇÃO
# ─────────────────────────────────────────────────────────────
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

def is_valid_email(email):
    return bool(EMAIL_REGEX.match(email or ''))

def is_strong_password(pwd):
    """
    Mesma lógica do frontend, mas validada de novo no servidor.
    REGRA DE OURO: nunca confie em validação de frontend.
    """
    if not pwd or len(pwd) < 8:
        return False, 'Senha deve ter no mínimo 8 caracteres.'
    if not re.search(r'[a-z]', pwd) or not re.search(r'[A-Z]', pwd):
        return False, 'Senha precisa ter letras maiúsculas e minúsculas.'
    if not re.search(r'\d', pwd):
        return False, 'Senha precisa ter pelo menos um número.'
    common = {'12345678', 'password', 'senha123', 'qwerty12', '11111111'}
    if pwd.lower() in common:
        return False, 'Essa senha é muito comum. Escolha outra.'
    return True, None


# ─────────────────────────────────────────────────────────────
# 6. ROTAS
# ─────────────────────────────────────────────────────────────

@app.route('/')
def index():
    """Página inicial: mostra o login."""
    return render_template('login.html')


@app.route('/login', methods=['POST'])
def login():
    """
    🔐 Esta rota é POST-only e está automaticamente protegida pelo CSRFProtect.
    Se o request chegar sem o token válido, nem entra aqui — o handler
    de CSRFError acima é acionado primeiro.
    """
    # Honeypot: se o campo "website" foi preenchido, é um bot.
    # Respondemos como sucesso pra não dar pista de que detectamos.
    if request.form.get('website'):
        flash('Login realizado!', 'success')
        return redirect(url_for('index'))

    email = request.form.get('email', '').strip().lower()
    password = request.form.get('password', '')

    if not is_valid_email(email):
        flash('E-mail inválido.', 'error')
        return redirect(url_for('index'))

    user = User.query.filter_by(email=email).first()

    # 🔐 IMPORTANTE: a mensagem é genérica de propósito.
    # Nunca diga "e-mail não encontrado" ou "senha errada" separadamente —
    # isso ajuda atacantes a descobrir quais e-mails estão cadastrados.
    if not user or not user.check_password(password):
        flash('E-mail ou senha incorretos.', 'error')
        return redirect(url_for('index'))

    # Login OK — cria sessão
    session['user_id'] = user.id
    session['user_name'] = user.name
    flash(f'Bem-vindo de volta, {user.name}! 🌱', 'success')
    return redirect(url_for('dashboard'))


@app.route('/register', methods=['POST'])
def register():
    """🔐 Também protegida pelo CSRFProtect automaticamente."""
    if request.form.get('website'):
        flash('Cadastro realizado!', 'success')
        return redirect(url_for('index'))

    name = request.form.get('name', '').strip()
    email = request.form.get('email', '').strip().lower()
    password = request.form.get('password', '')
    confirm = request.form.get('confirm_password', '')
    emblem = request.form.get('emblem', '🌱')
    terms = request.form.get('terms')

    # Validação do math challenge (próximo passo vamos melhorar isso)
    try:
        math_a = int(request.form.get('math_a', 0))
        math_b = int(request.form.get('math_b', 0))
        math_answer = int(request.form.get('math_answer', -1))
    except ValueError:
        flash('Resposta do desafio inválida.', 'error')
        return redirect(url_for('index'))

    if math_answer != math_a + math_b:
        flash('Resposta do desafio matemático incorreta.', 'error')
        return redirect(url_for('index'))

    if not name or len(name) < 2:
        flash('Nome muito curto.', 'error')
        return redirect(url_for('index'))

    if not is_valid_email(email):
        flash('E-mail inválido.', 'error')
        return redirect(url_for('index'))

    if password != confirm:
        flash('As senhas não coincidem.', 'error')
        return redirect(url_for('index'))

    ok, msg = is_strong_password(password)
    if not ok:
        flash(msg, 'error')
        return redirect(url_for('index'))

    if not terms:
        flash('Você precisa aceitar os termos de uso.', 'error')
        return redirect(url_for('index'))

    if User.query.filter_by(email=email).first():
        flash('E-mail já cadastrado. Tente fazer login.', 'warning')
        return redirect(url_for('index'))

    # Tudo OK — cria o usuário
    new_user = User(name=name, email=email, emblem=emblem)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    flash(f'Missão iniciada, guardião {name}! 🎉', 'success')
    return redirect(url_for('index'))


@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    """🔐 Protegida pelo CSRFProtect."""
    if request.form.get('website'):
        flash('Se o e-mail existir, enviaremos instruções.', 'info')
        return redirect(url_for('index'))

    email = request.form.get('email', '').strip().lower()

    if not is_valid_email(email):
        flash('E-mail inválido.', 'error')
        return redirect(url_for('index'))

    # 🔐 Resposta genérica: nunca confirme se o e-mail existe ou não.
    # Atacantes usam essa rota pra fazer "user enumeration".
    # Aqui, no futuro, você vai gerar um token e mandar por e-mail.
    flash('Se o e-mail existir em nossa base, enviaremos instruções de recuperação.', 'info')
    return redirect(url_for('index'))


@app.route('/dashboard')
def dashboard():
    """Página protegida — só pra usuário logado."""
    if 'user_id' not in session:
        flash('Faça login para continuar.', 'warning')
        return redirect(url_for('index'))
    return f"<h1>Bem-vindo, {session.get('user_name')}! 🌱</h1><a href='/logout'>Sair</a>"


@app.route('/logout')
def logout():
    session.clear()
    flash('Você saiu. Até a próxima missão! 👋', 'info')
    return redirect(url_for('index'))


# ─────────────────────────────────────────────────────────────
# 7. INICIALIZAÇÃO
# ─────────────────────────────────────────────────────────────
if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # cria recyclo.db se não existir
    app.run(debug=True, port=5000) 
