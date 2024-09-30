@echo off
setlocal
SET HAYSTACK_PATH=%~dp0..\..\..\..
FOR /F "tokens=* USEBACKQ" %%g IN (`where /r "%HAYSTACK_PATH%\.build\node" node.exe`) do (SET "NODE=%%g")
call "%NODE%" "%HAYSTACK_PATH%\out\server-cli.js" "Code Server - Dev" "" "" "code.cmd" "--openExternal" %*
endlocal
