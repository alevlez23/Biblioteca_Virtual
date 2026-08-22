FROM php:8.3-apache

RUN apt-get update && apt-get install -y \
    libicu-dev \
    libpq-dev \
    libonig-dev \
    libzip-dev \
    unzip \
    git \
    && docker-php-ext-install \
        intl \
        mbstring \
        pdo_pgsql \
        pgsql \
        zip \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

RUN composer install \
    --no-dev \
    --prefer-dist \
    --optimize-autoloader \
    --no-interaction

RUN chown -R www-data:www-data /var/www/html/writable

RUN sed -i 's/Listen 80/Listen 10000/' /etc/apache2/ports.conf

RUN printf '%s\n' \
    '<VirtualHost *:10000>' \
    '    DocumentRoot /var/www/html/public' \
    '    <Directory /var/www/html/public>' \
    '        AllowOverride All' \
    '        Require all granted' \
    '    </Directory>' \
    '</VirtualHost>' \
    > /etc/apache2/sites-available/000-default.conf

EXPOSE 10000

CMD ["sh", "-c", "if [ -f /etc/secrets/.env ]; then cp /etc/secrets/.env /var/www/html/.env; fi; php spark migrate --all && php spark db:seed AdministradorSeeder && apache2-foreground"]
