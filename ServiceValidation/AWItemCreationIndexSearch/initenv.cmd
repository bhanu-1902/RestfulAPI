@ECHO ON

:: Setup a temp directory unique for the build job
:: Note, wrapping job will delete or move this directory
IF EXIST %WORKSPACE% SET TEMP=%WORKSPACE%\temp_%BUILD_NUMBER%
SET TMP=%TEMP%
IF NOT EXIST %TEMP% MKDIR %TEMP%

:: Ideally, we should assume this is install on system but using from TOOLBOX
SET PATH=%TC_TOOLBOX%\wntx64\nodejs\12.14.0;%PATH%
SET PATH=%PATH%;%~dps0

:: If we don't have a cache of the package-lock.json in WORKSPACE, run 'npm ci' & cache it
IF NOT EXIST ..\package-lock.json CALL npm ci && COPY package-lock.json ..\package-lock.json

:: If the package-lock.json differs from cache, run 'npm ci'
IF EXIST ..\package-lock.json FC /L package-lock.json ..\package-lock.json > nul
IF errorlevel 1 CALL npm ci

@ECHO ON
