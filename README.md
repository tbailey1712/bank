1. npm install
2. npm start
4. npm install --save @google-cloud/bigquery
5. npm install --save body-parser cookie-parser cookie-session dateformat

gcloud app deploy

bq --location=US mk -d --description "Bank Dataset" bankdata

bq mk --table --description "Bank Accounts"  bankdata.accounts account_id:INTEGER,name:STRING,pin:INTEGER,email:STRING,date_created:DATETIME,last_login:DATETIME 

bq mk --table --description "Account Transactions"  bankdata.transactions transaction_id:INTEGER,account_id:INTEGER,transaction_type_id:INTEGER,amount:NUMERIC,transaction_date:DATETIME 

bq mk --table --description "Account Transaction Types"  bankdata.transaction_type transaction_type_id:INTEGER,name:STRING

bq load --source_format=CSV --skip_leading_rows=1 bankdata.accounts load_accounts.csv account_id:INTEGER,name:STRING,pin:INTEGER,date_created:DATETIME

bq load --source_format=CSV --skip_leading_rows=1 bankdata.transactions trans.csv transaction_id:INTEGER,account_id:INTEGER,transaction_type_id:INTEGER,amount:NUMERIC,transaction_date:DATETIME

# TO-DO LIST
- https://cloud.google.com/scheduler/
- https://cloud.google.com/appengine/docs/standard/nodejs/sending-emails-with-sendgrid
- https://console.cloud.google.com/marketplace/details/sendgrid-app/sendgrid-email?project=mcduck-bank&folder&organizationId
- https://medium.com/codait/environment-variables-or-keeping-your-secrets-secret-in-a-node-js-app-99019dfff716
- https://www.npmjs.com/package/@google-cloud/connect-datastore


Special Thanks to:
https://www.codementor.io/mayowa.a/how-to-build-a-simple-session-based-authentication-system-with-nodejs-from-scratch-6vn67mcy3
