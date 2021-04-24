# import urllib.parse
try:
    import requests
except:
    import httplib
import json
import platform
class data_publisher:
    def __init__(self):
        print("Publishing data to AW Dashboard...")
    
    def publish_data(self, json_data):

        # params = urllib.parse.urlencode(json_data)
        # response = urllib.request.urlopen("http://pnv6s1774:8080/AWDashboard/tc_installs/addServices", params)
        if platform.system().startswith("Win"):
            response = requests.put('http://pnv6s1774:8080/AWDashboard/tc_installs/addServices', data= json.dumps(json_data), headers={'Content-type':'application/json'})
            
            if ( response.status_code == 200 ):
                print( "Data posted to AW Dashboard" )
            else:
                print( "Data couldn't get posted to AW Dashboard" )
        else:
            try:
                headers = {"content-type": "application/json"}
                conn = httplib.HTTPConnection("pnv6s1774:8080")
                conn.request("PUT","/AWDashboard/tc_installs/addServices", json.dumps(json_data), headers)
                response = conn.getresponse()
                if(response.status == 200):
                    print( "Data posted to AW Dashboard")
                else:
                    print( "Data couldn't get posted to AW Dashboard" )
            except:
                response = requests.put('http://pnv6s1774:8080/AWDashboard/tc_installs/addServices', data= json.dumps(json_data), headers={'Content-type':'application/json'})
            
                if ( response.status_code == 200 ):
                    print( "Data posted to AW Dashboard" )
                else:
                    print( "Data couldn't get posted to AW Dashboard" )


