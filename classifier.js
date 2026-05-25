const MODEL_NAME = "gemini-3-flash-preview";

const BRAND = {
  GREEN_DEEP:   "#1B4332",
  GREEN_MID:    "#2D6A4F",
  GREEN_LIGHT:  "#52B788",
  PURPLE:       "#6B46C1",
  PURPLE_LIGHT: "#9F7AEA",
  AMBER:        "#D97706",
  RED_SOFT:     "#C0392B",
  SURFACE:      "#F0F4F0",
};

function onGmailMessageOpen(e) {
  GmailApp.setCurrentMessageAccessToken(e.messageMetadata.accessToken);

  var messageId = e.messageMetadata.messageId;
  var message   = GmailApp.getMessageById(messageId);
  var subject   = message.getSubject();
  var body      = message.getPlainBody().substring(0, 400);
  var sender    = message.getFrom();
  var dateStr   = Utilities.formatDate(
    message.getDate(), Session.getScriptTimeZone(), "MMM d, yyyy"
  );

  var analysis = callClassifierAPI(subject, body, sender);

  return buildSidebarCard(
    analysis.verdict,
    analysis.extracted_email,
    analysis.confidence_note,
    subject,
    sender,
    dateStr,
    messageId
  );
}

function callClassifierAPI(subject, body, sender) {
  var url = "https://cinema-verde-classifier-578712543979.us-central1.run.app/classify";

  var payload = {
    "sender": sender,
    "subject": subject,
    "body": body
  };

  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  var response = fetchWithRetry(url, options);

  if (!response || response.getResponseCode() !== 200) {
    return {
      verdict: "HTTP_ERROR",
      extracted_email: "",
      confidence_note: "Classifier service unavailable."
    };
  }

  return JSON.parse(response.getContentText());
}

function buildSidebarCard(verdict, extractedEmail, confidenceNote, subject, sender, dateStr, messageId) {

  var card = CardService.newCardBuilder();

  if (verdict === "LEGIT") {

    card.setHeader(
      CardService.newCardHeader()
        .setTitle("Legitimate Inquiry")
        .setSubtitle(confidenceNote || "Human sender detected.")
        .setImageUrl("https://www.gstatic.com/images/icons/material/system/2x/check_circle_black_24dp.png")
        .setImageStyle(CardService.ImageStyle.CIRCLE)
    );

    var mainSection = CardService.newCardSection();

    var detailsHtml = "<b>From:</b> " + sender + "<br><b>Subject:</b> " + subject + "<br><b>Received:</b> " + dateStr;
    if (extractedEmail && extractedEmail !== "") {
      detailsHtml += "<br><b>Reply-to:</b> <font color=\"#4f46e5\">" + extractedEmail + "</font>";
    }
    mainSection.addWidget(CardService.newTextParagraph().setText(detailsHtml));

    var draftAction = CardService.newAction().setFunctionName("createDraftReply");
    if (extractedEmail && extractedEmail !== "") {
      draftAction.setParameters({ "realEmail": extractedEmail });
    }
    mainSection.addWidget(
      CardService.newTextButton()
        .setText("Draft Internship Reply")
        .setOnClickAction(draftAction)
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setBackgroundColor(BRAND.PURPLE)
    );

    card.addSection(mainSection);

  } else if (verdict === "SPAM") {

    card.setHeader(
      CardService.newCardHeader()
        .setTitle("B2B Spam Detected")
        .setSubtitle(confidenceNote || "Automated commercial outreach.")
        .setImageUrl("https://www.gstatic.com/images/icons/material/system/2x/block_black_24dp.png")
        .setImageStyle(CardService.ImageStyle.CIRCLE)
    );

    var spamSection = CardService.newCardSection();

    spamSection.addWidget(
      CardService.newTextParagraph()
        .setText("<b>From:</b> " + sender + "<br><b>Subject:</b> " + subject + "<br><b>Received:</b> " + dateStr)
    );

    spamSection.addWidget(
      CardService.newTextParagraph()
        .setText("Safe to archive or delete.")
    );

    card.addSection(spamSection);

  } else {

    card.setHeader(
      CardService.newCardHeader()
        .setTitle("Analysis Error")
        .setSubtitle("InternSift · Debug Mode")
        .setImageUrl("https://www.gstatic.com/images/icons/material/system/2x/warning_black_24dp.png")
        .setImageStyle(CardService.ImageStyle.CIRCLE)
    );

    var errorSection = CardService.newCardSection();

    errorSection.addWidget(
      CardService.newTextParagraph()
        .setText("<b>Error:</b> " + (verdict || "UNKNOWN") + "<br><b>Detail:</b> " + (confidenceNote || "None."))
    );

    errorSection.addWidget(
      CardService.newTextParagraph()
        .setText("Check <b>GEMINI_API_KEY</b> and <b>SHEET_ID</b> in Project Settings → Script Properties.")
    );

    card.addSection(errorSection);
  }

  var flywheelSection = CardService.newCardSection()
    .setHeader("Feedback")
    .setCollapsible(true)
    .setNumUncollapsibleWidgets(0);

  if (verdict === "LEGIT") {
    var markSpamAction = CardService.newAction()
      .setFunctionName("handleCorrection")
      .setParameters({ "messageId": messageId, "correctedLabel": "SPAM" });
    flywheelSection.addWidget(
      CardService.newTextButton()
        .setText("Incorrect? Mark as SPAM")
        .setOnClickAction(markSpamAction)
        .setTextButtonStyle(CardService.TextButtonStyle.OUTLINED)
    );
  } else if (verdict === "SPAM") {
    var markLegitAction = CardService.newAction()
      .setFunctionName("handleCorrection")
      .setParameters({ "messageId": messageId, "correctedLabel": "LEGIT" });
    flywheelSection.addWidget(
      CardService.newTextButton()
        .setText("Incorrect? Mark as LEGIT")
        .setOnClickAction(markLegitAction)
        .setTextButtonStyle(CardService.TextButtonStyle.OUTLINED)
    );
  }

  flywheelSection.addWidget(
    CardService.newTextParagraph()
      .setText("<i>Corrections are logged to the Cinema Verde Ground Truth Sheet.</i>")
  );

  card.addSection(flywheelSection);

  var footerSection = CardService.newCardSection();
  footerSection.addWidget(
    CardService.newTextParagraph()
      .setText("<font color=\"#2D6A4F\"><b>InternSift</b></font> · Powered by Gemini AI\n<font color=\"#6B7280\">Cinema Verde · Films for a Sustainable Future</font>")
  );
  card.addSection(footerSection);

  return card.build();
}

