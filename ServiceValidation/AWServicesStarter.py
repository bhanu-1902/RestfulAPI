import platform
import sys
import os
import re
import subprocess
from SetUpEnv import *
class aw_services_starter:
    def __init__(self):
        self.envJson = SetUpEnv()
    def start_solr(self):
        if (sys.platform.startswith('linux')):
            trPath = "/apps/tc/"+self.envJson.EnvJson['TCDir']+"/TR/"
            if (os.path.exists(trPath)):
                dirsList = os.listdir(trPath)
                for dir in dirsList:
                    if (re.search("^solr", dir) and os.path.isdir(trPath + "/" + dir) ):
                        print (trPath + dir + "/" + "bin" + "/" + "solr stop")
                        proc = subprocess.Popen([trPath + dir + "/" + "bin" + "/" + "solr stop"], stdout=subprocess.PIPE, shell=True)
                        # proc = subprocess.Popen(["/apps/tc/tc13/TR/solr-8.6.0/bin solr stop"], stdout=subprocess.PIPE, shell=True)
                        (out, err) = proc.communicate()
                        if ("No Solr nodes found to stop" in out):
                            print ("Solr was not running")
                        else:
                            print ("Solr was running")
                        proc = subprocess.Popen([trPath+ dir + "/" + "bin" + "/" + "solr start"], stdout=subprocess.PIPE, shell=True)
                        (out, err) = proc.communicate()
                        if ( "Started Solr server" in out ):
                            print ("Started Solr Server")
                            SetUpEnv.ServicesList['Solr'] = "Successful-Running"
                        else:
                            SetUpEnv.ServicesList['Solr'] = "Unsuccessful-Couldn't start"
                            
                        # proc = subprocess.Popen(["/apps/tc/tc13/TR/solr-8.6.0/bin/solr status"], stdout=subprocess.PIPE, shell=True)
    
    def start_tcfts_indexer(self):
        if (sys.platform.startswith('linux')):
            proc = subprocess.Popen(["/apps/tc/"+self.envJson.EnvJson['TCDir']+"/TR/TcFTSIndexer/bin/runTcFTSIndexer.sh -task=objdata:test"], stdout=subprocess.PIPE, shell=True)
        else:
            print ("C:\\apps\\tc\\"+self.envJson.EnvJson['TCDir']+"\\TR\\TcFTSIndexer\\bin\\runTcFTSIndexer.bat")
            proc = subprocess.Popen(["C:\\apps\\tc\\"+self.envJson.EnvJson['TCDir']+"\\TR\\TcFTSIndexer\\bin\\runTcFTSIndexer.bat", "-task=objdata:test"], stdout=subprocess.PIPE, shell=True)

        (out, err) = proc.communicate()
        print(out)

        if ("Test successful" in out):
            SetUpEnv.ServicesList['TcFTS Indexer'] = "Successful-Running"
        else:
            SetUpEnv.ServicesList['TcFTS Indexer'] = "Unsuccessful-Couldn't start"


    def start_services(self):
        self.start_solr()
        self.start_tcfts_indexer()