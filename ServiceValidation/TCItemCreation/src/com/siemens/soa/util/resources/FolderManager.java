package com.siemens.soa.util.resources;

import com.teamcenter.services.strong.core.DataManagementService;
import com.teamcenter.services.strong.core._2006_03.DataManagement.CreateFolderInput;
import com.teamcenter.soa.client.model.ModelObject;
import com.teamcenter.soa.client.model.strong.Folder;
import com.teamcenter.soa.client.model.strong.WorkspaceObject;
import com.teamcenter.soa.exceptions.NotLoadedException;


public class FolderManager {
	
	public static DataManagementService.CreateFoldersResponse  createFolder(LoginManager loginManager, String folderName, String folderDesc, String fldName) {	
		
		String parentUID = null;
		
		CreateFolderInput createFolderInput = new CreateFolderInput();
		createFolderInput.clientId = "autotest";
		createFolderInput.name = folderName;
		createFolderInput.desc = folderDesc;		
		DataManagementService.CreateFoldersResponse resp = null;
		try {
			if ("Home".equalsIgnoreCase(fldName)){
				resp = loginManager.getDMService().createFolders(new CreateFolderInput[]{createFolderInput}, loginManager.getUser().get_home_folder(), "");				
			}
			else{
				ModelObject[] objects = { loginManager.getUser().get_home_folder() };
				String[] attributes = { "contents" };            
				loginManager.getDMService().getProperties(objects, attributes);
				WorkspaceObject[] contents = loginManager.getUser().get_home_folder().get_contents();
				for (WorkspaceObject object : contents) {
					String parFolderName = object.get_object_string();
					if (object instanceof Folder && parFolderName.equalsIgnoreCase( fldName )) {
						Folder autoFolder = (Folder) object;
						parentUID = autoFolder.getUid();
						break;
					}
				}		
				resp = loginManager.getDMService().createFolders(new CreateFolderInput[]{createFolderInput}, loginManager.getModelManager().getObject(parentUID), "");	
			}
		} catch (NotLoadedException e) {
			e.printStackTrace();
		}
		return resp;
	}		
	
	public static String getParentFolderUID(LoginManager loginManager, String folderName){
		
		String folderUID = null;
		
		try{
			if (folderName.equalsIgnoreCase("Home")){
				folderUID = loginManager.getUser().get_home_folder().getUid();
			}else{
				ModelObject[] objects = { loginManager.getUser().get_home_folder() };
	            String[] attributes = { "contents" };            
	            loginManager.getDMService().getProperties(objects, attributes);
				WorkspaceObject[] contents = loginManager.getUser().get_home_folder().get_contents();			
				for (WorkspaceObject object : contents) {
					String fldName = object.get_object_string();
					if (object instanceof Folder && fldName.equalsIgnoreCase( folderName )) {
						Folder autoFolder = (Folder) object;
						folderUID = autoFolder.getUid();
						break;
					}			
				}
			}
		}
		catch (Exception e){
			e.printStackTrace();
		}
		
		return folderUID;
	}
	
	public static String getChildFolderUID(LoginManager loginManager,String parentFolderName, String childFolderName){
		
		String chfolderUID = null;
		
		try{
			if (parentFolderName.equalsIgnoreCase("Home")){
				ModelObject[] objects = { loginManager.getUser().get_home_folder() };
	            String[] attributes = { "contents" };            
	            loginManager.getDMService().getProperties(objects, attributes);
				WorkspaceObject[] contents = loginManager.getUser().get_home_folder().get_contents();			
				for (WorkspaceObject object : contents) {
					String fldName = object.get_object_string();
					if ("Newstuff".equalsIgnoreCase(childFolderName)){
						chfolderUID = loginManager.getUser().get_newstuff_folder().getUid();						
						break;
					}else{ if(object instanceof Folder && fldName.equalsIgnoreCase( childFolderName )) {
							Folder autoFolder = (Folder) object;								
							chfolderUID = autoFolder.getUid();
							break;										
						}													
					}							
				}						
			}else{	
					ModelObject[] objects = { loginManager.getUser().get_home_folder() };			
            String[] attributes = { "contents" };            
		            loginManager.getDMService().getProperties(objects, attributes);	            
					WorkspaceObject[] contents = loginManager.getUser().get_home_folder().get_contents();					
			for (WorkspaceObject object : contents) {
				String parfolderName = object.get_object_string();
				if (object instanceof Folder && parfolderName.equalsIgnoreCase( parentFolderName )) {
					Folder autoFolder = (Folder) object;
					ModelObject[] fldobjects =  { autoFolder };
					String[] fldattributes = { "contents" }; 
							loginManager.getDMService().getProperties(fldobjects, fldattributes);
					WorkspaceObject[] fldcontent = autoFolder.get_contents();
					for (WorkspaceObject fldobject : fldcontent) {
						String subfolderName = fldobject.get_object_string();
						if (fldobject instanceof Folder && subfolderName.equalsIgnoreCase( childFolderName )) {
							Folder autoSubFolder = (Folder) fldobject;
							chfolderUID = autoSubFolder.getUid();
							break;
						}
					}
				}
			}
		}
		}
		catch (Exception e){
			e.printStackTrace();
		}
		
		return chfolderUID;
	}	
}

