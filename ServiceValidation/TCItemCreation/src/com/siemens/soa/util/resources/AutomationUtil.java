package com.siemens.soa.util.resources;

import java.io.File;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.StringTokenizer;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;

import org.apache.log4j.Logger;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.apache.log4j.Level;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.Random;

import com.teamcenter.services.strong.core._2006_03.DataManagement.CreateRelationsResponse;
import com.teamcenter.services.strong.core._2006_03.DataManagement.Relationship;

public class AutomationUtil {

	public static String PARENT_FOLDER_NAME = "AutoFolder";

	public static String SUB_FOLDER_NAME = "AutoFolder1111";

	public static String SOA_XML_INPUT = "";
	public static String DS_XML_PATH = "";

	public static Logger logger = Logger.getLogger(AutomationUtil.class);
	
	public static CreateRelationsResponse createRelation(LoginManager loginManager, String primaryObject, String secondaryObject, String relationName){
		CreateRelationsResponse createRelationsResponse = null;
		try {
			Relationship[] relInputs = new Relationship[1];
			Relationship input = new Relationship();
			input.clientId = "autotest";
			input.primaryObject = loginManager.getModelManager().constructObject(primaryObject);
			input.secondaryObject = loginManager.getModelManager().constructObject(secondaryObject);
			input.relationType = relationName;			
			relInputs[0] = input;
			createRelationsResponse = loginManager.getDMService().createRelations(relInputs);
			
		} catch (Exception e) {
			e.printStackTrace();
		}
		return createRelationsResponse;
	}



	public static String splitString(String strToSplit, String delimiterStr, int position) {

		String[] temp;
		String splitStr = "";
		String delimiter = delimiterStr;
		temp = strToSplit.split(delimiter);
		if (temp.length >= position) {
			for (int i = 0; i < position; i++) {
				splitStr = temp[i];
			}
		}
		return splitStr;
	}

	public static List<String> getCredentials(String strToSplit, String delimiterStr) {

		StringTokenizer sT = new StringTokenizer(strToSplit, delimiterStr);
		List<String> credentials = new ArrayList<String>();
		while (sT.hasMoreTokens()) {
			credentials.add(sT.nextToken());
		}
		return credentials;
	}
	
	public static List<String> getObjData(String strToSplit, String delimiterStr) {
		
		StringTokenizer sT = new StringTokenizer(strToSplit, delimiterStr);
		List<String> objData = new ArrayList<String>();
		while (sT.hasMoreTokens()) {
			objData.add(sT.nextToken());
		}
		return objData;
	}	

	public static Calendar stringDateToCalender(String strDate){	
		
			
		SimpleDateFormat sdf = new SimpleDateFormat("dd-MM-yyyy HH:mm:ss");
		Calendar cal=Calendar.getInstance();
		Date date = null;
		try {
			date = sdf.parse(strDate);
		} catch (ParseException ex) {
			AutomationUtil.logger.log(Level.DEBUG, ex.getMessage());
		}
		cal.setTime(date);
		return cal;

	}	
	
	public static String getDate(String dateParam, int addVal){
		
		String DATE_FORMAT = "dd-MM-yyyy HH:mm:ss";
		Calendar cal = Calendar.getInstance();
		
		if (dateParam.equalsIgnoreCase("year")){
			cal.add(Calendar.YEAR, addVal);
		}else if (dateParam.equalsIgnoreCase("month")){
			cal.add(Calendar.MONTH, addVal);
		}else if (dateParam.equalsIgnoreCase("day")){
			cal.add(Calendar.DATE, addVal);
		}
		
		SimpleDateFormat sdf = new SimpleDateFormat(DATE_FORMAT);
		
		return sdf.format(cal.getTime());				
	}

	public static String getTime(){
		
		String TIME_FORMAT = " HH:mm:ss";
		Calendar cal = Calendar.getInstance();
			
		SimpleDateFormat sdf = new SimpleDateFormat(TIME_FORMAT);
		
		return sdf.format(cal.getTime());				
	}	
	
	public static String getDatasetExt(String filePath, String dsName){
		
		String extName = null;
		String extVal = null;
		int i = 0 ;
		int j = 0;
			
		try{
			File file = new File(filePath);
			if (file.exists()) {
				DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
				DocumentBuilder db = dbf.newDocumentBuilder();
				Document doc = db.parse(file);
				doc.getDocumentElement().normalize();
				NodeList nodeLst = doc.getElementsByTagName("FileExt");	
				if (nodeLst != null && nodeLst.getLength() > 0){
					for (i = 0; i < nodeLst.getLength(); i++) {
						Element dsExt = (Element)nodeLst.item(i);
						extVal = dsExt.getAttribute("name");
						Node fstNode = nodeLst.item(i);
						if (fstNode.getNodeType() == Node.ELEMENT_NODE) {
							Element fstElmnt = (Element) fstNode;
							NodeList fstNmElmntLst = fstElmnt.getElementsByTagName("DatasetType");
							if (fstNmElmntLst != null && fstNmElmntLst.getLength() > 0){
								for (j = 0; j < fstNmElmntLst.getLength(); j++) {
									Element dsType = (Element)fstNmElmntLst.item(j);
									extName = dsType.getAttribute("name");										
									if (dsName.equalsIgnoreCase(extName)){																
										break;
									}
								}
							}							
						}
						if (dsName.equalsIgnoreCase(extName)){						
							break;
						}												
					}					
				}				
			}
			
		}catch(Exception e) {
			e.printStackTrace();
		}
		return extVal;		
	}	
	public static String getRandomID()
    {
		Random rand = new Random();
		int rndNumber = rand.nextInt();
		if (rndNumber < 0){
			rndNumber = rndNumber*(-1);
		}
		String TIME_FORMAT = "ddMMHHmmss";
		Calendar cal = Calendar.getInstance();			
		SimpleDateFormat sdf = new SimpleDateFormat(TIME_FORMAT);
		
		return sdf.format(cal.getTime()) + Integer.toString(rndNumber);	
    }	
	
	public static String getFilePath()
	{
		String fileName = null;
		System.out.print("Enter excel filepath : ");
		BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
		try {
			 fileName = br.readLine();
			 fileName = fileName.replace("\\", "\\\\");
		} catch (IOException e) {
			System.out.println("IO error trying to get excel name");
			System.exit(1);			
		}		
		
		return fileName;
	}
	
	public static boolean createOutputFile (String filePath){
		
		boolean retVal = false;
		
		File file = new File(filePath);
		if (file.exists()) 
		{
			file.delete();
			try 
			{
				file.createNewFile();
				retVal = true;
			} 
			catch (IOException e) 
			{
				e.printStackTrace();
			}
		} 
		else 
		{
			try 
			{
				file.createNewFile();
				retVal = true;
			} 
			catch (IOException e) 
			{
				e.printStackTrace();
			}
		}		
		
		return retVal;
						
	}
}
