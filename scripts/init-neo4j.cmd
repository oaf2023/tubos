@echo off
REM Initializes Neo4j schema and syncs all cylinders to Neo4j
REM Requires Neo4j running on bolt://localhost:7687
REM Usage: scripts\init-neo4j.cmd

echo "=== GasTrack AR - Neo4j Initialization ==="
echo.

REM Set Neo4j connection parameters
set NEO4J_URI=bolt://localhost:7687
set NEO4J_USER=neo4j
set NEO4J_PASSWORD=gastrack123
set NEO4J_ENABLED=true

echo "Starting Next.js to trigger schema initialization..."
echo "Make sure Neo4j is running (docker compose up -d)"
echo.

REM Run dev server which will call initNeo4jSchema on startup
npm run dev
