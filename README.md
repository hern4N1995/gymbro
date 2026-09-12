# GymBro

GymBro es una app de entrenamiento pensada para planificar rutinas, registrar series, medir progreso y mantener una experiencia rápida y clara desde móvil o desktop.

Incluye:
- Rutinas por día de la semana
- Carga de ejercicios con sets, reps, RIR y descanso
- Historial de series y métricas de rendimiento
- Chat IA para apoyo en entrenamiento y nutrición
- Analytics básicos de volumen y progreso
- Sincronización con Supabase para persistencia en la nube

## Capturas de pantalla

> Reemplazá este bloque por capturas reales del proyecto cuando publiques el repo.

![GymBro preview](https://placehold.co/1200x675/111214/FFFFFF?text=GymBro+App+Preview)

## Stack tecnológico

- React + Vite
- Supabase
- Tailwind CSS
- DnD Kit
- Recharts
- Lucide React
- PWA support

## Requisitos previos

- Node.js 18 o superior
- npm
- Cuenta Supabase configurada

## Instalación

1. Cloná el repositorio:

```bash
git clone https://github.com/hern4N1995/gymbro.git
cd gymbro
```

2. Instalá dependencias:

```bash
npm install
```

3. Creá un archivo `.env.local` a partir del ejemplo:

```bash
cp .env.example .env.local
```

4. Completá tus variables de entorno:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

> Nunca subas claves secretas del backend al repositorio. La clave de servicio debe quedar solo en el entorno de Supabase.

## Ejecutar la app

Modo desarrollo:

```bash
npm start
```

O también:

```bash
npm run dev
```

Compilar para producción:

```bash
npm run build
```

Vista previa local:

```bash
npm run preview
```

## Cómo contribuir

Las contribuciones son bienvenidas.

1. Hacé fork del proyecto
2. Creá una rama para tu cambio: `git checkout -b feature/nombre-del-cambio`
3. Realizá tus cambios y probalos localmente
4. Hacé commit con un mensaje claro
5. Abrí un Pull Request describiendo detalladamente lo que mejoraste

## Código de conducta

Se espera un comportamiento respetuoso, profesional y colaborativo en todas las interacciones del proyecto.

## Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## Agradecimientos

- Comunidad de React y Vite
- Supabase por la infraestructura de datos y autenticación
- Lucide por los iconos
- Todas las personas que participan en la comunidad fitness y desarrollo open source

## Badges

[![GitHub stars](https://img.shields.io/github/stars/hern4N1995/gymbro?style=social)](https://github.com/hern4N1995/gymbro/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/hern4N1995/gymbro?style=social)](https://github.com/hern4N1995/gymbro/network/members)
[![GitHub issues](https://img.shields.io/github/issues/hern4N1995/gymbro)](https://github.com/hern4N1995/gymbro/issues)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Demo opcional

Si desplegas la app en Vercel, Netlify o similar, podés agregar aquí el enlace de la demo pública.

```md
https://gymbro-demo.vercel.app
```
