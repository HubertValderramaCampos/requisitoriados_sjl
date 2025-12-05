# 📦 GUÍA DE INSTALACIÓN COMPLETA

## ✅ Estado Actual

- ✅ Node.js instalado
- ✅ Python 3.9 instalado
- ✅ Proyecto descargado
- ⏳ Instalando dependencias...

---

## 🎯 OPCIÓN 1: Sistema Python + DeepFace (MÁS ROBUSTO)

### Paso 1: Instalar Dependencias Python

Las dependencias se están instalando en segundo plano. Esto puede tardar 5-10 minutos.

**Paquetes que se instalan:**
- deepface (framework de reconocimiento facial)
- tensorflow (motor de IA, ~500MB)
- opencv-python (procesamiento de imágenes)
- flask (servidor API)
- numpy, pillow, tqdm (utilidades)

**Total: ~2GB de descarga**

### Paso 2: Entrenar Tu Rostro

Una vez instalado, ejecuta:

```bash
python train_model_python.py
```

**En el programa:**
1. Ingresa tu nombre: `Hubert`
2. Selecciona opción: `1` (webcam)
3. Número de fotos: `20`
4. En la ventana:
   - **ESPACIO** = Capturar foto
   - **Q** = Salir
5. Varía entre cada foto:
   - Gira la cabeza (izquierda/derecha)
   - Cambia expresión (sonríe/serio)
   - Acércate/aléjate
   - Muévete para diferentes luces

### Paso 3: Iniciar API

**Terminal 1 (dejar abierta):**
```bash
python face_recognition_api.py
```

Verás:
```
🚀 INICIANDO API DE RECONOCIMIENTO FACIAL
✅ Embeddings de Hubert cargados
✅ Servidor Flask iniciado
   Corriendo en http://localhost:5000
```

### Paso 4: Configurar Frontend

Edita `index.html` línea 115:

**Cambiar de:**
```html
<script type="module" src="/src/main.ts"></script>
```

**A:**
```html
<script type="module" src="/src/main_python.ts"></script>
```

### Paso 5: Iniciar Frontend

**Terminal 2 (nueva terminal):**
```bash
npm run dev
```

### Paso 6: Probar

Abre: `http://localhost:5174`

1. Click "Iniciar Cámara"
2. Mira a la cámara
3. Tu rostro se detectará automáticamente cada 2 segundos
4. Verás tu nombre si te reconoce

---

## 🟨 OPCIÓN 2: Sistema JavaScript (MÁS SIMPLE)

### Ya está casi listo!

Veo que ya tienes un archivo de entrenamiento:
- `face-descriptors-Hubert-1764915410958.json`

**Solo necesitas:**

1. **Renombrar el archivo:**
```bash
# En PowerShell:
Copy-Item "public\trained-faces\face-descriptors-Hubert-1764915410958.json" "public\trained-faces\face-descriptors.json"
```

2. **Iniciar servidor:**
```bash
npm run dev
```

3. **Abrir navegador:**
```
http://localhost:5174
```

4. **Probar:**
- Click "Iniciar Cámara"
- Click "Escanear Persona"

---

## 📊 ¿Cuál elegir?

| Característica | Python 🐍 | JavaScript 🟨 |
|---|---|---|
| **Ya configurado** | ❌ Requiere instalar | ✅ Casi listo |
| **Robustez** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Precisión** | 99.6% | ~95% |
| **Luz/Ruido** | Excelente | Bueno |
| **Complejidad** | Media | Baja |
| **Tiempo setup** | 15 min | 2 min |

**Mi recomendación:**
- **Quieres probarlo YA:** Usa JavaScript (Opción 2)
- **Quieres lo mejor:** Usa Python (Opción 1)

---

## 🔧 Solución de Problemas

### Error al instalar Python
```bash
# Verificar instalación
python --version

# Si falla, reinstalar desde:
https://www.python.org/downloads/
```

### Puerto 5174 ocupado
```bash
# El servidor usará otro puerto automáticamente
# Revisa la consola para ver el puerto
```

### No detecta webcam
- Cierra otras apps que usen la cámara (Zoom, Teams, etc.)
- Permite permisos de cámara en el navegador

### Python tarda mucho instalando
- Es normal, tensorflow es pesado (~500MB)
- Ten paciencia, descarga solo una vez

---

## 📝 Comandos Rápidos

**Ver estado instalación Python:**
```bash
./venv/Scripts/pip list
```

**Entrenar (Python):**
```bash
python train_model_python.py
```

**API (Python):**
```bash
python face_recognition_api.py
```

**Frontend:**
```bash
npm run dev
```

**Ver logs:**
- API Python: En la terminal donde corre
- Frontend: Consola del navegador (F12)
