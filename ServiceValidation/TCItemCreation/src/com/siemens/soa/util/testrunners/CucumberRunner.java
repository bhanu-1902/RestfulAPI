package com.siemens.soa.util.testrunners;

import org.junit.runner.RunWith;

import cucumber.api.CucumberOptions;
import cucumber.api.junit.Cucumber;


/*import org.junit.After;
import org.junit.Before;
import org.junit.Test;
*/
import org.junit.internal.TextListener;
import org.junit.runner.JUnitCore;
import org.junit.runner.Result;

@RunWith(Cucumber.class)
@CucumberOptions(		
		features="feature",
		glue = {"com.siemens.soa.util.tests"},
		plugin = { "pretty", "html:target/cucumber-reports",
				"json:target/cucumber.json" },
		monochrome = true

		) 

public class CucumberRunner {
	
	public static void main(String[] args) {
			
		 			//args[0] = "http://pnv6s1195/tc12b";
		
		  /*System.setProperty("URL","http://pnv6s1195/tc12b");
		  
		  System.setProperty("User", "infodba");
		  System.setProperty("Pass", "infodba");
		  
		  System.setProperty("Group", "dba");
		  System.setProperty("Role", "DBA");*/	  
						  
		  JUnitCore junit = new JUnitCore();
		  junit.addListener(new TextListener(System.out));
		  Result result = junit.run(CucumberRunner.class); 
		  if (result.getFailureCount() > 0) {
		    System.out.println("Test failed.");
		    System.exit(1);
		  } else {
		    System.out.println("Test finished successfully.");
		    System.exit(0);
		  }
		}

}
