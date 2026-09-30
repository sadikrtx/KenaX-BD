import type { Handler, HandlerEvent } from "@netlify/functions";
import nodemailer from "nodemailer";

export const handler: Handler = async (event: HandlerEvent) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const {
      to,
      subject,
      html,
      text,
      type,
      senderName = "KenaX BD Official",
      superAdminEmail: reqSuperAdmin,
      smtpUser,
      smtpPass,
      smtpHost,
      smtpPort,
    } = body;

    if (!to || !subject) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing required fields: to, subject" }),
      };
    }

    const timestamp = new Date().toISOString();
    const user = smtpUser || process.env.GMAIL_USER || process.env.SMTP_USER || "sadikrtx3060@gmail.com";
    const pass = smtpPass || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;
    const host = smtpHost || process.env.SMTP_HOST || "smtp.gmail.com";
    const port = Number(smtpPort || process.env.SMTP_PORT || 465);

    const superAdminEmail = (reqSuperAdmin || process.env.SUPER_ADMIN_EMAIL || "sadikrtx3060@gmail.com").trim();
    const bccList: string[] = [];
    if (superAdminEmail && to.toLowerCase().trim() !== superAdminEmail.toLowerCase().trim()) {
      bccList.push(superAdminEmail);
    }

    console.log(`[Netlify Email Function] To: ${to} | BCC: ${bccList.join(", ") || "None"} | Subject: ${subject}`);

    if (user && pass) {
      try {
        const isGmail = host.toLowerCase().includes("gmail.com");
        const transporter = isGmail
          ? nodemailer.createTransport({
              service: "gmail",
              auth: { user, pass },
              connectionTimeout: 5000,
              greetingTimeout: 5000,
              socketTimeout: 5000,
              tls: { rejectUnauthorized: false },
            })
          : nodemailer.createTransport({
              host,
              port,
              secure: port === 465,
              auth: { user, pass },
              connectionTimeout: 5000,
              greetingTimeout: 5000,
              socketTimeout: 5000,
              tls: { rejectUnauthorized: false },
            });

        const mailPayload: any = {
          from: `"${senderName}" <${user}>`,
          to,
          replyTo: user,
          subject,
          text: text || "KenaX BD Notification",
          html: html || `<p>${subject}</p>`,
          headers: {
            "X-Mailer": "KenaX-BD-Netlify-Engine/2.5",
            "X-Priority": "1",
            Importance: "High",
          },
        };

        if (bccList.length > 0) {
          mailPayload.bcc = bccList;
        }

        const info: any = await Promise.race([
          transporter.sendMail(mailPayload),
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "SMTP connection timed out (Netlify/AWS cloud blocks outbound SMTP port 465/587)."
                  )
                ),
              6000
            )
          ),
        ]);
        console.log(`[Netlify SMTP Live SUCCESS] MessageId: ${info.messageId}`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            status: "Delivered",
            messageId: info.messageId,
            to,
            superAdminBcc: bccList[0] || null,
            subject,
            timestamp,
            mode: "netlify_live_smtp",
          }),
        };
      } catch (smtpErr: any) {
        console.error("[Netlify SMTP Error]:", smtpErr?.message);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            status: "Simulated",
            smtpError: smtpErr?.message,
            to,
            superAdminBcc: bccList[0] || null,
            subject,
            timestamp,
            mode: "fallback_simulated",
            note: `SMTP attempt error: ${smtpErr?.message}`,
          }),
        };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        status: "Simulated",
        to,
        subject,
        timestamp,
        mode: "simulated_no_password",
        note: "Please set your Gmail App Password in Admin Settings to enable live email delivery.",
      }),
    };
  } catch (err: any) {
    console.error("[Netlify Function Error]:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err?.message }),
    };
  }
};
