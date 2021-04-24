import os
import platform
import json
class SetUpEnv:
    ServicesList = {}
    overallStatus = "Successful"
    def __init__(self):
        self.EnvJson = self.create_env_json()
        

    
    def create_env_json(self):
        db=""
        if(os.environ["Database"] == "MsSql"):
            db="SQL"
        else:
            db=os.environ["Database"]
        port=""
        webApp = ""
        if(os.environ["WebServer"] == "Weblogic" or os.environ["WebServer"] == "WebLogic"):
            port="7001"
            webApp="Weblogic"
        elif (os.environ["WebServer"] == "Tomcat"):
            port="8080"
            webApp="Tomcat"
        elif (os.environ["WebServer"] == "IIS"):
            port="80"
            webApp="IIS"
        env_json = {
            "WebServer" : webApp,
            "Database":db,
            "TCRelease": os.environ["TCRelease"],
            "TCDir": os.environ["TCDir"],
            "Port":port
        }
        self.dump_json_file(env_json)
        return env_json

    def dump_json_file(self, env_json):
        if(platform.system().startswith("Win")):
           json_file=open('C:\\Users\\yytcadm\\Desktop\\ServiceValidation\\SetUpEnv.json',"w+")
        else:    
           json_file=open('/home2/yytcadm/Desktop/ServiceValidation/SetUpEnv.json',"w+")
        json_file.write(json.dumps(env_json))
        json_file.close()