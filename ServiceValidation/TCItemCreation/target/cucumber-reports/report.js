$(document).ready(function() {var formatter = new CucumberHTML.DOMFormatter($('.cucumber-report'));formatter.uri("itemcreate.feature");
formatter.feature({
  "comments": [
    {
      "line": 1,
      "value": "#Author: archana.deshpande@siemens.com"
    }
  ],
  "line": 3,
  "name": "Item Creation in Teamcenter using SOA",
  "description": "",
  "id": "item-creation-in-teamcenter-using-soa",
  "keyword": "Feature",
  "tags": [
    {
      "line": 2,
      "name": "@tag"
    }
  ]
});
formatter.scenario({
  "line": 7,
  "name": "To verify that basic Item Creation functionality works in Teamcenter Enviornment",
  "description": "",
  "id": "item-creation-in-teamcenter-using-soa;to-verify-that-basic-item-creation-functionality-works-in-teamcenter-enviornment",
  "type": "scenario",
  "keyword": "Scenario",
  "tags": [
    {
      "line": 6,
      "name": "@tag1"
    }
  ]
});
formatter.step({
  "line": 8,
  "name": "I am Logged in Teamcenter",
  "keyword": "Given "
});
formatter.step({
  "line": 10,
  "name": "I Create Object of type Item",
  "keyword": "When "
});
formatter.step({
  "line": 12,
  "name": "Object of type Item gets created",
  "keyword": "Then "
});
formatter.step({
  "line": 14,
  "name": "I log out from Teamcenter",
  "keyword": "Then "
});
formatter.match({
  "location": "StepDef.Login()"
});
formatter.result({
  "duration": 19209571534,
  "status": "passed"
});
formatter.match({
  "location": "StepDef.SOAItemCreate()"
});
formatter.result({
  "duration": 2710980994,
  "status": "passed"
});
formatter.match({
  "location": "StepDef.GetID()"
});
formatter.result({
  "duration": 57839,
  "status": "passed"
});
formatter.match({
  "location": "StepDef.logot()"
});
formatter.result({
  "duration": 236827942,
  "status": "passed"
});
});