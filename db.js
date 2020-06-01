const {BigQuery} = require('@google-cloud/bigquery');
var mail = require("./mail.js");


exports.sumTwo = function(){
    return 2+2; 
};

exports.sumThree = function(){
    return 2+2+2; 
  };

exports.insertAccount = async function (row, callback) {
    console.log("db.insertAccount(): BEGIN with " +JSON.stringify(row) );

    const bigquery = new BigQuery();
    const options = {
        ignoreUnknownValues: true,
        raw: false
      };
    // Insert data into a table
    try {
        var id = 0;
        getNewAccountID( function(result) { 
            id = result;
            if ( id == 0) {
                console.log("insertAccount(): Didn't get a new ID");
                callback("ERROR");
            }
            row[0].account_id = id;
            console.log("db.insertAccount(): About to Insert " +JSON.stringify(row) );
    
            bigquery.dataset("bankdata").table("accounts").insert(row, options).catch(err => {
                if (err && err.name === 'PartialFailureError') {
                    if (err.errors && err.errors.length > 0) {
                        console.log('insertAccount() Insert errors:');
                        err.errors.forEach(err => console.error(err));
                    }
                } else {
                    console.error('insertAccount() ERROR:', err);
                }
            });
            console.log(`db.insertAccount(): Likely inserted ${row.length} rows`);
            callback("done");        
        });    
    } catch (error) {
        console.error("insertAccount() ERROR: " + error);
        callback("ERROR");
    }
    console.log("db.insertAccount(): END");
};

exports.changepin = async function( id, pin, callback) {
    console.log("db.changepin( " + id + ", " + pin + ") BEGIN");
    
    try {
        const bigqueryClient = new BigQuery();
        var query = "UPDATE bankdata.accounts set pin = " + pin + " WHERE account_id = " + id;
        const options = { query: query, location: 'US' };
        const [job] = await bigqueryClient.createQueryJob(options);
        console.log(`db.changepin(): Job ${job.id} started. with query ${query}`);
        const [rows] = await job.getQueryResults();
        console.log("db.changepin(): " + JSON.stringify(rows));
    
    } catch (error) {
        console.log("db.changepin() ERROR=" + error);
        callback("ERROR");
    }
};

exports.insertTransaction = async function (row, callback) {
    console.log("db.insertTransaction(): BEGIN with " +JSON.stringify(row) );

    const bigquery = new BigQuery();
    const options = {
        ignoreUnknownValues: true,
        raw: false
      };
    // Insert data into a table
    try {
        var id = 0;

        // May get same ID twice due to commit delays
        getNewTransactionID( function(result) { 
            id = result;
            if ( id == 0) {
                console.log("insertTransaction(): Didn't get a new ID");
                callback("ERROR");
            }
            row[0].transaction_id = id;
            console.log("insertTransaction(): About to Insert " +JSON.stringify(row) );
    
            bigquery.dataset("bankdata").table("transactions").insert(row, options).catch(err => {
                if (err && err.name === 'PartialFailureError') {
                    if (err.errors && err.errors.length > 0) {
                        console.log('insertTransaction() Insert errors:');
                        err.errors.forEach(err => console.error(err));
                    }
                } else {
                    console.error('insertTransaction() ERROR:', err);
                }
            });
            console.log(`insertTransaction(): Likely inserted ${row.length} rows`);      
        });    
    } catch (error) {
        console.error("insertTransaction() ERROR: " + error);
        callback("ERROR");
    }
    console.log("insertTransaction(): END");
    return callback("DONE");  
    
};



getNewAccountID = async function(callback) {
    console.log("getNewAccountID() BEGIN");
    const bigqueryClient = new BigQuery();
    const query = "SELECT MAX(account_id) AS ID FROM bankdata.accounts";
    const options = { query: query, location: 'US' };
    const [job] = await bigqueryClient.createQueryJob(options);
    console.log(`getTransactionTypes(): Job ${job.id} started.`);
    const [rows] = await job.getQueryResults();

    var id = 0;
    rows.forEach(row => {
        console.log("getNewAccountID(): row=" + JSON.stringify(row) );
        id = parseInt(row.ID);
        id++;
        console.log("getNewAccountID(): Returning " + id);
        callback(id);
    });
};