function createDraftReply(e) {
  GmailApp.setCurrentMessageAccessToken(e.messageMetadata.accessToken);

  var messageId      = e.messageMetadata.messageId;
  var message        = GmailApp.getMessageById(messageId);
  var subject        = message.getSubject();
  var extractedEmail = e.parameters.realEmail;

  var replyBody = "Hello,\n\nI am the Program Manager at Cinema Verde and I'm reaching out to thank you for your interest in joining Cinema Verde. The intern roles we are looking for include graphic/web design, fundraising, business strategy, journalism, public relations, digital/media production and advertising.\n\nWe are excited to be working on these tasks: streamline our website, expand our social media marketing, further develop our GoGreenNation news site with original reporting and careful curation, and especially develop more programming to expand our beautiful channel. We have had a few inquiries about hosting local events so we might venture back into the arena on a (very) limited basis.\n\nWe meet at 3pm on Mondays and 1pm on Fridays.\n\nThank you again for your interest in Cinema Verde.\n\nIf you are available to join us date and time, please let me know, and I will follow up with details for the meeting.";

  if (extractedEmail && extractedEmail !== "") {
    GmailApp.createDraft(extractedEmail, "Re: " + subject, replyBody);
  } else {
    message.createDraftReply(replyBody);
  }

  return CardService.newActionResponseBuilder()
    .setNotification(
      CardService.newNotification().setText("Draft created — check your Drafts folder.")
    )
    .build();
}

function handleCorrection(e) {
  GmailApp.setCurrentMessageAccessToken(e.messageMetadata.accessToken);

  var messageId      = e.parameters.messageId;
  var correctedLabel = e.parameters.correctedLabel;
  var message        = GmailApp.getMessageById(messageId);

  var dateStr = Utilities.formatDate(
    message.getDate(), Session.getScriptTimeZone(), "MM-dd-yyyy"
  );
  var sender  = message.getFrom();
  var subject = message.getSubject();
  var body    = message.getPlainBody();

  var sheetId = PropertiesService.getScriptProperties().getProperty("SHEET_ID");

  if (!sheetId) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText("Error: SHEET_ID missing from Script Properties.")
      )
      .build();
  }

  var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
  sheet.appendRow([dateStr, sender, subject, body, correctedLabel, "InternSift UI Correction"]);

  return CardService.newActionResponseBuilder()
    .setNotification(
      CardService.newNotification().setText("Correction logged to Ground Truth Sheet.")
    )
    .build();
}

function fetchWithRetry(url, options) {
  var maxRetries = 3;
  var waitMs = 10000;

  for (var i = 0; i < maxRetries; i++) {
    try {
      var response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() === 200) return response;
      if (i < maxRetries - 1) Utilities.sleep(waitMs);
    } catch (error) {
      if (i < maxRetries - 1) {
        Utilities.sleep(waitMs);
      } else {
        throw error;
      }
    }
  }
  return null;
}
