const MODEL_NAME = "gemini-3-flash-preview";
const API_KEY = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");

function onGmailMessageOpen(e) {
  GmailApp.setCurrentMessageAccessToken(e.messageMetadata.accessToken);

  var messageId = e.messageMetadata.messageId;
  var message = GmailApp.getMessageById(messageId);
  var subject = message.getSubject();
  var body = message.getPlainBody();
  var sender = message.getFrom();

  var analysis = callGeminiAPI(subject, body, sender);

  return buildSidebarCard(analysis.verdict, analysis.extracted_email, subject);
}

function callGeminiAPI(subject, body, sender) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

  const payload = {
    "contents": [{
      "parts": [{
        "text": `You are an expert admin assistant for a business owner. Your job is to filter internship inquiries.

LEGIT: Returns this if the email is from a human student asking about an internship, mentioning specific skills, following up on an application, or is human and personable.

SPAM: Returns this if the email is an SEO sales pitch, a generic marketing bot, a 'website optimization' offer, or irrelevant junk.

CRITICAL INSTRUCTION: If the email is a form submission (e.g., from Webflow), look closely at the Email Body text and extract the actual applicant's email address so we can reply to them.

        Email Sender: ${sender}
        Email Subject: ${subject}
        Email Body: ${body}`
      }]
    }],
    "generationConfig": {
      "temperature": 0.0,
      "responseMimeType": "application/json",
      "responseSchema": {
        "type": "object",
        "properties": {
          "verdict": {
            "type": "string",
            "enum": ["LEGIT", "SPAM"]
          },
          "extracted_email": {
            "type": "string",
            "description": "The real applicant's email address found in the body. Leave blank if not found."
          }
        },
        "required": ["verdict"]
      }
    }
  };

  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);

    if (response.getResponseCode() !== 200) {
      return { verdict: "HTTP_ERROR: " + response.getContentText(), extracted_email: "" };
    }

    var json = JSON.parse(response.getContentText());
    var resultStr = json.candidates[0].content.parts[0].text;

    return JSON.parse(resultStr);

  } catch (error) {
    return { verdict: "CODE_ERROR: " + error.toString(), extracted_email: "" };
  }
}

function buildSidebarCard(verdict, extractedEmail, subject) {
  var card = CardService.newCardBuilder();
  var section = CardService.newCardSection();

  if (verdict === "LEGIT") {
    var header = CardService.newCardHeader()
      .setTitle("Legitimate Inquiry")
      .setSubtitle("Ready to reply.")
      .setImageUrl("https://www.gstatic.com/images/icons/material/system/2x/check_circle_black_24dp.png")
      .setImageStyle(CardService.ImageStyle.CIRCLE);

    //show extracted email in UI
    var statusText = "<b>Status:</b> This looks like a real student.";
    if (extractedEmail) {
       statusText += `<br><b>Applicant Email:</b> ${extractedEmail}`;
    }
    section.addWidget(CardService.newTextParagraph().setText(statusText));

    //pass extracted email to button click action
    var action = CardService.newAction().setFunctionName("createDraftReply");
    if (extractedEmail) {
        action.setParameters({ "realEmail": extractedEmail });
    }

    section.addWidget(CardService.newTextButton()
      .setText("Draft Internship Reply")
      .setOnClickAction(action)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setBackgroundColor("#673AB7"));

    card.setHeader(header);

  } else if (verdict === "SPAM") {
    var header = CardService.newCardHeader()
      .setTitle("Potential Spam")
      .setSubtitle("No action needed.")
      .setImageUrl("https://www.gstatic.com/images/icons/material/system/2x/cancel_black_24dp.png")
      .setImageStyle(CardService.ImageStyle.CIRCLE);

    section.addWidget(CardService.newTextParagraph().setText("<b>Status:</b> This appears to be marketing or automated spam."));
    card.setHeader(header);

  } else {
    var header = CardService.newCardHeader()
      .setTitle("Analysis Failed")
      .setSubtitle("Debug Info");

    section.addWidget(CardService.newTextParagraph().setText(verdict));
    card.setHeader(header);
  }

  card.addSection(section);
  return card.build();
}

function createDraftReply(e) {
  GmailApp.setCurrentMessageAccessToken(e.messageMetadata.accessToken);

  var messageId = e.messageMetadata.messageId;
  var message = GmailApp.getMessageById(messageId);
  var subject = message.getSubject();

  //get hidden parameter passed from the button
  var extractedEmail = e.parameters.realEmail;

  var replyBody = "Hi there,\n\nThank you for your interest in the internship program! Please send your resume and portfolio to us for review.\n\nBest,\nCinema Verde Team";

  //if real email create a new draft to THEM
  if (extractedEmail && extractedEmail !== "") {
    GmailApp.createDraft(extractedEmail, "Re: " + subject, replyBody);
  } else {
    //j reply directly to the sender
    message.createDraftReply(replyBody);
  }

  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText("Draft Created! Check your Drafts folder."))
    .build();
}