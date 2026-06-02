CREATE DATABASE IF NOT EXISTS anticithera;
USE anticithera;

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sesiones_actividad (
    id SERIAL PRIMARY KEY,
    usuario_id BIGINT UNSIGNED,
    token_sesion VARCHAR(255) UNIQUE NOT NULL,
    inicio_conexion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fin_conexion TIMESTAMP,
    duracion_segundos INT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exportaciones_zip (
    id SERIAL PRIMARY KEY,
    usuario_id BIGINT UNSIGNED,
    nombre_archivo VARCHAR(255) NOT NULL,
    ruta_archivo VARCHAR(255) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
