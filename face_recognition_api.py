#!/usr/bin/env python3
"""
API de Reconocimiento Facial usando DeepFace
Proporciona endpoints para reconocimiento en tiempo real desde el frontend
"""

import os
import json
import base64
import numpy as np
from io import BytesIO
from PIL import Image
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from deepface import DeepFace
from scipy.spatial.distance import cosine
import cv2

app = Flask(__name__)
CORS(app)  # Permitir CORS para desarrollo

# Configuración
MODEL_NAME = "Facenet512"
DETECTOR_BACKEND = "opencv"
EMBEDDINGS_FILE = Path("public/trained-faces/face_embeddings.json")
THRESHOLD = 0.4  # Umbral de similitud (ajustable)

# Cargar embeddings entrenados
trained_embeddings = None
person_name = None


def load_trained_embeddings():
    """Carga los embeddings entrenados desde el archivo JSON"""
    global trained_embeddings, person_name

    if not EMBEDDINGS_FILE.exists():
        print(f"⚠️  No se encontró {EMBEDDINGS_FILE}")
        return False

    try:
        with open(EMBEDDINGS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)

        trained_embeddings = np.array(data['embeddings'])
        person_name = data['name']

        print(f"✅ Embeddings cargados: {person_name}")
        print(f"   Embeddings: {len(trained_embeddings)}")
        print(f"   Modelo: {data.get('model', 'N/A')}")
        print(f"   Dimensión: {data.get('embedding_size', 'N/A')}")

        return True
    except Exception as e:
        print(f"❌ Error cargando embeddings: {e}")
        return False


def base64_to_image(base64_string):
    """Convierte una imagen base64 a un array numpy"""
    try:
        # Remover el prefijo data:image/...;base64, si existe
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]

        img_data = base64.b64decode(base64_string)
        img = Image.open(BytesIO(img_data))

        # Convertir a RGB si es necesario
        if img.mode != 'RGB':
            img = img.convert('RGB')

        # Convertir a numpy array
        img_array = np.array(img)

        return img_array
    except Exception as e:
        raise ValueError(f"Error convirtiendo imagen: {e}")


def compare_embeddings(embedding1, embedding2):
    """Calcula la similitud entre dos embeddings usando distancia coseno"""
    similarity = 1 - cosine(embedding1, embedding2)
    return similarity


@app.route('/health', methods=['GET'])
def health():
    """Endpoint de salud"""
    return jsonify({
        'status': 'ok',
        'model': MODEL_NAME,
        'detector': DETECTOR_BACKEND,
        'embeddings_loaded': trained_embeddings is not None,
        'person': person_name if person_name else None
    })


@app.route('/recognize', methods=['POST'])
def recognize():
    """
    Endpoint principal para reconocimiento facial
    Recibe una imagen en base64 y retorna si es la persona entrenada
    """
    try:
        # Verificar que hay embeddings cargados
        if trained_embeddings is None:
            return jsonify({
                'success': False,
                'error': 'No hay embeddings entrenados cargados',
                'message': 'Ejecuta train_model_python.py primero'
            }), 400

        # Obtener imagen del request
        data = request.get_json()

        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'error': 'No se proporcionó imagen'
            }), 400

        # Convertir base64 a imagen
        img_array = base64_to_image(data['image'])

        # Extraer embedding de la imagen
        try:
            embedding_objs = DeepFace.represent(
                img_path=img_array,
                model_name=MODEL_NAME,
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=True,
                align=True
            )

            if not embedding_objs:
                return jsonify({
                    'success': True,
                    'face_detected': False,
                    'message': 'No se detectó ningún rostro'
                })

            # Tomar el primer rostro detectado
            test_embedding = np.array(embedding_objs[0]['embedding'])

            # Comparar con todos los embeddings entrenados
            similarities = []
            for trained_emb in trained_embeddings:
                similarity = compare_embeddings(test_embedding, trained_emb)
                similarities.append(similarity)

            # Tomar la mejor similitud
            max_similarity = max(similarities)
            avg_similarity = np.mean(similarities)

            # Decidir si es la persona entrenada
            is_match = max_similarity > THRESHOLD

            confidence = max_similarity * 100  # Convertir a porcentaje

            return jsonify({
                'success': True,
                'face_detected': True,
                'is_match': is_match,
                'person_name': person_name if is_match else 'Desconocido',
                'confidence': float(confidence),
                'max_similarity': float(max_similarity),
                'avg_similarity': float(avg_similarity),
                'threshold': THRESHOLD,
                'details': {
                    'model': MODEL_NAME,
                    'num_comparisons': len(similarities)
                }
            })

        except ValueError as e:
            # No se detectó rostro
            return jsonify({
                'success': True,
                'face_detected': False,
                'message': str(e)
            })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/verify', methods=['POST'])
def verify():
    """
    Verifica dos imágenes si son de la misma persona
    Útil para testing y comparaciones
    """
    try:
        data = request.get_json()

        if not data or 'image1' not in data or 'image2' not in data:
            return jsonify({
                'success': False,
                'error': 'Se requieren dos imágenes'
            }), 400

        img1 = base64_to_image(data['image1'])
        img2 = base64_to_image(data['image2'])

        result = DeepFace.verify(
            img1_path=img1,
            img2_path=img2,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=True
        )

        return jsonify({
            'success': True,
            'verified': result['verified'],
            'distance': result['distance'],
            'threshold': result['threshold'],
            'model': result['model']
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/reload', methods=['POST'])
def reload_embeddings():
    """Recarga los embeddings desde el archivo"""
    success = load_trained_embeddings()

    if success:
        return jsonify({
            'success': True,
            'message': f'Embeddings de {person_name} recargados correctamente'
        })
    else:
        return jsonify({
            'success': False,
            'error': 'No se pudieron cargar los embeddings'
        }), 500


@app.route('/info', methods=['GET'])
def info():
    """Información sobre el modelo y embeddings cargados"""
    if trained_embeddings is None:
        return jsonify({
            'loaded': False,
            'message': 'No hay embeddings cargados'
        })

    return jsonify({
        'loaded': True,
        'person_name': person_name,
        'num_embeddings': len(trained_embeddings),
        'embedding_dimension': len(trained_embeddings[0]),
        'model': MODEL_NAME,
        'detector': DETECTOR_BACKEND,
        'threshold': THRESHOLD,
        'embeddings_file': str(EMBEDDINGS_FILE)
    })


if __name__ == '__main__':
    print("="*70)
    print("🚀 INICIANDO API DE RECONOCIMIENTO FACIAL")
    print("="*70)
    print(f"\nModelo: {MODEL_NAME}")
    print(f"Detector: {DETECTOR_BACKEND}")
    print(f"Umbral de similitud: {THRESHOLD}")
    print(f"Archivo de embeddings: {EMBEDDINGS_FILE}")
    print()

    # Cargar embeddings al iniciar
    load_trained_embeddings()

    print("\n" + "="*70)
    print("✅ Servidor Flask iniciado")
    print("="*70)
    print("\nEndpoints disponibles:")
    print("  GET  /health     - Estado del servidor")
    print("  GET  /info       - Información de embeddings cargados")
    print("  POST /recognize  - Reconocer rostro en imagen")
    print("  POST /verify     - Verificar dos imágenes")
    print("  POST /reload     - Recargar embeddings")
    print("\n" + "="*70)

    # Iniciar servidor
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        threaded=True
    )
