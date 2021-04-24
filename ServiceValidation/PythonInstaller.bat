set PYTHONBIN=C:\apps\Python
set PYTHONINST=Y:\system\python\python-2.7.14.amd64.msi
set JobType=%JobType%

set NODEPATH=C:\apps\nodejs
set NODEINST=C:\Users\yytcadm\Desktop\ServiceValidation\AWLogin\node-v12.13.0-x64.msi
if exist %PYTHONBIN% (
    echo.
    echo Uninstall Python if it exists
    msiexec /qn /x %PYTHONINST%
    ping 127.0.0.1 -n 60 > nul
)
echo .
echo Install Python
msiexec /qn /i %PYTHONINST% TARGETDIR=%PYTHONBIN% ALLUSERS=1 ADDLOCAL=Extensions,TclTk,Tools

echo.
%PYTHONBIN%\python.exe --version

mkdir C:\apps\Python\Lib\site-packages\psutil
xcopy /y /f C:\Users\yytcadm\Desktop\ServiceValidation\psutil C:\apps\Python\Lib\site-packages\psutil
mkdir C:\apps\Python\Lib\site-packages\psutil-5.7.2.dist-info
xcopy /y /f C:\Users\yytcadm\Desktop\ServiceValidation\psutil-5.7.2.dist-info C:\apps\Python\Lib\site-packages\psutil-5.7.2.dist-info

mkdir C:\apps\Python\Lib\site-packages\requests
xcopy /y /f C:\Users\yytcadm\Desktop\ServiceValidation\requests C:\apps\Python\Lib\site-packages\requests
mkdir C:\apps\Python\Lib\site-packages\requests-2.2.1.dist-info
xcopy /y /f C:\Users\yytcadm\Desktop\ServiceValidation\requests-2.2.1.dist-info C:\apps\Python\Lib\site-packages\requests-2.2.1.dist-info
	
C:\apps\7-Zip\7z x "C:\Users\yytcadm\Desktop\ServiceValidation\TCItemCreation\libs.zip" -o"C:\Users\yytcadm\Desktop\ServiceValidation\TCItemCreation\"
C:\apps\7-Zip\7z x "C:\Users\yytcadm\Desktop\ServiceValidation\TCItemCreation\temp.zip" -o"C:\Users\yytcadm\Desktop\ServiceValidation\TCItemCreation\"

set BooleanResult=false
if "%JobType%"=="Nightly" set BooleanResult=true
if "%JobType%"=="IntegrationPipeline" set BooleanResult=true

if "%BooleanResult%"=="true" (
    echo Install NodeJS if Nightly or AW Server Pipeline job is being executed
    msiexec /i %NODEINST% INSTALLDIR=%NODEPATH% /quiet
    timeout /t 50 > NUL
    C:\apps\7-Zip\7z x "C:\Users\yytcadm\Desktop\ServiceValidation\AWLogin\node_modules.zip" -o"C:\Users\yytcadm\Desktop\ServiceValidation\AWLogin\"
    C:\apps\7-Zip\7z x "C:\Users\yytcadm\Desktop\ServiceValidation\AWItemCreationIndexSearch\node_modules.zip" -o"C:\Users\yytcadm\Desktop\ServiceValidation\AWItemCreationIndexSearch\"
)   