# Technology Stack: Llaqta Monorepo

## Overview
Llaqta is a modern full-stack application structured as a monorepo, designed for high performance and seamless deployment to Netlify.

## Core Technologies
- **Runtime**: [Bun](https://bun.sh/) (Used for package management, script execution, and as a development runtime).
- **Frontend**: [Angular 21](https://angular.dev/) (Cutting-edge signals-based architecture).
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) (Using the latest CSS-first configuration).
- **Backend**: [Node.js](https://nodejs.org/) with [Express](https://expressjs.com/).
- **Deployment**: [Netlify](https://netlify.com/) (Single-site monorepo deployment with Netlify Functions).

## Monorepo Structure
- `/apps/web`: Angular application.
- `/apps/api`: Node.js Express backend (deployed as Netlify Functions).
- `package.json`: Root manager for workspaces.
- `netlify.toml`: Orchestrates builds and routing.

## AI Interaction Guidelines
- Always use `bun` commands instead of `npm` or `yarn`.
- When modifying the backend, ensure `serverless-http` compatibility.
- Ensure all new components follow Angular 21 best practices (Signals, standalone components).
