# ⚽ FIFA World Cup 2026 — Quiniela

Aplicación web de quiniela deportiva para el Grupo de Innovación Tecnológica.

## Características

- **Landing page** de bienvenida con diseño FIFA 2026
- **Autenticación** con registro y login de usuarios
- **Estadísticas**: resultados, tablas de posición por grupo, próximos partidos
- **Ranking**: podio y tabla completa con puntos y efectividad
- **Mi Quiniela**: pronósticos por partido, **bloqueados automáticamente** cuando el partido comienza
- **Panel admin**: actualizar resultados y recalcular puntos automáticamente

## Sistema de puntuación

| Resultado | Puntos |
|-----------|--------|
| Marcador exacto | ⭐ 3 pts |
| Resultado correcto (ganador o empate) | ✅ 1 pt |
| Incorrecto | ❌ 0 pts |

## Instalación local

```bash
# 1. Instalar Node.js 18+ si no lo tienes
# https://nodejs.org

# 2. Entrar a la carpeta del proyecto
cd fifa-quiniela

# 3. Instalar dependencias
npm install

# 4. (Opcional) Configurar variables de entorno
cp .env.example .env
# Edita .env y cambia JWT_SECRET

# 5. Iniciar la aplicación
npm start
```

Abre tu navegador en: **http://localhost:3000**

**Usuario administrador inicial:**
- Usuario: `admin`
- Contraseña: `Admin2026!`

---

## 🚀 Despliegue en producción (GRATUITO)

### Opción 1: Render.com ⭐ (Recomendado)

Render ofrece un tier gratuito perfecto para este proyecto.

**Pasos:**

1. **Crear cuenta** en [render.com](https://render.com)

2. **Subir el código a GitHub:**
   ```bash
   git init
   git add .
   git commit -m "FIFA Quiniela 2026"
   # Crea un repositorio en github.com y sigue las instrucciones
   git remote add origin https://github.com/TU_USUARIO/fifa-quiniela.git
   git push -u origin main
   ```

3. **En Render:**
   - Clic en **"New +"** → **"Web Service"**
   - Conecta tu repositorio de GitHub
   - Configura:
     - **Name:** `fifa-quiniela`
     - **Runtime:** `Node`
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`
   - En **Environment Variables** agrega:
     - `JWT_SECRET` = (una cadena aleatoria larga, ej: `m1ClaveSecreta_FIFA2026_MuySegura!`)
     - `NODE_ENV` = `production`
   - Clic en **"Create Web Service"**

4. Render generará una URL como: `https://fifa-quiniela.onrender.com`

> **Nota tier gratuito:** La instancia se "duerme" tras 15 min de inactividad. El primer acceso puede tardar ~30s. Para un grupo de trabajo esto es aceptable.

---

### Opción 2: Railway.app

1. Crea cuenta en [railway.app](https://railway.app)
2. Clic en **"New Project"** → **"Deploy from GitHub repo"**
3. Selecciona tu repositorio
4. Agrega variable `JWT_SECRET` en Settings → Variables
5. Railway detecta automáticamente que es Node.js

**$5 USD/mes de crédito gratis** — suficiente para uso moderado.

---

### Opción 3: Fly.io

Para proyectos que necesitan más uptime sin "dormirse":

```bash
# Instalar flyctl
brew install flyctl  # macOS

# Login y despliegue
fly auth login
fly launch
fly deploy
```

---

## Mantenimiento

### Agregar nuevos participantes
Los usuarios se registran solos desde la app.

### Registrar resultados (Admin)
1. Inicia sesión como `admin`
2. Ve a la pestaña **Estadísticas**
3. Junto a cada partido hay un botón **"⚽ Registrar"** o **"✏️ Editar"**
4. Ingresa el marcador → los puntos se recalculan automáticamente

### Cambiar contraseña admin
Accede a la base de datos SQLite:
```bash
npm install -g better-sqlite3-cli  # opcional
# O modifica directamente en server.js el hash
```

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + Express 4 |
| Base de datos | SQLite (better-sqlite3) |
| Autenticación | JWT + bcryptjs |
| Frontend | HTML5 + CSS3 + JavaScript (Vanilla) |
| Hosting sugerido | Render.com (gratis) |

No requiere frameworks adicionales ni proceso de compilación — listo para producción con `npm start`.
