package com.siemens.soa.util.resources;

import java.util.List;

import com.teamcenter.schemas.soa._2006_03.exceptions.ServiceException;
import com.teamcenter.services.strong.core._2007_01.DataManagement.GetItemFromIdInfo;
import com.teamcenter.services.strong.core._2007_01.DataManagement.GetItemFromIdPref;
import com.teamcenter.services.strong.core._2007_01.DataManagement.GetItemFromIdResponse;
import com.teamcenter.services.strong.core._2008_06.DataManagement.CreateIn;
import com.teamcenter.services.strong.core._2008_06.DataManagement.CreateResponse;
import com.teamcenter.soa.client.model.ModelObject;
import com.teamcenter.soa.client.model.ServiceData;
import com.teamcenter.soa.client.model.strong.Item;
import com.teamcenter.soa.client.model.strong.ItemRevision;
import com.teamcenter.soa.exceptions.NotLoadedException;


public class ItemManager {
	
	@SuppressWarnings("unused")
	public static String[] create(LoginManager loginManager, List<String> objDetails, int loopCount ) {
				
		String[] result = new String[2];
		StringBuilder createdItems = new StringBuilder();
		
		String parentUID = null;
		String itmName = null;
		String itmDesc = null;
		String itemType = objDetails.get(0);
		String itemName = objDetails.get(1);
		String itemDesc = objDetails.get(2);
	
		
		try {
			
		/*	String parFolder = XMLUtil.getXMLData(XMLUtil.getXMLPath("input"), "ParentFolder");
			String chFolder = XMLUtil.getXMLData(XMLUtil.getXMLPath("input"), "ChildFolder");*/
			
			String parFolder = "Home";
			String chFolder = null;
			
			if (chFolder != null){
				parentUID = FolderManager.getChildFolderUID(loginManager,parFolder, chFolder);
			}else{
				parentUID = FolderManager.getParentFolderUID(loginManager, parFolder);
			}
			
			if (parentUID != null) {				
				for ( int i = 0; i < loopCount; i++ ) {
					if (loopCount == 1){
						itmName = itemName;
						itmDesc = itemDesc;					
					}else{
						itmName = itemName + "_" + i;
						itmDesc = itemDesc + "_" + i;					
					}
					 CreateResponse createItemsResponse = createItems(loginManager, itmName, itmDesc, itemType);
									 					 
					 for ( int respLength = 0; respLength < createItemsResponse.output[0].objects.length ; respLength++ ) {
						if ( createItemsResponse.output[0].objects[respLength] instanceof Item ) {
							Item item = (Item) createItemsResponse.output[0].objects[respLength];
							AutomationUtil.createRelation(loginManager, parentUID, item.getUid(), "");							
						}
						if ( createItemsResponse.output[0].objects[respLength] instanceof ItemRevision ) {
							ItemRevision itemRev = (ItemRevision) createItemsResponse.output[0].objects[respLength];
							
							try {									
									createdItems.append(itemRev.get_object_string()+"|");									
							} catch (NotLoadedException e) {
								e.printStackTrace();
							}
						}						
					 }  
					if (createItemsResponse.serviceData.sizeOfPartialErrors() > 0) {
				    	result[0] = "false";
				    	result[1] = createdItems.toString();
				    	break;						
					}else {
				    	result[0] = "true";
				    }
				 }
				if (result[0].equals("true")) {
					result[1] = createdItems.toString();
				}			
			}			
		} catch (Exception e) {
			e.printStackTrace();
		}
		return result;
	}
	
    //@SuppressWarnings("unchecked")
	public static CreateResponse createItems(LoginManager loginManager, String itemName, String itemDescription, String itemType) {

        CreateIn createIn = new CreateIn();
        createIn.clientId = "Test";
        createIn.data.boName = itemType;
        createIn.data.stringProps.put("object_name", itemName);
        createIn.data.stringProps.put("object_desc", itemDescription);
        
        CreateResponse resp = null;
        try
		{
			resp = loginManager.getDMService().createObjects(new CreateIn[]{createIn});
		}
		catch (ServiceException e)
		{
			e.printStackTrace();
		}
		return resp;
    }
    