getNewTransactionID = async function(callback) {
    console.log("getNewTransactionID() BEGIN");
    const bigqueryClient = new BigQuery();
    const query = "SELECT MAX(transaction_id) AS ID FROM bankdata.transactions";
    const options = { query: query, location: 'US' };
    const [job] = await bigqueryClient.createQueryJob(options);
    console.log(`getTransactionTypes(): Job ${job.id} started.`);
    const [rows] = await job.getQueryResults();

    var id = 0;

    if (rows.length == 0) {
        console.log("getNewTransactionID(): No Transactions Exist, First will be 1");
        callback(1);
    }
    else {
        var row = rows[0];
        console.log("getNewTransactionID(): row=" + JSON.stringify(row) );
        id = parseInt(row.ID);
        id++;
        console.log("getNewTransaction(): Returning " + id);
        callback(id);
    }
 
};

exports.processInterestPayments = async function(callback) {

    console.log("db.processInterestPayments(): BEGIN");
    try {
        // see if already ran this month

        exports.getAccounts(function (result) {
            console.log('processInterestPayments() getAccounts returned: ' + result);
            
            result.data.forEach(account => {
                var account_id = account.account;
                if (account_id != 0) {
                    var balance = parseFloat(account.balance);
                    var rate = 0.015;
                    var interest = parseFloat((balance * rate).toFixed(2));
    
                    var newbalance = parseFloat( (balance + interest).toFixed(2) );
                    console.log("processInterestPayments() User=" + account_id + " Balance=" + balance + " Interest=" + interest + " New Balance=" + newbalance );
                    // insertTransaction

                    var dateFormat = require('dateformat');
                    var day=dateFormat(new Date(), "yyyy-mm-dd");
                
                    var row = [];
                    row.push({"account_id": account_id,"transaction_date": day, "transaction_type_id": 4, "amount": interest});
                
                    exports.insertTransaction(row, function (result) {
                        console.log('processInterestPayments(): insertTransaction returned: ' + result);
                        sendInterestPaidEmail(account_id, interest, newbalance, function(emailresult) {
                            console.log('processInterestPayments(): sendInterestPaidEmail returned: ' + result);
                        });
                    });
                
                }
            });

            callback("Done");
        });
    } catch (error) {
        console.error("db.processInterestPayments() ERROR: " + error);
        callback("ERROR");
    }
}


sendInterestPaidEmail = async function(account_id, interest, newbalance, callback) {
    console.log("sendInterestPaidEmail(" + account_id + "): BEGIN");

    getAccountDetails(account_id, function(result) {
        console.log("sendInterestPaidEmail() Emailing " + result.email);
        var body = "Dear " + result.name + ", \r\n" + 
        "You have received an interest payment of $" + interest + " \r\n" +
        "Your new balance is $" + newbalance + " \r\n";
        
        var message = { to: result.email, subject: "McDuck Savings and Loan: Interest Payment", body: body};
    
        mail.sendMessage(message, function(result) {
            console.log("sendInterestPaidEmail(): Message Sent");
        });
        callback("DONE");    
    });
};

exports.sendStatements = async function(callback) {

    var body = "=============\n" + 
    "Welcome to McDuck Savings and Loan!\n" +
    "Your account is now open\n";
    
    var message = { to: "tony.bailey@gmail.com", subject: "Welcome to McDuck Bank", body: body};

    mail.sendMessage(message, function(result) {
        //
    });
    callback("DONE");
}

