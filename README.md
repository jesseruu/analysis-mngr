# analysis-mngr

Administrador de análisis para repositorios de GitHub y archivos ZIP almacenados en Amazon S3. El servicio extrae los metadatos y la estructura del repositorio, detecta lenguajes y frameworks, recopila archivos fuente y envía el prompt de análisis a Anthropic.

## Requisitos

- Node.js 20 o superior
- npm
- Una clave de API de Anthropic
- Un token personal de GitHub para repositorios privados o para aumentar los límites de la API de GitHub
- Credenciales de AWS con permiso de lectura sobre el bucket S3 configurado para analizar archivos

AWS se utiliza para almacenar y recuperar archivos ZIP desde S3. El análisis de código se realiza directamente mediante la API de Anthropic, no mediante Amazon Bedrock.

## Instalación

```bash
npm install
```

Crea un archivo `.env` en la raíz del proyecto. Nunca subas este archivo al repositorio ni compartas sus credenciales.

```env
API_PATH=/api/v1
API_PORT=3000

# GitHub
GITHUB_TOKEN=your-github-token
GITHUB_API_PATH=https://api.github.com/repos

# Anthropic
ANTHROPIC_API_KEY=your-anthropic-api-key
ANTHROPIC_MODEL=claude-haiku-4-5

# S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
BUCKET_NAME=your-analysis-bucket
```

El SDK de AWS también puede utilizar un rol de IAM, un perfil de AWS o las credenciales del contenedor en lugar de `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY`.

## Ejecución local

```bash
npm start
```

La API estará disponible en `http://localhost:3000` cuando `API_PORT=3000`.

El script de inicio habilita los logs de depuración:

```text
api:*
```

Para ejecutar únicamente namespaces específicos:

```bash
DEBUG=api:AnalysisController,api:GitHubService npm start
```

Cada solicitud debe incluir un valor `X-RqUID`. Este identificador se propaga por el controlador, las estrategias, S3, la extracción del repositorio y los servicios de Anthropic para correlacionar los logs.

## Analizar un repositorio de GitHub

Envía la URL del repositorio de GitHub en `requestUrl` y utiliza `X-Type: url`:

```bash
curl -X POST http://localhost:3000/api/v1/analysis \
	-H 'Content-Type: application/json' \
	-H 'X-RqUID: 123e4567-e89b-12d3-a456-426614174000' \
	-H 'X-Type: url' \
	-d '{"requestUrl":"https://github.com/octocat/Hello-World"}'
```

La estrategia de GitHub realiza los siguientes pasos:

1. Valida la URL del repositorio.
2. Obtiene los metadatos del repositorio.
3. Obtiene las estadísticas de lenguajes de GitHub.
4. Obtiene y analiza el árbol del repositorio.
5. Detecta directorios raíz, entradas de `src`, frameworks y archivos fuente.
6. Envía a Anthropic una selección limitada del código fuente.

## Analizar un ZIP de S3

Primero sube un ZIP al bucket S3 configurado. El cuerpo de la solicitud debe contener la clave del objeto S3, no el contenido del ZIP:

```bash
curl -X POST http://localhost:3000/api/v1/analysis \
	-H 'Content-Type: application/json' \
	-H 'X-RqUID: 123e4567-e89b-12d3-a456-426614174001' \
	-H 'X-Type: file' \
	-d '{"requestUrl":"uploads/example-repository.zip"}'
```

La estrategia de archivos realiza los siguientes pasos:

1. Lee el objeto desde S3 utilizando `requestUrl` como clave del objeto.
2. Asume que el objeto es un archivo ZIP.
3. Lo extrae en un directorio temporal.
4. Elimina un único directorio envolvente, como `pwa-demo-main/`, cuando está presente.
5. Analiza el repositorio extraído utilizando la misma lógica de extracción local.
6. Envía los archivos fuente extraídos a Anthropic.
7. Elimina el directorio temporal tanto en casos exitosos como en casos de error.

Las rutas del ZIP se validan para evitar ataques de path traversal. Los archivos binarios, las dependencias, los archivos generados y los archivos lock se excluyen de la extracción del código fuente.

## Estructura de la respuesta

La respuesta incluye información del repositorio, porcentajes de lenguajes, estructura y el análisis de Anthropic convertido a JSON:

```json
{
    "name": "example-repository",
    "isRemote": false,
    "principalLanguage": "TypeScript",
    "principalLanguagePercentage": 70.45,
    "languages": {
        "TypeScript": 70.45,
        "SQL": 29.55
    },
    "structure": {
        "directories": ["src"],
        "sourcePaths": ["src/controllers", "src/services"],
        "files": ["package.json", "src/index.ts"],
        "frameworks": ["Angular"]
    },
    "analysis": {
        "summary": "...",
        "detectedArchitecture": "Arquitectura en capas",
        "risks": [],
        "recommendations": [],
        "detectedPatterns": []
    }
}
```

Cuando no se detecta ninguna arquitectura, `detectedArchitecture` devuelve:

```text
No architecture detected
```

## Comprobaciones de desarrollo

Verificar los tipos del proyecto:

```bash
npx tsc --noEmit
```

Comprobar el formato:

```bash
npm run prettier
```

El proyecto utiliza el patrón Strategy para seleccionar entre el flujo de análisis de GitHub (`X-Type: url`) y el flujo de análisis de ZIP en S3 (`X-Type: file`). Ambos flujos comparten los servicios de extracción de estructura de repositorios y análisis con Anthropic.

## Notas importantes

- El endpoint de carga de adjuntos a S3 está presente en el contrato de la API, pero la implementación del controlador aún no está completa. Por ahora, sube los archivos ZIP a S3 mediante tu proceso de carga existente.
- El objeto de S3 debe ser un archivo ZIP.
- El servidor debe tener acceso de red a GitHub, Amazon S3 y Anthropic.
- Mantén las credenciales en variables de entorno y rota cualquier credencial que haya sido expuesta.
