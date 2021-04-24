package com.siemens.soa.util.resources;
//package com.teamcenter.pv.util;

import com.teamcenter.schemas.soa._2006_03.exceptions.InternalServerException;
import com.teamcenter.schemas.soa._2006_03.exceptions.InvalidCredentialsException;
import com.teamcenter.schemas.soa._2006_03.exceptions.ServiceException;

//import com.teamcenter.services.strong.administration.PreferenceManagementService;
//import com.teamcenter.services.strong.core.FileManagementService;
//import com.teamcenter.services.strong.globalmultisite.*;

//import com.teamcenter.services.loose.changemanagement.ChangeManagementService;
import com.teamcenter.services.strong.core.DataManagementService;
import com.teamcenter.services.strong.core.SessionService;
import com.teamcenter.services.strong.core._2006_03.Session.LoginResponse;
//import com.teamcenter.services.strong.projectmanagement.ScheduleManagementService;
import com.teamcenter.services.strong.query.SavedQueryService;
import com.teamcenter.soa.SoaConstants;
import com.teamcenter.soa.client.Connection;
import com.teamcenter.soa.client.ExceptionHandler;
import com.teamcenter.soa.client.FileManagementUtility;
import com.teamcenter.soa.client.model.ModelManager;
import com.teamcenter.soa.client.model.strong.User;
import com.teamcenter.soa.exceptions.CanceledOperationException;
//import com.fnd0.services.strong.configfiltercriteria.EffectivityManagementService;
//import com.ptn0.services.strong.partition.PartitionManagementService;

public class LoginManager
{

    private static ModelManager manager = null;
    private static SessionService sessionService = null;	
	private static Connection connection = null;
    private static DataManagementService  dmService;
  /*  private static com.teamcenter.services.strong.cad.StructureManagementService smService;
  /*  private static com.teamcenter.services.strong.cad.StructureManagementService smService2007_01;
    private static com.teamcenter.services.strong.bom.StructureManagementService  smBomService;
    private static com.teamcenter.services.loose.vendormanagement.VendorManagementService vmgmtService = null;
    private static com.teamcenter.services.internal.loose.vendormanagement.VendorManagementService vmgmtServiceInternal = null;	 */
    private static FileManagementUtility fileMgmtUtility = null;
    private static SavedQueryService queryService = null;
  //  private static ScheduleManagementService smPublishedService = null;
   // private static ChangeManagementService  cmService;
    private static User loggedInUser;
 //   private static PreferenceManagementService prefService;
    private static SessionService tcsession;
 //   private static ImportExportService impexpService;
 //   private static FileManagementService fmsService;
//    private static com.teamcenter.services.internal.strong.projectmanagement.ScheduleManagementService smUnpublishedService;
	
//    private EffectivityManagementService eftyService;
//    private PartitionManagementService ptnService;
//    private com.mdl0.services.strong.modelcore.SearchService srchService;
    private String url = null, username = null, password = null, group = null, role = null;
    
   
    public LoginManager(String url, String username, String password, String group, String role) {
		this.url = url;
		this.username = username;
		this.password = password;
		this.group = group;
		this.role = role;
    }
    
    public void login()
    {
		String soaClientID = "soa_automated_tests_" + Long.toString(System.currentTimeMillis()); 
        TcCredentialManager tcCredentialManager = new TcCredentialManager(username, password, group, role, soaClientID); 
      //  System.out.println("IN FUnction login with URL:" + url);
		if (url.indexOf("http") != -1)
  		{
  			connection = new Connection(url, tcCredentialManager, SoaConstants.REST, SoaConstants.HTTP);
  		}
  		else if (url.indexOf("iiop") != -1)
  		{
  			connection = new Connection(url, tcCredentialManager, SoaConstants.REST, SoaConstants.IIOP);
  		}
		connection.setExceptionHandler( new POCExceptionHandler() );
		
		sessionService = SessionService.getService(connection);
		boolean valid = false;
		while (!valid)
		{
			try
			{
				//System.out.println("IN FUnction login with Username:" + username);
				LoginResponse resp = sessionService.login( username, password, group, role, "", "soa_automated_tests");
				loggedInUser = resp.user;
				valid = true;
				initializeServices();
			}
			catch (InvalidCredentialsException e)
			{
				e.printStackTrace();
				throw new RuntimeException(e.getMessage());
			}
		}
    }
    
