# Anticithera Backend - Jakarta EE

Este es el backend para el proyecto Anticithera, desarrollado con Jakarta EE 10, JPA y REST.

## Requisitos
- Java 11 o superior.
- Servidor de aplicaciones compatible con Jakarta EE 10 (ej. WildFly 27+, Payara 6+, GlassFish 7+).
- MariaDB o MySQL.
- Maven.

## Configuración de la Base de Datos
1. Ejecuta el script `setup.sql` en tu servidor MariaDB.
2. Configura un DataSource en tu servidor de aplicaciones con el nombre JNDI `java:jboss/datasources/AnticitheraDS` (o ajusta `persistence.xml` según tu servidor).

## Despliegue
1. Compila el proyecto con Maven:
   ```bash
   mvn clean package
   ```
2. Despliega el archivo `target/anticithera-backend.war` en tu servidor de aplicaciones.

## Integración con el Frontend
El frontend está configurado para buscar el backend en `http://localhost:8081/anticithera/api`. Si tu servidor corre en otro puerto o contexto, ajusta la variable `API_BASE_URL` en `scripts.js`.

## Funcionalidades Implementadas
- **Autenticación**: Registro e inicio de sesión con hashing de contraseñas (BCrypt).
- **Tracking de Actividad**: Registro de sesiones en la tabla `sesiones_actividad`.
- **Gestión de Archivos**: Los ZIPs exportados se suben automáticamente al servidor y se ligan al usuario.
- **Restauración**: Permite listar y descargar respaldos previos directamente desde la interfaz.
