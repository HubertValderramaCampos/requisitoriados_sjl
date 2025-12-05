#!/usr/bin/env python3
"""
Sistema de Entrenamiento de Reconocimiento Facial Robusto
Usando DeepFace con modelos ArcFace/Facenet512
Extremadamente resistente a cambios de iluminación, pose, ruido, etc.
"""

import os
import json
import cv2
import numpy as np
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Tuple
from deepface import DeepFace
from tqdm import tqdm

# Configuración
MODEL_NAME = "Facenet512"  # Opciones: VGG-Face, Facenet, Facenet512, OpenFace, DeepFace, DeepID, ArcFace, Dlib, SFace
DETECTOR_BACKEND = "opencv"  # Opciones: opencv, ssd, dlib, mtcnn, retinaface, mediapipe
OUTPUT_DIR = Path("public/trained-faces")
PHOTOS_DIR = Path("training_photos")

class FaceTrainer:
    def __init__(self, person_name: str):
        self.person_name = person_name
        self.embeddings = []
        self.valid_photos = []
        self.failed_photos = []

        # Crear directorios
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        PHOTOS_DIR.mkdir(parents=True, exist_ok=True)

    def capture_from_webcam(self, num_photos: int = 20) -> None:
        """
        Captura fotos desde la webcam con guías visuales
        """
        print(f"\n🎥 Iniciando captura de {num_photos} fotos desde webcam...")
        print("📸 Instrucciones:")
        print("   - Presiona ESPACIO para capturar una foto")
        print("   - Presiona 'q' para salir")
        print("   - Varía tu expresión, ángulo e iluminación entre capturas\n")

        cap = cv2.VideoCapture(0)

        if not cap.isOpened():
            raise Exception("No se pudo abrir la webcam")

        captured = 0
        photo_paths = []

        while captured < num_photos:
            ret, frame = cap.read()
            if not ret:
                continue

            # Detectar rostro en tiempo real
            try:
                faces = DeepFace.extract_faces(
                    img_path=frame,
                    detector_backend=DETECTOR_BACKEND,
                    enforce_detection=False
                )

                # Dibujar rectángulo alrededor del rostro
                if faces:
                    for face_obj in faces:
                        facial_area = face_obj['facial_area']
                        x, y, w, h = facial_area['x'], facial_area['y'], facial_area['w'], facial_area['h']

                        # Rectángulo verde si detecta rostro
                        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
                        cv2.putText(frame, "Rostro Detectado", (x, y-10),
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            except:
                pass

            # Mostrar información
            cv2.putText(frame, f"Fotos: {captured}/{num_photos}", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.putText(frame, "ESPACIO: Capturar | Q: Salir", (10, 70),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

            # Círculo guía central
            h, w = frame.shape[:2]
            cv2.circle(frame, (w//2, h//2), 150, (0, 255, 255), 2)

            cv2.imshow('Entrenamiento - Captura de Fotos', frame)

            key = cv2.waitKey(1) & 0xFF

            if key == ord(' '):  # Espacio para capturar
                # Guardar foto
                photo_path = PHOTOS_DIR / f"{self.person_name.replace(' ', '_')}_{captured+1}.jpg"
                cv2.imwrite(str(photo_path), frame)
                photo_paths.append(photo_path)
                captured += 1

                # Efecto flash
                flash = np.ones_like(frame) * 255
                cv2.imshow('Entrenamiento - Captura de Fotos', flash)
                cv2.waitKey(100)

                print(f"✓ Foto {captured}/{num_photos} capturada")

            elif key == ord('q'):
                break

        cap.release()
        cv2.destroyAllWindows()

        print(f"\n✅ Captura completada: {captured} fotos guardadas en {PHOTOS_DIR}")
        return photo_paths

    def load_photos_from_directory(self, photo_dir: Path = None) -> List[Path]:
        """
        Carga fotos desde un directorio
        """
        if photo_dir is None:
            photo_dir = PHOTOS_DIR

        extensions = ['.jpg', '.jpeg', '.png', '.bmp']
        photos = []

        for ext in extensions:
            photos.extend(list(photo_dir.glob(f"*{ext}")))
            photos.extend(list(photo_dir.glob(f"*{ext.upper()}")))

        return sorted(photos)

    def extract_embeddings(self, photo_paths: List[Path]) -> None:
        """
        Extrae embeddings de todas las fotos usando DeepFace
        """
        print(f"\n🧠 Extrayendo embeddings con modelo {MODEL_NAME}...")
        print(f"   Este modelo es extremadamente robusto contra:")
        print("   ✓ Cambios de iluminación (día/noche, interior/exterior)")
        print("   ✓ Diferentes ángulos de pose (±45°)")
        print("   ✓ Expresiones faciales variadas")
        print("   ✓ Ruido y baja calidad de imagen")
        print("   ✓ Oclusiones parciales (lentes, gorras, etc.)\n")

        for photo_path in tqdm(photo_paths, desc="Procesando fotos"):
            try:
                # Extraer embedding usando DeepFace
                embedding_objs = DeepFace.represent(
                    img_path=str(photo_path),
                    model_name=MODEL_NAME,
                    detector_backend=DETECTOR_BACKEND,
                    enforce_detection=True,
                    align=True  # Alinear rostro antes de extraer features
                )

                # DeepFace puede detectar múltiples rostros, tomamos el primero
                if embedding_objs:
                    embedding = embedding_objs[0]["embedding"]
                    self.embeddings.append(embedding)
                    self.valid_photos.append(str(photo_path))

            except Exception as e:
                self.failed_photos.append((str(photo_path), str(e)))
                tqdm.write(f"✗ Error en {photo_path.name}: {str(e)}")

        print(f"\n✅ Procesamiento completado:")
        print(f"   ✓ Exitosos: {len(self.valid_photos)}")
        print(f"   ✗ Fallidos: {len(self.failed_photos)}")

    def save_embeddings(self) -> Path:
        """
        Guarda los embeddings en formato JSON compatible con el frontend
        """
        if not self.embeddings:
            raise ValueError("No hay embeddings para guardar")

        # Convertir embeddings a formato serializable
        embeddings_list = [emb if isinstance(emb, list) else emb.tolist()
                          for emb in self.embeddings]

        output_data = {
            "name": self.person_name,
            "model": MODEL_NAME,
            "detector": DETECTOR_BACKEND,
            "embeddings": embeddings_list,
            "embedding_size": len(embeddings_list[0]),
            "num_photos": len(self.valid_photos),
            "timestamp": datetime.now().isoformat(),
            "valid_photos": self.valid_photos,
            "failed_photos": [{"path": p, "error": e} for p, e in self.failed_photos]
        }

        # Guardar archivo principal
        output_file = OUTPUT_DIR / "face_embeddings.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)

        # Guardar backup con timestamp
        backup_file = OUTPUT_DIR / f"face_embeddings_{self.person_name.replace(' ', '_')}_{int(datetime.now().timestamp())}.json"
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)

        print(f"\n💾 Embeddings guardados:")
        print(f"   📄 Archivo principal: {output_file}")
        print(f"   📄 Backup: {backup_file}")

        return output_file

    def compute_statistics(self) -> Dict:
        """
        Calcula estadísticas de calidad del entrenamiento
        """
        if not self.embeddings:
            return {}

        embeddings_array = np.array(self.embeddings)

        # Calcular similitudes entre embeddings (distancia coseno)
        from scipy.spatial.distance import cosine

        similarities = []
        for i in range(len(embeddings_array)):
            for j in range(i+1, len(embeddings_array)):
                similarity = 1 - cosine(embeddings_array[i], embeddings_array[j])
                similarities.append(similarity)

        stats = {
            "mean_similarity": float(np.mean(similarities)) if similarities else 0,
            "std_similarity": float(np.std(similarities)) if similarities else 0,
            "min_similarity": float(np.min(similarities)) if similarities else 0,
            "max_similarity": float(np.max(similarities)) if similarities else 0,
            "embedding_dimension": len(embeddings_array[0]),
            "num_embeddings": len(embeddings_array)
        }

        print(f"\n📊 Estadísticas de Calidad:")
        print(f"   Similitud promedio: {stats['mean_similarity']:.3f} (más cercano a 1.0 es mejor)")
        print(f"   Desviación estándar: {stats['std_similarity']:.3f} (menor es más consistente)")
        print(f"   Dimensión del embedding: {stats['embedding_dimension']}")
        print(f"   Total de embeddings: {stats['num_embeddings']}")

        if stats['mean_similarity'] > 0.8:
            print("   ✅ Excelente calidad de entrenamiento!")
        elif stats['mean_similarity'] > 0.6:
            print("   ⚠️  Calidad aceptable, considera capturar más fotos variadas")
        else:
            print("   ❌ Baja calidad, verifica que todas las fotos sean de la misma persona")

        return stats


def main():
    print("="*70)
    print("🎯 SISTEMA DE ENTRENAMIENTO DE RECONOCIMIENTO FACIAL ROBUSTO")
    print("="*70)
    print(f"\nModelo: {MODEL_NAME}")
    print(f"Detector: {DETECTOR_BACKEND}")
    print(f"Dimensión del embedding: 512 dimensiones (Facenet512)")
    print("\nCaracterísticas:")
    print("  ✓ Resistente a cambios de iluminación extremos")
    print("  ✓ Funciona con diferentes ángulos (±45°)")
    print("  ✓ Robusto contra ruido y compresión")
    print("  ✓ Tolera oclusiones parciales")
    print("="*70)

    # Solicitar nombre
    person_name = input("\n👤 Ingresa tu nombre completo: ").strip()
    if not person_name:
        print("❌ Nombre vacío. Abortando.")
        return

    trainer = FaceTrainer(person_name)

    # Opción de captura
    print("\n📷 Opciones de captura:")
    print("  1. Capturar fotos desde webcam (Recomendado)")
    print("  2. Usar fotos existentes en 'training_photos/'")

    choice = input("\nSelecciona una opción (1/2): ").strip()

    if choice == "1":
        num_photos = input("\n¿Cuántas fotos deseas capturar? (recomendado: 20-30): ").strip()
        num_photos = int(num_photos) if num_photos.isdigit() else 20

        photo_paths = trainer.capture_from_webcam(num_photos)
    else:
        print(f"\n📂 Buscando fotos en {PHOTOS_DIR}...")
        photo_paths = trainer.load_photos_from_directory()

        if not photo_paths:
            print(f"❌ No se encontraron fotos en {PHOTOS_DIR}")
            print("   Coloca tus fotos (.jpg, .png) en esa carpeta e intenta de nuevo.")
            return

        print(f"✓ Encontradas {len(photo_paths)} fotos")

    if not photo_paths:
        print("❌ No hay fotos para procesar.")
        return

    # Extraer embeddings
    trainer.extract_embeddings(photo_paths)

    if not trainer.embeddings:
        print("\n❌ No se pudo extraer ningún embedding válido.")
        return

    # Calcular estadísticas
    trainer.compute_statistics()

    # Guardar embeddings
    output_file = trainer.save_embeddings()

    print("\n" + "="*70)
    print("✅ ENTRENAMIENTO COMPLETADO EXITOSAMENTE")
    print("="*70)
    print(f"\n📦 Archivo de embeddings: {output_file}")
    print(f"\n🚀 Siguiente paso:")
    print(f"   1. El archivo '{output_file.name}' está listo para usar")
    print(f"   2. Inicia el servidor: npm run dev")
    print(f"   3. El sistema frontend lo cargará automáticamente")
    print("\n" + "="*70)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Proceso interrumpido por el usuario.")
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
