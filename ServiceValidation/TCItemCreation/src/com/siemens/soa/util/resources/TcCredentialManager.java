package com.siemens.soa.util.resources;
//package com.teamcenter.pv.util;
import com.teamcenter.schemas.soa._2006_03.exceptions.InvalidCredentialsException;
import com.teamcenter.schemas.soa._2006_03.exceptions.InvalidUserException;
import com.teamcenter.soa.client.CredentialManager;
import com.teamcenter.soa.exceptions.CanceledOperationException;


public class TcCredentialManager  implements CredentialManager
{

	private String name;
	private String password;
    private String group;
    private String role;
    private String discriminator;
    
    public TcCredentialManager(String name, String password, String group, String role, String discriminator)
	{
		super();
		this.setDiscriminator(discriminator);
		this.setGroup(group);
		this.setName(name);
		this.setPassword(password);
		this.setRole(role);
	}

	public int getCredentialType()
	{
		return 0;
	}

	public String[] getCredentials(InvalidCredentialsException arg0) throws CanceledOperationException
	{
		return null;
	}

	public String[] getCredentials(InvalidUserException arg0) throws CanceledOperationException
	{
		return null;
	}

	public void setGroupRole(String arg0, String arg1)
	{
		
	}

	public void setUserPassword(String arg0, String arg1, String arg2)
	{
		
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getName() {
		return name;
	}

	public void setPassword(String password) {
		this.password = password;
	}

	public String getPassword() {
		return password;
	}

	public void setGroup(String group) {
		this.group = group;
	}

	public String getGroup() {
		return group;
	}

	public void setRole(String role) {
		this.role = role;
	}

	public String getRole() {
		return role;
	}

	public void setDiscriminator(String discriminator) {
		this.discriminator = discriminator;
	}

	public String getDiscriminator() {
		return discriminator;
	}
}
