@echo off
echo ========================================
echo Setting up HTTPS for Accident Detection
echo ========================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo This script requires administrator privileges.
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo Creating SSL certificate...
cd C:\xampp\apache

REM Create certificate
bin\openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout conf\ssl.key\server.key -out conf\ssl.crt\server.crt -config conf\openssl.cnf -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

echo.
echo Certificate created successfully!
echo.
echo Now enabling SSL in Apache...

REM Enable SSL module
echo LoadModule ssl_module modules/mod_ssl.so >> conf\httpd.conf

REM Include SSL config
echo Include conf/extra/httpd-ssl.conf >> conf\httpd.conf

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Restart Apache in XAMPP Control Panel
echo 2. Access your app at: https://172.3.4.18/VAD/
echo 3. Accept the security warning (self-signed certificate)
echo.
pause
