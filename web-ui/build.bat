@echo off
echo Building MCP Web UI for production...
call npm run build
echo.
echo Build completed! Files are in the 'dist' directory.
echo You can serve them using any static file server.
echo.
echo Example: npx serve dist
pause