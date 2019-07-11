/**
 * Copyright 2019, McDuck Labs
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

// [START gae_node_request_example]
const express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');

const app = express();
var path = require('path');
const bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false })  


app.use('/public', express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(session({
    key: 'mcduck_bank',
    secret: 'ikn0wsom3th1ngy0ud0ntkn0w',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 600000  // 10 minutes I think
    }
}));
var db = require("./db.js");

// This middleware will check if user's cookie is still saved in browser and user is not set, 
// then automatically log the user out.
// This usually happens when you stop your express server after login, 
// your cookie still remains saved in the browser.
app.use((req, res, next) => {
    if (req.cookies.mcduck_bank && !req.session.user) {
        res.clearCookie('mcduck_bank');        
    }
    next();
});

// middleware function to check for logged-in users
var sessionChecker = (req, res, next) => {
    console.log("sessionChecker(): Checking cookies: " + JSON.stringify(req.cookies));
    if (req.session.user && req.cookies.mcduck_bank) {
        console.log("sessionChecker(): " + JSON.stringify(req.session.user));
        var id = req.session.user.id;
        console.log("sessionChecker() id=" + id);
        
    } else {
        console.log("sessionChecker(): NOT!");
        res.sendFile(path.join(__dirname + '/public/login.html'));
    //        next();
    }    
};


//-------------------------------------------------------------------

app.get('/', (req, res) => {
    console.log("HTTP GET / ");

    if (req.session.user && req.cookies.mcduck_bank) {
        console.log("app.get(/): " + JSON.stringify(req.session.user));
        var id = req.session.user.id;
        console.log("app.get(/) id=" + id);
        
        if (id == 0) {
            console.log("app.get(/) Send to Admin");
            res.redirect('/admin');
        } else {
            console.log("app.get(/) Send to Account");
            res.redirect('/account');
        }
    } else {
        console.log("/: no valid user or cookie");
        res.sendFile(path.join(__dirname + '/public/login.html'));
    }

});

// route for user logout
app.get('/logout', (req, res) => {
    if (req.session.user && req.cookies.mcduck_bank) {
        res.clearCookie('mcduck_bank');
        res.redirect('/');
    } else {
        res.sendFile(path.join(__dirname + '/public/login.html'));
    }
});

/*
// route for handling 404 requests(unavailable routes)
app.use(function (req, res, next) {
  res.status(404).send("Sorry can't find that!")
});
*/

app.get('/balance', (req,res) => {
    // check for API auth
    console.log("/balance GET START");

    if (req.session.user && req.cookies.mcduck_bank) {
        var id = req.session.user.id;
        console.log("/balance for " + id);

        db.getBalances( id, function(result) {
            res.setHeader('Content-Type', 'application/json');
            res.json( JSON.stringify(result) );
        });

    } else {
        res.sendFile(path.join(__dirname + '/public/login.html'));
    }    
    
});

app.get('/transactiontypes', (req,res) => {
    // check for API auth
    console.log("/transactiontypes GET START");
    /*res.setHeader('Content-Type', 'application/json');
    var type = "[{ \"id\": 0,\"name\": \"Deposit\" },{\"id\": 1, \"name\": \"Withdrawl\"}]";
    res.json(type);*/

    db.getTransactionTypes( function(result) {
        res.setHeader('Content-Type', 'application/json');
        res.json( JSON.stringify(result) );
    });
});

app.get('/getaccounts', (req,res) => {
    // TODO check for API auth
    console.log("/accounttypes GET START");
    db.getAccounts( function(result) {
        res.setHeader('Content-Type', 'application/json');
        res.json( JSON.stringify(result.data) );
    });
});

app.get('/getaccountstable', (req,res) => {
    // TODO check for API auth
    console.log("/accounttypestable GET START");
    res.setHeader('Content-Type', 'application/json');

    db.getAccounts( function(result) {
        res.setHeader('Content-Type', 'application/json');
        res.json(result);
    }); 
});

app.get('/gettransactionstable', (req,res) => {
    // TODO check for API auth

    var id = req.session.user.id;
    console.log("/gettransactionstable GET START for account id=" + id);
    res.setHeader('Content-Type', 'application/json');

    db.getTransactions( id, function(result) {
        res.setHeader('Content-Type', 'application/json');
        res.json(result);
    }); 
});


app.post('/login', urlencodedParser, function(req,res) {
    console.log("/login: POST START");
    console.dir(req.body);
    var account = req.body.inputAccount;
    var pin = req.body.inputPIN;
    console.log("User name = "+ account +", password is "+ pin);

    db.validateLogin(account, pin, function (result) {

        if ( result == false ) {
            res.status(200).send('LOGIN FAILED');
        }
        else {
            console.log("Creating a new session for: " + account );
            req.session.user = { id: account, name: "TBD" };
            res.redirect("/");
        }
    });   
});

app.post('/postTransaction', urlencodedParser, function(req,res) {
    //bearer check
    console.log("/postTransaction: POST START");
    console.dir(req.body);

    var account = req.body.account;
    var transaction = req.body.transaction;
    var amount = req.body.amount;    
    var dateFormat = require('dateformat');
    var day=dateFormat(new Date(), "yyyy-mm-dd");

    console.log("/postTransaction(): Account = "+ account +", transaction="+ transaction + " amount=" + amount );

    // TODO made sure fees/withdraw are negative
    var row = [];
    row.push({"account_id": account,"transaction_date": day, "transaction_type_id": transaction, "amount": parseFloat(amount)});

    db.insertTransaction(row, function (result) {
        console.log('/postTransaction() DB returned: ' + result);
    });
    res.redirect("/admin");
    res.end();
});

app.post('/newaccount', urlencodedParser, function(req,res) {
    //bearer check
    console.log("/newaccount: POST START");
    console.dir(req.body);
    var name = req.body.name;
    var pin = req.body.pin;
    var email = req.body.email;
    var dateFormat = require('dateformat');
    var day=dateFormat(new Date(), "yyyy-mm-dd");
   
    console.log("/newaccount Received Name = "+ name +", pin="+ pin + " email=" + email );

    var row = [];
    row.push({"account_id": 0, "name": name, "pin": parseInt(pin), "email": email, "date_created": day});
    db.insertAccount(row, function (result) {
        console.log('/newaccount: ${result}');
    });
    res.redirect("/admin");
});

app.get('/admin', function(req, res) {

    if (req.session.user && req.cookies.mcduck_bank) {
        console.log("/admin: Valid Request");
        res.sendFile(path.join(__dirname + '/secure/admin.html'));
    } else {
        console.log("/admin: No Valid User or Cookie");
        res.sendFile(path.join(__dirname + '/public/login.html'));
    }

});

app.get('/account', function(req, res) {

    if (req.session.user && req.cookies.mcduck_bank) {
        res.sendFile(path.join(__dirname + '/secure/account.html'));

    } else {
        res.sendFile(path.join(__dirname + '/public/login.html'));

    }

});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});


// [END gae_node_request_example]