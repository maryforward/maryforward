const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@maryforward.com";
const FROM_NAME = process.env.FROM_NAME || "MaryForward";
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || "team@maryforward.com";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (!process.env.BREVO_API_KEY) {
    console.warn("BREVO_API_KEY not configured, skipping email");
    return { success: false, error: "Email not configured" };
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: FROM_NAME,
          email: FROM_EMAIL,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to send email:", errorData);
      return { success: false, error: errorData.message || "Failed to send email" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: "Failed to send email" };
  }
}

export async function sendReportReadyNotification({
  patientEmail,
  patientName,
  caseNumber,
  caseId,
  reportType,
}: {
  patientEmail: string;
  patientName: string | null;
  caseNumber: string;
  caseId: string;
  reportType: string;
}) {
  const reportTypeLabels: Record<string, string> = {
    EXPERT_REVIEW: "Expert Review",
    AI_SYNTHESIS: "AI Synthesis",
    PATIENT_SUMMARY: "Patient Summary",
    FINAL_REPORT: "Final Report",
  };

  const reportLabel = reportTypeLabels[reportType] || reportType;
  const portalUrl = `${process.env.NEXTAUTH_URL}/portal/cases/${caseId}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Your Medical Report is Ready</h1>
  </div>

  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin-top: 0;">Dear ${patientName || "Patient"},</p>

    <p>Good news! A new medical report has been prepared for your case.</p>

    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 120px;">Case Number:</td>
          <td style="padding: 8px 0; font-weight: 600;">${caseNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Report Type:</td>
          <td style="padding: 8px 0; font-weight: 600;">${reportLabel}</td>
        </tr>
      </table>
    </div>

    <p>Our medical team has reviewed your case and prepared detailed findings and recommendations for you.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Your Report</a>
    </div>

    <p style="color: #64748b; font-size: 14px;">If the button above doesn't work, copy and paste this link into your browser:</p>
    <p style="color: #0ea5e9; font-size: 14px; word-break: break-all;">${portalUrl}</p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

    <p style="color: #64748b; font-size: 13px; margin-bottom: 0;">
      <strong>Important:</strong> This report is provided for informational purposes only. Please discuss all findings and recommendations with your primary healthcare provider before making any changes to your treatment plan.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p style="margin: 0;">© ${new Date().getFullYear()} MaryForward. All rights reserved.</p>
    <p style="margin: 5px 0 0 0;">This is an automated message. Please do not reply to this email.</p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: patientEmail,
    subject: `Your Medical Report is Ready - Case ${caseNumber}`,
    html,
  });
}

export async function sendCaseCompletedNotification({
  patientEmail,
  patientName,
  caseNumber,
  caseId,
}: {
  patientEmail: string;
  patientName: string | null;
  caseNumber: string;
  caseId: string;
}) {
  const portalUrl = `${process.env.NEXTAUTH_URL}/portal/cases/${caseId}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Your Case Review is Complete</h1>
  </div>

  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin-top: 0;">Dear ${patientName || "Patient"},</p>

    <p>Great news! The medical review of your case has been completed.</p>

    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 120px;">Case Number:</td>
          <td style="padding: 8px 0; font-weight: 600;">${caseNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Status:</td>
          <td style="padding: 8px 0;">
            <span style="display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;">Completed</span>
          </td>
        </tr>
      </table>
    </div>

    <p>All reports and recommendations for your case are now available in your patient portal. Please review them carefully and discuss with your healthcare provider.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Your Case</a>
    </div>

    <p style="color: #64748b; font-size: 14px;">If the button above doesn't work, copy and paste this link into your browser:</p>
    <p style="color: #10b981; font-size: 14px; word-break: break-all;">${portalUrl}</p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

    <p style="color: #64748b; font-size: 13px; margin-bottom: 0;">
      <strong>Next Steps:</strong> Schedule a follow-up appointment with your primary healthcare provider to discuss the findings and recommendations from your case review.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p style="margin: 0;">© ${new Date().getFullYear()} MaryForward. All rights reserved.</p>
    <p style="margin: 5px 0 0 0;">This is an automated message. Please do not reply to this email.</p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: patientEmail,
    subject: `Your Case Review is Complete - Case ${caseNumber}`,
    html,
  });
}

