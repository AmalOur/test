FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py ./
COPY ./wait-for-keycloak.sh /usr/local/bin/wait-for-keycloak.sh
RUN chmod +x /usr/local/bin/wait-for-keycloak.sh

EXPOSE 5000

ENTRYPOINT ["/usr/local/bin/wait-for-keycloak.sh"]

CMD ["python", "app.py"]