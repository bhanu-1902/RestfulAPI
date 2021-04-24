# AWCLoginCheck - Node.js Login/Logout AWC Login Check utility.

**AWC Login Check Utility**

**Setup Instructions:**

* Install Node.js
* Execute initenv.cmd


**Use case examples:**

**Successful Test – getting a response from AWC URL:**
```
D:\GitLab\cisa\cisa>node awclogincheck.js --url=http://10.134.65.18:3000 --username=jhaji --password=pw_jhaji
info: http://10.134.65.18:3000/health/checkhealth Gateway Web service response is successfull.
info: http://10.134.65.18:3000/tc/controller/test Presentation tier response is successfull.
info: http://10.134.65.18:3000 HTTP response is successfull.
info: http://10.134.65.18:3000 AWC Login/Logout is successfull.
```


**Successful Test – getting a response from AWC URL with Extra Info:**
```
D:\GitLab\cisa\cisa>node awclogincheck.js --url=http://10.134.65.18:3000 --username=jhaji --password=pw_jhaji --extrainfo
info: http://10.134.65.18:3000/health/checkhealth Gateway Web service response is successfull.
info: http://10.134.65.18:3000/tc/controller/test Presentation tier response is successfull.
info: http://10.134.65.18:3000 HTTP response is successfull.
info: AWServerVersion: aw5.0.0.12x.2020050403;Monday May 04, 2020;11:03:09.825 India Standard Time, GMT+0530
info: TCServerVersion: P12000.4.0.20200430.00
info: Extra Info: {
info:   "Database Banner": "SQL Server 13.0.4001.0 SP1 Developer Edition (64-bit)",
info:   "Database Engine": "SQL Server",
info:   "Database Version": "2016",
info:   "DatabaseName": "DATABASE=tc;SERVER=vc6s004,1433",
info:   "DeploymentType": "",
info:   "OnCloud": "false",
info:   "Site": "7b9f38861d8ac1f950a532aacf210d86",
info:   "SiteID": "IMC--1823123568 (-1823123568)",
info:   "TC_SAN_Env_Type": "0",
info:   "TC_SAN_isSaaS": "false",
info:   "UserLicenseLevel": "Author",
info:   "Vendor": "For Internal Siemens PLM Use Only",
info:   "isManagedSvs": "false",
info:   "tcserverBuildVersion": "P12000.4.0.20200430.00",
info:   "tcserverPlatformArchitecture": "x64 Level 6 Revision 05504",
info:   "tcserverPlatformLocale": "en_US",
info:   "tcserverPlatformName": "Windows NT",
info:   "tcserverPlatformTimezone": "India Standard Time",
info:   "tcserverPlatformVersion": "10.0 Windows Server 2016 Standard (Build 14393) ",
info:   "tcserverVersion": "12.4"
info: }
info: http://10.134.65.18:3000 AWC Login/Logout is successfull.
```


**Failure Test – supplied wrong username/password to emulate failure:**
```
D:\GitLab\cisa\cisa>node awclogincheck.js --url=http://10.134.65.18:3000 --username=NONEXITENT --password=WRONGPASS --extrainfo
info: http://10.134.65.18:3000/health/checkhealth Gateway Web service response is successfull.
info: http://10.134.65.18:3000 HTTP response is successfull.
info: http://10.134.65.18:3000/tc/controller/test Presentation tier response is successfull.
info: The login attempt failed: either the user ID or the password is invalid.
info: http://10.134.65.18:3000 AWC Login/Logout failed.
```


**Failure Test – supplied wrong IP address to emulate failure:**
```
D:\GitLab\cisa\cisa>node awclogincheck.js --url=http://10.134.65.218:3000 --username=jhaji --password=pw_jhaji --extrainfo
error: http://10.134.65.218:3000 down
error: http://10.134.65.218:3000/tc/controller/test FAILED [Error: connect ETIMEDOUT 10.134.65.218:3000]
error: http://10.134.65.218:3000/health/checkhealth FAILED [Error: connect ETIMEDOUT 10.134.65.218:3000]
error: http://10.134.65.218:3000/ FAILED [Error: connect ETIMEDOUT 10.134.65.218:3000]
error: http://10.134.65.218:3000 FAILED login test [Error: connect ETIMEDOUT 10.134.65.218:3000]
```

