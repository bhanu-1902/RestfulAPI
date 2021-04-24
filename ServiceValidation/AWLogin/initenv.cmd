IF EXIST D:\GitLab (cd /D D:\GitLab ) ELSE ( mkdir D:\GitLab && cd /D D:\GitLab )

IF EXIST awclogincheck ( CD awclogincheck && git pull) ELSE ( CALL git clone https://gitlab.industrysoftware.automation.siemens.com/Environments/awclogincheck.git && cd awclogincheck )

IF NOT EXIST package-lock.json CALL npm install && npm ci && COPY /Y package-lock.json ..\package-lock.json

:: If we don't have a cache of the package-lock.json in WORKSPACE, run 'npm ci' & cache it
IF NOT EXIST ..\package-lock.json CALL npm ci && COPY /Y package-lock.json ..\package-lock.json

:: If the package-lock.json differs from cache, run 'npm ci'
IF EXIST ..\package-lock.json FC /L package-lock.json ..\package-lock.json > nul
IF errorlevel 1 CALL npm ci

node awclogincheck.js --url=http://10.134.65.18:3000 --username=ed --password=ed --extrainfo