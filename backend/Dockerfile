FROM node:24.11.1

WORKDIR /app

COPY package*.json ./

# Update OS packages and install dependencies
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/* && \
    npm install && npm install cors

COPY . .

RUN groupadd -r appuser && useradd -r -g appuser appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 3000

CMD ["npm", "run", "dev"]