# CTRL-View
## Objective:
Design and implement a lightweight windows application written in the Electron
framework, capable of uploading, syncing and displaying image data from the server. This
project is designed to evaluate your ability to design a full-stack framework under Electron,
set up a robust, maintainable data workflow, interface with a mock server environment
(Docker, PostgreSQL, API), and integrate third-party libraries(WASM, N-API).

## Setup
This application is a desktop app built with **Electron** and **React**.  
It syncs images between a **local mounted storage directory** and a **PostgreSQL database** running inside Docker.

This README explains how to:

1. **Launch the server-side environment** (Postgres in Docker)
2. **Start the Electron/React application from source**

### 1. Requirements
Install before running project

1. Node.js
2. npm
3. Docker Desktop
4. Git

### 2. Docker

docker-compose.yaml
```services:
  postgres:
    image: postgres:17
    platform: linux/arm64
    container_name: voyis_postgres
    restart: always
    environment:
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypass
      POSTGRES_DB: ctrl-view
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - /Users/USER/PROJECTFOLDER/postgres/mounted-storage:/mounted-storage:cached

volumes:
  postgres-data:
```
Place docker-compose in **/Users/USER/PROJECTFOLDER/postgres/** 
Replace USER/PROJECTFOLDER with your folder

Run
`docker-compose up -d`

Verify with `docker ps`

### 3. Electron React App

Navigate to electron-app folder
`cd .\electron-app\`

Install dependencies
`npm install`

Start react and electron app concurrently
`npm run dev`

## App Controls
- Click on image to select and view meta data
- Double click on image for full screen
- CTRL + Click to select area for cropping
- ESC to exit full screen
- Scroll to zoom

### Notes

#### Filtering

Filtering is done server side which allows for future large-scale data.

#### Syncing

A *Server Always Wins* approach is used:

- If a file exists on the server and differs locally, the server version overwrites the local copy.
- Pros:
  - Simpler to implement and maintain
  - Users don't need to resolve conflicts
- Cons:
  - Local changes not yet synced to the server will be lost

[Watch Demo](./demo/CTRL-View%20Demo.mp4)
