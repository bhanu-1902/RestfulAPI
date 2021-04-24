try:
    import psutil
except:
    print("psutil python library is not required for Linux")
import platform
import os
import subprocess
from JsonFileReader import *
from SetUpEnv import *
import platform
import time
import sys
# import httplib2
# import requests



class ServiceStarter:
    def __init__(self):
        self.envJson = SetUpEnv()
        self.service_counter = 0
        if platform.system().startswith("lin"):
            self.ServiceJson=json_file_reader.readJson('/home2/yytcadm/Desktop/ServiceValidation/ServiceList.json')
        elif platform.system().startswith("Win"):
            self.ServiceJson=json_file_reader.readJson('C:\\Users\\yytcadm\\Desktop\\ServiceValidation\\ServiceList.json')


    def start_tc_services(self, serviceType):
        process_list = {}
        
        if(platform.system().startswith("Win")):
            for service in psutil.win_service_iter():   
                info = service.as_dict()
                #Start TC Services
                if((serviceType == "tc") and (info['binpath'].startswith('"C:\\apps\\tc\\' + self.envJson.EnvJson['TCDir']) or info['binpath'].startswith('C:\\apps\\tc\\' + self.envJson.EnvJson['TCDir'])) and "FSC" not in info['display_name'] and "Server Manager" not in info['display_name']):
                    self.service_counter = self.service_counter + 1
                    print(str(self.service_counter) + "." + info['display_name'])
                    if( info['status'] == "stopped"):
                        service_status = self.start_service(info['display_name'])
                        if (service_status != 0  and SetUpEnv.overallStatus != "Failed"):
                            SetUpEnv.overallStatus = "Warning"
                    elif (info['status'] == "running"):
                        os.system('net stop "'+info['display_name']+'" /y')
                        service_status = self.start_service(info['display_name'])
                        if (service_status != 0  and SetUpEnv.overallStatus != "Failed"):
                            SetUpEnv.overallStatus = "Warning"
                #Start DB Services
                elif (serviceType == "db" and (self.envJson.EnvJson['Database'] in info['display_name']) and ("TNSListener" in info['display_name'] or "OracleServiceTC" in info['display_name'] or info['display_name'] == "SQL Server (MSSQLSERVER)")):
                    self.service_counter = self.service_counter + 1
                    print(str(self.service_counter) + "." + info['display_name'])
                    if( info['status'] == "stopped"):
                        service_status = self.start_service(info['display_name'])
                        if (service_status != 0 ):
                            SetUpEnv.overallStatus = "Failed"
                    elif (info['status'] == "running"):
                        os.system('net stop "'+info['display_name']+'" /y')
                        service_status = self.start_service(info['display_name'])
                        if (service_status != 0 ):
                            SetUpEnv.overallStatus = "Failed"
                #Start App Server
                elif (serviceType == "app_server" and (self.envJson.EnvJson['WebServer'] in info['display_name'])):
                    self.service_counter = self.service_counter + 1
                    print(str(self.service_counter) + "." + info['display_name'])
                    if( info['status'] == "stopped"):
                        service_status = self.start_service(info['display_name'])
                        if (service_status != 0 ):
                            SetUpEnv.overallStatus = "Failed"

                    elif ( info['status'] == "running" ):
                        os.system('net stop "'+info['display_name']+'"')
                        service_status = self.start_service(info['display_name'])
                        if (service_status != 0 ):
                            SetUpEnv.overallStatus = "Failed"
                    time.sleep(180)
                #Start FSC Services
                elif (serviceType == "fsc" and "FSC" in info['display_name']):
                    self.service_counter = self.service_counter + 1
                    print(str(self.service_counter) + "." + info['display_name'])
                    if( info['status'] == "stopped"):
                        service_status = self.start_service(info['display_name'])
                        if (service_status != 0 ):
                            SetUpEnv.overallStatus = "Failed"
                    elif (info['status'] == "running"):
                        os.system('net stop "'+info['display_name']+'"')
                        service_status = self.start_service(info['display_name'])
                        if (service_status != 0 ):
                            SetUpEnv.overallStatus = "Failed"
                #Start Pool Manager Services
                elif ( serviceType == "pool_mgr" and "Server Manager" in info['display_name'] ):
                    self.service_counter = self.service_counter + 1
                    print(str(self.service_counter) + "." + info['display_name'])
                    if( info['status'] == "stopped"):
                        service_status = self.start_service(info['display_name'])
                        if (service_status != 0 ):
                            SetUpEnv.overallStatus = "Failed"
                    elif (info['status'] == "running"):
                        os.system('net stop "'+info['display_name']+'"')
                        service_status = self.start_service(info['display_name'])
                        if (service_status != 0 ):
                            SetUpEnv.overallStatus = "Failed"
        else:
            self.ServiceJson = json_file_reader.readJson("/home2/yytcadm/Desktop/ServiceValidation/ServiceList.json")
            # print(self.ServiceJson)
            if(serviceType == "tc"):
                for services in self.ServiceJson['ServiceList']:
                    if (self.replace_string_in_command(self.ServiceJson['linux']['tc'][services]['path']) != "NA"):
                        proc = subprocess.Popen([self.replace_string_in_command(self.ServiceJson['linux']['tc'][services]['path'])+" status"], stdout=subprocess.PIPE, shell=True)
                        (out, err) = proc.communicate()
                        if("not running" in out):
                            print(services+" is not running")
                            proc = subprocess.Popen([self.replace_string_in_command(self.ServiceJson['linux']['tc'][services]['path'])+ " start"], stdout=subprocess.PIPE, shell=True)
                            (out, err) = proc.communicate()
                            proc = subprocess.Popen([self.replace_string_in_command(self.ServiceJson['linux']['tc'][services]['path'])+" status"], stdout=subprocess.PIPE, shell=True)
                            (out, err) = proc.communicate()
                            if("is running" in out):
                                print (services+" started successfully")
                                self.envJson.ServicesList[services]="Successful-Running"
                            else:
                                self.envJson.ServicesList[services]="Unsuccessful-Couldn't start"
                                if (SetUpEnv.overallStatus != "Failed"):
                                    SetUpEnv.overallStatus = "Warning"    
                        else:
                            # print(services+" is running")
                            self.envJson.ServicesList[services]="Successful-Running"

            elif (serviceType == "app_server"):
                print("Web Server is being validated")
                for webApps in self.ServiceJson['WebServerList']:
                    if( webApps == self.envJson.EnvJson['WebServer'] ):
                        proc = subprocess.Popen(["systemctl status "+self.ServiceJson['linux']['appServer'][webApps]], stdout=subprocess.PIPE, shell=True)
                        (out, err) = proc.communicate()
                        if("Active: inactive" in out):
                            print(webApps +" service is not running")
                            proc = subprocess.Popen(["sudo systemctl start "+self.ServiceJson['linux']['appServer'][webApps]], stdout=subprocess.PIPE, shell=True)
                            (out, err) = proc.communicate()
                            time.sleep(180)
                            proc = subprocess.Popen(["systemctl status "+self.ServiceJson['linux']['appServer'][webApps]], stdout=subprocess.PIPE, shell=True)
                            (out, err) = proc.communicate()
                            print("restarted")
                            if("Active: active" in out):
                                print(webApps +" service started")
                                self.envJson.ServicesList[webApps]="Successful-Running"
                            else:
                                self.envJson.ServicesList[webApps]="Unsuccessful-Couldn't start"
                                SetUpEnv.overallStatus = "Failed"
                        else:
                            print(webApps +" is already running")
                            proc = subprocess.Popen(["sudo systemctl stop "+self.ServiceJson['linux']['appServer'][webApps]], stdout=subprocess.PIPE, shell=True)
                            (out, err) = proc.communicate()
                            time.sleep(10)
                            print("Stopped " + webApps)
                            proc = subprocess.Popen(["sudo systemctl start "+self.ServiceJson['linux']['appServer'][webApps]], stdout=subprocess.PIPE, shell=True)
                            (out, err) = proc.communicate()
                            time.sleep(180)
                            proc = subprocess.Popen(["systemctl status "+self.ServiceJson['linux']['appServer'][webApps]], stdout=subprocess.PIPE, shell=True)
                            (out, err) = proc.communicate()
                            time.sleep(10)
                            if("Active: active" in out):
                                self.envJson.ServicesList[webApps]="Successful-Running"
                                # print(webApps +" service restarted")
            # print(psutil.pids())s
            # for p in psutil.pids():
            #     try:
            #         if(psutil.Process(p).exe().startswith("/apps")):
            #             print(psutil.Process(p).name())
            #             print(psutil.Process(p).exe())
            #             print(psutil.Process(p).status())
            #             print(psutil.Process(p).cwd())
            #             # print(psutil.Process(p).cmdline())
            #             print("==============================================================")
            #     except:
            #         print("Exception occured")
        return process_list

    # def start_aw_service(self):
    #     if platform.system().startswith("lin"):



    def replace_string_in_command(self, rc_command):
        if("host" in rc_command):
            rc_command = rc_command.replace("host", platform.node())
        if("tcDir" in rc_command):
            rc_command = rc_command.replace("tcDir", self.envJson.EnvJson['TCDir'])
            # return (rc_command.replace("host", self.envJson.EnvJson['tcDir']))
        
        return rc_command

    def get_rc_services(self):
        proc = subprocess.Popen(["cd /apps/tc/tc13/TR/install && grep /chkconfig root*.ksh"], stdout=subprocess.PIPE, shell=True)
        (out, err) = proc.communicate()
        # print ("program output:"+ out)
        return out        
    
    def start_service(self, service_name):
        service_status = os.system('net start "'+service_name+'"')
        if (service_status != 0):
            print(service_name + " couldn't start")
            print("Retrying again.........")
            service_status = os.system('net start "'+service_name+'"')
            if(service_status != 0):
                print("Couldn't start "+service_name+ " after one try")
                self.envJson.ServicesList[service_name]="Unsuccessful-Couldn't start"
        else:
            self.envJson.ServicesList[service_name]="Successful-Running"
        return service_status



    def validate_services(self):
        print("DB Services:=============================")
        self.start_tc_services("db")
        print("FSC Services:=============================")
        self.start_tc_services("fsc")
        print("Pool Manager Services:=============================")
        self.start_tc_services("pool_mgr")
        print("TC Services:=============================")
        self.start_tc_services("tc")
        print("App Server Services:=============================")
        self.start_tc_services("app_server")
        # print("Indexing service for Linux:=============================")
        # self.start_aw_service()
