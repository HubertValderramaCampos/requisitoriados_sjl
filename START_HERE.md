# 🚀 INICIO RÁPIDO - Sistema de Reconocimiento Facial Python + TypeScript

## ✨ Qué Sistema Usar

Tienes **2 opciones**:

### 🐍 Opción 1: Python + DeepFace (RECOMENDADO - MÁS ROBUSTO)
- ✅ Modelo Facenet512 (512 dimensiones)
- ✅ Extremadamente robusto a cambios de luz
- ✅ Precisión >99%
- ✅ Resistente a ruido, ángulos, oclusiones
- ⚠️  Requiere Python + API corriendo

### 🟨 Opción 2: JavaScript + face-api.js (Más Simple)
- ✅ Todo en el navegador
- ✅ No requiere Python
- ⚠️  Menos robusto (128 dimensiones)
- ⚠️  Menos preciso en condiciones difíciles

---

## 🐍 OPCIÓN 1: Sistema Python (RECOMENDADO)

### 📦 Paso 1: Instalar Dependencias Python

**Windows:**
```bash
setup_python.bat
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 🎯 Paso 2: Entrenar Tu Rostro

```bash
python train_model_python.py
```

1. Ingresa tu nombre
2. Selecciona **1** (webcam)
3. Captura 20-30 fotos:
   - **ESPACIO**: Capturar foto
   - **Q**: Salir
   - Varía expresión, ángulo, iluminación

4. El script procesará todo automáticamente
5. Archivo generado: `public/trained-faces/face_embeddings.json`

### 🌐 Paso 3: Iniciar Sistema

**Terminal 1 - API Python:**
```bash
python face_recognition_api.py
```

Verás:
```
✅ Servidor Flask iniciado
🚀 API corriendo en http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Abre: `http://localhost:5174`

### ✅ Paso 4: Probar

1. Click "Iniciar Cámara"
2. Tu rostro se detectará automáticamente
3. Aparecerá tu nombre si te reconoce

**Cambiar a este sistema en el código:**
En `index.html`, cambiar línea 115:
```html
<!-- Actual -->
<script type="module" src="/src/main.ts"></script>

<!-- Cambiar a -->
<script type="module" src="/src/main_python.ts"></script>
```

---

## 🟨 OPCIÓN 2: Sistema JavaScript (Actual)

### Ya está configurado y corriendo!

1. **Entrenar:**
   - Abre `http://localhost:5174/train_face_model.html`
   - Captura fotos con webcam
   - Descarga JSON
   - Guarda en `public/trained-faces/face-descriptors.json`

2. **Usar:**
   - Abre `http://localhost:5174`
   - Click "Iniciar Cámara"

---

## 📊 Comparación

| Característica | Python + DeepFace | JavaScript face-api.js |
|---|---|---|
| **Dimensiones** | 512 | 128 |
| **Precisión** | 99.6% | ~95% |
| **Robustez a luz** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Ángulos** | ±45° | ±30° |
| **Velocidad** | ~200ms | ~100ms |
| **Requisitos** | Python + API | Solo navegador |
| **Complejidad** | Media | Baja |

---

## 🔧 Solución de Problemas

### Python: "ModuleNotFoundError"
```bash
pip install -r requirements.txt
```

### Python: API no conecta
- Verifica que corra en puerto 5000
- Revisa firewall
- En `src/main_python.ts` verifica: `API_URL = 'http://localhost:5000'`

### JavaScript: "Failed to fetch models"
```bash
npm run setup
```

### No detecta mi rostro
- **Python**: Captura más fotos variadas (20-30)
- **JavaScript**: Entrena con 10-20 fotos, buena iluminación

---

## 📝 Archivos Importantes

```
requisitoriados_sjl/
├── train_model_python.py          # 🐍 Entrenamiento Python
├── face_recognition_api.py        # 🐍 API Python
├── src/main_python.ts             # 🐍 Frontend para Python
├── src/main.ts                    # 🟨 Frontend JavaScript
├── train_face_model.html          # 🟨 Entrenamiento JavaScript
├── requirements.txt               # 🐍 Dependencias Python
└── public/trained-faces/
    ├── face_embeddings.json       # 🐍 Datos Python
    └── face-descriptors.json      # 🟨 Datos JavaScript
```

---

## 🎯 Recomendación Final

**Para producción o uso serio:** Usa Python + DeepFace
**Para prototipo rápido:** Usa JavaScript face-api.js

---

## 📚 Documentación Completa

- [README_PYTHON.md](README_PYTHON.md) - Guía completa Python
- [README_FACIAL_RECOGNITION.md](README_FACIAL_RECOGNITION.md) - Guía JavaScript
- [README.md](README.md) - Overview general

---

## ⚡ Quick Start (Lo Más Rápido)

**Python (Más Robusto):**
```bash
setup_python.bat
python train_model_python.py
# Terminal 1: python face_recognition_api.py
# Terminal 2: npm run dev
# Cambiar index.html línea 115 a main_python.ts
```

**JavaScript (Más Simple):**
```bash
npm run dev
# Abrir http://localhost:5174/train_face_model.html
# Entrenar y usar
```
