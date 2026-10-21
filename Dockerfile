# Site estático da Cerâmicas Alencar servido por nginx. Contexto de build: a própria pasta site/.
FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html/