exports.getBalances = async function(account_id, callback) {

    console.log("db.getBalances(" + account_id + ") BEGIN");
    try {
        const bigqueryClient = new BigQuery();
        var balance = 0.0;
        var interest = 4.20;
        
        var query = "SELECT SUM(amount) as amount FROM bankdata.transactions ";
    
        if (account_id != 0) {
            query += "WHERE account_id = " + account_id;
        }
        var options = { query: query, location: 'US' };
        var [job] = await bigqueryClient.createQueryJob(options);
        console.log(`getBalances(): Job ${job.id} started with SQL: ` + query);
        var [rows] = await job.getQueryResults();
    
        if (rows.length == 1) {
            console.log("db.getBalances() Balance Returned " + JSON.stringify(rows));
            balance = parseFloat( rows[0].amount );
        }

        var query = "SELECT SUM(amount) as amount FROM bankdata.transactions ";
    
        if (account_id != 0) {
            query += "WHERE transaction_type_id = 4 AND account_id = " + account_id;
        } else {
            query += "WHERE transaction_type_id = 4";
        }
        var options2 = { query: query, location: 'US' };
        [job2] = await bigqueryClient.createQueryJob(options2);
        console.log(`getBalances(): Job ${job2.id} started with SQL: ` + query);
        [rows2] = await job2.getQueryResults();
    
        if (rows2.length == 1) {
            console.log("db.getBalances() Interest Returned " + JSON.stringify(rows2));
            interest = parseFloat( rows2[0].amount );
        }

        var result = {balance: balance, interest: interest};
        callback(result);
    } catch (error) {
        console.error("db.getBalances() ERROR: " + error);
        callback({amount: "error", interest: "error"});
    }
 
};

exports.getTransactionTypes = async function(callback) {
    console.log("db.getTransactionTypes(): BEGIN");
    const bigqueryClient = new BigQuery();
    const query = "SELECT * FROM bankdata.transaction_type";
    const options = { query: query, location: 'US' };
    const [job] = await bigqueryClient.createQueryJob(options);
    console.log(`getTransactionTypes(): Job ${job.id} started.`);
    const [rows] = await job.getQueryResults();

    var result = [];
    rows.forEach(row => {
        result.push({id: row.transaction_type_id, name: row.name});
    });
    callback(result);
};

exports.getTransactions = async function(accountid, callback) {
    console.log("db.getTransactions( " + accountid + " ) BEGIN");
    
    var format = require('date-format');
    const bigqueryClient = new BigQuery();
    var query = "SELECT transaction_date, tt.name, amount FROM bankdata.transactions t, bankdata.transaction_type tt ";
    query += " WHERE t.transaction_type_id = tt.transaction_type_id ";
    query += " AND account_id = ";
    query += accountid; 
    query += " ORDER BY transaction_date";
    const options = { query: query, location: 'US' };
    const [job] = await bigqueryClient.createQueryJob(options);
    console.log(`getAccounts(): Job ${job.id} started.`);
    const [rows] = await job.getQueryResults();

    var table = {};
    var key = "data";
    var array = [];
    
    try {
        rows.forEach(row => {

            date = row.transaction_date;
            //console.log("getTransactions() Row.date is " + date.value.substring(0, date.value.indexOf('T') ) ); // JSON.stringify(date));
            fmtdate = date.value.substring(0, date.value.indexOf('T') );
            array.push({date: fmtdate, type: row.name, balance: row.amount});
        });
        table[key] = array;
        callback(table);    
    } catch (error) {
        console.error("getTransactions() ERROR: " + error );
        callback(" ");
    }

}

