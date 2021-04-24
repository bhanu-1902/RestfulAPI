try:
    import urllib.request
    from urllib.parse import urlparse
    from urllib.parse import urljoin
except:
    import urllib2
    from urllib2 import urlopen
from JsonFileReader import *
import os
import platform
import re
import subprocess
import time
from SetUpEnv import *

class ServicesValidator:
    def __init__(self):
        self.envJson = SetUpEnv()
        self.app_server_status = True
        if platform.system().startswith("lin"):
            self.ServiceJson=json_file_reader.readJson('/home2/yytcadm/Desktop/ServiceValidation/ServiceList.json')
        elif platform.system().startswith("Win"):
            self.ServiceJson=json_file_reader.readJson('C:\\Users\\yytcadm\\Desktop\\ServiceValidation\\ServiceList.json')


    def check_fms_url(self):
        try:
            url = urljoin("http://"+platform.node()+"%3A4544","FMSMasterConfigFileRequest")
            print(url)
            if(urllib.request.urlopen(url).getcode() == 200):
                SetUpEnv.ServicesList['FMS URL'] = "Successful-Running"
                return 200
        except:
            try:
                if(urllib2.urlopen("http://"+platform.node()+":4544/FMSMasterConfigFileRequest").getcode() == 200):
                    SetUpEnv.ServicesList['FMS URL'] = "Successful-Running"
                    return 200
            except:
                SetUpEnv.ServicesList['FMS URL'] = "Unsuccessful-Couldn't start"
                return "FMS is not up"

    def check_app_server(self):
        ret_code = 0
        app_server_counter = 5
        while (ret_code != 200 and app_server_counter > 0):
            try:
                url = urljoin("http://"+platform.node()+"%3A"+self.envJson.EnvJson['Port'],"tc/controller/test")
                print(url)
                if(urllib.request.urlopen(url).getcode() == 200):
                    SetUpEnv.ServicesList['TC Server URL'] = "Successful-Running"
                    ret_code = 200
                    break
            except:
                try:
                    if(urllib2.urlopen("http://"+platform.node()+":"+self.envJson.EnvJson['Port']+"/tc/controller/test").getcode() == 200):
                        SetUpEnv.ServicesList['TC Server URL'] = "Successful-Running"
                        ret_code = 200
                        break
                except:
                    SetUpEnv.ServicesList['TC Server URL'] = "Unsuccessful-Couldn't start"
                    self.app_server_status = False
            print ("pinging ':port/test/controller/test' URL once again...")
            app_server_counter = app_server_counter - 1
            time.sleep(10)
        return ret_code

    def validate_db(self):
        print("validating DB")
        if(self.envJson.EnvJson['Database'] == "Oracle"):
            if(platform.system().startswith("Win")):
                os.system("set ORACLE_SID=tc")
                os.system("echo exit | sqlplus -s system/Pa55w_rd@tc  @C:\\Users\\yytcadm\\Desktop\\ServiceValidation\\oracle.sql  >>C:\\Users\\yytcadm\\Desktop\\ServiceValidation\\oracle_validation")
                db_validation_file = open("C:\\Users\\yytcadm\\Desktop\\ServiceValidation\\oracle_validation", "r+")
                with db_validation_file as val_file:
                    eachLine = val_file.read()
                # print(eachLine)
                if("Database closed" in eachLine and "Database mounted" in eachLine and "Database opened" in eachLine and "Database mounted" in eachLine):
                    print("Database was closed and dismounted")
                    print("Database is opened and mounted")
                    SetUpEnv.ServicesList['Oracle DB Mounting'] = "Successful"
                else:
                    SetUpEnv.ServicesList['Oracle DB Mouting'] = "Unsuccessful"
                    SetUpEnv.overallStatus = "Failed"
            if(platform.system().startswith("Lin")):
                print("Linux")
                os.system("echo Pa55w_rd | sqlplus system/Pa55w_rd  @/home2/yytcadm/Desktop/ServiceValidation/oracle.sql  >/home2/yytcadm/Desktop/ServiceValidation/oracle_validation.txt")
                db_validation_file = open("/home2/yytcadm/Desktop/ServiceValidation/oracle_validation.txt", "r+")
                with db_validation_file as val_file:
                    eachLine = val_file.read()
                # print(eachLine)
                if("Database closed" in eachLine and "Database mounted" in eachLine and "Database opened" in eachLine and "Database mounted" in eachLine):
                    print("Database was closed and dismounted")
                    print("Database is opened and mounted")
                    SetUpEnv.ServicesList['Oracle DB Mounting'] = "Successful"
                else:
                    SetUpEnv.ServicesList['Oracle DB Mouting'] = "Unsuccessful"
                    SetUpEnv.overallStatus = "Failed"
        elif(self.envJson.EnvJson['Database'] == "SQL"):
            if(platform.system().startswith("Win")):
                os.system("sqlcmd -S 127.0.0.1,1433 -i C:\\Users\\yytcadm\\Desktop\\ServiceValidation\\mssql.sql -o C:\\Users\\yytcadm\\Desktop\\ServiceValidation\\ms_sql_validation.txt")
                db_validation_file = open("C:\\Users\\yytcadm\\Desktop\\ServiceValidation\\ms_sql_validation.txt", "r+")
                with db_validation_file as val_file:
                    eachLine = val_file.read()
                print(eachLine)
                if("Changed database context" in eachLine and "rows affected" in eachLine):
                    print("USE <db_name> operation was performed and select * query was fired")
                    SetUpEnv.ServicesList['MsSQL DB Query'] = "Successful"
                else:
                    # print("Database validation for MsSQL failed")
                    SetUpEnv.ServicesList['MsSQL DB Query'] = "Unsuccessful"
                    SetUpEnv.overallStatus = "Failed"
    
    def validate_login(self):
        if(platform.system().startswith("Win")):
            proc = subprocess.Popen(["java", "-jar" ,"C:\\Users\\yytcadm\\Desktop\\ServiceValidation\\HelloTc.jar","-host" ,"http://localhost:"+self.envJson.EnvJson['Port']+"/tc" ,"-user","yytcadm","-password","Pa55w_rd"], stdout=subprocess.PIPE, shell=True)
        elif(platform.system().startswith("Lin")):
            # proc = subprocess.Popen(["java", "-jar" ,"/home2/yytcadm/Desktop/ServiceValidation/HelloTc.jar","-host" ,"http://localhost:7001/tc" ,"-user","ed","-password","ed"], stdout=subprocess.PIPE, shell=True)
            proc = subprocess.Popen(["java -jar /home2/yytcadm/Desktop/ServiceValidation/HelloTc.jar -host http://localhost:"+self.envJson.EnvJson['Port']+"/tc -user yytcadm -password Pa55w_rd"], stdout=subprocess.PIPE, shell=True)

        (out, err) = proc.communicate()
        # print(proc)
        print(out)
        if("Error" in str(out) or "ERROR" in str(out) or "failed" in str(out)):
            # print("Error in Login (4Tier Login)")
            SetUpEnv.ServicesList['4 Tier Login'] = "Unsuccessful"
            SetUpEnv.overallStatus = "Failed"
        else:
            SetUpEnv.ServicesList['4 Tier Login'] = "Successful"
            if (SetUpEnv.ServicesList['TC Server URL'] == "Unsuccessful-Couldn't start" and SetUpEnv.overallStatus != "Failed"):
                SetUpEnv.overallStatus = "Successful"
            SetUpEnv.ServicesList['TC Server URL'] = "Successful-Running"
            # print("4Tier Login: Successful")
    
    def validate_item_creation_tc(self):
        #Read env.properties file
        self.replace_url_in_env_file()
        if(platform.system().startswith("Win")):
            os.chdir("C:\\Users\\yytcadm\\Desktop\\ServiceValidation\\TCItemCreation")
            os.system("call C:\\Users\\yytcadm\\Desktop\\ServiceValidation\\TCItemCreation\\RunTest.bat >>C:\\Users\\yytcadm\\Desktop\\ServiceValidation\\TCItemCreation\\TC_Item_Creation.txt")
            tc_item_creation_file = open("C:\\Users\\yytcadm\\Desktop\\ServiceValidation\\TCItemCreation\\TC_Item_Creation.txt", "r+")
            with tc_item_creation_file as item_create_file:
                file_string = item_create_file.read()

            if("Item Created Sucessfully" in file_string):
                SetUpEnv.ServicesList['TC Item Creation'] = "Successful"
                if (SetUpEnv.ServicesList['TC Server URL'] == "Unsuccessful-Couldn't start" and self.app_server_status == False):
                    SetUpEnv.overallStatus = "Successful"
                    SetUpEnv.ServicesList['TC Server URL'] = "Successful-Running"
                    SetUpEnv.ServicesList['4 Tier Login'] = "Successful-Running"
            else:
                SetUpEnv.ServicesList['TC Item Creation'] = "Unsuccessful"
    
    def replace_url_in_env_file(self):
        if(platform.system().startswith("Win")):
            prop_file = open("C:\\Users\\yytcadm\\Desktop\\ServiceValidation\\TCItemCreation\\env.properties", "r+")
            with prop_file as item_create_file:
                file_string= item_create_file.read()
            file_string = re.sub("url","http://localhost:"+self.envJson.EnvJson['Port']+"/tc" , file_string)
            prop_file = open("C:\\Users\\yytcadm\\Desktop\\ServiceValidation\\TCItemCreation\\env.properties", 'w+')
            prop_file.write(file_string)