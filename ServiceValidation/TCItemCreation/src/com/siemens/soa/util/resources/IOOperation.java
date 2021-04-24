package com.siemens.soa.util.resources;


import java.io.FileReader;
import java.util.Properties;

public class IOOperation {

	public String readProperties(String sFileloc, String sProperty) throws Throwable {
	    // Write code here that turns the phrase above into concrete actions
		FileReader reader=new FileReader(sFileloc);
		String strVal;
	    
	    Properties p=new Properties();  
	    p.load(reader);
	    
	    strVal = p.getProperty(sProperty);    
	    return strVal;	
		
	}
	
	
}
