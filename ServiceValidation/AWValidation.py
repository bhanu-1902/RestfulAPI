import platform
import os
from JsonFileReader import *
from SetUpEnv import *
import subprocess
try:
    import urllib.request
    from urllib.parse import urlparse
    from urllib.parse import urljoin
except:
    import urllib2
    from urllib2 import urlopen

class AWValidation:
    def __init__(self):
        self.envJson = SetUpEnv()
        if platform.system().startswith("lin"):
            self.ServiceJson=json_file_reader.readJson('/home2/yytcadm/Desktop/ServiceValidation/ServiceList.json')
        elif platform.system().startswith("Win"):
            self.ServiceJson=json_file_reader.readJson('C:\\Users\\yytcadm\\Desktop\\ServiceValidation\\ServiceList.json')
    
    def validate_aw_login(self):

        if platform.system().startswith("Win"):
            proc = subprocess.Popen(["C:\\apps\\nodejs\\node", "C:\\Users\\yytcadm\\Desktop\\ServiceValidation\\AWLogin\\awclogincheck.js" ,"--url=http://localhost:3000","--username=ed" ,"--password=ed"], stdout=subprocess.PIPE, shell=True)
        else:
            proc = subprocess.Popen(["/apps/nodejs/node-v14.8.0-linux-x64/bin/node /home2/yytcadm/Desktop/ServiceValidation/AWLogin/awclogincheck.js --url=http://localhost:3000 --username=ed --password=ed"], stdout=subprocess.PIPE, shell=True)
        
        (out, err) = proc.communicate()
        # print(proc)
        # print(out)
        print (out)
        if("Error" in str(out) or "failed" in str(out)):
            # print("AW Login: Error in Login")
            SetUpEnv.ServicesList["AW Login"] = "Unsuccessful"
            SetUpEnv.overallStatus = "Failed"
        else:
            SetUpEnv.ServicesList["AW Login"] = "Successful"
            # print("AW Login: Successful")
    
    def validate_item_creation_and_item_search(self):
        if platform.system().startswith("Win"):
            proc = subprocess.Popen(["C:\\apps\\nodejs\\node", "C:\\Users\\yytcadm\\Desktop\\ServiceValidation\\AWItemCreationIndexSearch\\vmtest\\testVM.js" ,"http://localhost:3000", "infodba", "pw_infodba", "HDD"], stdout=subprocess.PIPE, shell=True)
        else:
            proc = subprocess.Popen(["/apps/nodejs/node-v14.8.0-linux-x64/bin/node /home2/yytcadm/Desktop/ServiceValidation/AWItemCreationIndexSearch/vmtest/testVMLnx.js http://localhost:3000 infodba pw_infodba HDD"], stdout=subprocess.PIPE, shell=True)
        (out, err) = proc.communicate()
        # if("getTCSessionInfo success" in str(out) and "Item created" in str(out) and "signOut success" in str(out) and "Completed testing" in str(out)):
        #     # print("Item Creation, * Search , DataUpload: Successful")
        #     SetUpEnv.ServicesList["AW Dataupload"] = "Successful"
        #     SetUpEnv.ServicesList["AW * Search"] = "Successful"
        #     SetUpEnv.ServicesList["AW Item Creation"] = "Successful"
        # else:
        #     # print("Item Creation, * Search , DataUpload: Unsuccessful")
        #     SetUpEnv.ServicesList["AW Dataupload"] = "Unsuccessful"
        #     SetUpEnv.ServicesList["AW * Search"] = "Unsuccessful"
        #     SetUpEnv.ServicesList["AW Item Creation"] = "Unsuccessful"
        print (str(out))
        if("Item created" in str(out) ):
            SetUpEnv.ServicesList["AW Item Creation"] = "Successful"
        else:
            SetUpEnv.ServicesList["AW Item Creation"] = "Unsuccessful"
            SetUpEnv.overallStatus = "Failed"
        
        if("search performed" in str(out) ):
            SetUpEnv.ServicesList["AW Search"] = "Successful"
        else:
            SetUpEnv.ServicesList["AW Search"] = "Unsuccessful"
            SetUpEnv.overallStatus = "Failed"
        
        if("Cookie:" in str(out) ):
            SetUpEnv.ServicesList["AW Dataupload"] = "Successful"
        else:
            SetUpEnv.ServicesList["AW Dataupload"] = "Unsuccessful"
            SetUpEnv.overallStatus = "Failed"