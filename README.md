1. npm install
2. npm start
4. npm install --save @google-cloud/bigquery
5. npm install --save body-parser cookie-parser cookie-session

gcloud app deploy

bq --location=US mk -d --description "Bank Dataset" bankdata


bq mk --table --description "Bank Accounts"  bankdata.accounts account_id:INTEGER,name:STRING,pin:INTEGER,email:STRING,date_created:DATETIME,last_login:DATETIME 

bq mk --table --description "Account Transactions"  bankdata.transactions transaction_id:INTEGER,account_id:INTEGER,transaction_type_id:INTEGER,amount:NUMERIC,transaction_date:DATETIME 

bq mk --table --description "Account Transaction Types"  bankdata.transaction_type transaction_type_id:INTEGER,name:STRING

bq load --source_format=CSV --skip_leading_rows=1 bankdata.accounts load_accounts.csv account_id:INTEGER,name:STRING,pin:INTEGER,date_created:DATETIME

bq load --source_format=CSV --skip_leading_rows=1 bankdata.transaction_type load_transaction_types.csv transaction_type_id:INTEGER,name:STRING


Special Thanks to:
https://www.codementor.io/mayowa.a/how-to-build-a-simple-session-based-authentication-system-with-nodejs-from-scratch-6vn67mcy3
