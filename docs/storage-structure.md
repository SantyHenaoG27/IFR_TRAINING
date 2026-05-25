# Estructura de almacenamiento

Esta estructura prepara la app para guardar archivos y metadatos sin definir todavia una tecnologia especifica.

## Carpetas principales

- `src/`: interfaz web y codigo del cliente.
- `server/`: logica futura del backend, rutas, controladores, servicios y modelos.
- `storage/uploads/pdfs/`: archivos PDF cargados por el usuario.
- `storage/uploads/documents/`: documentos generales.
- `storage/uploads/images/`: imagenes asociadas a documentos, aeropuertos o cartas.
- `storage/uploads/temp/`: archivos temporales antes de validarlos o procesarlos.
- `storage/processed/`: versiones procesadas, convertidas o normalizadas.
- `storage/metadata/`: indices o archivos JSON con informacion descriptiva.
- `database/migrations/`: cambios futuros del esquema de base de datos.
- `database/seeds/`: datos iniciales o de prueba.
- `config/`: configuracion de la aplicacion.

## Regla practica

Los archivos fisicos deben vivir en `storage/`. La base de datos debe guardar referencias, nombres, tipos, fechas, tamanos, propietarios y rutas relativas, no el archivo completo.
