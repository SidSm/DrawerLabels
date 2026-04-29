FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app/backend

RUN pip install --no-cache-dir \
    'fastapi>=0.115' \
    'uvicorn[standard]>=0.30' \
    'sqlmodel>=0.0.21' \
    'qrcode[pil]>=7.4' \
    'python-multipart>=0.0.9' \
    'pyyaml>=6.0' \
    'jinja2>=3.1'

COPY app ./app
COPY scripts ./scripts
COPY pics ./pics
COPY config ./config

RUN mkdir -p data uploads

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
