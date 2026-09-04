@echo off
setlocal enabledelayedexpansion

set "PROJECT_DIR=%~dp0"
set "PG_BIN=C:\Users\u50222\pgsql-portable\pgsql\bin"
set "PG_DATA=C:\Users\u50222\pgsql-portable\data"
set "MVN=C:\Users\u50222\.m2\wrapper\dists\apache-maven-3.9.12-bin\5nmfsn99br87k5d4ajlekdq10k\apache-maven-3.9.12\bin\mvn.cmd"

echo === Postgres kontrol ediliyor ===
"%PG_BIN%\pg_isready.exe" -h localhost -p 5432 >nul 2>&1
if errorlevel 1 (
    echo Postgres baslatiliyor...
    "%PG_BIN%\pg_ctl.exe" -D "%PG_DATA%" -l "%PROJECT_DIR%pg.log" start
) else (
    echo Postgres zaten calisiyor.
)

echo === Backend kontrol ediliyor ===
curl -s -o nul -w "%%{http_code}" -X POST http://localhost:8080/auth/login -H "Content-Type: application/json" -d "{}" > "%TEMP%\todolist_backend_check.txt" 2>nul
set /p BACKEND_CODE=<"%TEMP%\todolist_backend_check.txt"
if "%BACKEND_CODE%"=="400" (
    echo Backend zaten calisiyor.
) else (
    echo Backend baslatiliyor ^(yeni pencerede^)...
    start "ToDoList Backend" cmd /k ""%MVN%" -o -f "%PROJECT_DIR%pom.xml" spring-boot:run"
)

echo === Frontend kontrol ediliyor ===
curl -s -o nul -w "%%{http_code}" http://localhost:63342/login.html > "%TEMP%\todolist_frontend_check.txt" 2>nul
set /p FRONTEND_CODE=<"%TEMP%\todolist_frontend_check.txt"
if "%FRONTEND_CODE%"=="200" (
    echo Frontend zaten calisiyor.
) else (
    echo Frontend baslatiliyor ^(yeni pencerede^)...
    start "ToDoList Frontend" cmd /k "node "%PROJECT_DIR%serve-frontend.js""
)

echo === Backend'in tam hazir olmasi bekleniyor ===
set /a COUNT=0
:WAITLOOP
curl -s -o nul -w "%%{http_code}" -X POST http://localhost:8080/auth/login -H "Content-Type: application/json" -d "{}" > "%TEMP%\todolist_healthcheck.txt" 2>nul
set /p HTTP_CODE=<"%TEMP%\todolist_healthcheck.txt"
if "%HTTP_CODE%"=="400" goto READY
set /a COUNT+=1
if !COUNT! GEQ 40 goto READY
ping -n 2 127.0.0.1 >nul
goto WAITLOOP

:READY
echo === Tarayici aciliyor ===
start http://localhost:63342/login.html

echo.
echo Hazir. Bu pencereyi kapatabilirsin, backend ve frontend kendi ayri pencerelerinde calismaya devam ediyor.
pause

endlocal
