AW Login and Data Import Test

GitLab Repo:      https://gitlab.industrysoftware.automation.siemens.com/Environments/ci
Main Code:         https://gitlab.industrysoftware.automation.siemens.com/Environments/ci/-/blob/Env_CI/vmtest/testVM.js


Usage:

node vmtest\testVM.js <AW URI> <username> <password> <SearchKeyword>

Example:

cd /D D:\GitLab\ci
node vmtest\testVM.js http://10.134.153.39:3000 ed ed HDD

info: Reading D:/GitLab/ci/previousRun.json...
info: {
info:   "emailSent": 0,
info:   "failing": {}
info: }
info: http://10.134.153.39:3000: Started...
info: Executing node.exe D:\GitLab\ci\vmtest/nodejs/testSignIn.js ed ed HDD
error:  NG Module not registered - $interpolate
info:  Start: 2020-09-29 14:30 EDT
info:  Login In: 9.475 secs
info:  getTCSessionInfo success
info:  getProperties success
info:  getProperties success
info:  Item created
info:  Uploading D:\GitLab\ci\vmtest\test.jpg to http://10.134.153.39:3000 ...
info:  Old Ticket: ba502c2e0c3dac9e63fbe6b837e5796aabf750c7861a0ecb445f5be7932ccf8dv1002T0000000000000c835f7342c99420a70b2020%2f09%2f30+04%3a00%3a00-1809799413+++++++++++++++++++++ed+++++++++++++++++++++++++++++
+00f65f5bd18e9420a70b++++++++++++%5ced_5f5c2da2%5ctest_jp_jpe_jfm1atg8r2639.jpg
info:  Cookie: JSESSIONID=F-zbIVnlDTLawp82L5JNUsz4ZIj25iMPtmt5ODc4dM6APCJs39ml!2119289494; path=/; HttpOnly
info:  FSC: http://10.134.153.39:4544
info:  getProperties success
info:  -----------------------------------------------------------------------------------------------------------
info:  HDD - keyword search performed - Total Objects Found: 61
info:  -----------------------------------------------------------------------------------------------------------
info:  signOut success
info:  Run Time: 22.561 secs
info: http://10.134.153.39:3000: up
info: http://10.134.153.39:3000: Completed testing
info: Wrote D:/GitLab/ci/previousRun.json after <0 s