    public static String getItemRevision (LoginManager loginManager, String itemID){
    	
    	String itemRevID = null;
    	
    	GetItemFromIdInfo itemFromIdInfo = new GetItemFromIdInfo();
    	itemFromIdInfo.itemId = itemID;
    	itemFromIdInfo.revIds = new String[]{""};
    	GetItemFromIdPref getItemFromIdPref = new GetItemFromIdPref();	
    	@SuppressWarnings("deprecation")
		GetItemFromIdResponse getItemFromIdResponse = loginManager.getDMService().getItemFromId(new GetItemFromIdInfo[]{itemFromIdInfo}, 25, getItemFromIdPref);
    	ModelObject[] inputs = new ModelObject[1];
    	inputs[0] = loginManager.getModelManager().constructObject(getItemFromIdResponse.output[0].item.getUid());
    	String[] titles = new String[1];
    	titles[0] = "revision_list";
    	loginManager.getDMService().getProperties(inputs, titles);
    	try {
			ModelObject[] revisions = getItemFromIdResponse.output[0].item.get_revision_list();
			for (ModelObject revision : revisions){
				ServiceData sd = loginManager.getDMService().getProperties(new ModelObject[]{revision}, new String[]{"current_revision_id"});
				if (sd.getPlainObject(0) instanceof ItemRevision) {
	                  ItemRevision itemRev = (ItemRevision)sd.getPlainObject(0);
	                  itemRevID = itemRev.get_current_revision_id();
				}
			}
		} catch (NotLoadedException e) {
			e.printStackTrace();
		}
		return itemRevID; 	
    }    
    
    public static String getItemUID(LoginManager loginManager, String tcItemId){
    	
    	GetItemFromIdInfo[] getItemFromIdInfoArr = new GetItemFromIdInfo[1];
		GetItemFromIdInfo getItemFromIdInfo = new GetItemFromIdInfo();
		getItemFromIdInfo.itemId = tcItemId;
		String[] revIds = new String[1];
		revIds[0] = getItemRevision(loginManager, tcItemId);
		getItemFromIdInfo.revIds = revIds;
		getItemFromIdInfoArr[0] = getItemFromIdInfo;
		GetItemFromIdPref getItemFromIdPref = new GetItemFromIdPref();		
		@SuppressWarnings("deprecation")
		GetItemFromIdResponse getItemFromIdResponse = loginManager.getDMService().getItemFromId(getItemFromIdInfoArr, 25, getItemFromIdPref);
		
		return getItemFromIdResponse.output[0].item.getUid();
    	
    }    
    
    public static String getItemRevUID(LoginManager loginManager, String tcItemId){
    	
    	GetItemFromIdInfo[] getItemFromIdInfoArr = new GetItemFromIdInfo[1];
		GetItemFromIdInfo getItemFromIdInfo = new GetItemFromIdInfo();
		getItemFromIdInfo.itemId = tcItemId;
		String[] revIds = new String[1];
		revIds[0] = getItemRevision(loginManager, tcItemId);
		getItemFromIdInfo.revIds = revIds;
		getItemFromIdInfoArr[0] = getItemFromIdInfo;
		GetItemFromIdPref getItemFromIdPref = new GetItemFromIdPref();		
		@SuppressWarnings("deprecation")
		GetItemFromIdResponse getItemFromIdResponse = loginManager.getDMService().getItemFromId(getItemFromIdInfoArr, 25, getItemFromIdPref);    	
		
		return getItemFromIdResponse.output[0].itemRevOutput[0].itemRevision.getUid();
    	
    }  
    
    public static Item getItem(LoginManager loginManager, String tcItemId){
    	
    	GetItemFromIdInfo[] getItemFromIdInfoArr = new GetItemFromIdInfo[1];
		GetItemFromIdInfo getItemFromIdInfo = new GetItemFromIdInfo();
		getItemFromIdInfo.itemId = tcItemId;
		String[] revIds = new String[1];
		revIds[0] = getItemRevision(loginManager, tcItemId);
		getItemFromIdInfo.revIds = revIds;
		getItemFromIdInfoArr[0] = getItemFromIdInfo;
		GetItemFromIdPref getItemFromIdPref = new GetItemFromIdPref();		
		@SuppressWarnings("deprecation")
		GetItemFromIdResponse getItemFromIdResponse = loginManager.getDMService().getItemFromId(getItemFromIdInfoArr, 25, getItemFromIdPref);    	
		return getItemFromIdResponse.output[0].item;
		
    	
    }    
    
    public static ItemRevision getItemRevesion(LoginManager loginManager, String tcItemId){
    	
    	GetItemFromIdInfo[] getItemFromIdInfoArr = new GetItemFromIdInfo[1];
		GetItemFromIdInfo getItemFromIdInfo = new GetItemFromIdInfo();
		getItemFromIdInfo.itemId = tcItemId;
		String[] revIds = new String[1];
		revIds[0] = getItemRevision(loginManager, tcItemId);
		getItemFromIdInfo.revIds = revIds;
		getItemFromIdInfoArr[0] = getItemFromIdInfo;
		GetItemFromIdPref getItemFromIdPref = new GetItemFromIdPref();		
		@SuppressWarnings("deprecation")
		GetItemFromIdResponse getItemFromIdResponse = loginManager.getDMService().getItemFromId(getItemFromIdInfoArr, 25, getItemFromIdPref);    	
		return getItemFromIdResponse.output[0].itemRevOutput[0].itemRevision;
    	
    }      
}
