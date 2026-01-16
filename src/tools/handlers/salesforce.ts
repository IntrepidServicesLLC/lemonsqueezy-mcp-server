import { getSalesforceConnection } from "../../connections/salesforce.js";
import { createResponse, createErrorResponse } from "../../utils/response.js";

export async function handleSyncCustomerToCRM(args: {
  email: string;
  name: string;
  revenue?: number;
  company?: string;
  title?: string;
}) {
  const { email, name: customerName, revenue, company, title } = args;

  if (!email || !customerName) {
    throw new Error("email and name are required");
  }

  try {
    const conn = await getSalesforceConnection();

    // Check if Lead with this email already exists
    // Using SOQL with proper escaping to prevent injection
    const escapedEmail = email.replace(/'/g, "''").replace(/\\/g, "\\\\");
    const soqlQuery = `SELECT Id FROM Lead WHERE Email = '${escapedEmail}' LIMIT 1`;
    const existingLeads = await conn.query<{ Id: string }>(soqlQuery);

    if (existingLeads.records && existingLeads.records.length > 0) {
      const leadId = existingLeads.records[0].Id;
      return createResponse({
        success: true,
        action: "found_existing",
        leadId: leadId,
        message: `Lead with email ${email} already exists in Salesforce`,
      });
    }

    // Parse name into FirstName and LastName
    // Split on spaces, use first part as FirstName, rest as LastName
    const nameParts = customerName.trim().split(/\s+/);
    const firstName = nameParts.length > 1 ? nameParts[0] : "";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : customerName;

    // Create new Lead
    // Salesforce requires Company field
    const leadData: {
      FirstName?: string;
      LastName: string;
      Email: string;
      Company: string;
      LeadSource: string;
      Title?: string;
      AnnualRevenue?: number;
    } = {
      LastName: lastName,
      Email: email,
      Company: company || customerName,
      LeadSource: "AI Agent",
      Title: title,
      AnnualRevenue: revenue,
    };

    const result = await conn.sobject("Lead").create(leadData);

    if (!result.success) {
      throw new Error(`Salesforce Lead creation failed: ${JSON.stringify(result.errors)}`);
    }

    return createResponse({
      success: true,
      action: "created_new",
      leadId: result.id,
      message: `Created new Lead in Salesforce for ${email}`,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
