function transactionEmail(data) {
    let emailTemplate = 
    `
    <!DOCTYPE html><html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office"><head>
    <meta http-equiv="Content-Type" content="text/html; charset=us-ascii">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <meta name="x-apple-disable-message-reformatting">
        <title>Template II</title>
        <!--[if mso]>
          <noscript>
            <xml>
              <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
              </o:OfficeDocumentSettings>
            </xml>
          </noscript>
        <![endif]-->
        <style>
          @media only screen and (max-width: 600px) {
            html body {
              width: 100vw;
              padding: 0rem !important;
              margin: 0rem !important;
            }
            .container {
              margin: 0rem !important;
            }
          }
    
          @media only screen and (max-width: 1366px) {
            html {
              width: 100% !important;
            }
          }
    
          table,
          td,
          div,
          h1,
          p {
            font-family: Arial, sans-serif;
          }
          body {
            background-color: rgb(247, 247, 247);
            font-size: 16px;
            margin: 0rem 8rem;
            padding: 0rem 4rem;
            width: 700px;
            margin: 2rem auto;
          }
          .container {
            background-color: rgb(247, 247, 247);
          }
          .heading {
            background-color: #321EDA;
            display: flex;
            gap: 10px;
            padding: 10px 0px 10px 10px;
          }
    
          img {
            height: 60px;
          }
    
          .white-text {
            color: white;
          }
    
          .body-container {
            background-color: #fff;
            padding: 10px 0px 16px 10px;
            border-bottom: #321EDA solid 2px;
            border-radius: 0px 0px 4px 4px;
          }
    
          .pin-card {
            background-color: #321EDA;
            width: fit-content;
            padding: 6px;
          }
    
          h2 {
            margin: 0;
          }
          table,
          th,
          td {
            border: 0px solid black;
            border-collapse: collapse;
          }
          th,
          td {
            text-align: start;
            padding: 8px;
          }
          .line {
            width: 60%;
            margin-left: 0px;
          }
        </style>
      </head>
    
      <body>
        <div class="container">
          <div class="heading">
            <img src="https://seeklogo.com/images/T/trust-wallet-token-twt-logo-5312F3331F-seeklogo.com.png">
            <h3 class="white-text">E-Wallet Email Notification</h3>
          </div>
          <div class="body-container">
            <div class="center">
              <p>
                Hi ${data.emailName}, we wish to inform you that a ${data.transactionType}
                transaction occurred on your E-wallet.
              </p>
    
              <span>The details of the transaction are shown below:</span>
              <hr class="line">
              <table style="width: 60%">
                <tbody>
                  <tr>
                    <th>Reference ID:</th>
                    <td>${data.id}</td>
                  </tr>
                  <tr>
                    <th>${data.transactionType == 'Credit' ? 'Sender ' : 'Recipient '}Account No:</th>
                    <td>${data.walletNo == 100054 ? 'XXXXX' : data.walletNo}</td>
                  </tr>
                  <tr>
                    <th>${data.transactionType == 'Credit' ? 'Sender ' : 'Recipient '}Wallet Name:</th>
                    <td>${data.walletName}</td>
                  </tr>
                  <tr>
                    <th>Date and Time:</th>
                    <td>${data.dateTime}</td>
                  </tr>
                  <tr>
                    <th>Amount:</th>
                    <td>$${data.amount}</td>
                  </tr>
                  <tr>
                    <th>Narration:</th>
                    <td>${data.narration}</td>
                  </tr>
                  <tr>
                    <th>Account Balance:</th>
                    <td>$${data.accountBalance}</td>
                  </tr>
                </tbody>
              </table>
              <hr class="line">
              <p>
                If you have any questions or
                inquiries, please send an email to test@e-wallet.com
                or call (603) 506-2393 immediately.
              </p>
            </div>
          </div>
        </div>
    
        <div class="footer"></div>
      </body>
    </html>
    
    `

    return emailTemplate;
}

module.exports = transactionEmail;