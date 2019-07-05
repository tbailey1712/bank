const {BigQuery} = require('@google-cloud/bigquery');

exports.sumTwo = function(){
    return 2+2; 
};

exports.sumThree = function(){
    return 2+2+2; 
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

    // Print the results
    console.log('Query Succeeded');

    if (rows.length == 0) {
        console.log("NO ACCOUNT EXISTS for " + account);
        callback(false);
    } else {

        rows.forEach(row => {
            console.log(row);
            if (row.pin == pin) {
                console.log("VALID LOGIN for " + account);
                callback(true);
            } else {
                console.log("WRONG PIN for " + account);
                callback(false);
            }
        });
    }
};