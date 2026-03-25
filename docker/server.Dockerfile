FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=4000

COPY server/requirements.txt ./server/requirements.txt

RUN pip install --no-cache-dir -r server/requirements.txt

COPY server ./server

EXPOSE 4000

CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "4000"]
