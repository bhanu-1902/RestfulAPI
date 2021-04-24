#Author: archana.deshpande@siemens.com
@tag
Feature: Item Creation in Teamcenter using SOA
  

  @tag1
  Scenario: To verify that basic Item Creation functionality works in Teamcenter Enviornment
    Given I am Logged in Teamcenter 
    
    When I Create Object of type Item
    
    Then Object of type Item gets created
    
     Then I log out from Teamcenter 
     