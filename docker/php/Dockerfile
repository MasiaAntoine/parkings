FROM php:8.3-fpm-alpine

RUN apk add --no-cache icu-libs icu-dev \
    && docker-php-ext-install pdo pdo_mysql intl \
    && apk del icu-dev

WORKDIR /var/www/html