export async function sendCaseSubmittedPatientNotification({
  patientEmail,
  patientName,
  caseNumber,
  caseId,
  caseType,
}: {
  patientEmail: string;
  patientName: string | null;
  caseNumber: string;
  caseId: string;
  caseType: string;
}) {
  const caseTypeLabels: Record<string, string> = {
    ONCOLOGY: "Oncology",
    INFECTIOUS_DISEASE: "Infectious Disease",
    OTHER: "Other",
  };

  const caseTypeLabel = caseTypeLabels[caseType] || caseType;
  const portalUrl = `${process.env.NEXTAUTH_URL}/portal/cases/${caseId}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Case Submitted Successfully</h1>
  </div>

  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin-top: 0;">Dear ${patientName || "Patient"},</p>

    <p>Thank you for submitting your case. Our medical team has received it and will begin the review process shortly.</p>

    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 120px;">Case Number:</td>
          <td style="padding: 8px 0; font-weight: 600;">${caseNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Case Type:</td>
          <td style="padding: 8px 0; font-weight: 600;">${caseTypeLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Status:</td>
          <td style="padding: 8px 0;">
            <span style="display: inline-block; background: #8b5cf6; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;">Submitted</span>
          </td>
        </tr>
      </table>
    </div>

    <h3 style="color: #334155; margin-bottom: 10px;">What Happens Next?</h3>
    <ol style="color: #64748b; padding-left: 20px;">
      <li style="margin-bottom: 8px;">Our team will review your submitted information</li>
      <li style="margin-bottom: 8px;">A specialist will be assigned to your case</li>
      <li style="margin-bottom: 8px;">You'll receive an email when your report is ready</li>
    </ol>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Your Case</a>
    </div>

    <p style="color: #64748b; font-size: 14px;">If the button above doesn't work, copy and paste this link into your browser:</p>
    <p style="color: #8b5cf6; font-size: 14px; word-break: break-all;">${portalUrl}</p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

    <p style="color: #64748b; font-size: 13px; margin-bottom: 0;">
      <strong>Questions?</strong> If you have any questions about your case or the review process, please don't hesitate to contact our support team.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p style="margin: 0;">© ${new Date().getFullYear()} MaryForward. All rights reserved.</p>
    <p style="margin: 5px 0 0 0;">This is an automated message. Please do not reply to this email.</p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: patientEmail,
    subject: `Case Submitted - ${caseNumber}`,
    html,
  });
}

export async function sendCaseSubmittedTeamNotification({
  patientName,
  patientEmail,
  caseNumber,
  caseId,
  caseType,
  primaryDiagnosis,
}: {
  patientName: string | null;
  patientEmail: string;
  caseNumber: string;
  caseId: string;
  caseType: string;
  primaryDiagnosis: string | null;
}) {
  const caseTypeLabels: Record<string, string> = {
    ONCOLOGY: "Oncology",
    INFECTIOUS_DISEASE: "Infectious Disease",
    OTHER: "Other",
  };

  const caseTypeLabel = caseTypeLabels[caseType] || caseType;
  const adminUrl = `${process.env.NEXTAUTH_URL}/clinician/cases/${caseId}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">New Case Submitted</h1>
  </div>

  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin-top: 0;">A new case has been submitted and is awaiting review.</p>

    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 140px;">Case Number:</td>
          <td style="padding: 8px 0; font-weight: 600;">${caseNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Patient Name:</td>
          <td style="padding: 8px 0; font-weight: 600;">${patientName || "Not provided"}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Patient Email:</td>
          <td style="padding: 8px 0;">${patientEmail}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Case Type:</td>
          <td style="padding: 8px 0;">
            <span style="display: inline-block; background: #0ea5e9; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;">${caseTypeLabel}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Primary Diagnosis:</td>
          <td style="padding: 8px 0; font-weight: 600;">${primaryDiagnosis || "Not specified"}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${adminUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Review Case</a>
    </div>

    <p style="color: #64748b; font-size: 14px;">If the button above doesn't work, copy and paste this link into your browser:</p>
    <p style="color: #f59e0b; font-size: 14px; word-break: break-all;">${adminUrl}</p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p style="margin: 0;">© ${new Date().getFullYear()} MaryForward Internal Notification</p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: NOTIFICATION_EMAIL,
    subject: `[Action Required] New Case Submitted - ${caseNumber}`,
    html,
  });
}
