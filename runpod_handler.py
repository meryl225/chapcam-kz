"""
RunPod Serverless Handler for ChapCam Face Swap
Pay-per-use: GPU only active when processing requests
"""

import runpod
import base64
import cv2
import numpy as np
from PIL import Image
import io
import os

# Global model (loaded once, reused for all requests)
face_swapper = None
face_analyser = None

def load_models():
    """Load face swap models (called once at cold start)"""
    global face_swapper, face_analyser
    
    if face_swapper is None:
        import insightface
        from insightface.app import FaceAnalysis
        
        # Initialize face analyser
        face_analyser = FaceAnalysis(name='buffalo_l')
        face_analyser.prepare(ctx_id=0, det_size=(640, 640))
        
        # Load face swapper model
        face_swapper = insightface.model_zoo.get_model(
            '/app/models/inswapper_128.onnx',
            providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
        )
        
        print("[ChapCam] Models loaded successfully")
    
    return face_swapper, face_analyser


def base64_to_image(base64_string):
    """Convert base64 string to numpy array"""
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    
    image_data = base64.b64decode(base64_string)
    image = Image.open(io.BytesIO(image_data))
    return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)


def image_to_base64(image):
    """Convert numpy array to base64 string"""
    _, buffer = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, 90])
    return base64.b64encode(buffer).decode('utf-8')


def swap_face(source_image, target_image):
    """Perform face swap"""
    swapper, analyser = load_models()
    
    # Detect faces
    source_faces = analyser.get(source_image)
    target_faces = analyser.get(target_image)
    
    if len(source_faces) == 0:
        raise ValueError("No face detected in source image")
    if len(target_faces) == 0:
        raise ValueError("No face detected in target image")
    
    # Get the main face from each image
    source_face = source_faces[0]
    target_face = target_faces[0]
    
    # Perform swap
    result = swapper.get(target_image, target_face, source_face, paste_back=True)
    
    return result


def handler(event):
    """
    RunPod Serverless Handler
    
    Input:
    {
        "input": {
            "source_image": "base64_encoded_image",  # Avatar face
            "target_image": "base64_encoded_image",  # User's camera frame
            "enhance": true/false  # Optional: enhance result with GFPGAN
        }
    }
    
    Output:
    {
        "output": {
            "swapped_image": "base64_encoded_result",
            "processing_time_ms": 123
        }
    }
    """
    import time
    start_time = time.time()
    
    try:
        input_data = event.get('input', {})
        
        # Get images
        source_b64 = input_data.get('source_image')
        target_b64 = input_data.get('target_image')
        enhance = input_data.get('enhance', False)
        
        if not source_b64 or not target_b64:
            return {"error": "Missing source_image or target_image"}
        
        # Convert from base64
        source_image = base64_to_image(source_b64)
        target_image = base64_to_image(target_b64)
        
        # Perform face swap
        result = swap_face(source_image, target_image)
        
        # Optional: enhance with GFPGAN
        if enhance:
            try:
                from gfpgan import GFPGANer
                enhancer = GFPGANer(
                    model_path='/app/models/GFPGANv1.4.pth',
                    upscale=1,
                    arch='clean',
                    channel_multiplier=2
                )
                _, _, result = enhancer.enhance(result, paste_back=True)
            except Exception as e:
                print(f"[ChapCam] Enhancement skipped: {e}")
        
        # Convert result to base64
        result_b64 = image_to_base64(result)
        
        processing_time = int((time.time() - start_time) * 1000)
        
        return {
            "output": {
                "swapped_image": result_b64,
                "processing_time_ms": processing_time
            }
        }
        
    except Exception as e:
        return {"error": str(e)}


# Start the serverless handler
runpod.serverless.start({"handler": handler})