getAccountDetails = async function(account_id, callback) {
    console.log("db.getAccountDetails(" + account_id + "): BEGIN");
    const bigqueryClient = new BigQuery();
    //const query = "SELECT * FROM bankdata.accounts";
    var query = "SELECT account_id, name, email, last_login " +
    " FROM bankdata.accounts " +
    " where account_id = " + account_id;
    
    const options = { query: query, location: 'US' };
    const [job] = await bigqueryClient.createQueryJob(options);
    console.log(`getAccountDetails(): Job ${job.id} started with ` + query);
    const [rows] = await job.getQueryResults();

    if (rows.length == 0) {
        console.log("getAccountDetails(): NO ACCOUNT EXISTS for " + account_id);
        callback("ERROR");
    } else {
        console.log("getAccountDetails(" + account_id + "): Found Rows: " + rows.length );
        var row = rows[0];
        
        console.log("getAccountDetails(" + account_id + "):" + JSON.stringify(row));
        callback({name: row.name, email: row.email});
        
    }

};


exports.getAccounts = async function(callback) {
    console.log("db.getAccounts(): BEGIN");
    const bigqueryClient = new BigQuery();
    //const query = "SELECT * FROM bankdata.accounts";
    var query = "SELECT account_id, name, email, last_login, (SELECT sum(amount) " +
    " FROM bankdata.transactions as balance " +
    " where account_id = a.account_id ) " +
    " FROM bankdata.accounts a ";
    
    const options = { query: query, location: 'US' };
    const [job] = await bigqueryClient.createQueryJob(options);
    console.log(`getAccounts(): Job ${job.id} started with ` + query);
    const [rows] = await job.getQueryResults();

    var table = {};
    var key = "data";
    var array = [];
    
    try {
        rows.forEach(row => {
            date = row.last_login;
            fmtdate = date.value.substring(0, date.value.indexOf('T'));
            //console.log("getAccounts() Row: " + JSON.stringify(row) );
            array.push({account: row.account_id, name: row.name, email: row.email, balance: row.f0_, last_login: fmtdate });
        });
        table[key] = array;
        console.log("db.getAccounts() WithBal Returning: " + JSON.stringify(table));
        callback(table);    
    } catch (error) {
        console.error("getAccounts() error: " + error);
        callback(" ");
    }
}

updateLastLoginDate = async function(account_id, callback) {
    var dateFormat = require('dateformat');
    var day=dateFormat(new Date(), "yyyy-mm-dd");

    console.log("db.updateLastLoginDate( " + account_id +  ") BEGIN");
    
    try {
        const bigqueryClient = new BigQuery();
        var query = "UPDATE bankdata.accounts set last_login = '" + day + "' WHERE account_id = " + account_id;
        const options = { query: query, location: 'US' };
        const [job] = await bigqueryClient.createQueryJob(options);
        console.log(`db.updateLastLoginDate(): Job ${job.id} started. with query ${query}`);
        const [rows] = await job.getQueryResults();
        console.log("db.updateLastLoginDate(): " + JSON.stringify(rows));
        callback("Updated");
    } catch (error) {
        console.log("db.changupdateLastLoginDateepin() ERROR=" + error);
        callback("ERROR");
    }
}

exports.validateLogin = async function(account, pin, callback) {

    console.log("LOGIN ATTEMPT BY " + account + " with PIN " + pin  );

    const bigqueryClient = new BigQuery();

    const query = "SELECT pin FROM bankdata.accounts WHERE account_id = " + account;

    const options = {
        query: query,
        location: 'US',
    };

    // Run the query as a job
    const [job] = await bigqueryClient.createQueryJob(options);
    console.log(`validateLogin(): Job ${job.id} started.`);

    // Wait for the query to finish
    const [rows] = await job.getQueryResults();

    if (rows.length == 0) {
        console.log("validateLogin(): NO ACCOUNT EXISTS for " + account);
        callback(false);
    } else {

        rows.forEach(row => {
            console.log("validateLogin():" + row);
            if (row.pin == pin) {
                console.log("validateLogin(): VALID LOGIN for " + account);

                updateLastLoginDate(account, function (result) {
                    console.log('validateLogin() Update Login Date returned: ' + result);
                });
                callback(true);
            } else {
                console.log("validateLogin(): WRONG PIN for " + account);
                callback(false);
            }
        });
    }
};