package com.siemens.soa.util.tests;

import java.io.*;
import java.util.*;

import org.apache.log4j.Level;
import org.apache.log4j.Logger;

import com.siemens.soa.util.resources.AutomationUtil;
import com.siemens.soa.util.resources.ItemManager;
import com.siemens.soa.util.resources.LoginManager;

import cucumber.api.java.en.Given;
import cucumber.api.java.en.Then;
import cucumber.api.java.en.When;


public class StepDef {

	String strurl;
	String strLoginuser;
    String strPwd;
    String strUsrGrp;
    String strUsrRole;
    String[] result = null;
    
    LoginManager loginManager = null;
	public static Logger StpDeflogger = Logger.getLogger(StepDef.class);
	public static String SOA_Properties = "env.properties";

@Given("^User is having valid Web Client URL$")
public void readURL() throws Throwable {
    // Write code here that turns the phrase above into concrete actions
   // throw new PendingException();
		
	strurl = readProperties(SOA_Properties, "webclient");   
	StepDef.StpDeflogger.log(Level.INFO, "Teamcenter URL : " + strurl);
}

@When("^User provide username and password$")
public void readUserinfo() throws Throwable {
    // Write code here that turns the phrase above into concrete actions
   // throw new PendingException();	   
    
    strLoginuser = readProperties(SOA_Properties, "user");
    strPwd = readProperties(SOA_Properties, "password");
    strUsrGrp = readProperties(SOA_Properties, "group"); 
    strUsrRole = readProperties(SOA_Properties, "role");
	
}

//@Given("^I am Logged in Teamcenter$")
public void loginSOA() throws Throwable {
    
	if(strurl == null)
	{
		strurl = readProperties(SOA_Properties, "webclient");
	}
	
	if(strLoginuser == null)
	{
		strLoginuser = readProperties(SOA_Properties, "user");
	}
	
	if(strPwd == null)
	{
		strPwd = readProperties(SOA_Properties, "password");
	}
	
	if(strUsrGrp == null)
	{
		strUsrGrp = readProperties(SOA_Properties, "group");
	}
	
	if(strUsrRole == null)
	{
		strUsrRole = readProperties(SOA_Properties, "role");
	}
	
	
	loginManager = new LoginManager(strurl, strLoginuser,strPwd,strUsrGrp, strUsrRole);
	loginManager.login();
	System.out.println("Login is Successful");
	StepDef.StpDeflogger.log(Level.INFO, "Teamcenter login with user : " + strLoginuser + "is successful");
	
	
}

public String readProperties(String sFileloc, String sProperty) throws Throwable {
    // Write code here that turns the phrase above into concrete actions
	FileReader reader=new FileReader(sFileloc);
	String strVal;
    
    Properties p=new Properties();  
    p.load(reader);
    
    strVal = p.getProperty(sProperty);    
    return strVal;	
	
}

@Given("^I am Logged in Teamcenter$")
public void Login() throws Throwable {
	//System.out.println("In Login");
	loginSOA();	
	
}

@When("^I Create Object of type Item")
public void SOAItemCreate() throws Throwable {
	// Get object data from XML
	String objData = readProperties(SOA_Properties, "ObjectData");
	List<String> aObjData = AutomationUtil.getObjData(objData, "|");
	// Count of objects to be created
	String objCount = "1";	
	
	String[] result = null;
	
	LoginManager lm = null;
	lm = new LoginManager(strurl, strLoginuser,strPwd,strUsrGrp, strUsrRole);
	lm.login();
	
	new ItemManager();
	result = ItemManager.create(lm, aObjData, Integer.valueOf(objCount));
	
	StepDef.StpDeflogger.log(Level.INFO,"Item got created Sucessfully" + result[0]);
	StepDef.StpDeflogger.log(Level.INFO,"Item got created Sucessfully" + result[1]);
	System.out.println("Item Created Sucessfully" + result[0] +"-" +  result[1]);
	
	
}

@Then("^Object of type Item gets created$")
public void GetID() throws Throwable {
	//loginManager.logout();
	
}

@Then ("^I log out from Teamcenter$")
public void logot()throws Throwable {
	loginManager.logout();
	
} 


}

