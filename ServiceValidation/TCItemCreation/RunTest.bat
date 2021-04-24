
cd /d %CD%
Set JAVA_HOME=C:\apps\Java\jdk8x64
Set PATH=%JAVA_HOME%\bin;%PATH%
set CLASSPATH=.
set CLASSPATH=%CLASSPATH%;%CD%\libs\*;%CD%\libs\SOAlibs\*;%CD%\bin\;
java cucumber.api.cli.Main --glue com.siemens.soa.util.tests feature/itemcreate.feature