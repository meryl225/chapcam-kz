# Configuration RunPod Serverless - InsightFace

## Etape 1: Creer l'Endpoint sur RunPod

1. Connecte-toi sur https://runpod.io
2. Va dans "Serverless" > "Endpoints" > "New Endpoint"
3. Configure comme suit:

### Template Settings
- **Name**: `chapcam-insightface`
- **Select Template**: Choisir "runpod/pytorch:2.2.0-py3.10-cuda12.1.1"
- **Container Start Command**: 
```bash
python -u handler.py
```

### Scaling Settings
- **Min Workers**: 0 (scale to zero)
- **Max Workers**: 5 (ajuster selon la demande)
- **Idle Timeout**: 5 seconds
- **Flash Boot**: Enabled

### GPU Selection
- **GPU**: RTX 3090 ou RTX 4090 (meilleur rapport qualite/prix)
- **VRAM**: 24GB

## Etape 2: Deployer le Handler InsightFace

Cree un nouveau repo GitHub ou utilise notre template.

### Structure du projet:
```
runpod-insightface/
├── handler.py          # Handler principal RunPod
├── requirements.txt    # Dependances Python
├── Dockerfile          # Image Docker personnalisee
└── models/             # Modeles InsightFace (telecharges au build)
```

### handler.py
```python
import runpod
import base64
import io
import numpy as np
from PIL import Image
import cv2
import insightface
from insightface.app import FaceAnalysis

# Initialize InsightFace
app = FaceAnalysis(name='buffalo_l', providers=['CUDAExecutionProvider'])
app.prepare(ctx_id=0, det_size=(640, 640))

# Load swapper model
swapper = insightface.model_zoo.get_model('inswapper_128.onnx', download=True)

def base64_to_image(base64_string):
    """Convert base64 string to PIL Image"""
    img_data = base64.b64decode(base64_string)
    img = Image.open(io.BytesIO(img_data))
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

def image_to_base64(image):
    """Convert OpenCV image to base64 string"""
    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(rgb_image)
    buffered = io.BytesIO()
    pil_image.save(buffered, format="JPEG", quality=90)
    return base64.b64encode(buffered.getvalue()).decode('utf-8')

def handler(job):
    """RunPod handler function"""
    job_input = job['input']
    
    source_image_b64 = job_input.get('source_image')
    target_image_b64 = job_input.get('target_image')
    enhance_face = job_input.get('enhance_face', True)
    
    if not source_image_b64 or not target_image_b64:
        return {"error": "source_image and target_image are required"}
    
    try:
        import time
        start_time = time.time()
        
        # Decode images
        source_img = base64_to_image(source_image_b64)
        target_img = base64_to_image(target_image_b64)
        
        # Detect faces
        source_faces = app.get(source_img)
        target_faces = app.get(target_img)
        
        if len(source_faces) == 0:
            return {"error": "No face detected in source image"}
        
        if len(target_faces) == 0:
            return {"error": "No face detected in target image"}
        
        # Perform face swap
        source_face = source_faces[0]
        result = target_img.copy()
        
        for face in target_faces:
            result = swapper.get(result, face, source_face, paste_back=True)
        
        # Optional: Enhance face
        if enhance_face:
            # Add GFPGAN or CodeFormer enhancement here if needed
            pass
        
        processing_time = time.time() - start_time
        
        # Encode result
        output_b64 = image_to_base64(result)
        
        return {
            "output_image": output_b64,
            "processing_time": processing_time * 1000,  # Convert to ms
            "status": "success"
        }
        
    except Exception as e:
        return {"error": str(e), "status": "failed"}

runpod.serverless.start({"handler": handler})
```

### requirements.txt
```
insightface==0.7.3
onnxruntime-gpu==1.17.0
opencv-python-headless==4.9.0.80
pillow==10.2.0
numpy==1.26.4
runpod==1.6.0
```

### Dockerfile
```dockerfile
FROM runpod/pytorch:2.2.0-py3.10-cuda12.1.1-devel-ubuntu22.04

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download InsightFace models
RUN python -c "from insightface.app import FaceAnalysis; app = FaceAnalysis(name='buffalo_l'); app.prepare(ctx_id=-1)"

# Download inswapper model
RUN mkdir -p /root/.insightface/models && \
    wget -O /root/.insightface/models/inswapper_128.onnx \
    https://huggingface.co/deepinsight/inswapper/resolve/main/inswapper_128.onnx

# Copy handler
COPY handler.py .

CMD ["python", "-u", "handler.py"]
```

## Etape 3: Build et Push l'Image Docker

```bash
# Build l'image
docker build -t your-dockerhub/chapcam-insightface:latest .

# Push sur Docker Hub
docker push your-dockerhub/chapcam-insightface:latest
```

## Etape 4: Configurer l'Endpoint RunPod

Sur runpod.io:
1. Va dans ton endpoint
2. Clique "Edit"
3. Dans "Container Image", mets: `your-dockerhub/chapcam-insightface:latest`
4. Sauvegarde

## Etape 5: Ajouter les Variables d'Environnement sur Vercel

Sur Vercel, ajoute ces variables:
- `RUNPOD_API_KEY`: Ta cle API RunPod
- `RUNPOD_ENDPOINT_ID`: L'ID de ton endpoint (visible dans l'URL: https://api.runpod.ai/v2/YOUR_ENDPOINT_ID)

## Test

```bash
curl -X POST "https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "source_image": "BASE64_SOURCE_FACE",
      "target_image": "BASE64_TARGET_FRAME",
      "enhance_face": true
    }
  }'
```

## Couts Estimes

- GPU RTX 3090: ~$0.30/heure
- GPU RTX 4090: ~$0.50/heure
- Avec scale-to-zero, tu ne paies que quand quelqu'un utilise le swap
- Temps moyen par frame: ~100-200ms
- Cout par minute de swap: ~$0.01-0.02

## Support

Si tu as des questions, contacte le support RunPod ou consulte leur documentation: https://docs.runpod.io/