    public void logout()
    {
        try {
        	sessionService.logout();
        } catch (ServiceException e){e.printStackTrace();}
    }
    private void initializeServices()
	{
        dmService = DataManagementService.getService( connection );      
        manager = connection.getModelManager();      
       
       /* smService = com.teamcenter.services.strong.cad.StructureManagementService.getService( connection );
        smService2007_01 = com.teamcenter.services.strong.cad.StructureManagementService.getService( connection );
        smBomService = com.teamcenter.services.strong.bom.StructureManagementService.getService( connection );  */
      /*  fileMgmtUtility = new FileManagementUtility( connection );
        vmgmtService = com.teamcenter.services.loose.vendormanagement.VendorManagementService.getService(connection);
        vmgmtServiceInternal = com.teamcenter.services.internal.loose.vendormanagement.VendorManagementService.getService(connection);  */
        queryService = SavedQueryService.getService( connection );
        /*smPublishedService = ScheduleManagementService.getService(connection);
        cmService = ChangeManagementService.getService(connection);
        prefService = PreferenceManagementService.getService(connection);*/
        tcsession = SessionService.getService(connection);
   /*     fmsService = FileManagementService.getService(connection);
        impexpService = ImportExportService.getService(connection);
        smUnpublishedService = com.teamcenter.services.internal.strong.projectmanagement.ScheduleManagementService.getService(connection);
		
		eftyService = EffectivityManagementService.getService(connection);
        ptnService = PartitionManagementService.getService(connection);
        srchService = com.mdl0.services.strong.modelcore.SearchService.getService(connection); */
       
	}
    public Connection getCurrentConnection() {
    	return connection;
    }
    public User getUser() {
    	return loggedInUser;
    }
	public SessionService getTCSession() {
		return tcsession;
	}     
	/*public PreferenceManagementService getPerfService() {
		return prefService;
	}    
	public ChangeManagementService getCMService() {
		return cmService;
	}*/
	public DataManagementService getDMService() {
		return dmService;
	}
	public ModelManager getModelManager() {
		return manager;
	}	
	/*public com.teamcenter.services.strong.bom.StructureManagementService getSMBomService() {
		return smBomService;
	}
	public com.teamcenter.services.strong.cad.StructureManagementService getSMCadService() {
		return smService2007_01;
	}
	public com.teamcenter.services.strong.cad.StructureManagementService getSMgrService() {
		return smService;
	}*/
	public FileManagementUtility getFileManagementUtility(){
		return fileMgmtUtility;
	}
	/*public static com.teamcenter.services.loose.vendormanagement.VendorManagementService getVmgmtService(){
		return vmgmtService;
	}
	public static com.teamcenter.services.internal.loose.vendormanagement.VendorManagementService getVmgmtServiceInternal(){
		return vmgmtServiceInternal;
	}*/
	public SavedQueryService getQueryService() {
		return queryService;
	}
	/*public ScheduleManagementService getSMPublishedService() {
		return smPublishedService;
	}			
	public com.teamcenter.services.internal.strong.projectmanagement.ScheduleManagementService getSMUnpublishedService() {
		return smUnpublishedService;
	}	
	public ImportExportService getImpExpService() {
		return impexpService;
	}	
	public FileManagementService getFMSService(){
		return fmsService;
	}*/
	/*public EffectivityManagementService getEffectivityService()
	{
		return eftyService;
	}	
	public PartitionManagementService getPartitionService()
	{
		return ptnService;
	}
	public com.mdl0.services.strong.modelcore.SearchService getSearchService()
	{
		return srchService;
	}*/
}
class POCExceptionHandler implements ExceptionHandler {
	public void handleException(InternalServerException iSE)
	{
		throw new RuntimeException(iSE);
	}

	public void handleException(CanceledOperationException cOE)
	{
		throw new RuntimeException(cOE);
	}
}
