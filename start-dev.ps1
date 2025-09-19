# 开发环境启动脚本
# 同时启动后端服务器和前端Vite开发服务器

Write-Host "正在启动开发环境..." -ForegroundColor Green
Write-Host "后端服务器 (MCP): http://localhost:3667" -ForegroundColor Yellow
Write-Host "后端API服务器: http://localhost:3668" -ForegroundColor Yellow
Write-Host "前端开发服务器将在 http://localhost:5173 启动" -ForegroundColor Yellow
Write-Host ""

# 设置项目根目录
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $rootDir

# 启动后端服务器（在后台）
Write-Host "启动后端服务器..." -ForegroundColor Cyan
$serverJob = Start-Job -ScriptBlock {
    param($rootPath)
    Set-Location $rootPath
    node server.js --port 3667 --api-port 3668
} -ArgumentList $rootDir

# 等待一下确保服务器启动
Start-Sleep -Seconds 2

# 启动前端Vite开发服务器
Write-Host "启动前端开发服务器..." -ForegroundColor Cyan
Set-Location "$rootDir\web-ui"

try {
    # 在前台运行Vite，这样可以看到实时输出
    npm run dev
}
finally {
    # 当Vite停止时，也停止后端服务器
    Write-Host ""
    Write-Host "正在停止后端服务器..." -ForegroundColor Red
    Stop-Job $serverJob -Force
    Remove-Job $serverJob -Force
    Write-Host "开发环境已停止" -ForegroundColor Red
}