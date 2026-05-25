# RunPod Serverless Dockerfile for ChapCam Face Swap
# Base image with CUDA support for GPU inference
FROM runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    wget \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies for face swap
RUN pip install --no-cache-dir \
    runpod \
    opencv-python \
    numpy \
    pillow \
    torch \
    torchvision \
    insightface \
    onnxruntime-gpu \
    gfpgan \
    requests

# Create model directory
RUN mkdir -p /app/models

# Download face swap models (inswapper)
RUN wget -O /app/models/inswapper_128.onnx \
    https://huggingface.co/deepinsight/inswapper/resolve/main/inswapper_128.onnx

# Copy handler script
COPY runpod_handler.py /app/handler.py

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV NVIDIA_VISIBLE_DEVICES=all

# Run the handler
CMD ["python", "-u", "/app/handler.py"]
