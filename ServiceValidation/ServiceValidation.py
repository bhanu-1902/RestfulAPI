from ServiceStarter import *
from ServicesValidator import *
from AWValidation import *
from DataPublisher import *
from AWServicesStarter import *
import json
import sys

def main():
    print("Service Validation is started....")
    start_services= ServiceStarter()
    start_services.validate_services()

    services_validator = ServicesValidator()
    # print(services_validator.check_app_server())
    if (services_validator.check_app_server() == 200):
        print("Web Server is running")
    else:
        print("Web Server is not running")
    if(services_validator.check_fms_url() == 200):
        print("FMS is running")
    else:
        print("FMS is not running")
    services_validator.validate_db()
    services_validator.validate_login()
    services_validator.validate_item_creation_tc()
    if("Nightly" in os.environ["JobType"] or os.environ["JobType"] == "IntegrationPipeline" ):
        aw_service_starter_obj = aw_services_starter()
        aw_service_starter_obj.start_services()
        aw_validation = AWValidation()
        aw_validation.validate_aw_login()
        if ( os.environ["JobType"] != "IntegrationPipeline" ):
            aw_validation.validate_item_creation_and_item_search()
    print(SetUpEnv.ServicesList)
    formatted_json = json.dumps(SetUpEnv.ServicesList, indent=2, sort_keys=True)
    print(formatted_json)
    SetUpEnv.ServicesList ['efId'] = os.environ["EF_Id"]
    SetUpEnv.ServicesList ['overallStatus'] = SetUpEnv.overallStatus
    try:
        if (os.environ["JobType"] != "IntegrationPipeline"):        
            data_publisher_obj = data_publisher()
            data_publisher_obj.publish_data(SetUpEnv.ServicesList)
        else:
            print ("Environment_Validation results are not being published for SubmitCI jobs...")
    except Exception as e:
        print ("Exception occured!")
        print (e)
    
    if ( SetUpEnv.overallStatus == "Failed" ):
        sys.exit(1)
    else :
        sys.exit ("Environment Validation was successful")




if __name__ == '__main__':
    main()